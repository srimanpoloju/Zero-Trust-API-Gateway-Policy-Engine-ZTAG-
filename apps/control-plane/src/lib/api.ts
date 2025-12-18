// apps/control-plane/src/lib/api.ts
import { Policy, DecisionRequest, DecisionResponse, AuditLog } from '@ztag/shared';

const POLICY_ENGINE_URL = process.env.NEXT_PUBLIC_POLICY_ENGINE_URL || 'http://localhost:4000';

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const api = {
  // Policies API
  policies: {
    getAll: async (token: string): Promise<Policy[]> => {
      const response = await fetch(`${POLICY_ENGINE_URL}/policies`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch policies: ${response.statusText}`);
      }
      return response.json();
    },

    getById: async (id: string, token: string): Promise<Policy> => {
      const response = await fetch(`${POLICY_ENGINE_URL}/policies/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch policy: ${response.statusText}`);
      }
      return response.json();
    },

    create: async (policy: Omit<Policy, 'id' | 'createdAt' | 'updatedAt'>, token: string): Promise<Policy> => {
      const response = await fetch(`${POLICY_ENGINE_URL}/policies`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(policy),
      });
      if (!response.ok) {
        throw new Error(`Failed to create policy: ${response.statusText}`);
      }
      return response.json();
    },

    update: async (id: string, policy: Partial<Omit<Policy, 'id' | 'createdAt' | 'updatedAt'>>, token: string): Promise<Policy> => {
      const response = await fetch(`${POLICY_ENGINE_URL}/policies/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(policy),
      });
      if (!response.ok) {
        throw new Error(`Failed to update policy: ${response.statusText}`);
      }
      return response.json();
    },

    delete: async (id: string, token: string): Promise<void> => {
      const response = await fetch(`${POLICY_ENGINE_URL}/policies/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to delete policy: ${response.statusText}`);
      }
    },
  },

  // Audit Logs API
  audits: {
    getAll: async (token: string, params?: { page?: number; limit?: number; decision?: 'ALLOW' | 'DENY'; service?: string; path?: string; subjectSub?: string }): Promise<PaginatedResponse<AuditLog>> => {
      const query = new URLSearchParams();
      if (params?.page) query.append('page', params.page.toString());
      if (params?.limit) query.append('limit', params.limit.toString());
      if (params?.decision) query.append('decision', params.decision);
      if (params?.service) query.append('service', params.service);
      if (params?.path) query.append('path', params.path);
      if (params?.subjectSub) query.append('subjectSub', params.subjectSub);

      const response = await fetch(`${POLICY_ENGINE_URL}/audits?${query.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch audit logs: ${response.statusText}`);
      }
      return response.json();
    },
  },

  // Simulator API
  simulator: {
    simulate: async (request: DecisionRequest, token: string): Promise<DecisionResponse> => {
      const response = await fetch(`${POLICY_ENGINE_URL}/evaluate/simulate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });
      if (!response.ok) {
        throw new Error(`Failed to simulate policy: ${response.statusText}`);
      }
      return response.json();
    },
  },

  // Login API (conceptual for demo)
  auth: {
    // In a real app, this would call an auth service.
    // For this demo, we'll just return a mock token/email.
    login: async (email: string, password: string): Promise<{ token: string; email: string }> => {
      // Dummy validation for demo
      if (email === 'admin@ztag.com' && password === 'password') {
        // This token is NOT real, it's a placeholder.
        // In a real scenario, this would come from a secure auth service.
        const demoToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbi11c2VyLWlkIiwiZW1haWwiOiJhZG1pbkB6dGFnLmNvbSIsInJvbGUiOiJhZG1pbiIsInRlbmFudCI6ImRlZmF1bHQiLCJzY29wZXMiOlsiKiJdLCJpYXQiOjE2NzgyODcyMDAsImV4cCI6MTk5MzY0ODAwMH0.YOUR_DEMO_JWT_SECRET_HERE';
        return { token: demoToken, email };
      }
      throw new Error('Invalid credentials');
    },
  },
};
