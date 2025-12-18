// apps/control-plane/src/app/simulator/page.tsx
'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { DecisionRequest, DecisionResponse, JWTClaimsSchema, DecisionRequestSchema } from '@ztag/shared';
import { z } from 'zod';

const initialSubjectJson = JSON.stringify({
  sub: 'user123',
  email: 'user@example.com',
  role: 'user',
  tenant: 'default',
  scopes: ['read', 'write'],
  exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour from now
  iat: Math.floor(Date.now() / 1000),
}, null, 2);

const initialResourceContextJson = JSON.stringify({
  resource: {
    service: 'echo-service',
    path: '/echo/hello',
    method: 'GET',
  },
  context: {
    ip: '127.0.0.1',
    userAgent: 'Simulator',
    timestamp: new Date().toISOString(),
    requestId: 'sim-12345',
    tenant: 'default',
  },
}, null, 2);


export default function SimulatorPage() {
  const { token } = useAuth();
  const [subjectJson, setSubjectJson] = useState(initialSubjectJson);
  const [resourceContextJson, setResourceContextJson] = useState(initialResourceContextJson);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decisionResult, setDecisionResult] = useState<DecisionResponse | null>(null);

  const [subjectJsonError, setSubjectJsonError] = useState<string | null>(null);
  const [resourceContextJsonError, setResourceContextJsonError] = useState<string | null>(null);

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
    if (!token) {
      setError('Authentication token not found.');
      return;
    }

    setSubjectJsonError(null);
    setResourceContextJsonError(null);

    const subjErr = validateJson(subjectJson, JWTClaimsSchema);
    const rcErr = validateJson(resourceContextJson, DecisionRequestSchema.omit({subject: true})); // Omit subject as we parse it separately

    if (subjErr || rcErr) {
      setSubjectJsonError(subjErr);
      setResourceContextJsonError(rcErr);
      return;
    }

    setLoading(true);
    setError(null);
    setDecisionResult(null);

    try {
      const subject = JSON.parse(subjectJson);
      const { resource, context } = JSON.parse(resourceContextJson);

      const requestPayload: DecisionRequest = {
        subject,
        resource,
        context,
      };

      const result = await api.simulator.simulate(requestPayload, token);
      setDecisionResult(result);
    } catch (err) {
      setError((err as Error).message || 'Failed to simulate policy.');
      console.error('Error simulating policy:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Policy Simulator</h1>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md mb-6">
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}
        
        <div className="mb-4">
          <label htmlFor="subjectJson" className="block text-gray-700 text-sm font-bold mb-2">Subject (JWT Claims JSON):</label>
          <textarea
            id="subjectJson"
            value={subjectJson}
            onChange={(e) => setSubjectJson(e.target.value)}
            onBlur={() => setSubjectJsonError(validateJson(subjectJson, JWTClaimsSchema))}
            rows={10}
            className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${subjectJsonError ? 'border-red-500' : ''}`}
            required
          />
          {subjectJsonError && <p className="text-red-500 text-xs italic">{subjectJsonError}</p>}
        </div>

        <div className="mb-4">
          <label htmlFor="resourceContextJson" className="block text-gray-700 text-sm font-bold mb-2">Resource & Context (JSON):</label>
          <textarea
            id="resourceContextJson"
            value={resourceContextJson}
            onChange={(e) => setResourceContextJson(e.target.value)}
            onBlur={() => setResourceContextJsonError(validateJson(resourceContextJson, DecisionRequestSchema.omit({subject: true})))}
            rows={10}
            className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${resourceContextJsonError ? 'border-red-500' : ''}`}
            required
          />
          {resourceContextJsonError && <p className="text-red-500 text-xs italic">{resourceContextJsonError}</p>}
        </div>

        <div className="flex items-center justify-between">
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Simulating...' : 'Simulate Policy'}
          </button>
        </div>
      </form>

      {decisionResult && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-3">Simulation Result</h2>
          <div className="mb-2">
            <strong>Decision:</strong> <span className={`font-bold ${decisionResult.decision === 'ALLOW' ? 'text-green-600' : 'text-red-600'}`}>{decisionResult.decision}</span>
          </div>
          <div className="mb-2">
            <strong>Reason:</strong> {decisionResult.reason}
          </div>
          {decisionResult.policyId && (
            <div className="mb-2">
              <strong>Policy ID:</strong> {decisionResult.policyId}
            </div>
          )}
          {decisionResult.obligations && Object.keys(decisionResult.obligations).length > 0 && (
            <div className="mb-2">
              <strong>Obligations:</strong>
              <pre className="bg-gray-100 p-2 rounded text-sm mt-1 overflow-x-auto">{JSON.stringify(decisionResult.obligations, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
