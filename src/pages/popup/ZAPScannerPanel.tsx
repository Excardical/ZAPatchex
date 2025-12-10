import React, { useState, useEffect } from 'react';
import Browser from 'webextension-polyfill';
import {
  startSpiderScan,
  startAjaxSpiderScan,
  checkSpiderStatus,
  checkAjaxSpiderStatus,
  startActiveScan,
  checkActiveScanStatus,
  stopSpiderScan,
  stopAjaxSpiderScan,
  stopActiveScan,
  createNewSession,
  saveSession,
  shutdownZAP
} from '../../utils/zapApi';

interface ZapScannerPanelProps {
  host: string;
  apiKey: string;
  onScanStart?: () => void;    // NEW: Callback when scan starts
  onScanComplete: () => void;
  onViewReports: () => void;
  onDisconnect?: () => void; // Added for logout functionality
}

export const ZAPScannerPanel: React.FC<ZapScannerPanelProps> = ({ host, apiKey, onScanStart, onScanComplete, onViewReports, onDisconnect }) => {
  const [targetUrl, setTargetUrl] = useState<string>('');
  const [useAjaxSpider, setUseAjaxSpider] = useState<boolean>(false);
  const [scanStatusMessage, setScanStatusMessage] = useState<string>('');
  const [scanId, setScanId] = useState<string | null>(null);
  const [scanType, setScanType] = useState<'spider' | 'ajaxSpider' | 'active' | null>(null);
  const [scanProgress, setScanProgress] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal State for Saving Session
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveFilename, setSaveFilename] = useState('');

  // Manual Mode Selection State
  const [selectedMode, setSelectedMode] = useState<'standard' | 'attack'>('standard');

  // Load Fonts
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @import url('${chrome.runtime.getURL('Font/MerriweatherSans-Regular.ttf')}');
      .merriweather-font { font-family: 'Merriweather Sans', sans-serif; }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  // Restore State
  useEffect(() => {
    const restoreState = async () => {
      try {
        const storage = await Browser.storage.local.get(['activeScan']);
        if (storage.activeScan) {
          const { id, type, url, ajax } = storage.activeScan as any;
          setScanId(id);
          setScanType(type);
          setTargetUrl(url);
          setUseAjaxSpider(ajax);
          setIsLoading(true);
          setScanStatusMessage(`Resuming ${type}...`);
        } else {
          // Auto-fill current tab URL
          const tabs = await Browser.tabs.query({ active: true, currentWindow: true });
          if (tabs[0]?.url?.startsWith('http')) setTargetUrl(tabs[0].url);
        }
      } catch (e) { console.error(e); }
    };
    restoreState();
  }, []);

  // Save State
  useEffect(() => {
    if (scanId && scanType) {
      Browser.storage.local.set({
        activeScan: {
          id: scanId,
          type: scanType,
          url: targetUrl,
          ajax: useAjaxSpider,
          host,
          apiKey
        }
      });
    } else if (!isLoading && !scanId) {
      Browser.storage.local.remove('activeScan');
    }
  }, [scanId, scanType, targetUrl, useAjaxSpider, isLoading, host, apiKey]);

  // Monitor Scan
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (scanId) {
      intervalId = setInterval(async () => {
        try {
          let progress = 0;
          let friendlyType = scanType === 'spider' ? 'Spider' : scanType === 'active' ? 'Active Scan' : 'AJAX Spider';

          if (scanType === 'spider') progress = await checkSpiderStatus(host, apiKey, scanId);
          else if (scanType === 'active') progress = await checkActiveScanStatus(host, apiKey, scanId);
          else if (scanType === 'ajaxSpider') {
            const status = await checkAjaxSpiderStatus(host, apiKey);
            friendlyType = `AJAX Spider (${status})`;
            progress = status === 'stopped' ? 100 : 50;
          }

          setScanProgress(progress);
          setScanStatusMessage(`${friendlyType}: ${progress}%`);

          if (progress >= 100) {
            setScanStatusMessage(`${friendlyType} Complete! ✅`);
            setScanId(null);
            setIsLoading(false);
            Browser.storage.local.remove('activeScan');
            setTimeout(onScanComplete, 1500);
          }
        } catch (e) {
          console.error("Status check failed", e);
          setIsLoading(false);
          setScanId(null);
        }
      }, 1000);
    }
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [scanId, host, apiKey, scanType, onScanComplete]);

  // --- HANDLERS ---

  const handleStartScan = async () => {
    if (!targetUrl) {
      setError("Please enter a target URL.");
      return;
    }

    // NEW: Notify parent that scan started so it can clear old results
    if (onScanStart) onScanStart();

    setError(null);
    setSuccessMsg(null);
    setIsLoading(true);
    setScanProgress(0);

    try {
      let id = '';
      let type: 'spider' | 'ajaxSpider' | 'active' = 'spider'; // Default

      if (selectedMode === 'standard') {
        if (useAjaxSpider) {
          const response = await startAjaxSpiderScan(host, apiKey, targetUrl);
          if (response) {
            type = 'ajaxSpider';
            id = 'ajax';
          } else { throw new Error("Failed to start AJAX Spider"); }
        } else {
          id = await startSpiderScan(host, apiKey, targetUrl);
          type = 'spider';
        }
      } else {
        id = await startActiveScan(host, apiKey, targetUrl);
        type = 'active';
      }

      setScanId(id);
      setScanType(type);
      setScanStatusMessage(`Starting ${type}...`);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to start scan");
      setIsLoading(false);
    }
  };

  const handleStopScan = async () => {
    if (!scanId || !scanType) return;
    try {
      if (scanType === 'spider') await stopSpiderScan(host, apiKey, scanId);
      else if (scanType === 'ajaxSpider') await stopAjaxSpiderScan(host, apiKey);
      else if (scanType === 'active') await stopActiveScan(host, apiKey, scanId);

      setScanStatusMessage("Stopped by user.");
      setIsLoading(false);
      setScanId(null);
      setScanProgress(null);
      Browser.storage.local.remove('activeScan');
    } catch (e) { console.error(e); }
  };

  // --- NEW HANDLERS ---

  const handleNewSession = async () => {
    if (confirm("Are you sure you want to reset the session? This will clear all current scan data.")) {
      try {
        await createNewSession(host, apiKey);
        setSuccessMsg("Session reset successfully.");
        setError(null);
        setScanId(null);
        // Also notify parent to clear results view
        if (onScanStart) onScanStart();
      } catch (e: any) {
        setError(e.message || "Failed to reset session");
      }
    }
  };

  const handleSaveSessionClick = () => {
    setSaveFilename('');
    setShowSaveModal(true);
  };

  const handleConfirmSave = async () => {
    if (!saveFilename) {
      alert("Please enter a filename.");
      return;
    }
    try {
      await saveSession(host, apiKey, saveFilename);
      setSuccessMsg(`Session saved as '${saveFilename}'`);
      setError(null);
      setShowSaveModal(false);
    } catch (e: any) {
      alert("Error saving session: " + e.message);
    }
  };

  const handleShutdown = async () => {
    if (confirm("WARNING: This will shutdown the ZAP application on your machine.\n\nYou will be logged out.")) {
      try {
        await shutdownZAP(host, apiKey);
        if (onDisconnect) onDisconnect();
      } catch (e: any) {
        console.error("Shutdown error:", e);
        if (onDisconnect) onDisconnect();
      }
    }
  };

  // --- RENDER HELPERS ---

  const renderLoadingState = () => (
    <div className="mt-4 p-4 bg-slate-800/80 rounded border border-cyan-500/30 text-center shadow-lg animate-fade-in relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent animate-shimmer"></div>
      <div className="flex justify-center items-center space-x-2 mb-3">
        <div className="w-2.5 h-2.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-2.5 h-2.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-2.5 h-2.5 bg-cyan-400 rounded-full animate-bounce"></div>
      </div>
      <p className="font-bold text-cyan-400 text-sm mb-1 uppercase tracking-wider">
        {scanStatusMessage || "Scan in Progress..."}
      </p>
      <p className="text-xs text-slate-300 leading-relaxed mb-4">
        ZAPatchex is analyzing <strong>{targetUrl}</strong>.<br />This may take several minutes.
      </p>
      {scanProgress !== null && scanProgress < 100 && (
        <div className="w-64 mx-auto bg-slate-700/50 rounded-full h-1.5 overflow-hidden mb-4 relative">
          <div className="absolute top-0 left-0 h-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.7)] transition-all duration-500 ease-out" style={{ width: `${scanProgress}%` }}></div>
        </div>
      )}
      <div className="py-2 px-3 bg-slate-700/30 rounded border border-slate-600/50 inline-block w-full">
        <p className="text-[11px] text-slate-300 font-semibold flex items-center justify-center gap-2">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          You can close this window
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5">
          We'll notify you when it's done.
        </p>
      </div>
      <button
        onClick={handleStopScan}
        className="mt-4 text-[10px] text-red-400 hover:text-red-300 uppercase font-bold tracking-widest border-b border-red-900/0 hover:border-red-400 transition-all cursor-pointer"
      >
        Stop Scan
      </button>
    </div>
  );

  return (
    <div className="font-sans w-[450px] min-h-[600px] bg-slate-900 text-slate-200 p-5 flex flex-col relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>

      {/* --- SAVE MODAL --- */}
      {showSaveModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-800 p-5 rounded-lg border border-slate-600 shadow-2xl w-3/4">
            <h3 className="text-md font-bold text-white mb-3">Save Session</h3>
            <p className="text-xs text-slate-400 mb-2">Enter a filename for the ZAP snapshot:</p>
            <input
              type="text"
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white mb-4 focus:border-cyan-500 outline-none"
              placeholder="my_session_name"
              value={saveFilename}
              onChange={(e) => setSaveFilename(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-3 py-1.5 text-xs text-slate-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSave}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-xs font-bold"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- HEADER --- */}
      <header className="flex flex-col items-center mb-6 relative z-10">

        {/* Top Right Controls (Fixed Side-by-Side Layout) */}
        <div className="absolute top-2 right-2 flex flex-row items-center gap-3 z-50 pointer-events-auto">

          {/* Disconnect Button (Yellow/Amber, New Thunder Icon) */}
          {onDisconnect && (
            <button
              onClick={onDisconnect}
              className="p-1.5 rounded-full bg-yellow-500/10 hover:bg-yellow-600 text-yellow-500 hover:text-white transition-colors border border-yellow-500/20 shadow-sm"
              title="Disconnect (Logout)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
            </button>
          )}

          {/* Power Off Button (Red, Power Icon) */}
          <button
            onClick={handleShutdown}
            className="p-1.5 rounded-full bg-red-900/20 hover:bg-red-600 text-red-500 hover:text-white transition-colors border border-red-900/50 shadow-sm"
            title="Power Off ZAP"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.636 5.636a9 9 0 1012.728 0M12 3v9"></path></svg>
          </button>
        </div>

        <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center shadow-2xl border border-slate-700 mb-3 relative group">
          <div className="absolute inset-0 bg-cyan-500/20 rounded-2xl blur-lg group-hover:bg-cyan-500/30 transition-all duration-500"></div>
          <img
            src={chrome.runtime.getURL('Icons/OWASP_ZAP_Logo.png')}
            alt="ZAP Logo"
            className="w-10 h-10 object-contain relative z-10"
          />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white merriweather-font">
          ZAPatchex
        </h1>
        <p className="text-xs text-slate-400 font-medium tracking-wide uppercase mt-1">
          Web Vulnerability Scanner
        </p>
      </header>

      <main className="flex-grow flex flex-col relative z-10">
        {isLoading ? (
          // LOADING STATE VIEW
          <div className="flex-grow flex flex-col justify-center">
            {renderLoadingState()}
          </div>
        ) : (
          // CONFIGURATION VIEW
          <div className="space-y-5 animate-fade-in-up">

            {/* 1. Target Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase ml-1">Target Scope</label>
              <div className="relative group">
                <input
                  type="text"
                  placeholder="https://example.com"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  className="w-full bg-slate-800/50 text-sm p-3 rounded-lg border border-slate-700 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all text-white placeholder-slate-600 shadow-inner"
                />
                <div className="absolute right-3 top-3 text-slate-500 group-focus-within:text-cyan-500 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                </div>
              </div>
            </div>

            {/* 2. Mode Selection Cards */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase ml-1">Scan Mode</label>
              <div className="grid grid-cols-2 gap-3">
                {/* Standard Mode Card */}
                <div
                  onClick={() => setSelectedMode('standard')}
                  className={`cursor-pointer p-3 rounded-lg border transition-all duration-200 relative overflow-hidden group ${selectedMode === 'standard'
                    ? 'bg-slate-800 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                    : 'bg-slate-800/40 border-slate-700 hover:border-slate-600 hover:bg-slate-800/60'
                    }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-bold ${selectedMode === 'standard' ? 'text-white' : 'text-slate-300'}`}>Standard</span>
                    {selectedMode === 'standard' && <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></div>}
                  </div>
                  <p className="text-[10px] text-slate-400 leading-snug">
                    Maps the application structure. Safe for most sites.
                  </p>
                </div>

                {/* Attack Mode Card */}
                <div
                  onClick={() => setSelectedMode('attack')}
                  className={`cursor-pointer p-3 rounded-lg border transition-all duration-200 relative overflow-hidden group ${selectedMode === 'attack'
                    ? 'bg-red-900/20 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                    : 'bg-slate-800/40 border-slate-700 hover:border-slate-600 hover:bg-slate-800/60'
                    }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-bold ${selectedMode === 'attack' ? 'text-red-100' : 'text-slate-300'}`}>Attack</span>
                    {selectedMode === 'attack' && <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>}
                  </div>
                  <p className="text-[10px] text-slate-400 leading-snug">
                    Simulates real attacks. <span className="text-red-400 font-semibold">Active Scan.</span>
                  </p>
                </div>
              </div>
            </div>

            {/* 3. Options (AJAX) */}
            <div className="flex items-center space-x-2 pl-1">
              <input
                type="checkbox"
                id="useAjax"
                checked={useAjaxSpider}
                onChange={e => setUseAjaxSpider(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 text-cyan-500 focus:ring-offset-slate-900 focus:ring-cyan-500 bg-slate-800"
              />
              <label htmlFor="useAjax" className="text-xs text-slate-300 select-none cursor-pointer">
                Use AJAX Spider (for modern JS apps)
              </label>
            </div>

            {/* 4. Start Button */}
            <button
              onClick={handleStartScan}
              className={`w-full py-3.5 rounded-lg text-sm font-bold text-white shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 ${selectedMode === 'attack'
                ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-red-900/30'
                : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-900/30'
                }`}
            >
              {selectedMode === 'attack' ? 'LAUNCH ATTACK' : 'START SCAN'}
            </button>

            {/* 5. NEW: Session Controls (Reset & Save) */}
            <div className="flex gap-3">
              <button
                onClick={handleNewSession}
                className="flex-1 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                New Session
              </button>
              <button
                onClick={handleSaveSessionClick}
                className="flex-1 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
                Save Session
              </button>
            </div>

            {error && (
              <div className="p-3 rounded bg-red-900/20 border border-red-500/50 text-red-200 text-xs text-center animate-fade-in">
                {error}
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded bg-green-900/20 border border-green-500/50 text-green-200 text-xs text-center animate-fade-in">
                {successMsg}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="mt-auto pt-4 text-center space-y-2">
        {/* View Reports Button */}
        <div>
          <button
            onClick={onViewReports}
            className="text-xs text-cyan-500 hover:text-cyan-400 font-bold border-b border-cyan-500/30 hover:border-cyan-400 transition-colors uppercase tracking-wider"
          >
            View Previous Reports
          </button>
        </div>
        <p className="text-[10px] text-slate-600 font-medium">Powered by ZAP API</p>
      </footer>
    </div>
  );
};