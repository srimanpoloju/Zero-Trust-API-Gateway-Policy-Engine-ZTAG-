import { db } from './index';
import type { Policy } from '@ztag/shared';

// The PolicyRepository is responsible for all database interactions related to policies.
export class PolicyRepository {
  /**
   * Finds all policies that could potentially match a given request.
   * This query intentionally fetches a broader set of policies (by service and tenant)
   * which are then filtered more precisely in memory.
   *
   * @param service The name of the downstream service.
   * @param path The request path.
   * @param method The HTTP method.
   * @param tenant An optional tenant identifier.
   * @returns A promise that resolves to an array of matching policies, sorted by priority.
   */
  static async findMatchingPolicies(service: string, path: string, method: string, tenant?: string): Promise<Policy[]> {
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

    // In-memory filtering for path pattern and methods, which is more flexible
    // than doing complex regex and array lookups in SQL across all DB types.
    return policies.filter(policy => {
      const { pathPattern, methods } = policy.matchConditions;

      const methodMatches = methods.includes('*') || methods.includes(method.toUpperCase());
      if (!methodMatches) return false;

      const pathMatches = this.matchesPath(pathPattern, path);
      if (!pathMatches) return false;
      
      return true;
    });
  }

  // --- Standard CRUD methods for the Control Plane ---

  static async findAll(): Promise<Policy[]> {
    const query = 'SELECT * FROM policies ORDER BY priority DESC, name ASC';
    const result = await db.query(query);
    return result.rows.map(row => this.mapToPolicy(row));
  }

  static async findById(id: string): Promise<Policy | null> {
    const query = 'SELECT * FROM policies WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows.length > 0 ? this.mapToPolicy(result.rows[0]) : null;
  }
  
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
      JSON.stringify(policy.matchConditions),
      JSON.stringify(policy.rules),
      JSON.stringify(policy.obligations),
      policy.version ?? 1,
    ];
    const result = await db.query(query, values);
    return this.mapToPolicy(result.rows[0]);
  }

  static async update(id: string, updates: Partial<Omit<Policy, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Policy | null> {
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

  static async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM policies WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rowCount > 0;
  }

  /**
   * Converts a wildcard path pattern into a regular expression for matching.
   * @param pattern The wildcard pattern (e.g., '/users/*').
   * @param path The actual request path to test.
   * @returns True if the path matches the pattern.
   */
  private static matchesPath(pattern: string, path: string): boolean {
    if (pattern === '/*') pattern = '*';
    if (pattern === '*') return true;
    const regexPattern = pattern.replace(/\*/g, '.*').replace(/\//g, '\\/');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }

  /**
   * Maps a raw database row to a structured Policy object.
   * Handles JSON parsing for nested objects.
   * @param row The raw row from the 'pg' driver.
   * @returns A Policy object.
   */
  private static mapToPolicy(row: any): Policy {
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