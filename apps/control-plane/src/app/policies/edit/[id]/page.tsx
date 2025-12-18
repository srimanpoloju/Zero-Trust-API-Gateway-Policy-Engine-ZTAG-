// apps/control-plane/src/app/policies/edit/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PolicyForm } from '../../../components/PolicyForm';
import { api } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { Policy } from '@ztag/shared';

export default function EditPolicyPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const policyId = id as string;

  const { token } = useAuth();
  const [initialPolicyData, setInitialPolicyData] = useState<Policy | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPolicy = async () => {
      if (!policyId || !token) {
        setError('Policy ID or authentication token not found.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const fetchedPolicy = await api.policies.getById(policyId, token);
        setInitialPolicyData(fetchedPolicy);
      } catch (err) {
        setError((err as Error).message || 'Failed to fetch policy.');
        console.error('Error fetching policy:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPolicy();
  }, [policyId, token]);

  const handleSubmit = async (policyData: Omit<Policy, 'id' | 'createdAt' | 'updatedAt' | 'version'>) => {
    if (!token || !policyId) {
      setError('Policy ID or authentication token not found.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.policies.update(policyId, policyData, token);
      alert('Policy updated successfully!');
      router.push('/policies'); // Redirect to policies list
    } catch (err) {
      setError((err as Error).message || 'Failed to update policy.');
      console.error('Error updating policy:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading policy...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">Error: {error}</div>;
  }

  if (!initialPolicyData) {
    return <div className="text-center py-8 text-gray-700">Policy not found.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Edit Policy: {initialPolicyData.name}</h1>
      <PolicyForm initialData={initialPolicyData} onSubmit={handleSubmit} loading={loading} error={error} />
    </div>
  );
}
