import React, { useState, useEffect, useMemo, useRef, Component, ErrorInfo, ReactNode } from 'react';
import { VulnerabilityPanel } from './VulnerabilityPanel';
import { DashboardPanel } from './DashboardPanel';
import { GroupedAlert, fetchAllAlerts } from '../../utils/zapApi'; // Import from shared
import Browser from 'webextension-polyfill';

// Error Boundary (SafeView) remains the same...
class SafeView extends Component<{ children: ReactNode, onReset: () => void }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(_: Error) { return { hasError: true }; }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) { console.error("Error:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-slate-900 text-slate-200">
          <p className="text-red-400 mb-2 font-bold">Display Error</p>
          <button onClick={() => { this.setState({ hasError: false }); this.props.onReset(); }} className="px-4 py-2 bg-slate-700 rounded">Retry</button>
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

  // Initialize loading if we don't have alerts yet
  const [isLoading, setIsLoading] = useState(cachedAlerts.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'linear' | 'dashboard'>('linear');
  const [selectedSite, setSelectedSite] = useState<string>('');

  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;

    const loadData = async () => {
      // 1. Check if we already have data in props (Lifted State)
      if (hasLoaded && cachedAlerts.length > 0) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // 2. Check Storage Cache (Background Fetch)
        const storage = await Browser.storage.local.get('zap_cached_alerts');
        if (storage.zap_cached_alerts && Array.isArray(storage.zap_cached_alerts) && storage.zap_cached_alerts.length > 0) {
          console.log("Loaded alerts from background cache.");
          if (isMounted.current) {
            onUpdateAlerts(storage.zap_cached_alerts);
            onLoadComplete();
            setIsLoading(false);
          }
          return;
        }

        // 3. Fallback: Fetch manually if cache is empty
        console.log("Cache empty. Fetching manually...");
        const alerts = await fetchAllAlerts(host, apiKey);

        if (isMounted.current) {
          onUpdateAlerts(alerts);
          onLoadComplete();
          setIsLoading(false);

          // Save to cache for next time
          Browser.storage.local.set({ zap_cached_alerts: alerts });
        }

      } catch (err: any) {
        if (isMounted.current) {
          console.error(err);
          setError(err.message || 'Failed to load results');
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => { isMounted.current = false; };
  }, []); // Run once on mount

  // Filter Logic
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

  if (isLoading) {
    return (
      <div className={`${panelStyles} flex flex-col items-center justify-center`}>
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400">Loading Report...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${panelStyles} flex items-center justify-center`}>
        <p className="text-red-400 p-4 text-center">Error: {error}</p>
        <button onClick={onBackToScanner} className="absolute bottom-4 text-xs text-slate-500 underline">Back</button>
      </div>
    );
  }

  // Empty State (No Vulnerabilities Found)
  if (cachedAlerts.length === 0) {
    return (
      <div className={`${panelStyles} flex flex-col items-center justify-center p-6 relative`}>
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 text-center space-y-4">
          <div className="w-20 h-20 mx-auto bg-slate-800 rounded-2xl flex items-center justify-center shadow-2xl border border-slate-700/50 mb-2">
            <svg className="w-10 h-10 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-white mb-1">All Systems Clean</h3>
            <p className="text-xs text-slate-400 max-w-[220px] mx-auto leading-relaxed">No vulnerabilities detected.</p>
          </div>
          <button onClick={onBackToScanner} className="px-6 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition-all">Back to Scanner</button>
        </div>
      </div>
    );
  }

  return (
    <SafeView onReset={() => setSelectedSite('')}>
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
    </SafeView>
  );
};