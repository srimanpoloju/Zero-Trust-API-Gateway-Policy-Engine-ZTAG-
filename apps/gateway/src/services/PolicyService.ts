import { config } from '../config';
import type { DecisionRequest, DecisionResponse } from '@ztag/shared';

export class PolicyService {
  static async evaluate(request: DecisionRequest): Promise<DecisionResponse> {
    try {
      const response = await fetch(`${config.policyEngineUrl}/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`Policy engine responded with status ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to evaluate policy:', error);
      // In case of error, deny for security
      return {
        decision: 'DENY',
        reason: `Policy evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        obligations: {}
      };
    }
  }
}
