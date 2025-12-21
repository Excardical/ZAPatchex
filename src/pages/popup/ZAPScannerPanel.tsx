import React, { useState, useEffect } from 'react';
import Browser from 'webextension-polyfill';
import {
  startSpiderScan,
  checkSpiderStatus,
  startActiveScan,
  checkActiveScanStatus,
  stopSpiderScan,
  stopActiveScan,
  createNewSession,
  saveSession,
  shutdownZAP,
  getZapHomePath
} from '../../utils/zapApi';
import { InfoTooltip } from './InfoTooltip';

interface ZapScannerPanelProps {
  host: string;
  apiKey: string;
  onScanStart?: () => void;
  onScanComplete: () => void;
  onViewReports: () => void;
  onDisconnect?: () => void;
}

// --- Custom Confirmation Modal Component ---
interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmModalProps> = ({ isOpen, title, message, type = 'warning', onConfirm, onCancel }) => {
  if (!isOpen) return null;

  const getColors = () => {
    switch (type) {
      case 'danger': return { btn: 'bg-red-600 hover:bg-red-700', icon: 'text-red-500', border: 'border-red-500/30' };
      case 'info': return { btn: 'bg-cyan-600 hover:bg-cyan-700', icon: 'text-cyan-500', border: 'border-cyan-500/30' };
      default: return { btn: 'bg-yellow-600 hover:bg-yellow-700', icon: 'text-yellow-500', border: 'border-yellow-500/30' };
    }
  };

  const colors = getColors();

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-fade-in p-6">
      <div className={`w-full max-w-sm bg-slate-800 rounded-xl shadow-2xl border ${colors.border} overflow-hidden transform transition-all scale-100`}>
        <div className="p-5 text-center">
          <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-slate-700/50 mb-4 ${colors.icon}`}>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg leading-6 font-bold text-white mb-2">{title}</h3>
          <div className="mt-2">
            <p className="text-sm text-slate-300 whitespace-pre-wrap">{message}</p>
          </div>
        </div>

        <div className="bg-slate-900/50 px-4 py-3 sm:px-6 flex flex-col sm:flex-row-reverse gap-3 items-center justify-center">
          <button
            type="button"
            className={`inline-flex justify-center items-center w-full sm:w-auto rounded-lg border border-transparent shadow-sm px-4 py-2 text-sm font-bold text-white focus:outline-none transition-all min-w-[100px] ${colors.btn}`}
            onClick={onConfirm}
          >
            Confirm
          </button>
          <button
            type="button"
            className="inline-flex justify-center items-center w-full sm:w-auto rounded-lg border border-slate-600 shadow-sm px-4 py-2 bg-slate-800 text-sm font-bold text-slate-300 hover:bg-slate-700 hover:text-white focus:outline-none transition-all min-w-[100px]"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export const ZAPScannerPanel: React.FC<ZapScannerPanelProps> = ({ host, apiKey, onScanStart, onScanComplete, onViewReports, onDisconnect }) => {
  const [targetUrl, setTargetUrl] = useState<string>('');
  const [scanStatusMessage, setScanStatusMessage] = useState<string>('');
  const [scanId, setScanId] = useState<string | null>(null);
  const [scanType, setScanType] = useState<'spider' | 'active' | null>(null);
  const [scanProgress, setScanProgress] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [savedPath, setSavedPath] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveFilename, setSaveFilename] = useState('');

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
    onConfirm: () => { },
  });

  const [selectedMode, setSelectedMode] = useState<'standard' | 'attack'>('standard');

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @import url('${chrome.runtime.getURL('Font/MerriweatherSans-Regular.ttf')}');
      .merriweather-font { font-family: 'Merriweather Sans', sans-serif; }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  useEffect(() => {
    const restoreState = async () => {
      try {
        const storage = await Browser.storage.local.get(['activeScan']);
        if (storage.activeScan) {
          const { id, type, url } = storage.activeScan as any;
          setScanId(id);
          setScanType(type);
          setTargetUrl(url);
          setIsLoading(true);
          setScanStatusMessage(`Resuming ${type}...`);
        } else {
          const tabs = await Browser.tabs.query({ active: true, currentWindow: true });
          if (tabs[0]?.url?.startsWith('http')) setTargetUrl(tabs[0].url);
        }
      } catch (e) { console.error(e); }
    };
    restoreState();
  }, []);

  useEffect(() => {
    if (scanId && scanType) {
      Browser.storage.local.set({
        activeScan: {
          id: scanId,
          type: scanType,
          url: targetUrl,
          host,
          apiKey
        }
      });
    } else if (!isLoading && !scanId) {
      Browser.storage.local.remove('activeScan');
    }
  }, [scanId, scanType, targetUrl, isLoading, host, apiKey]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (scanId) {
      intervalId = setInterval(async () => {
        try {
          let progress = 0;
          let friendlyType = scanType === 'spider' ? 'Spider' : 'Active Scan';

          if (scanType === 'spider') progress = await checkSpiderStatus(host, apiKey, scanId);
          else if (scanType === 'active') progress = await checkActiveScanStatus(host, apiKey, scanId);

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

  const closeConfirmModal = () => {
    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
  };

  const handleStartScan = async () => {
    if (!targetUrl) {
      setError("Please enter a target URL.");
      return;
    }
    if (onScanStart) onScanStart();

    setError(null);
    setSuccessMsg(null);
    setSavedPath(null);
    setIsLoading(true);
    setScanProgress(0);

    try {
      let id = '';
      let type: 'spider' | 'active' = 'spider';

      if (selectedMode === 'standard') {
        id = await startSpiderScan(host, apiKey, targetUrl);
        type = 'spider';
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
      else if (scanType === 'active') await stopActiveScan(host, apiKey, scanId);

      setScanStatusMessage("Stopped by user.");
      setIsLoading(false);
      setScanId(null);
      setScanProgress(null);
      Browser.storage.local.remove('activeScan');
    } catch (e) { console.error(e); }
  };

  const handleNewSession = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Reset Session?',
      message: 'Are you sure you want to reset the session?\nThis will clear all current scan data.',
      type: 'warning',
      onConfirm: async () => {
        closeConfirmModal();
        try {
          await createNewSession(host, apiKey);
          setSuccessMsg("Session reset successfully.");
          setSavedPath(null);
          setError(null);
          setScanId(null);
          if (onScanStart) onScanStart();
        } catch (e: any) {
          setError(e.message || "Failed to reset session");
        }
      }
    });
  };

  const handleSaveSessionClick = () => {
    setSaveFilename('');
    setShowSaveModal(true);
  };

  const handleConfirmSave = async () => {
    if (!saveFilename) {
      setError("Please enter a filename.");
      return;
    }
    try {
      await saveSession(host, apiKey, saveFilename);

      let fullPath = '';
      try {
        const homePath = await getZapHomePath(host, apiKey);
        const isWindows = homePath.includes('\\');
        const separator = isWindows ? '\\' : '/';
        const cleanHomePath = homePath.replace(/[/\\]$/, '');
        fullPath = `${cleanHomePath}${separator}session${separator}${saveFilename}`;
      } catch (e) {
        console.warn("Could not fetch home path", e);
      }

      setSuccessMsg(`Session saved as '${saveFilename}'`);
      setSavedPath(fullPath || "Saved in ZAP default directory");
      setError(null);
      setShowSaveModal(false);
    } catch (e: any) {
      setError("Error saving session: " + e.message);
    }
  };

  const handleShutdown = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Power Off ZAP?',
      message: 'WARNING: This will shutdown the ZAP application on your machine.\n\nYou will be logged out immediately.',
      type: 'danger',
      onConfirm: async () => {
        closeConfirmModal();
        try {
          await shutdownZAP(host, apiKey);
          if (onDisconnect) onDisconnect();
        } catch (e: any) {
          console.error("Shutdown error:", e);
          if (onDisconnect) onDisconnect();
        }
      }
    });
  };

  const handleDisconnectClick = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Disconnect?',
      message: 'Are you sure you want to disconnect?\nYou will be returned to the login screen.',
      type: 'warning',
      onConfirm: () => {
        closeConfirmModal();
        if (onDisconnect) onDisconnect();
      }
    });
  };

  const handleCopyPath = () => {
    if (savedPath) {
      navigator.clipboard.writeText(savedPath);
    }
  };

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
    <div className="font-sans w-[450px] h-[600px] bg-slate-900 text-slate-200 p-5 flex flex-col relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>

      <ConfirmationModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
        onConfirm={confirmConfig.onConfirm}
        onCancel={closeConfirmModal}
      />

      {showSaveModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-800 p-5 rounded-lg border border-slate-600 shadow-2xl w-3/4">
            <h3 className="text-md font-bold text-white mb-3">Save Session</h3>
            <p className="text-xs text-slate-400 mb-2">Enter a filename for the ZAP session:</p>
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

      <header className="flex flex-col items-center mb-6 relative z-10">
        <div className="absolute top-2 right-2 flex flex-row items-center gap-3 z-50 pointer-events-auto">
          {onDisconnect && (
            <button
              onClick={handleDisconnectClick}
              className="p-1.5 rounded-full bg-yellow-500/10 hover:bg-yellow-600 text-yellow-500 hover:text-white transition-colors border border-yellow-500/20 shadow-sm"
              title="Disconnect (Logout)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
            </button>
          )}
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

      <main
        className="flex-grow flex flex-col relative z-10 overflow-y-auto px-1 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none' }}
      >
        {isLoading ? (
          <div className="flex-grow flex flex-col justify-center">
            {renderLoadingState()}
          </div>
        ) : (
          <div className="space-y-5 animate-fade-in-up pb-4">
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
                <div className="absolute right-2 top-2.5 z-20">
                  <InfoTooltip text="Auto-detects URL from the active tab." />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase ml-1">Scan Mode</label>
              <div className="grid grid-cols-2 gap-3">
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

            {/* INTEGRATED STATUS BAR */}
            <div className="mt-2 mb-2 flex items-center justify-between px-3 py-1.5 bg-slate-800/80 rounded border border-slate-700/50 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)] animate-pulse"></div>
                <span className="text-[10px] font-bold text-slate-300">ZAP Engine Ready</span>
              </div>
              <div className="text-[10px] text-white font-bold font-mono truncate max-w-[150px]" title={host}>
                {host.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </div>
            </div>

            <button
              onClick={handleStartScan}
              className={`w-full py-3.5 rounded-lg text-sm font-bold text-white shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 ${selectedMode === 'attack'
                ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-red-900/30'
                : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-900/30'
                }`}
            >
              {selectedMode === 'attack' ? 'LAUNCH ATTACK' : 'START SCAN'}
            </button>

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
              <div className="p-3 rounded bg-green-900/20 border border-green-500/50 text-green-200 text-xs text-center animate-fade-in break-words">
                <p className="font-bold mb-1">{successMsg}</p>
                {savedPath && (
                  <div className="mt-2 text-left">
                    <p className="text-[10px] text-green-300/70 mb-1 uppercase tracking-wide">Saved Location:</p>
                    <div className="flex items-center gap-2 bg-black/30 p-2 rounded border border-green-500/30">
                      <code className="flex-1 text-[10px] font-mono text-green-100 overflow-x-auto whitespace-nowrap scrollbar-hide select-all">
                        {savedPath}
                      </code>
                      <button
                        onClick={handleCopyPath}
                        className="p-1.5 hover:bg-green-500/20 rounded text-green-400 hover:text-green-200 transition-colors"
                        title="Copy path to clipboard"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                      </button>
                    </div>
                    <p className="mt-1 text-[9px] text-green-400/50 italic">
                      Paste this path into your File Explorer to open.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="mt-auto pt-4 text-center space-y-2 z-20 bg-slate-900/95">
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