import { db } from './index';
// The PolicyRepository is responsible for all database interactions related to policies.
export class PolicyRepository {
    static async findMatchingPolicies(service, path, method, tenant) {
        const query = `
      SELECT * FROM policies
      WHERE
        enabled = true
        AND (
          (match_conditions->>'service' = $1) OR (match_conditions->>'service' = '*')
        )
        AND (
          (match_conditions->>'tenant' IS NULL) OR (match_conditions->>'tenant' = $2)
        )
      ORDER BY priority DESC, created_at DESC
    `;
        const result = await db.query(query, [service, tenant || null]);
        const policies = result.rows.map(row => this.mapToPolicy(row));
        return policies.filter(policy => {
            const { pathPattern, methods } = policy.matchConditions;
            const methodMatches = methods.includes('*') || methods.includes(method.toUpperCase());
            if (!methodMatches)
                return false;
            const pathMatches = this.matchesPath(pathPattern, path);
            if (!pathMatches)
                return false;
            return true;
        });
    }
    static async findAll() {
        const query = 'SELECT * FROM policies ORDER BY priority DESC, name ASC';
        const result = await db.query(query);
        return result.rows.map(row => this.mapToPolicy(row));
    }
    static async findById(id) {
        const query = 'SELECT * FROM policies WHERE id = $1';
        const result = await db.query(query, [id]);
        return result.rows.length > 0 ? this.mapToPolicy(result.rows[0]) : null;
    }
    static async create(policy) {
        const query = `
      INSERT INTO policies (name, enabled, priority, match_conditions, rules, obligations, version)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
        const values = [
            policy.name,
            policy.enabled,
            policy.priority,
            JSON.stringify(policy.matchConditions),
            JSON.stringify(policy.rules),
            JSON.stringify(policy.obligations),
            policy.version ?? 1,
        ];
        const result = await db.query(query, values);
        return this.mapToPolicy(result.rows[0]);
    }
    static async update(id, updates) {
        const { name, enabled, priority, matchConditions, rules, obligations, version } = updates;
        const query = `
      UPDATE policies
      SET
        name = COALESCE($1, name),
        enabled = COALESCE($2, enabled),
        priority = COALESCE($3, priority),
        match_conditions = COALESCE($4, match_conditions),
        rules = COALESCE($5, rules),
        obligations = COALESCE($6, obligations),
        version = COALESCE($7, version),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `;
        const values = [
            name,
            enabled,
            priority,
            matchConditions ? JSON.stringify(matchConditions) : null,
            rules ? JSON.stringify(rules) : null,
            obligations ? JSON.stringify(obligations) : null,
            version,
            id
        ];
        const result = await db.query(query, values);
        return result.rows.length > 0 ? this.mapToPolicy(result.rows[0]) : null;
    }
    static async delete(id) {
        const query = 'DELETE FROM policies WHERE id = $1';
        const result = await db.query(query, [id]);
        return (result.rowCount ?? 0) > 0;
    }
    static matchesPath(pattern, path) {
        if (pattern === '/*')
            pattern = '*';
        if (pattern === '*')
            return true;
        const regexPattern = pattern.replace(/\*/g, '.*').replace(/\//g, '\\/');
        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(path);
    }
    static mapToPolicy(row) {
        return {
            id: row.id,
            name: row.name,
            enabled: row.enabled,
            priority: row.priority,
            matchConditions: typeof row.match_conditions === 'string' ? JSON.parse(row.match_conditions) : row.match_conditions,
            rules: typeof row.rules === 'string' ? JSON.parse(row.rules) : row.rules,
            obligations: typeof row.obligations === 'string' ? JSON.parse(row.obligations) : (row.obligations || {}),
            version: row.version,
            createdAt: new Date(row.created_at).toISOString(),
            updatedAt: new Date(row.updated_at).toISOString()
        };
    }
}
//# sourceMappingURL=PolicyRepository.js.map