import React, { useState } from 'react';
import { ActionsPanel } from './ActionsPanel';

const testZapConnection = async (host: string, apiKey: string): Promise<string> => {
  const url = new URL(`${host}/JSON/core/view/version/`);

  console.log(`Attempting to connect to ZAP at: ${url}`);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-ZAP-API-Key': apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Authentication failed or endpoint not found. Status: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.version) {
      return data.version;
    } else {
      throw new Error('Unexpected response format from ZAP.');
    }

  } catch (error) {
    console.error("ZAP Connection Error:", error);
    throw new Error(`Could not connect to ZAP. Is it running at that host?`);
  }
};

const Popup = () => {
  const [host, setHost] = useState<string>('http://localhost:8080');
  const [apiKey, setApiKey] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [zapVersion, setZapVersion] = useState<string>('');

  const handleConnect = async () => {
    setMessage('');
    setZapVersion('');
    setStatus('loading');
    setMessage('Connecting...');

    if (!host.trim()) {
      setMessage('Must fill in ZAP Host URL first');
      setStatus('error');
      return;
    }
    if (!apiKey.trim()) {
      setMessage('Must fill in API key first');
      setStatus('error');
      return;
    }

    try {
      const version = await testZapConnection(host, apiKey);
      setMessage(`Connection Successful! ✅`);
      setZapVersion(`ZAP Version: ${version}`);
      setStatus('success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      setMessage(errorMessage);
      setStatus('error');
    }
  };

  if (status === 'success') {
    return <ActionsPanel host={host} apiKey={apiKey} />;
  }

  return (
    <div className="p-4 bg-gray-100 text-gray-800 w-80">
      <header className="text-center mb-5">
        <h1 className="text-xl font-bold m-0 text-gray-800">ZAP Connector</h1>
        <p className="m-1 text-sm text-gray-600">Connect to the Zed Attack Proxy</p>
      </header>
      <main>
        <div className="mb-3 text-left">
          <label htmlFor="zapHost" className="block text-sm font-semibold mb-1">ZAP Host URL</label>
          <input
            type="text"
            id="zapHost"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="http://localhost:8080"
            disabled={status === 'loading'}
            className="box-border w-full p-2 rounded border border-gray-300 text-base focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div className="mb-3 text-left">
          <label htmlFor="apiKey" className="block text-sm font-semibold mb-1">ZAP API Key</label>
          <input
            type="password"
            id="apiKey"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your ZAP API key"
            disabled={status === 'loading'}
            className="box-border w-full p-2 rounded border border-gray-300 text-base focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>
        
        <button onClick={handleConnect} disabled={status === 'loading'} className="w-full p-2.5 border-none rounded bg-blue-600 text-white text-base font-semibold cursor-pointer transition-colors hover:enabled:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
          {status === 'loading' ? 'Connecting...' : 'Connect to ZAP'}
        </button>
        
        {message && (
          <div className={`mt-4 p-2.5 rounded font-medium text-center ${status === 'error' ? 'bg-red-100 text-red-700' : 'text-gray-600'}`}>
            <p>{message}</p>
            {zapVersion && <p className="mt-1 text-xs">{zapVersion}</p>}
          </div>
        )}
      </main>
    </div>
  );
};

export default Popup;