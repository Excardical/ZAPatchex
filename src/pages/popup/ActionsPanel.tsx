import React, { useState, useEffect, useMemo, useRef } from 'react';
import { VulnerabilityPanel, GroupedAlert } from './VulnerabilityPanel';
import { DashboardPanel } from './DashboardPanel';

// --- CONFIGURATION ---
const INSTANT_BATCH_SIZE = 200;  // Tiny batch for immediate user feedback (0.5s load)
const REMAINING_BATCH_SIZE = 3000; // The rest of the limit
const MAX_INSTANCES_PER_ALERT = 80;

interface ActionsPanelProps {
  host: string;
  apiKey: string;
  onBackToScanner: () => void;
  cachedAlerts: GroupedAlert[];
  onUpdateAlerts: (alerts: GroupedAlert[]) => void;
  hasLoaded: boolean;
  onLoadComplete: () => void;
}

export const ActionsPanel: React.FC<ActionsPanelProps> = ({
  host, apiKey, onBackToScanner,
  cachedAlerts, onUpdateAlerts, hasLoaded, onLoadComplete
}) => {

  const [isLoading, setIsLoading] = useState(!hasLoaded);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<'linear' | 'dashboard'>('linear');
  const [selectedSite, setSelectedSite] = useState<string>('');

  const isMounted = useRef(false);
  // We use a local Ref to aggregate data before sending it up to parent to reduce re-renders
  const alertsMapRef = useRef<Map<string, GroupedAlert>>(new Map());

  // --- Initialize Map from Cache ---
  useEffect(() => {
    if (cachedAlerts.length > 0) {
      cachedAlerts.forEach(g => alertsMapRef.current.set(g.name, g));
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;

    // IF WE ALREADY HAVE DATA, DO NOT FETCH AGAIN
    if (hasLoaded) {
      setIsLoading(false);
      return;
    }

    const loadAlerts = async () => {
      setIsLoading(true);
      setError(null);
      alertsMapRef.current.clear(); // Start fresh

      try {
        // 1. Get Total Count (Optional, for UI stats)
        try {
          const countUrl = new URL(`${host}/JSON/core/view/numberOfAlerts/`);
          countUrl.searchParams.append('apikey', apiKey);
          const countRes = await fetch(countUrl.toString(), { headers: { 'X-ZAP-API-Key': apiKey } });
          if (countRes.ok) {
            const data = await countRes.json();
          }
        } catch (e) { console.warn(e); }

        // 2. INSTANT FETCH (First 50 items)
        // This makes the UI appear almost immediately
        await fetchAndProcessBatch(0, INSTANT_BATCH_SIZE);

        // Update Parent & UI immediately after small batch
        if (isMounted.current) {
          onUpdateAlerts(Array.from(alertsMapRef.current.values()));
          setIsLoading(false); // Spinner stops here!
          setIsFetchingMore(true); // Switch to "Streaming" indicator
        }

        // 3. BACKGROUND FETCH (The rest)
        // Now fetch the big chunk (up to 2500)
        await fetchAndProcessBatch(INSTANT_BATCH_SIZE, REMAINING_BATCH_SIZE);

        // Final Update
        if (isMounted.current) {
          onUpdateAlerts(Array.from(alertsMapRef.current.values()));
          onLoadComplete(); // Mark as fully loaded so we don't fetch again
        }

      } catch (err) {
        if (isMounted.current) {
          console.error(err);
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
          setIsFetchingMore(false);
        }
      }
    };

    loadAlerts();

    return () => { isMounted.current = false; };
  }, [host, apiKey, hasLoaded]); // Dependency ensures we don't run if already loaded

  // --- HELPER: Fetch & Process ---
  const fetchAndProcessBatch = async (start: number, count: number) => {
    const url = new URL(`${host}/JSON/alert/view/alerts/`);
    url.searchParams.append('start', start.toString());
    url.searchParams.append('count', count.toString());
    url.searchParams.append('apikey', apiKey);

    const res = await fetch(url.toString(), { headers: { 'X-ZAP-API-Key': apiKey } });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);

    const json = await res.json();
    const batch = json.alerts || [];

    // Aggregate
    batch.forEach((alert: any) => {
      const key = alert.alert || alert.name || 'Unknown Alert';

      if (!alertsMapRef.current.has(key)) {
        alertsMapRef.current.set(key, {
          name: key,
          description: alert.description,
          solution: alert.solution,
          risk: alert.risk,
          confidence: alert.confidence,
          cweid: alert.cweid,
          wascid: alert.wascid,
          pluginId: alert.pluginId,
          instances: [],
        } as any);
      }

      const group = alertsMapRef.current.get(key)!;

      // CAP INSTANCES
      if (group.instances.length < MAX_INSTANCES_PER_ALERT) {
        group.instances.push({
          url: alert.url,
          param: alert.param,
          evidence: alert.evidence,
        });
      }
    });
  };

  // MEMOIZATION
  const filteredAlerts = useMemo(() => {
    return cachedAlerts.filter(alert => {
      if (!selectedSite) return true;
      return alert.instances.some(instance => instance.url.startsWith(selectedSite));
    });
  }, [cachedAlerts, selectedSite]);

  const panelStyles = "font-sans w-[450px] h-[550px] bg-slate-900 text-slate-200 overflow-hidden relative";

  // Initial Loading (Only shows for the first 0.5 seconds)
  if (isLoading && cachedAlerts.length === 0) {
    return (
      <div className={`${panelStyles} flex flex-col items-center justify-center`}>
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400">Fetching results...</p>
      </div>
    );
  }

  if (error && cachedAlerts.length === 0) {
    return <div className={`${panelStyles} flex items-center justify-center`}><p className="text-red-400 p-4 text-center">Error loading results: <br />{error}</p></div>;
  }

  if (cachedAlerts.length === 0 && !isLoading && !isFetchingMore) {
    return (
      <div className={`${panelStyles} flex flex-col items-center justify-center p-4`}>
        <p className="text-slate-400 mb-4">No alerts found.</p>
        <button onClick={onBackToScanner} className="p-2 bg-slate-700 rounded text-white hover:bg-slate-600">Back</button>
      </div>
    );
  }

  return (
    <div className={`${panelStyles} flex flex-col`}>
      {viewMode === 'dashboard' ? (
        <DashboardPanel
          alerts={filteredAlerts}
          onViewList={() => setViewMode('linear')}
          host={host}
          apiKey={apiKey}
          selectedSite={selectedSite}
          onSiteSelect={setSelectedSite}
        />
      ) : (
        <VulnerabilityPanel
          alerts={filteredAlerts}
          onBackToScanner={onBackToScanner}
          onViewDashboard={() => setViewMode('dashboard')}
          host={host}
          apiKey={apiKey}
          selectedSite={selectedSite}
          onSiteSelect={setSelectedSite}
        />
      )}
    </div>
  );
};