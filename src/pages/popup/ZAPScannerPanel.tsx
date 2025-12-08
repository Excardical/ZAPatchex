// src/pages/popup/ZAPScannerPanel.tsx
import React, { useState, useEffect } from 'react';
import Browser from 'webextension-polyfill';
import {
  startSpiderScan,
  startAjaxSpiderScan,
  checkSpiderStatus,
  checkAjaxSpiderStatus,
  startActiveScan,
  checkActiveScanStatus
} from '../../utils/zapApi';

interface ZapScannerPanelProps {
  host: string;
  apiKey: string;
  onScanComplete: () => void;
}

export const ZapScannerPanel: React.FC<ZapScannerPanelProps> = ({ host, apiKey, onScanComplete }) => {
  const [targetUrl, setTargetUrl] = useState<string>('');
  const [useAjaxSpider, setUseAjaxSpider] = useState<boolean>(false);
  const [scanStatusMessage, setScanStatusMessage] = useState<string>('');
  const [scanId, setScanId] = useState<string | null>(null);
  const [scanType, setScanType] = useState<'spider' | 'ajaxSpider' | 'active' | null>(null);
  const [scanProgress, setScanProgress] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Add Merriweather font loading (Persisted from User's Version)
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @import url('${chrome.runtime.getURL('Font/MerriweatherSans-Regular.ttf')}');

      .merriweather-font {
        font-family: 'Merriweather Sans', sans-serif;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // --- PERSISTENCE: Restore State on Mount ---
  useEffect(() => {
    const restoreState = async () => {
      try {
        const storage = await Browser.storage.local.get(['activeScan']);
        if (storage.activeScan) {
          const { id, type, url, ajax } = storage.activeScan as { id: string, type: 'spider' | 'ajaxSpider' | 'active', url: string, ajax: boolean };
          setScanId(id);
          setScanType(type);
          setTargetUrl(url);
          setUseAjaxSpider(ajax);
          setIsLoading(true);
          const friendlyType = type === 'ajaxSpider' ? 'AJAX Spider' : type.charAt(0).toUpperCase() + type.slice(1);
          setScanStatusMessage(`Resuming ${friendlyType}...`);
        } else {
          // If no active scan, try to get current tab
          getCurrentTabUrl();
        }
      } catch (e) {
        console.error("Failed to restore state:", e);
      }
    };
    restoreState();
  }, []);

  // --- PERSISTENCE: Save State on Change ---
  useEffect(() => {
    if (scanId && scanType) {
      Browser.storage.local.set({
        activeScan: { id: scanId, type: scanType, url: targetUrl, ajax: useAjaxSpider }
      });
    } else if (!isLoading && !scanId) {
      // Clear storage when scan is finished or idle
      Browser.storage.local.remove('activeScan');
    }
  }, [scanId, scanType, targetUrl, useAjaxSpider, isLoading]);

  const getCurrentTabUrl = async () => {
    try {
      if (Browser.tabs) {
        const tabs = await Browser.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]?.url && tabs[0].url.startsWith('http')) {
          setTargetUrl(tabs[0].url);
        } else {
          // Keep user's helpful message
          setScanStatusMessage("Current tab is not a scannable URL. Please enter one manually.");
        }
      }
    } catch (err) {
      console.error("Error getting current tab URL:", err);
      setScanStatusMessage("Could not get current tab URL. Enter manually.");
    }
  };

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (scanId) {
      intervalId = setInterval(async () => {
        try {
          let progress = 0;
          let friendlyScanType = '';

          if (scanType === 'spider') {
            progress = await checkSpiderStatus(host, apiKey, scanId);
            friendlyScanType = 'Spider';
            setScanStatusMessage(`${friendlyScanType} in progress: ${progress}%`);
          } else if (scanType === 'active') {
            progress = await checkActiveScanStatus(host, apiKey, scanId);
            friendlyScanType = 'Active Scan';
            setScanStatusMessage(`${friendlyScanType} in progress: ${progress}%`);
          } else if (scanType === 'ajaxSpider') {
            // AJAX Spider Logic
            const status = await checkAjaxSpiderStatus(host, apiKey);
            friendlyScanType = 'AJAX Spider';
            setScanStatusMessage(`${friendlyScanType} is ${status}`);
            // Fake progress for visual feedback
            progress = status === 'stopped' ? 100 : 50;
          }

          setScanProgress(progress);

          if (progress >= 100) {
            setScanStatusMessage(`${friendlyScanType || scanType} Complete! ✅`);
            setScanId(null);
            setIsLoading(false);
            // Clear storage explicitly here
            await Browser.storage.local.remove('activeScan');
            setTimeout(onScanComplete, 1500);
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to check scan status.';
          console.error(`Error checking ${scanType} status:`, err);
          setError(errorMessage); // Keep user's error handling
          setScanId(null);
          setIsLoading(false);
          // Clear storage on error so we don't get stuck
          await Browser.storage.local.remove('activeScan');
        }
      }, 3000); // Poll every 3 seconds (User preference)
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [scanId, scanType, host, apiKey, onScanComplete]);

  const resetState = () => {
    setError(null);
    setScanId(null);
    setScanProgress(null);
    setScanStatusMessage('');
  }

  const handleSpiderScan = async () => {
    if (!targetUrl.trim()) {
      setError("Target URL is required.");
      return;
    }
    resetState();
    setIsLoading(true);

    try {
      if (useAjaxSpider) {
        setScanType('ajaxSpider');
        setScanStatusMessage('Starting AJAX Spider...');
        const scan = await startAjaxSpiderScan(host, apiKey, targetUrl);
        setScanId(scan);
        setScanProgress(0); // Indeterminate
        setScanStatusMessage('AJAX Spider started...');
      } else {
        setScanType('spider');
        setScanStatusMessage('Starting Spider...');
        const scan = await startSpiderScan(host, apiKey, targetUrl);
        setScanId(scan);
        setScanProgress(0);
        setScanStatusMessage('Spider started. Progress: 0%');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start Spider scan.';
      console.error("Error starting spider scan:", err);
      setError(errorMessage);
      setScanStatusMessage('');
      setIsLoading(false);
    }
  };

  const handleActiveScan = async () => {
    if (!targetUrl.trim()) {
      setError("Target URL is required.");
      return;
    }
    resetState();
    setIsLoading(true);
    setScanType('active');
    setScanStatusMessage('Starting Active Scan...');
    try {
      const scan = await startActiveScan(host, apiKey, targetUrl);
      setScanId(scan);
      setScanProgress(0);
      setScanStatusMessage('Active Scan started. Progress: 0%');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start active scan.';
      console.error("Error starting active scan:", err);
      setError(errorMessage);
      setScanStatusMessage('');
      setIsLoading(false);
    }
  };

  return (
    <div className="font-sans w-[450px] h-[550px] bg-slate-900 text-slate-200 p-4 flex flex-col">
      <header className="flex-shrink-0 pb-2 border-b border-slate-700 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <img src={chrome.runtime.getURL('Icons/Github-Octicons-Code-review-16.512.png')} alt="ZAP Logo" className="w-7 h-7 brightness-0 invert" />
          <span className="text-lg font-bold merriweather-font">ZAP Scanner</span>
        </div>
      </header>

      <main className="flex-grow space-y-4">
        <div>
          <label htmlFor="targetUrl" className="block text-sm font-semibold mb-1 text-cyan-400">Target URL</label>
          <input
            type="text"
            id="targetUrl"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            placeholder="https://example.com"
            disabled={isLoading}
            className="box-border w-full p-2 rounded border border-slate-700 bg-slate-800 text-slate-200 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        {/* AJAX Toggle - New Feature with matching style */}
        <div className="flex items-center gap-2 p-2 bg-slate-800 rounded border border-slate-700">
          <input
            type="checkbox"
            checked={useAjaxSpider}
            onChange={(e) => setUseAjaxSpider(e.target.checked)}
            id="ajaxToggle"
            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-cyan-600 focus:ring-cyan-500"
            disabled={isLoading}
          />
          <label htmlFor="ajaxToggle" className="text-sm cursor-pointer select-none text-slate-300">
            Use AJAX Spider <span className="text-xs text-slate-500">(for React/Vue apps)</span>
          </label>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleSpiderScan}
            disabled={isLoading}
            className="flex-1 p-2.5 border-none rounded bg-blue-600 text-white text-sm font-semibold cursor-pointer transition-colors hover:enabled:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed">
            {useAjaxSpider ? 'AJAX Spider' : 'Spider Scan'}
          </button>
          <button
            onClick={handleActiveScan}
            disabled={isLoading}
            className="flex-1 p-2.5 border-none rounded bg-red-600 text-white text-sm font-semibold cursor-pointer transition-colors hover:enabled:bg-red-700 disabled:bg-slate-600 disabled:cursor-not-allowed">
            Active Scan
          </button>
        </div>

        {scanStatusMessage && (
          <div className="mt-4 p-3 rounded bg-slate-800 text-center text-sm border border-slate-700">
            <p className="font-medium text-cyan-400">{scanStatusMessage}</p>
            {scanProgress !== null && scanProgress < 100 && (
              <div className="w-full bg-slate-700 rounded-full h-2.5 mt-2 overflow-hidden">
                <div className="bg-cyan-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${scanProgress}%` }}></div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 rounded bg-red-900/50 text-red-300 border border-red-700 text-center text-sm">
            <p className="font-bold mb-1">An Error Occurred</p>
            <p className="text-xs">{error}</p>
          </div>
        )}
      </main>

      <footer className="flex-shrink-0 mt-4 pt-2 border-t border-slate-700 text-center">
        <button
          onClick={onScanComplete}
          disabled={isLoading}
          className="w-full p-2.5 border-none rounded bg-teal-600 text-white text-sm font-semibold cursor-pointer transition-colors hover:enabled:bg-teal-700 disabled:bg-slate-600 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Scan in Progress...' : 'View Last Scan Results'}
        </button>
      </footer>
    </div>
  );
};
