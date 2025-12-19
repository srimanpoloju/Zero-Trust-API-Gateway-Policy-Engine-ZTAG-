import type { AuditLog } from '@ztag/shared';
export declare class AuditRepository {
    /**
     * Creates a new audit log entry in the database.
     * @param log The audit log data.
     */
    static create(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog>;
    /**
     * Maps a raw database row to a structured AuditLog object.
     * @param row The raw row from the 'pg' driver.
     * @returns An AuditLog object.
     */
    private static mapToAuditLog;
}
//# sourceMappingURL=AuditRepository.d.ts.map