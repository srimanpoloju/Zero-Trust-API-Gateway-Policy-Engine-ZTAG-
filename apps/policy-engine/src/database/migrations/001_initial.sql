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

-- Audits table
CREATE TABLE IF NOT EXISTS audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    subject_sub VARCHAR(255),
    subject_role VARCHAR(100),
    subject_tenant VARCHAR(100),
    method VARCHAR(10) NOT NULL,
    path TEXT NOT NULL,
    decision VARCHAR(10) NOT NULL,
    reason TEXT,
    policy_id UUID REFERENCES policies(id),
    latency_ms INTEGER,
    status_code INTEGER,
    rate_limit_info JSONB,
    ip VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_policies_service ON policies ((match_conditions->>'service'));
CREATE INDEX IF NOT EXISTS idx_policies_priority ON policies (priority DESC);
CREATE INDEX IF NOT EXISTS idx_policies_enabled ON policies (enabled);

CREATE INDEX IF NOT EXISTS idx_audits_timestamp ON audits (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audits_decision ON audits (decision);
CREATE INDEX IF NOT EXISTS idx_audits_subject ON audits (subject_sub);
CREATE INDEX IF NOT EXISTS idx_audits_path ON audits (path);

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
    '{"service": "*", "pathPattern": "/*", "methods": ["*"]}',
    '{"allowIf": [{"field": "role", "operator": "eq", "value": "admin"}]}',
    '{}'
),
(
    'User Echo Service Access',
    true,
    50,
    '{"service": "echo-service", "pathPattern": "/echo/*", "methods": ["GET"]}',
    '{"allowIf": [{"field": "role", "operator": "eq", "value": "user"}]}',
    '{"rateLimit": {"limit": 10, "windowSeconds": 60}}'
),
(
    'Blocked User Deny All',
    true,
    90,
    '{"service": "*", "pathPattern": "/*", "methods": ["*"]}',
    '{"denyIf": [{"field": "role", "operator": "eq", "value": "blocked"}]}',
    '{}'
),
(
    'Default Deny All',
    true,
    1,
    '{"service": "*", "pathPattern": "/*", "methods": ["*"]}',
    '{"denyIf": []}',
    '{}'
) ON CONFLICT DO NOTHING;
