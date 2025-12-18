// apps/control-plane/src/app/policies/create/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PolicyForm } from '../../../components/PolicyForm';
import { api } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { Policy } from '@ztag/shared';

export default function CreatePolicyPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (policyData: Omit<Policy, 'id' | 'createdAt' | 'updatedAt' | 'version'>) => {
    if (!token) {
      setError('Authentication token not found.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.policies.create(policyData, token);
      alert('Policy created successfully!');
      router.push('/policies'); // Redirect to policies list
    } catch (err) {
      setError((err as Error).message || 'Failed to create policy.');
      console.error('Error creating policy:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Create New Policy</h1>
      <PolicyForm onSubmit={handleSubmit} loading={loading} error={error} />
    </div>
  );
}
