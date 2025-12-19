import type { AuditLog } from '@ztag/shared';
interface FindAuditsOptions {
    page?: number;
    limit?: number;
    decision?: 'ALLOW' | 'DENY';
    service?: string;
    path?: string;
    subjectSub?: string;
}
export declare class AuditRepository {
    static findAll(options?: FindAuditsOptions): Promise<{
        logs: AuditLog[];
        total: number;
    }>;
    static create(log: Omit<AuditLog, 'id'>): Promise<AuditLog>;
    private static mapToAuditLog;
}
export {};
//# sourceMappingURL=AuditRepository.d.ts.map