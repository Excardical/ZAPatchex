import React, { useState, useEffect } from 'react';
import Browser from 'webextension-polyfill';
import { InfoTooltip } from './InfoTooltip';
import {
  startSpiderScan,
  startAjaxSpiderScan,
  checkSpiderStatus,
  checkAjaxSpiderStatus,
  startActiveScan,
  checkActiveScanStatus,
  stopSpiderScan,
  stopAjaxSpiderScan,
  stopActiveScan
} from '../../utils/zapApi';

interface ZapScannerPanelProps {
  host: string;
  apiKey: string;
  onScanComplete: () => void;
}

export const ZAPScannerPanel: React.FC<ZapScannerPanelProps> = ({ host, apiKey, onScanComplete }) => {
  const [targetUrl, setTargetUrl] = useState<string>('');
  const [useAjaxSpider, setUseAjaxSpider] = useState<boolean>(false);
  const [scanStatusMessage, setScanStatusMessage] = useState<string>('');
  const [scanId, setScanId] = useState<string | null>(null);
  const [scanType, setScanType] = useState<'spider' | 'ajaxSpider' | 'active' | null>(null);
  const [scanProgress, setScanProgress] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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

  // Restore state logic...
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

  // Save state logic...
  useEffect(() => {
    if (scanId && scanType) {
      Browser.storage.local.set({ activeScan: { id: scanId, type: scanType, url: targetUrl, ajax: useAjaxSpider } });
    } else if (!isLoading && !scanId) {
      Browser.storage.local.remove('activeScan');
    }
  }, [scanId, scanType, targetUrl, useAjaxSpider, isLoading]);

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
        } catch (err) { console.warn(err); }
      }, 3000);
    }
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [scanId, scanType, host, apiKey, onScanComplete]);

  const handleStop = async () => {
    try {
      if (scanType === 'spider' && scanId) await stopSpiderScan(host, apiKey, scanId);
      else if (scanType === 'ajaxSpider') await stopAjaxSpiderScan(host, apiKey);
      else if (scanType === 'active' && scanId) await stopActiveScan(host, apiKey, scanId);

      setScanStatusMessage("Stopped by User 🛑");
      setScanId(null);
      setIsLoading(false);
      Browser.storage.local.remove('activeScan');
    } catch (e) { setError("Failed to stop."); }
  };

  const startScan = async (type: 'spider' | 'ajaxSpider' | 'active') => {
    setError(null);
    if (!targetUrl) return setError("Enter a Target URL.");
    setIsLoading(true);
    setScanType(type);
    try {
      let id = '';
      if (type === 'spider') id = await startSpiderScan(host, apiKey, targetUrl);
      else if (type === 'ajaxSpider') id = await startAjaxSpiderScan(host, apiKey, targetUrl);
      else if (type === 'active') id = await startActiveScan(host, apiKey, targetUrl);
      setScanId(id);
      setScanStatusMessage(`Starting ${type}...`);
    } catch (e) {
      setError("Start failed. Check ZAP connection.");
      setIsLoading(false);
    }
  };

  return (
    <div className="font-sans w-[450px] min-h-[600px] bg-slate-900 text-slate-200 p-4 flex flex-col">
      <header className="flex-shrink-0 pb-2 border-b border-slate-700 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <img src={chrome.runtime.getURL('Icons/Github-Octicons-Code-review-16.512.png')} alt="ZAP Logo" className="w-7 h-7 brightness-0 invert" />
          <span className="text-lg font-bold merriweather-font">ZAP Scanner</span>
        </div>
      </header>

      <main className="flex-grow space-y-4">
        {/* URL Input */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Target URL</label>
          <input
            type="text"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            placeholder="https://example.com"
            disabled={isLoading}
            className="w-full p-2 rounded border border-slate-700 bg-slate-800 text-slate-200 text-sm focus:border-cyan-500 outline-none"
          />
        </div>

        {/* Scan Buttons */}
        <div className="p-3 bg-slate-800 rounded border border-slate-700 space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-slate-300 uppercase">Crawlers</label>
            <div className="flex items-center gap-1">
              <input type="checkbox" checked={useAjaxSpider} onChange={(e) => setUseAjaxSpider(e.target.checked)} className="w-3.5 h-3.5" />
              <span className="text-xs text-slate-400">AJAX</span>
            </div>
          </div>
          <button onClick={() => startScan(useAjaxSpider ? 'ajaxSpider' : 'spider')} disabled={isLoading} className="w-full p-2 rounded bg-blue-700 hover:bg-blue-600 text-white text-sm font-semibold transition-colors disabled:opacity-50">
            Start Spider Scan
          </button>
        </div>

        <div className="p-3 bg-slate-800 rounded border border-slate-700 space-y-2">
          <label className="text-xs font-bold text-slate-300 uppercase">Attacker</label>
          <button onClick={() => startScan('active')} disabled={isLoading} className="w-full p-2 rounded bg-red-700 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-50">
            Start Active Scan
          </button>
        </div>

        {/* Status Area */}
        {scanStatusMessage && (
          <div className="p-3 rounded bg-slate-800 text-center text-sm border border-slate-700">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-cyan-400">{scanStatusMessage}</span>
              {scanId && (
                <button onClick={handleStop} className="px-2 py-1 ml-2 bg-red-900/40 hover:bg-red-800 border border-red-700 text-red-200 text-xs rounded font-bold flex items-center gap-1">
                  <span className="w-2 h-2 bg-red-500 rounded-sm"></span> Stop
                </button>
              )}
            </div>
            {scanProgress !== null && scanProgress < 100 && (
              <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                <div className="bg-cyan-600 h-2 rounded-full transition-all duration-300" style={{ width: `${scanProgress}%` }}></div>
              </div>
            )}
          </div>
        )}

        {error && <div className="p-2 rounded bg-red-900/50 text-red-300 border border-red-800 text-center text-xs">{error}</div>}
      </main>

      <footer className="flex-shrink-0 mt-2 pt-2 border-t border-slate-700 text-center">
        <button onClick={onScanComplete} disabled={isLoading} className="w-full p-2.5 border-none rounded bg-teal-700 hover:bg-teal-600 text-white text-sm font-semibold transition-colors disabled:opacity-50">
          View Full Report
        </button>
      </footer>
    </div>
  );
};
