import { PolicyRepository } from '../database/PolicyRepository';
import type { Policy, DecisionRequest, DecisionResponse } from '@ztag/shared';

export class PolicyService {
  static async evaluate(request: DecisionRequest): Promise<DecisionResponse> {
    try {
      // Find matching policies
      const policies = await PolicyRepository.findMatchingPolicies(
        request.resource.service,
        request.resource.path,
        request.resource.method,
        request.context.tenant
      );

      // If no policies match, default to DENY (zero-trust)
      if (policies.length === 0) {
        return {
          decision: 'DENY',
          reason: 'No matching policy found - default deny',
          obligations: {}
        };
      }

      // Evaluate policies by priority (highest first)
      for (const policy of policies) {
        const decision = this.evaluatePolicy(request, policy);
        
        if (decision.decision !== 'SKIP') {
          return decision;
        }
      }

      // If all policies returned SKIP, deny by default
      return {
        decision: 'DENY',
        reason: 'No policy condition matched',
        obligations: {}
      };
    } catch (error) {
      // In case of error, deny for security
      return {
        decision: 'DENY',
        reason: `Policy evaluation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        obligations: {}
      };
    }
  }

  private static evaluatePolicy(request: DecisionRequest, policy: Policy): DecisionResponse {
    try {
      // Evaluate each rule in the policy
      for (const rule of policy.rules) {
        const conditionsMatch = this.evaluateConditions(request, rule.conditions);
        
        if (conditionsMatch) {
          return {
            decision: rule.action.toUpperCase() as 'ALLOW' | 'DENY',
            reason: `Policy "${policy.name}" matched - ${rule.action} by rule`,
            policyId: policy.id,
            obligations: policy.obligations
          };
        }
      }

      // No rule conditions matched
      return {
        decision: 'SKIP',
        reason: 'Rule conditions not matched',
        policyId: policy.id
      };
    } catch (error) {
      return {
        decision: 'DENY',
        reason: `Policy evaluation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        policyId: policy.id
      };
    }
  }

  private static evaluateConditions(request: DecisionRequest, conditions: any[]): boolean {
    if (conditions.length === 0) {
      return true; // Empty conditions always match
    }

    return conditions.every(condition => this.evaluateCondition(request, condition));
  }

  private static evaluateCondition(request: DecisionRequest, condition: any): boolean {
    const { field, operator, value } = condition;
    const fieldValue = this.getNestedValue(request, field);

    switch (operator) {
      case 'equals':
        return fieldValue === value;
      case 'not_equals':
        return fieldValue !== value;
      case 'in':
        return Array.isArray(value) && value.includes(fieldValue);
      case 'not_in':
        return Array.isArray(value) && !value.includes(fieldValue);
      case 'contains':
        return Array.isArray(fieldValue) && value && fieldValue.includes(value);
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;
      case 'not_exists':
        return fieldValue === undefined || fieldValue === null;
      default:
        return false;
    }
  }

  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}
