import React, { useState, useEffect } from 'react';
import Browser from 'webextension-polyfill';
import { ActionsPanel } from './ActionsPanel';

// Define interface for storage result
interface StorageResult {
  zapApiKey?: string;
  zapHost?: string;
  rememberMe?: boolean;
}

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

// Helper function to safely access browser storage
const getBrowserStorage = () => {
  if (typeof Browser !== 'undefined' && Browser?.storage?.local) {
    return Browser.storage.local;
  }
  
  // Fallback to chrome API if available
  if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
    return chrome.storage.local;
  }
  
  return null;
};

const Popup = () => {
  const [host, setHost] = useState<string>('http://localhost:8080');
  const [apiKey, setApiKey] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [zapVersion, setZapVersion] = useState<string>('');

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storage = getBrowserStorage();
        
        if (!storage) {
          console.warn('Browser storage not available - running outside extension context?');
          return;
        }

        // Type assertion for the storage result
        const result = await storage.get(['zapApiKey', 'zapHost', 'rememberMe']) as StorageResult;

        if (result.rememberMe && result.zapApiKey) {
          // Explicit type assertions with fallbacks
          setApiKey((result.zapApiKey as string) || '');
          setHost((result.zapHost as string) || 'http://localhost:8080');
          setRememberMe(true);

          // Automatically try to connect if "Remember Me" was checked
          await handleConnect({
            isAutoConnect: true,
            key: (result.zapApiKey as string) || '',
            currentHost: (result.zapHost as string) || 'http://localhost:8080'
          });
        } else if (result.zapHost) {
          // Still load host if it's saved, even if not remembering API key
          setHost((result.zapHost as string) || '');
        }
      } catch (e) {
        console.error("Error loading settings from storage", e);
      }
    };

    loadSettings();
  }, []);

  const handleConnect = async ({ isAutoConnect = false, key = apiKey, currentHost = host }: { isAutoConnect?: boolean; key?: string; currentHost?: string } = {}) => {
    setMessage('');
    setZapVersion('');
    setStatus('loading');
    if (!isAutoConnect) {
      setMessage('Connecting...');
    }

    if (!currentHost?.trim()) {
      setMessage('Must fill in ZAP Host URL first');
      setStatus('error');
      return;
    }
    if (!key?.trim()) {
      setMessage('Must fill in API key first');
      setStatus('error');
      return;
    }

    try {
      const version = await testZapConnection(currentHost, key);
      setMessage(`Connection Successful! ✅`);
      setZapVersion(`ZAP Version: ${version}`);
      setStatus('success');

      const storage = getBrowserStorage();
      
      if (storage) {
        if (rememberMe) {
          await storage.set({ zapApiKey: key, zapHost: currentHost, rememberMe: true });
        } else {
          await storage.remove(['zapApiKey', 'rememberMe']);
          await storage.set({ zapHost: currentHost });
        }
      } else {
        console.warn('Cannot save settings - browser storage not available');
      }
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

        <div className="flex items-center my-3">
          <input
            id="rememberMe"
            name="rememberMe"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
          <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-900 cursor-pointer">
            Remember Me
          </label>
        </div>

        <button onClick={() => handleConnect()} disabled={status === 'loading'} className="w-full p-2.5 border-none rounded bg-blue-600 text-white text-base font-semibold cursor-pointer transition-colors hover:enabled:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
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