import React, { useState, useEffect } from 'react';
import { ZAPScannerPanel } from './ZAPScannerPanel';
import { ActionsPanel } from './ActionsPanel';
import { LoginPanel } from './LoginPanel';
import { GroupedAlert } from './VulnerabilityPanel'; // Import type
import Browser from 'webextension-polyfill';

const Popup = () => {
  const [host, setHost] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState(true);
  const [view, setView] = useState<'login' | 'scanner' | 'results'>('login');

  // --- PERSISTENT STATE (LIFTED UP) ---
  // This data survives when you switch between 'scanner' and 'results'
  const [persistedAlerts, setPersistedAlerts] = useState<GroupedAlert[]>([]);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const scanData = await Browser.storage.local.get(['activeScan']);
        if (scanData.activeScan && (scanData.activeScan as any).id) {
          const { host: scanHost, apiKey: scanKey } = scanData.activeScan as any;
          if (scanHost && scanKey) {
            setHost(scanHost);
            setApiKey(scanKey);
            setView('scanner');
            setIsInitializing(false);
            return;
          }
        }

        const res = await Browser.storage.local.get(['zapHost', 'zapApiKey']);
        if (res.zapHost && res.zapApiKey) {
          setHost(res.zapHost as string);
          setApiKey(res.zapApiKey as string);
          setView('scanner');
        } else {
          if (res.zapHost) setHost(res.zapHost as string);
          setView('login');
        }
      } catch (e) {
        console.error("Failed to load settings", e);
        setView('login');
      } finally {
        setIsInitializing(false);
      }
    };
    init();
  }, []);

  const handleLoginSuccess = (newHost: string, newKey: string) => {
    setHost(newHost);
    setApiKey(newKey);
    setView('scanner');
  };

  const handleLogout = () => {
    Browser.storage.local.remove(['zapApiKey', 'activeScan']);
    setApiKey('');
    setPersistedAlerts([]); // Clear data on logout
    setHasLoadedOnce(false);
    setView('login');
  };

  // Clear data if we start a NEW scan
  const handleStartNewScan = () => {
    setPersistedAlerts([]);
    setHasLoadedOnce(false);
    setView('results');
  };

  if (isInitializing) {
    return (
      <div className="w-[450px] h-[600px] bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-[450px] h-[600px] overflow-hidden bg-slate-900 text-slate-200 font-sans">

      {view === 'login' && (
        <LoginPanel onLoginSuccess={handleLoginSuccess} />
      )}

      {view === 'scanner' && (
        <div className="relative h-full">
          <button
            onClick={handleLogout}
            className="absolute top-3 right-3 z-50 p-2 text-slate-500 hover:text-white transition-colors rounded-full hover:bg-slate-800"
            title="Disconnect"
          >
            <img src={chrome.runtime.getURL('Icons/refresh-arrow_icon-icons.com_73442.png')} className="w-4 h-4 opacity-70" />
          </button>

          <ZAPScannerPanel
            host={host}
            apiKey={apiKey}
            // If scan completes or user clicks "View Reports", we go to results
            // Note: If you want to CLEAR data on a fresh scan, do it inside ZAPScannerPanel before calling this
            onScanComplete={() => setView('results')}
            onViewReports={() => setView('results')}
          />
        </div>
      )}

      {view === 'results' && (
        <ActionsPanel
          host={host}
          apiKey={apiKey}
          onBackToScanner={() => setView('scanner')}
          // Pass the lifted state
          cachedAlerts={persistedAlerts}
          onUpdateAlerts={setPersistedAlerts}
          hasLoaded={hasLoadedOnce}
          onLoadComplete={() => setHasLoadedOnce(true)}
        />
      )}
    </div>
  );
};

export default Popup;
