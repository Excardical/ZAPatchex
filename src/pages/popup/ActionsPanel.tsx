import React, { useState, useEffect } from 'react';
import { VulnerabilityPanel, Alert, GroupedAlert } from './VulnerabilityPanel';

// The API function to fetch all detailed alerts from ZAP
const fetchAlerts = async (host: string, apiKey: string): Promise<Alert[]> => {
  const url = new URL(`${host}/JSON/alert/view/alerts/`);
  url.searchParams.append('baseurl', '');
  url.searchParams.append('start', '0');
  url.searchParams.append('count', '0');
  url.searchParams.append('apikey', apiKey);


  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'X-ZAP-API-Key': apiKey }, // Keep header too
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch alerts. Status: ${response.status}`);
  }
  const data = await response.json();
  return data.alerts;
};

const groupAlerts = (alerts: Alert[]): GroupedAlert[] => {
  const grouped = new Map<string, GroupedAlert>();

  alerts.forEach(alert => {
    const key = alert.name;
    if (!grouped.has(key)) {
      grouped.set(key, {
        name: alert.name,
        description: alert.description,
        solution: alert.solution,
        risk: alert.risk,
        confidence: alert.confidence,
        cweid: alert.cweid,
        wascid: alert.wascid,
        instances: [],
      });
    }
    grouped.get(key)!.instances.push({
      url: alert.url,
      param: alert.param,
      evidence: alert.evidence,
    });
  });

  return Array.from(grouped.values());
};


export const ActionsPanel: React.FC<{ host: string; apiKey: string; onBackToScanner?: () => void }> = ({ host, apiKey, onBackToScanner }) => {
  const [groupedAlerts, setGroupedAlerts] = useState<GroupedAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to refresh alerts
  const refreshAlerts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const rawAlerts = await fetchAlerts(host, apiKey);
        const groupedData = groupAlerts(rawAlerts);
        setGroupedAlerts(groupedData);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(message);
        setGroupedAlerts([]); // Clear alerts on error
      } finally {
        setIsLoading(false);
      }
    };

  // Fetch alerts on initial load
  useEffect(() => {
    refreshAlerts();
  }, [host, apiKey]);

  const renderContent = () => {
    if (isLoading) {
      return <div className="flex items-center justify-center h-full"><p className="text-slate-400 p-4">Loading alerts...</p></div>;
    }

    if (error) {
      return <div className="flex items-center justify-center h-full"><p className="text-red-400 p-4">Error loading results: {error}</p></div>;
    }

    if (groupedAlerts.length > 0) {
      return <VulnerabilityPanel alerts={groupedAlerts} onBackToScanner={onBackToScanner} />;
    }

    return <div className="flex items-center justify-center h-full"><p className="text-slate-400 p-4">No alerts found. Run a scan first.</p></div>;
  };

  return (
    <div className="font-sans w-[450px] h-[550px] bg-slate-900 text-slate-200">
      {renderContent()}
    </div>
  );
};