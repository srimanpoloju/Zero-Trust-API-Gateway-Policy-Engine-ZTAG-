import type { DecisionRequest, DecisionResponse } from '@ztag/shared';
/**
 * The core of the policy engine. It evaluates incoming requests against the policy set.
 */
export declare class PolicyService {
    /**
     * Helper to build a DecisionResponse with obligations always present.
     */
    private static makeDecisionResponse;
    /**
     * Main evaluation entry point.
     * Orchestrates fetching policies and evaluating them in order.
     */
    static evaluate(request: DecisionRequest): Promise<DecisionResponse>;
    /**
     * Evaluates the 'denyIf' and 'allowIf' rules for a single policy.
     * Deny rules are always evaluated first and take precedence.
     */
    private static evaluatePolicyRules;
    /**
     * Checks if any set of conditions in a list matches the request.
     * Used for 'allowIf' and 'denyIf' which can be arrays of condition sets.
     */
    private static anyConditionsMatch;
    /**
     * Checks if all conditions in a given set match the request.
     */
    private static allConditionsMatch;
    /**
     * Evaluates a single condition against the request context.
     */
    private static evaluateCondition;
    /**
     * Safely retrieves a nested value from an object based on a dot-notation path.
     * e.g., getNestedValue(request, 'subject.role') -> request.subject.role
     */
    private static getNestedValue;
}
//# sourceMappingURL=PolicyService.d.ts.map