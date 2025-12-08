import React, { useState, useEffect } from 'react';
import { ZAPScannerPanel } from './ZAPScannerPanel';
import { ActionsPanel } from './ActionsPanel';
import Browser from 'webextension-polyfill';

const Popup = () => {
  const [host, setHost] = useState<string>('http://localhost:8080');
  const [apiKey, setApiKey] = useState<string>('12345');
  const [view, setView] = useState<'scanner' | 'results'>('scanner');

  useEffect(() => {
    // Load saved settings
    Browser.storage.local.get(['zapHost', 'zapApiKey']).then((res: any) => {
      if (res.zapHost) setHost(res.zapHost as string);
      if (res.zapApiKey) setApiKey(res.zapApiKey as string);
    });
  }, []);

  const showResults = () => {
    setView('results');
  };

  return (
    <div className="w-[450px] h-[600px] overflow-hidden bg-slate-900 text-slate-200">
      {view === 'scanner' && (
        <ZAPScannerPanel
          host={host}
          apiKey={apiKey}
          onScanComplete={showResults}
          onViewReports={showResults}
        />
      )}

      {view === 'results' && (
        <ActionsPanel
          host={host}
          apiKey={apiKey}
          onBackToScanner={() => setView('scanner')}
        />
      )}
    </div>
  );
};

export default Popup;
