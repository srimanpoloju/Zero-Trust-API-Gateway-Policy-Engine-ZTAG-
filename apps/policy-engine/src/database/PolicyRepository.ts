import { database } from './index';
import type { Policy, PolicyCondition, PolicyRule } from '@ztag/shared';

export class PolicyRepository {
  static async create(policy: Omit<Policy, 'id' | 'createdAt' | 'updatedAt'>): Promise<Policy> {
    const query = `
      INSERT INTO policies (name, enabled, priority, match_conditions, rules, obligations, version)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      policy.name,
      policy.enabled,
      policy.priority,
      policy.matchConditions,
      policy.rules,
      policy.obligations,
      policy.version
    ];

    const result = await database.query(query, values);
    return this.mapToPolicy(result.rows[0]);
  }

  static async findAll(): Promise<Policy[]> {
    const query = `
      SELECT id, name, enabled, priority, match_conditions, rules, obligations, version, created_at, updated_at
      FROM policies
      ORDER BY priority DESC, created_at DESC
    `;

    const result = await database.query(query);
    return result.rows.map(row => this.mapToPolicy(row));
  }

  static async findById(id: string): Promise<Policy | null> {
    const query = `
      SELECT id, name, enabled, priority, match_conditions, rules, obligations, version, created_at, updated_at
      FROM policies
      WHERE id = $1
    `;

    const result = await database.query(query, [id]);
    return result.rows.length > 0 ? this.mapToPolicy(result.rows[0]) : null;
  }

  static async update(id: string, updates: Partial<Policy>): Promise<Policy | null> {
    const setClause = [];
    const values = [];
    let paramCount = 1;

    if (updates.name !== undefined) {
      setClause.push(`name = $${paramCount++}`);
      values.push(updates.name);
    }

    if (updates.enabled !== undefined) {
      setClause.push(`enabled = $${paramCount++}`);
      values.push(updates.enabled);
    }

    if (updates.priority !== undefined) {
      setClause.push(`priority = $${paramCount++}`);
      values.push(updates.priority);
    }

    if (updates.matchConditions !== undefined) {
      setClause.push(`match_conditions = $${paramCount++}`);
      values.push(updates.matchConditions);
    }

    if (updates.rules !== undefined) {
      setClause.push(`rules = $${paramCount++}`);
      values.push(updates.rules);
    }

    if (updates.obligations !== undefined) {
      setClause.push(`obligations = $${paramCount++}`);
      values.push(updates.obligations);
    }

    if (updates.version !== undefined) {
      setClause.push(`version = $${paramCount++}`);
      values.push(updates.version);
    }

    if (setClause.length === 0) {
      return this.findById(id);
    }

    setClause.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE policies
      SET ${setClause.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, name, enabled, priority, match_conditions, rules, obligations, version, created_at, updated_at
    `;

    const result = await database.query(query, values);
    return result.rows.length > 0 ? this.mapToPolicy(result.rows[0]) : null;
  }

  static async delete(id: string): Promise<boolean> {
    const query = `DELETE FROM policies WHERE id = $1`;
    const result = await database.query(query, [id]);
    return result.rowCount > 0;
  }

  static async findMatchingPolicies(service: string, path: string, method: string, tenant?: string): Promise<Policy[]> {
    const query = `
      SELECT id, name, enabled, priority, match_conditions, rules, obligations, version, created_at, updated_at
      FROM policies
      WHERE enabled = true
        AND (match_conditions->>'service') = $1
        AND (match_conditions->>'tenant') IS NULL OR (match_conditions->>'tenant') = $2
      ORDER BY priority DESC, created_at DESC
    `;

    const result = await database.query(query, [service, tenant || null]);
    const policies = result.rows.map(row => this.mapToPolicy(row));
    
    // Filter by path and method matching
    return policies.filter(policy => {
      const pathPattern = policy.matchConditions.pathPattern;
      const methods = policy.matchConditions.methods;
      
      const pathMatches = this.matchesPath(pathPattern, path);
      const methodMatches = methods.includes(method.toUpperCase());
      
      return pathMatches && methodMatches;
    });
  }

  private static matchesPath(pattern: string, path: string): boolean {
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.')
      .replace(/\//g, '\\/');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }

  private static mapToPolicy(row: any): Policy {
    return {
      id: row.id,
      name: row.name,
      enabled: row.enabled,
      priority: row.priority,
      matchConditions: row.match_conditions,
      rules: row.rules,
      obligations: row.obligations || {},
      version: row.version,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
