import React, { useState, useEffect, useMemo, useRef, Component, ErrorInfo, ReactNode } from 'react';
import { VulnerabilityPanel, GroupedAlert } from './VulnerabilityPanel';
import { DashboardPanel } from './DashboardPanel';

// --- CONFIGURATION ---
const INSTANT_BATCH_SIZE = 200;
const REMAINING_BATCH_SIZE = 3000;
const MAX_INSTANCES_PER_ALERT = 80;

// --- 1. NEW: Error Boundary Component ---
class SafeView extends Component<{ children: ReactNode, onReset: () => void }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Critical Error in ActionsPanel:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="w-full h-full flex flex-col items-center justify-center p-6 bg-slate-900 text-slate-200 text-center overflow-hidden"
          style={{ scrollbarWidth: 'none' }}
        >
          <div className="text-red-400 mb-2">
            <svg className="w-10 h-10 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="font-bold text-lg">Unable to Retrieve Alerts</h3>
          </div>
          <p className="text-sm text-slate-400 mb-4">
            The data for this site appears to be malformed or corrupted.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              this.props.onReset();
            }}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-white text-sm transition-colors"
          >
            Go Back
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
  const alertsMapRef = useRef<Map<string, GroupedAlert>>(new Map());

  // --- Initialize Map from Cache ---
  useEffect(() => {
    if (cachedAlerts.length > 0) {
      cachedAlerts.forEach(g => alertsMapRef.current.set(g.name, g));
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;

    if (hasLoaded) {
      setIsLoading(false);
      return;
    }

    const loadAlerts = async () => {
      setIsLoading(true);
      setError(null);
      alertsMapRef.current.clear();

      try {
        try {
          const countUrl = new URL(`${host}/JSON/core/view/numberOfAlerts/`);
          countUrl.searchParams.append('apikey', apiKey);
          const countRes = await fetch(countUrl.toString(), { headers: { 'X-ZAP-API-Key': apiKey } });
          if (countRes.ok) {
            await countRes.json();
          }
        } catch (e) { console.warn(e); }

        await fetchAndProcessBatch(0, INSTANT_BATCH_SIZE);

        if (isMounted.current) {
          onUpdateAlerts(Array.from(alertsMapRef.current.values()));
          setIsLoading(false);
          setIsFetchingMore(true);
        }

        await fetchAndProcessBatch(INSTANT_BATCH_SIZE, REMAINING_BATCH_SIZE);

        if (isMounted.current) {
          onUpdateAlerts(Array.from(alertsMapRef.current.values()));
          onLoadComplete();
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
  }, [host, apiKey, hasLoaded]);

  const fetchAndProcessBatch = async (start: number, count: number) => {
    const url = new URL(`${host}/JSON/alert/view/alerts/`);
    url.searchParams.append('start', start.toString());
    url.searchParams.append('count', count.toString());
    url.searchParams.append('apikey', apiKey);

    const res = await fetch(url.toString(), { headers: { 'X-ZAP-API-Key': apiKey } });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);

    const json = await res.json();
    const batch = json.alerts || [];

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

      if (group.instances.length < MAX_INSTANCES_PER_ALERT) {
        group.instances.push({
          url: alert.url,
          param: alert.param,
          evidence: alert.evidence,
        });
      }
    });
  };

  const filteredAlerts = useMemo(() => {
    return cachedAlerts.filter(alert => {
      if (!alert || !Array.isArray(alert.instances)) return false;
      if (!selectedSite) return true;
      return alert.instances.some(instance =>
        instance && instance.url && instance.url.startsWith(selectedSite)
      );
    });
  }, [cachedAlerts, selectedSite]);

  const panelStyles = "font-sans w-[450px] h-[550px] bg-slate-900 text-slate-200 overflow-hidden relative";

  if (isLoading && cachedAlerts.length === 0) {
    return (
      <div
        className={`${panelStyles} flex flex-col items-center justify-center`}
        style={{ scrollbarWidth: 'none' }}
      >
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400">Fetching results...</p>
      </div>
    );
  }

  if (error && cachedAlerts.length === 0) {
    return (
      <div
        className={`${panelStyles} flex items-center justify-center`}
        style={{ scrollbarWidth: 'none' }}
      >
        <p className="text-red-400 p-4 text-center">Error loading results: <br />{error}</p>
      </div>
    );
  }

  // --- BEAUTIFIED EMPTY STATE ---
  if (cachedAlerts.length === 0 && !isLoading && !isFetchingMore) {
    return (
      <div
        className={`${panelStyles} flex flex-col items-center justify-center p-6 relative`}
        style={{ scrollbarWidth: 'none' }}
      >
        {/* Background Decorative Elements */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 text-center space-y-4">
          <div className="w-20 h-20 mx-auto bg-slate-800 rounded-2xl flex items-center justify-center shadow-2xl border border-slate-700/50 mb-2 group">
            {/* Shield Check Icon */}
            <svg className="w-10 h-10 text-slate-500 group-hover:text-green-500 transition-colors duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>

          <div>
            <h3 className="text-xl font-bold text-white mb-1 merriweather-font">All Systems Clean</h3>
            <p className="text-xs text-slate-400 max-w-[220px] mx-auto leading-relaxed">
              No vulnerabilities have been detected in the current session.
            </p>
          </div>

          <button
            onClick={onBackToScanner}
            className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 border border-slate-600 text-slate-200 text-xs font-bold shadow-lg transition-all active:scale-95 hover:text-white"
          >
            Back to Scanner
          </button>
        </div>
      </div>
    );
  }

  return (
    <SafeView onReset={() => setSelectedSite('')}>
      <div
        className={`${panelStyles} flex flex-col`}
        style={{ scrollbarWidth: 'none' }}
      >
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
    </SafeView>
  );
};