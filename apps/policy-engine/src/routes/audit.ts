import { FastifyInstance } from 'fastify';
import { database } from '../database';
import { AuditLogSchema } from '@ztag/shared';
import { Logger } from '../utils/logger';

export async function auditRoutes(fastify: FastifyInstance) {
  const logger = new Logger('audit');

  // Get audit logs with filters
  fastify.get('/', async (request, reply) => {
    try {
      const query = request.query as {
        decision?: string;
        service?: string;
        subject?: string;
        path?: string;
        limit?: string;
        offset?: string;
      };

      let sql = 'SELECT * FROM audit_logs WHERE 1=1';
      const params: any[] = [];
      let paramCount = 1;

      if (query.decision) {
        sql += ` AND decision = $${paramCount++}`;
        params.push(query.decision);
      }

      if (query.service) {
        sql += ` AND service = $${paramCount++}`;
        params.push(query.service);
      }

      if (query.subject) {
        sql += ` AND subject_sub = $${paramCount++}`;
        params.push(query.subject);
      }

      if (query.path) {
        sql += ` AND path ILIKE $${paramCount++}`;
        params.push(`%${query.path}%`);
      }

      sql += ' ORDER BY timestamp DESC';
      
      if (query.limit) {
        sql += ` LIMIT $${paramCount++}`;
        params.push(parseInt(query.limit));
      }

      if (query.offset) {
        sql += ` OFFSET $${paramCount++}`;
        params.push(parseInt(query.offset));
      }

      const result = await database.query(sql, params);
      
      return {
        logs: result.rows.map(row => ({
          id: row.id,
          requestId: row.request_id,
          timestamp: row.timestamp,
          subjectSub: row.subject_sub,
          role: row.role,
          tenant: row.tenant,
          method: row.method,
          path: row.path,
          service: row.service,
          decision: row.decision,
          reason: row.reason,
          policyId: row.policy_id,
          latencyMs: row.latency_ms,
          statusCode: row.status_code,
          rateLimitInfo: row.rate_limit_info,
          ip: row.ip,
          userAgent: row.user_agent,
          error: row.error
        })),
        total: result.rows.length
      };
    } catch (error) {
      logger.error('Failed to fetch audit logs', error);
      reply.status(500);
      return { error: 'Failed to fetch audit logs' };
    }
  });

  // Get audit log by request ID
  fastify.get('/request/:requestId', async (request, reply) => {
    try {
      const { requestId } = request.params as { requestId: string };
      const result = await database.query(
        'SELECT * FROM audit_logs WHERE request_id = $1 ORDER BY timestamp DESC',
        [requestId]
      );
      
      return {
        logs: result.rows.map(row => ({
          id: row.id,
          requestId: row.request_id,
          timestamp: row.timestamp,
          subjectSub: row.subject_sub,
          role: row.role,
          tenant: row.tenant,
          method: row.method,
          path: row.path,
          service: row.service,
          decision: row.decision,
          reason: row.reason,
          policyId: row.policy_id,
          latencyMs: row.latency_ms,
          statusCode: row.status_code,
          rateLimitInfo: row.rate_limit_info,
          ip: row.ip,
          userAgent: row.user_agent,
          error: row.error
        }))
      };
    } catch (error) {
      logger.error('Failed to fetch audit log by request ID', error);
      reply.status(500);
      return { error: 'Failed to fetch audit log' };
    }
  });
}
