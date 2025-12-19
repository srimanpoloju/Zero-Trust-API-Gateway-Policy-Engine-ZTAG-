import { AuditRepository } from '../database/AuditRepository';
import { logger } from '../utils/logger';
/**
 * Service for handling audit log creation in the Gateway.
 * It writes audit logs directly to the Postgres database.
 */
export class AuditService {
    static async recordAudit(auditLog) {
        try {
            await AuditRepository.create(auditLog);
            logger.debug({ requestId: auditLog.requestId }, 'Audit log recorded successfully to Postgres');
        }
        catch (error) {
            logger.error({ err: error, auditLog }, 'Failed to record audit log to Postgres');
        }
    }
}
//# sourceMappingURL=AuditService.js.map