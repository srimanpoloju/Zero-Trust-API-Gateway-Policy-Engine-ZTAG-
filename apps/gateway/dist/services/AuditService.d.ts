import { AuditLog } from '@ztag/shared';
/**
 * Service for handling audit log creation in the Gateway.
 * It writes audit logs directly to the Postgres database.
 */
export declare class AuditService {
    static recordAudit(auditLog: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void>;
}
//# sourceMappingURL=AuditService.d.ts.map