import type { Policy } from '@ztag/shared';
export declare class PolicyRepository {
    static findMatchingPolicies(service: string, path: string, method: string, tenant?: string): Promise<Policy[]>;
    static findAll(): Promise<Policy[]>;
    static findById(id: string): Promise<Policy | null>;
    static create(policy: Omit<Policy, 'id' | 'createdAt' | 'updatedAt'>): Promise<Policy>;
    static update(id: string, updates: Partial<Omit<Policy, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Policy | null>;
    static delete(id: string): Promise<boolean>;
    private static matchesPath;
    private static mapToPolicy;
}
//# sourceMappingURL=PolicyRepository.d.ts.map