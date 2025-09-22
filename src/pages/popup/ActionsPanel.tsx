import React, { useState, useEffect } from 'react';
import { VulnerabilityPanel, Alert } from './VulnerabilityPanel';

// The API function to fetch all detailed alerts from ZAP
const fetchAlerts = async (host: string, apiKey: string): Promise<Alert[]> => {
  const url = new URL(`${host}/JSON/alert/view/alerts/`);
  url.searchParams.append('baseurl', '');
  url.searchParams.append('start', '0');
  url.searchParams.append('count', '0');

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'X-ZAP-API-Key': apiKey },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch alerts.');
  }
  const data = await response.json();
  return data.alerts;
};

export const ActionsPanel: React.FC<{ host: string; apiKey: string }> = ({ host, apiKey }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getAlerts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const alertsData = await fetchAlerts(host, apiKey);
        setAlerts(alertsData);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    getAlerts();
  }, [host, apiKey]);

  const renderContent = () => {
    if (isLoading) {
      return <p className="text-center text-gray-400 p-4">Loading alerts...</p>;
    }

    if (error) {
      return <p className="text-center text-red-500 p-4">Error: {error}</p>;
    }

    if (alerts.length > 0) {
      return <VulnerabilityPanel alerts={alerts} />;
    }

    return <p className="text-center text-gray-400 p-4">No alerts found.</p>;
  };

  return (
    <div className="font-sans w-80 h-[550px] bg-gray-900 text-white">
      {renderContent()}
    </div>
  );
};