import React, { useState, useEffect } from 'react';
import Browser from 'webextension-polyfill';
// Note: We no longer import the other panels here.

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
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [zapVersion, setZapVersion] = useState<string>('');

  // Effect to load initial settings for the form
  useEffect(() => {
    const loadSettings = async () => {
      const storage = getBrowserStorage();
      if (!storage) return;
      try {
        const result = await storage.get(['zapHost', 'rememberMe']) as StorageResult;
        setHost(result.zapHost || 'http://localhost:8080');
        const shouldRemember = !!result.rememberMe;
        setRememberMe(shouldRemember);

        // If rememberMe is on, also load the API key for the input field
        if (shouldRemember) {
            const keyResult = await storage.get('zapApiKey');
            if (keyResult.zapApiKey) {
                setApiKey(keyResult.zapApiKey);
            }
        }
      } catch (e) {
        console.error("Error loading settings", e);
      }
    };
    loadSettings();
  }, []);

  const handleRememberMeChange = async (isChecked: boolean) => {
    setRememberMe(isChecked);
    const storage = getBrowserStorage();
    if (storage) {
        try {
            await storage.set({ rememberMe: isChecked });
            if (!isChecked) {
                await storage.remove('zapApiKey');
            }
        } catch(e) {
            console.error("Error saving 'rememberMe' status", e);
        }
    }
  };

  const handleConnect = async () => {
    setMessage('');
    setZapVersion('');
    setStatus('loading');
    setMessage('Connecting...');

    if (!host?.trim() || !apiKey?.trim()) {
      setMessage('Host and API Key are required.');
      setStatus('error');
      return;
    }

    try {
      // 1. Test the connection
      await testZapConnection(host, apiKey);

      // 2. Save details to storage so the new tab can read them
      const storage = getBrowserStorage();
      if (storage) {
        await storage.set({ zapHost: host });
        if (rememberMe) {
          await storage.set({ zapApiKey: apiKey });
        }
      }

      // 3. Create the new persistent tab
      await Browser.tabs.create({
        url: Browser.runtime.getURL('src/pages/main/index.html'),
      });

      // 4. Close this temporary popup
      window.close();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      setMessage(errorMessage);
      setStatus('error');
    }
  };

  // The popup now ONLY renders the connection form.
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
            onChange={(e) => handleRememberMeChange(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
          <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-900 cursor-pointer">
            Remember Me
          </label>
        </div>
        <button onClick={handleConnect} disabled={status === 'loading'} className="w-full p-2.5 border-none rounded bg-blue-600 text-white text-base font-semibold cursor-pointer transition-colors hover:enabled:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
          {status === 'loading' ? 'Connecting...' : 'Connect to ZAP'}
        </button>
        {message && (
          <div className={`mt-4 p-2.5 rounded font-medium text-center ${status === 'error' ? 'bg-red-100 text-red-700' : 'text-gray-600'}`}>
            <p>{message}</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Popup;

