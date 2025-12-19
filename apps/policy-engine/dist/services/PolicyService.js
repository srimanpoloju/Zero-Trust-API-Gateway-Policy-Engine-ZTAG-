import { PolicyRepository } from '../database/PolicyRepository';
import { logger } from '../utils/logger';
/**
 * The core of the policy engine. It evaluates incoming requests against the policy set.
 */
export class PolicyService {
    /**
     * Helper to build a DecisionResponse with obligations always present.
     */
    static makeDecisionResponse(params) {
        return {
            decision: params.decision,
            reason: params.reason,
            policyId: params.policyId,
            obligations: params.obligations ?? {},
        };
    }
    /**
     * Main evaluation entry point.
     * Orchestrates fetching policies and evaluating them in order.
     */
    static async evaluate(request) {
        logger.info({ requestId: request.context.requestId, resource: request.resource }, 'Starting policy evaluation');
        try {
            const policies = await PolicyRepository.findMatchingPolicies(request.resource.service, request.resource.path, request.resource.method, request.context.tenant);
            if (policies.length === 0) {
                logger.warn({ requestId: request.context.requestId }, 'No matching policy found');
                return this.makeDecisionResponse({
                    decision: 'DENY',
                    reason: 'No matching policy found',
                });
            }
            logger.info({ requestId: request.context.requestId, count: policies.length }, 'Found candidate policies');
            // Evaluate policies in order of priority
            for (const policy of policies) {
                const { result, reason } = this.evaluatePolicyRules(request, policy);
                if (result !== 'SKIP') {
                    logger.info({ requestId: request.context.requestId, policyId: policy.id, decision: result }, `Decision reached by policy: ${policy.name}`);
                    return this.makeDecisionResponse({
                        decision: result,
                        reason: reason || `Decision by policy: ${policy.name}`,
                        policyId: policy.id,
                        obligations: policy.obligations || {},
                    });
                }
            }
            logger.warn({ requestId: request.context.requestId }, 'All matching policies were inconclusive');
            return this.makeDecisionResponse({
                decision: 'DENY',
                reason: 'No policy rule produced an explicit decision',
            });
        }
        catch (error) {
            logger.error({ requestId: request.context.requestId, error }, 'An error occurred during policy evaluation');
            return this.makeDecisionResponse({
                decision: 'DENY',
                reason: `Policy evaluation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            });
        }
    }
    /**
     * Evaluates the 'denyIf' and 'allowIf' rules for a single policy.
     * Deny rules are always evaluated first and take precedence.
     */
    static evaluatePolicyRules(request, policy) {
        const { rules } = policy;
        // 1. Check deny rules first
        if (rules.denyIf && rules.denyIf.length > 0) {
            if (this.anyConditionsMatch(request, rules.denyIf)) {
                return { result: 'DENY', reason: `Denied by policy: ${policy.name}` };
            }
        }
        // 2. Check allow rules if no deny rule matched
        if (rules.allowIf && rules.allowIf.length > 0) {
            if (this.anyConditionsMatch(request, rules.allowIf)) {
                return { result: 'ALLOW', reason: `Allowed by policy: ${policy.name}` };
            }
        }
        // 3. If no rules produced a decision, skip to the next policy
        return { result: 'SKIP' };
    }
    /**
     * Checks if any set of conditions in a list matches the request.
     * Used for 'allowIf' and 'denyIf' which can be arrays of condition sets.
     */
    static anyConditionsMatch(request, conditionSets) {
        // In our simplified model, we treat this as a single set of AND conditions.
        // For a more complex engine, this could be an array of arrays (OR of ANDs).
        return this.allConditionsMatch(request, conditionSets);
    }
    /**
     * Checks if all conditions in a given set match the request.
     */
    static allConditionsMatch(request, conditions) {
        if (!conditions || conditions.length === 0) {
            return true; // An empty rule set is considered a match
        }
        return conditions.every((condition) => this.evaluateCondition(request, condition));
    }
    /**
     * Evaluates a single condition against the request context.
     */
    static evaluateCondition(request, condition) {
        const { field, operator, value } = condition;
        const actualValue = this.getNestedValue(request, field);
        if (actualValue === undefined || actualValue === null) {
            return operator === 'neq' || operator === 'not_in';
        }
        switch (operator) {
            case 'eq':
                return actualValue == value;
            case 'neq':
                return actualValue != value;
            case 'in':
                return Array.isArray(value) && value.includes(actualValue);
            case 'not_in':
                return Array.isArray(value) && !value.includes(actualValue);
            case 'contains':
                return Array.isArray(actualValue) && actualValue.includes(value);
            case 'starts_with':
                return typeof actualValue === 'string' && typeof value === 'string' && actualValue.startsWith(value);
            case 'ends_with':
                return typeof actualValue === 'string' && typeof value === 'string' && actualValue.endsWith(value);
            case 'gt':
                return typeof actualValue === 'number' && typeof value === 'number' && actualValue > value;
            case 'lt':
                return typeof actualValue === 'number' && typeof value === 'number' && actualValue < value;
            case 'gte':
                return typeof actualValue === 'number' && typeof value === 'number' && actualValue >= value;
            case 'lte':
                return typeof actualValue === 'number' && typeof value === 'number' && actualValue <= value;
            default:
                logger.warn({ condition }, 'Unsupported operator in policy condition');
                return false;
        }
    }
    /**
     * Safely retrieves a nested value from an object based on a dot-notation path.
     * e.g., getNestedValue(request, 'subject.role') -> request.subject.role
     */
    static getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => (current ? current[key] : undefined), obj);
    }
}
//# sourceMappingURL=PolicyService.js.map