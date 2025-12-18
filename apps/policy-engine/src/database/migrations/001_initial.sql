-- Initial database migration for ZTAG platform
-- Creates policies and audits tables

-- Policies table
CREATE TABLE IF NOT EXISTS policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    priority INTEGER NOT NULL DEFAULT 0,
    match_conditions JSONB NOT NULL,
    rules JSONB NOT NULL,
    obligations JSONB DEFAULT '{}',
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audits table (Corrected Schema)
CREATE TABLE IF NOT EXISTS audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    decision VARCHAR(10) NOT NULL,
    reason TEXT,
    latency_ms INTEGER NOT NULL,
    status_code INTEGER NOT NULL,
    policy_id UUID REFERENCES policies(id),
    subject JSONB,
    resource JSONB,
    context JSONB,
    rate_limit JSONB,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_policies_priority ON policies (priority DESC);
CREATE INDEX IF NOT EXISTS idx_policies_enabled ON policies (enabled);
-- GIN index for efficient JSONB querying on match_conditions
CREATE INDEX IF NOT EXISTS idx_policies_match_conditions ON policies USING GIN (match_conditions);


-- GIN indexes for efficient JSONB querying on audits
CREATE INDEX IF NOT EXISTS idx_audits_timestamp ON audits (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audits_decision ON audits (decision);
CREATE INDEX IF NOT EXISTS idx_audits_subject_sub ON audits USING GIN ((subject->'sub'));
CREATE INDEX IF NOT EXISTS idx_audits_resource_service ON audits USING GIN ((resource->'service'));
CREATE INDEX IF NOT EXISTS idx_audits_resource_path ON audits USING GIN ((resource->'path'));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for policies table
CREATE TRIGGER update_policies_updated_at BEFORE UPDATE ON policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert seed policies
INSERT INTO policies (name, enabled, priority, match_conditions, rules, obligations) VALUES
(
    'Admin Full Access',
    true,
    100,
    '{ "service": "*", "pathPattern": "/*", "methods": ["*"] }',
    '{ "allowIf": [{ "field": "subject.role", "operator": "eq", "value": "admin" }] }',
    '{}'
),
(
    'User Echo Service Access',
    true,
    50,
    '{ "service": "echo-service", "pathPattern": "/echo/*", "methods": ["GET"] }',
    '{ "allowIf": [{ "field": "subject.role", "operator": "eq", "value": "user" }] }',
    '{ "rateLimit": { "key": "subject.sub", "limit": 10, "windowSeconds": 60 } }'
),
(
    'Tenant-Specific Echo Access',
    true,
    60,
    '{ "service": "echo-service", "pathPattern": "/echo/*", "methods": ["*"], "tenant": "tenant-a" }',
    '{ "allowIf": [{ "field": "subject.role", "operator": "in", "value": ["admin", "user"] }] }',
    '{}'
),
(
    'Blocked User Deny All',
    true,
    90,
    '{ "service": "*", "pathPattern": "/*", "methods": ["*"] }',
    '{ "denyIf": [{ "field": "subject.role", "operator": "eq", "value": "blocked" }] }',
    '{}'
)
ON CONFLICT (name) DO NOTHING;
