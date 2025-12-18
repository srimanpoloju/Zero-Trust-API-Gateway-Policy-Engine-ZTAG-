// apps/control-plane/src/components/PolicyForm.tsx
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Policy, PolicyMatchConditionsSchema, PolicyRulesSchema, PolicyObligationSchema } from '@ztag/shared';
import { z } from 'zod';

interface PolicyFormProps {
  initialData?: Policy;
  onSubmit: (policy: Omit<Policy, 'id' | 'createdAt' | 'updatedAt' | 'version'>) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function PolicyForm({ initialData, onSubmit, loading, error }: PolicyFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialData?.name || '');
  const [enabled, setEnabled] = useState(initialData?.enabled ?? true);
  const [priority, setPriority] = useState(initialData?.priority || 100);
  const [matchConditions, setMatchConditions] = useState(JSON.stringify(initialData?.matchConditions || { service: '', pathPattern: '', methods: ['*'] }, null, 2));
  const [rules, setRules] = useState(JSON.stringify(initialData?.rules || { allowIf: [] }, null, 2));
  const [obligations, setObligations] = useState(JSON.stringify(initialData?.obligations || {}, null, 2));

  const [matchConditionsError, setMatchConditionsError] = useState<string | null>(null);
  const [rulesError, setRulesError] = useState<string | null>(null);
  const [obligationsError, setObligationsError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setEnabled(initialData.enabled);
      setPriority(initialData.priority);
      setMatchConditions(JSON.stringify(initialData.matchConditions, null, 2));
      setRules(JSON.stringify(initialData.rules, null, 2));
      setObligations(JSON.stringify(initialData.obligations || {}, null, 2));
    }
  }, [initialData]);

  const validateJson = (jsonString: string, schema: z.ZodSchema<any>) => {
    try {
      const parsed = JSON.parse(jsonString);
      schema.parse(parsed);
      return null;
    } catch (e: any) {
      if (e instanceof SyntaxError) {
        return `Invalid JSON: ${e.message}`;
      }
      if (e instanceof z.ZodError) {
        return `Validation Error: ${e.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ')}`;
      }
      return 'Unknown validation error';
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    setMatchConditionsError(null);
    setRulesError(null);
    setObligationsError(null);

    const mcErr = validateJson(matchConditions, PolicyMatchConditionsSchema);
    const rErr = validateJson(rules, PolicyRulesSchema);
    const obErr = validateJson(obligations, PolicyObligationSchema);

    if (mcErr || rErr || obErr) {
      setMatchConditionsError(mcErr);
      setRulesError(rErr);
      setObligationsError(obErr);
      return;
    }

    const policyData = {
      name,
      enabled,
      priority,
      matchConditions: JSON.parse(matchConditions),
      rules: JSON.parse(rules),
      obligations: JSON.parse(obligations),
    };

    await onSubmit(policyData);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}

      <div className="mb-4">
        <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">Policy Name:</label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          required
        />
      </div>

      <div className="mb-4">
        <label htmlFor="priority" className="block text-gray-700 text-sm font-bold mb-2">Priority (higher wins):</label>
        <input
          type="number"
          id="priority"
          value={priority}
          onChange={(e) => setPriority(parseInt(e.target.value))}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          required
        />
      </div>

      <div className="mb-4 flex items-center">
        <input
          type="checkbox"
          id="enabled"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="mr-2 leading-tight"
        />
        <label htmlFor="enabled" className="text-sm">Enabled</label>
      </div>

      <div className="mb-4">
        <label htmlFor="matchConditions" className="block text-gray-700 text-sm font-bold mb-2">Match Conditions (JSON):</label>
        <textarea
          id="matchConditions"
          value={matchConditions}
          onChange={(e) => setMatchConditions(e.target.value)}
          onBlur={() => setMatchConditionsError(validateJson(matchConditions, PolicyMatchConditionsSchema))}
          rows={8}
          className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${matchConditionsError ? 'border-red-500' : ''}`}
          required
        />
        {matchConditionsError && <p className="text-red-500 text-xs italic">{matchConditionsError}</p>}
      </div>

      <div className="mb-4">
        <label htmlFor="rules" className="block text-gray-700 text-sm font-bold mb-2">Rules (JSON: allowIf/denyIf):</label>
        <textarea
          id="rules"
          value={rules}
          onChange={(e) => setRules(e.target.value)}
          onBlur={() => setRulesError(validateJson(rules, PolicyRulesSchema))}
          rows={8}
          className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${rulesError ? 'border-red-500' : ''}`}
          required
        />
        {rulesError && <p className="text-red-500 text-xs italic">{rulesError}</p>}
      </div>

      <div className="mb-4">
        <label htmlFor="obligations" className="block text-gray-700 text-sm font-bold mb-2">Obligations (JSON, optional):</label>
        <textarea
          id="obligations"
          value={obligations}
          onChange={(e) => setObligations(e.target.value)}
          onBlur={() => setObligationsError(validateJson(obligations, PolicyObligationSchema))}
          rows={8}
          className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${obligationsError ? 'border-red-500' : ''}`}
        />
        {obligationsError && <p className="text-red-500 text-xs italic">{obligationsError}</p>}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Policy'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
          disabled={loading}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
