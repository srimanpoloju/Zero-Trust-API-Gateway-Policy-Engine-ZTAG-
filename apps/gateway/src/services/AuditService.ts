import { AuditRepository } from '../database/AuditRepository';
import { logger } from '../utils/logger';
import { AuditLog } from '@ztag/shared';

/**
 * Service for handling audit log creation in the Gateway.
 * It writes audit logs directly to the Postgres database.
 */
export class AuditService {
  static async recordAudit(auditLog: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    try {
      await AuditRepository.create(auditLog);
      logger.debug({ requestId: auditLog.requestId }, 'Audit log recorded successfully to Postgres');
    } catch (error) {
      logger.error({ err: error, auditLog }, 'Failed to record audit log to Postgres');
    }
  }
}
