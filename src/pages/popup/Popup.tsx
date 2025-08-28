import React, { useState } from 'react';
import './Popup.css'; 
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
  // --- STATE MANAGEMENT (No changes here) ---
  const [host, setHost] = useState<string>('http://localhost:8080');
  const [apiKey, setApiKey] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [zapVersion, setZapVersion] = useState<string>('');

  // --- UI LOGIC (No changes here) ---
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

  // If connection is successful, show the ActionsPanel
  if (status === 'success') {
    return <ActionsPanel host={host} apiKey={apiKey} />;
  }

  return (
    <div className="app-container">
      <header>
        <h1>ZAP Connector</h1>
        <p>Connect to the Zed Attack Proxy</p>
      </header>
      <main>
        <div className="form-group">
          <label htmlFor="zapHost">ZAP Host URL</label>
          <input
            type="text"
            id="zapHost"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="http://localhost:8080"
            disabled={status === 'loading'}
          />
        </div>

        <div className="form-group">
          <label htmlFor="apiKey">ZAP API Key</label>
          <input
            type="password"
            id="apiKey"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your ZAP API key"
            disabled={status === 'loading'}
          />
        </div>
        
        <button onClick={handleConnect} disabled={status === 'loading'}>
          {status === 'loading' ? 'Connecting...' : 'Connect to ZAP'}
        </button>
        
        {message && (
          <div className={`message-container ${status}`}>
            <p className="message">{message}</p>
            {zapVersion && <p className="version-info">{zapVersion}</p>}
          </div>
        )}
      </main>
    </div>
  );
};

export default Popup;