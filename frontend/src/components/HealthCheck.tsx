'use client';

import { useState, useEffect } from 'react';
import { buildApiUrl } from '../utils/api';

export default function HealthCheck() {
  const [status, setStatus] = useState<string>('Checking...');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(buildApiUrl('/health'));
        if (response.ok) {
          const data = await response.json();
          setStatus(`Backend is healthy: ${JSON.stringify(data)}`);
        } else {
          setStatus(`Backend responded with status: ${response.status}`);
        }
      } catch (err) {
        setError(`Failed to connect to backend: ${err}`);
        setStatus('Backend connection failed');
      }
    };

    checkHealth();
  }, []);

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="font-bold mb-2">Backend Health Check</h3>
      <p className="text-sm">Status: {status}</p>
      {error && <p className="text-sm text-red-600">Error: {error}</p>}
      <p className="text-xs mt-2">API URL: {buildApiUrl('/health')}</p>
    </div>
  );
} 