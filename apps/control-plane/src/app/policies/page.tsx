// apps/control-plane/src/app/policies/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Policy } from '@ztag/shared';

export default function PoliciesPage() {
  const { token } = useAuth(); // Assuming useAuth provides a way to get the token
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPolicies = async () => {
    if (!token) {
      setError('Authentication token not found.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fetchedPolicies = await api.policies.getAll(token);
      setPolicies(fetchedPolicies);
    } catch (err) {
      setError((err as Error).message || 'Failed to fetch policies.');
      console.error('Error fetching policies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, [token]);

  const handleDelete = async (policyId: string) => {
    if (!token) {
      alert('Authentication token not found.');
      return;
    }
    if (window.confirm('Are you sure you want to delete this policy?')) {
      try {
        await api.policies.delete(policyId, token);
        alert('Policy deleted successfully!');
        fetchPolicies(); // Re-fetch policies after deletion
      } catch (err) {
        alert(`Failed to delete policy: ${(err as Error).message}`);
        console.error('Error deleting policy:', err);
      }
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading policies...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Policies</h1>
      <div className="flex justify-end mb-4">
        <Link href="/policies/create" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Create New Policy
        </Link>
      </div>

      {policies.length === 0 ? (
        <p className="text-gray-700">No policies found. Create one to get started!</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300 rounded-lg shadow-sm">
            <thead>
              <tr className="bg-gray-100 text-left text-gray-600 uppercase text-sm leading-normal">
                <th className="py-3 px-6 border-b">Name</th>
                <th className="py-3 px-6 border-b">Enabled</th>
                <th className="py-3 px-6 border-b">Priority</th>
                <th className="py-3 px-6 border-b">Service</th>
                <th className="py-3 px-6 border-b">Path Pattern</th>
                <th className="py-3 px-6 border-b">Methods</th>
                <th className="py-3 px-6 border-b">Actions</th>
              </tr>
            </thead>
            <tbody className="text-gray-700 text-sm">
              {policies.map((policy) => (
                <tr key={policy.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-3 px-6 whitespace-nowrap">{policy.name}</td>
                  <td className="py-3 px-6">{policy.enabled ? 'Yes' : 'No'}</td>
                  <td className="py-3 px-6">{policy.priority}</td>
                  <td className="py-3 px-6">{policy.matchConditions.service}</td>
                  <td className="py-3 px-6">{policy.matchConditions.pathPattern}</td>
                  <td className="py-3 px-6">{policy.matchConditions.methods.join(', ')}</td>
                  <td className="py-3 px-6 flex space-x-2">
                    <Link
                      href={`/policies/edit/${policy.id}`}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white py-1 px-3 rounded text-xs"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(policy.id)}
                      className="bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded text-xs"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
