import React, { useState, useEffect } from 'react';
import Browser from 'webextension-polyfill';
import { ActionsPanel } from './ActionsPanel';
import { ZapScannerPanel } from './ZAPScannerPanel';

// Helper function to safely access browser storage
const getBrowserStorage = () => {
  if (typeof Browser !== 'undefined' && Browser?.storage?.local) {
    return Browser.storage.local;
  }
  if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
    return chrome.storage.local;
  }
  return null;
};

const Main = () => {
  const [host, setHost] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [status, setStatus] = useState<'loading' | 'connected' | 'showing_results'>('loading');

  // On mount, load the connection details that the popup saved.
  useEffect(() => {
    const loadConnectionDetails = async () => {
      const storage = getBrowserStorage();
      if (!storage) {
        console.error("Storage not available.");
        // Handle error state, maybe show an error message
        return;
      }
      const result = await storage.get(['zapHost', 'zapApiKey']);
      if (result.zapHost && result.zapApiKey) {
        setHost(result.zapHost);
        setApiKey(result.zapApiKey);
        // Since this window only opens on success, we can go straight to the scanner.
        setStatus('connected');
      } else {
        // Handle case where details might be missing
        console.error("Connection details not found in storage.");
      }
    };
    loadConnectionDetails();
  }, []);

  const showResults = () => {
    setStatus('showing_results');
  };

  // --- Conditional Rendering ---

  if (status === 'loading') {
    return (
        <div className="font-sans w-full h-screen bg-slate-900 text-slate-200 flex items-center justify-center">
            <p>Loading Connection Details...</p>
        </div>
    );
  }

  if (status === 'connected') {
    return <ZapScannerPanel host={host} apiKey={apiKey} onScanComplete={showResults} />;
  }

  if (status === 'showing_results') {
    // Note: You might want to add a "Back to Scan" button in ActionsPanel
    return <ActionsPanel host={host} apiKey={apiKey} />;
  }

  return (
    <div className="font-sans w-full h-screen bg-slate-900 text-slate-200 flex items-center justify-center">
        <p className='text-red-400'>An unexpected error occurred.</p>
    </div>
  );
};

export default Main;
