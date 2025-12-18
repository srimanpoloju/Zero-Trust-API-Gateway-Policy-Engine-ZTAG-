import { db } from './index';
import type { AuditLog } from '@ztag/shared';

export class AuditRepository {
  /**
   * Creates a new audit log entry in the database.
   * @param log The audit log data.
   */
  static async create(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> {
    const query = `
      INSERT INTO audits (request_id, timestamp, subject, resource, decision, reason, policy_id, latency_ms, status_code, rate_limit, context, error)
      VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    const values = [
      log.requestId,
      JSON.stringify(log.subject),
      JSON.stringify(log.resource),
      log.decision,
      log.reason,
      log.policyId,
      log.latencyMs,
      log.statusCode,
      log.rateLimit ? JSON.stringify(log.rateLimit) : null,
      JSON.stringify(log.context),
      log.error,
    ];

    const result = await db.query(query, values);
    return this.mapToAuditLog(result.rows[0]);
  }

  /**
   * Maps a raw database row to a structured AuditLog object.
   * @param row The raw row from the 'pg' driver.
   * @returns An AuditLog object.
   */
  private static mapToAuditLog(row: any): AuditLog {
    return {
      id: row.id,
      requestId: row.request_id,
      timestamp: new Date(row.timestamp).toISOString(),
      subject: typeof row.subject === 'string' ? JSON.parse(row.subject) : row.subject,
      resource: typeof row.resource === 'string' ? JSON.parse(row.resource) : row.resource,
      decision: row.decision,
      reason: row.reason,
      policyId: row.policy_id,
      latencyMs: row.latency_ms,
      statusCode: row.status_code,
      rateLimit: typeof row.rate_limit === 'string' ? JSON.parse(row.rate_limit) : (row.rate_limit || undefined),
      context: typeof row.context === 'string' ? JSON.parse(row.context) : row.context,
      error: row.error,
    };
  }
}
