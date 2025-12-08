import React, { useState, useEffect } from 'react';
import { VulnerabilityPanel, Alert, GroupedAlert } from './VulnerabilityPanel';
import { DashboardPanel } from './DashboardPanel';
import { generateHtmlReport } from '../../utils/zapApi';

const fetchAlerts = async (host: string, apiKey: string): Promise<Alert[]> => {
  const url = new URL(`${host}/JSON/alert/view/alerts/`);
  url.searchParams.append('baseurl', '');
  url.searchParams.append('start', '0');
  url.searchParams.append('count', '0');
  url.searchParams.append('apikey', apiKey);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'X-ZAP-API-Key': apiKey },
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
        pluginId: alert.pluginId,
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

  // VIEW STATE: Default is 'linear' as requested, but can toggle to dashboard
  const [viewMode, setViewMode] = useState<'linear' | 'dashboard'>('linear');

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
      setGroupedAlerts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { refreshAlerts(); }, [host, apiKey]);

  const handleDownloadReport = async () => {
    try {
      const blob = await generateHtmlReport(host, apiKey);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ZAP_Report_${new Date().toISOString().slice(0, 10)}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Failed to download report. Ensure ZAP is running.");
      console.error(e);
    }
  };

  // COMMON STYLES: Enforce strict width/height matching the Scanner Panel
  const panelStyles = "font-sans w-[450px] h-[550px] bg-slate-900 text-slate-200 overflow-hidden relative";

  if (isLoading) return <div className={`${panelStyles} flex items-center justify-center`}><p className="text-slate-400 p-4">Loading alerts...</p></div>;
  if (error) return <div className={`${panelStyles} flex items-center justify-center`}><p className="text-red-400 p-4">Error loading results: {error}</p></div>;

  if (groupedAlerts.length === 0) {
    return (
      <div className={`${panelStyles} flex flex-col items-center justify-center p-4`}>
        <p className="text-slate-400 mb-4">No alerts found.</p>
        <button onClick={onBackToScanner} className="p-2 bg-slate-700 rounded text-white">Back</button>
      </div>
    );
  }

  // VIEW ROUTING
  if (viewMode === 'dashboard') {
    return (
      <div className={panelStyles}>
        <DashboardPanel
          alerts={groupedAlerts}
          onViewList={() => setViewMode('linear')}
        />
      </div>
    );
  }

  // DEFAULT VIEW (Linear)
  return (
    <div className={`${panelStyles} flex flex-col`}>
      <VulnerabilityPanel
        alerts={groupedAlerts}
        onBackToScanner={onBackToScanner}
        onViewDashboard={() => setViewMode('dashboard')}
        host={host}
        apiKey={apiKey}
      />

      {/* Small floating action button for report */}
      <button
        onClick={handleDownloadReport}
        className="absolute bottom-16 right-4 w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center shadow-lg hover:bg-slate-600 border border-slate-500 z-10"
        title="Download HTML Report"
      >
        <span className="text-white text-lg">⬇</span>
      </button>
    </div>
  );
};