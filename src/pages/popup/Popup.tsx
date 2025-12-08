import React, { useState, useEffect } from 'react';
import { ZAPScannerPanel } from './ZAPScannerPanel';
import { VulnerabilityPanel, GroupedAlert, Alert } from './VulnerabilityPanel';
import { DashboardPanel } from './DashboardPanel';
import Browser from 'webextension-polyfill';

const Popup = () => {
  const [host, setHost] = useState<string>('http://localhost:8080');
  const [apiKey, setApiKey] = useState<string>('12345');
  const [view, setView] = useState<'scanner' | 'dashboard' | 'list'>('scanner');
  const [alerts, setAlerts] = useState<GroupedAlert[]>([]);

  // SHARED STATE: Site Filtering
  const [selectedSite, setSelectedSite] = useState<string>('');

  useEffect(() => {
    // Load saved settings
    Browser.storage.local.get(['zapHost', 'zapApiKey']).then((res) => {
      if (res.zapHost) setHost(res.zapHost);
      if (res.zapApiKey) setApiKey(res.zapApiKey);
    });
  }, []);

  const handleScanComplete = async () => {
    try {
      const response = await fetch(`${host}/JSON/alert/view/alerts/?apikey=${apiKey}&baseurl=&start=&count=`);
      const data = await response.json();
      const rawAlerts: Alert[] = data.alerts;

      // Group alerts by name
      const grouped: GroupedAlert[] = [];
      const map = new Map<string, GroupedAlert>();

      rawAlerts.forEach(a => {
        if (map.has(a.name)) {
          map.get(a.name)!.instances.push({ url: a.url, param: a.param, evidence: a.evidence });
        } else {
          const newGroup: GroupedAlert = {
            ...a,
            instances: [{ url: a.url, param: a.param, evidence: a.evidence }]
          };
          map.set(a.name, newGroup);
          grouped.push(newGroup);
        }
      });

      // Sort by risk
      const riskOrder = { 'High': 3, 'Medium': 2, 'Low': 1, 'Informational': 0 };
      grouped.sort((a, b) => (riskOrder[b.risk] || 0) - (riskOrder[a.risk] || 0));

      setAlerts(grouped);
      setView('dashboard');
    } catch (error) {
      console.error("Failed to fetch alerts:", error);
    }
  };

  // --- FILTERING LOGIC ---
  const filteredAlerts = alerts.map(group => {
    // If no site selected, return group as is
    if (!selectedSite) return group;

    // Filter instances that match the selected site
    const matchingInstances = group.instances.filter(i => i.url.startsWith(selectedSite));

    // Return group with ONLY matching instances
    return {
      ...group,
      instances: matchingInstances
    };
  }).filter(group => group.instances.length > 0); // Remove groups that have 0 instances for this site

  return (
    <div className="w-[450px] h-[600px] overflow-hidden">
      {view === 'scanner' && (
        <ZAPScannerPanel host={host} apiKey={apiKey} onScanComplete={handleScanComplete} />
      )}

      {view === 'dashboard' && (
        <DashboardPanel
          alerts={filteredAlerts} // Pass filtered data
          onViewList={() => setView('list')}
          host={host}
          apiKey={apiKey}
          selectedSite={selectedSite}
          onSiteSelect={setSelectedSite} // Pass control to child
        />
      )}

      {view === 'list' && (
        <VulnerabilityPanel
          alerts={filteredAlerts} // Pass filtered data
          onBackToScanner={() => setView('scanner')}
          onViewDashboard={() => setView('dashboard')}
          host={host}
          apiKey={apiKey}
          selectedSite={selectedSite}     // Pass state
          onSiteSelect={setSelectedSite}  // Pass control
        />
      )}
    </div>
  );
};

export default Popup;
