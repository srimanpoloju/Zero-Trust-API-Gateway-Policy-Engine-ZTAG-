import { db } from './index';
export class AuditRepository {
    static async findAll(options = {}) {
        const { page = 1, limit = 20, decision, service, path, subjectSub, } = options;
        const offset = (page - 1) * limit;
        const whereClauses = [];
        const values = [];
        let paramIndex = 1;
        if (decision) {
            whereClauses.push(`decision = $${paramIndex++}`);
            values.push(decision);
        }
        if (service) {
            whereClauses.push(`(resource->>'service') ILIKE $${paramIndex++}`);
            values.push(`%${service}%`);
        }
        if (path) {
            whereClauses.push(`(resource->>'path') ILIKE $${paramIndex++}`);
            values.push(`%${path}%`);
        }
        if (subjectSub) {
            whereClauses.push(`(subject->>'sub') ILIKE $${paramIndex++}`);
            values.push(`%${subjectSub}%`);
        }
        const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
        const logsQuery = `
      SELECT *, (SELECT COUNT(*) FROM audits ${whereString}) as total
      FROM audits
      ${whereString}
      ORDER BY timestamp DESC
      LIMIT $${paramIndex++}
      OFFSET $${paramIndex++}
    `;
        const logsResult = await db.query(logsQuery, [...values, limit, offset]);
        const total = logsResult.rows.length > 0 ? parseInt(logsResult.rows[0].total, 10) : 0;
        return {
            logs: logsResult.rows.map(row => this.mapToAuditLog(row)),
            total,
        };
    }
    // The gateway will be responsible for creating audit logs.
    // This method is included for completeness but should be moved if a dedicated service is created.
    static async create(log) {
        const query = `
      INSERT INTO audits (request_id, timestamp, subject, resource, decision, reason, policy_id, latency_ms, status_code, rate_limit, context, error)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
        const values = [
            log.requestId,
            log.timestamp,
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
    static mapToAuditLog(row) {
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
//# sourceMappingURL=AuditRepository.js.map