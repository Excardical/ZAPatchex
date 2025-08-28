import React, { useState, useEffect } from 'react';
import './ActionsPanel.css'; 

// Define the structure of the alerts summary data
interface AlertsSummary {
  High: number;
  Medium: number;
  Low: number;
  Informational: number;
}

// Props that this component receives from Popup.tsx
interface ActionsPanelProps {
  host: string;
  apiKey: string;
}

// API function to fetch the alerts summary from ZAP
const fetchAlertsSummary = async (host: string, apiKey: string): Promise<AlertsSummary> => {
  const url = new URL(`${host}/JSON/alert/view/alertsSummary/`);
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'X-ZAP-API-Key': apiKey },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch alerts summary.');
  }
  const data = await response.json();
  // The API returns an object with an "alertsSummary" key
  return data.alertsSummary;
};

export const ActionsPanel: React.FC<ActionsPanelProps> = ({ host, apiKey }) => {
  const [summary, setSummary] = useState<AlertsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // useEffect hook runs this code once when the component is first rendered
  useEffect(() => {
    const getSummary = async () => {
      try {
        const summaryData = await fetchAlertsSummary(host, apiKey);
        setSummary(summaryData);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    getSummary();
  }, [host, apiKey]); // Dependencies: re-run if host or apiKey change

  const renderContent = () => {
    if (isLoading) {
      return <p className="loading-text">Loading alert summary...</p>;
    }

    if (error) {
      return <p className="error-text">Error: {error}</p>;
    }

    if (summary) {
      return (
        <div className="summary-grid">
          <div className="risk-card risk-high">
            <div className="risk-count">{summary.High}</div>
            <div className="risk-label">High</div>
          </div>
          <div className="risk-card risk-medium">
            <div className="risk-count">{summary.Medium}</div>
            <div className="risk-label">Medium</div>
          </div>
          <div className="risk-card risk-low">
            <div className="risk-count">{summary.Low}</div>
            <div className="risk-label">Low</div>
          </div>
          <div className="risk-card risk-info">
            <div className="risk-count">{summary.Informational}</div>
            <div className="risk-label">Info</div>
          </div>
        </div>
      );
    }

    return null; // Should not happen, but good practice
  };

  return (
    <div className="actions-panel">
      <header className="actions-header">
        <h2>Alerts Summary</h2>
        <span className="status-indicator">● Connected</span>
      </header>
      <main className="actions-main">
        {renderContent()}
      </main>
    </div>
  );
};