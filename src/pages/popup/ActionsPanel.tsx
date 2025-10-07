import React, { useState, useEffect } from 'react';
import { VulnerabilityPanel, Alert, GroupedAlert } from './VulnerabilityPanel'; 

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

const groupAlerts = (alerts: Alert[]): GroupedAlert[] => {
  const grouped = new Map<string, GroupedAlert>();

  alerts.forEach(alert => {
    const key = alert.name;
    if (!grouped.has(key)) {
      // If this is the first time we see this alert type, create a new group
      grouped.set(key, {
        name: alert.name,
        description: alert.description,
        solution: alert.solution,
        risk: alert.risk,
        confidence: alert.confidence,
        cweid: alert.cweid,
        wascid: alert.wascid,
        instances: [], // Initialize with an empty array of instances
      });
    }

    // Add the current alert's details as an "instance" to its group
    grouped.get(key)!.instances.push({
      url: alert.url,
      param: alert.param,
      evidence: alert.evidence,
    });
  });

  return Array.from(grouped.values());
};


export const ActionsPanel: React.FC<{ host: string; apiKey: string }> = ({ host, apiKey }) => {
  const [groupedAlerts, setGroupedAlerts] = useState<GroupedAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getAlerts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const rawAlerts = await fetchAlerts(host, apiKey);
        const groupedData = groupAlerts(rawAlerts);
        setGroupedAlerts(groupedData);
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
      return <div className="flex items-center justify-center h-full"><p className="text-slate-400 p-4">Loading alerts...</p></div>;
    }

    if (error) {
      return <div className="flex items-center justify-center h-full"><p className="text-red-400 p-4">Error: {error}</p></div>;
    }

    if (groupedAlerts.length > 0) {
      return <VulnerabilityPanel alerts={groupedAlerts} />;
    }

    return <div className="flex items-center justify-center h-full"><p className="text-slate-400 p-4">No alerts found.</p></div>;
  };

  return (
    <div className="font-sans w-[450px] h-[550px] bg-slate-900 text-slate-200">
      {renderContent()}
    </div>
  );
};