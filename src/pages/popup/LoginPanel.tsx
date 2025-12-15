import React, { useState } from 'react';
import Browser from 'webextension-polyfill';
import { InfoTooltip } from './InfoTooltip';

interface LoginPanelProps {
    onLoginSuccess: (host: string, apiKey: string) => void;
}

export const LoginPanel: React.FC<LoginPanelProps> = ({ onLoginSuccess }) => {
    const [hostInput, setHostInput] = useState('http://localhost:8080');
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [zapVersion, setZapVersion] = useState<string>('');

    const handleConnect = async () => {
        setIsChecking(true);
        setError(null);
        setZapVersion('');

        // Basic URL validation
        let formattedHost = hostInput.replace(/\/$/, ''); // Remove trailing slash
        if (!formattedHost.startsWith('http')) {
            formattedHost = 'http://' + formattedHost;
        }

        try {
            // 1. Validation
            if (!formattedHost) throw new Error('Host URL is required');
            if (!apiKeyInput.trim()) throw new Error('Must fill in API key first');

            // 2. Connection Test (Version Check)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);

            const url = `${formattedHost}/JSON/core/view/version/?apikey=${apiKeyInput}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: { 'X-ZAP-API-Key': apiKeyInput },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Authentication failed. Status: ${response.status}`);
            }

            const data = await response.json();
            if (!data.version) {
                throw new Error('Unexpected response from ZAP.');
            }

            // Success!
            setZapVersion(data.version);

            // 3. Save to Storage
            await Browser.storage.local.set({
                zapHost: formattedHost,
                rememberMe: rememberMe
            });

            if (rememberMe) {
                await Browser.storage.local.set({ zapApiKey: apiKeyInput });
            } else {
                await Browser.storage.local.remove('zapApiKey');
            }

            // 4. Notify Parent
            setTimeout(() => {
                onLoginSuccess(formattedHost, apiKeyInput);
            }, 500);

        } catch (err: any) {
            console.error(err);
            if (err.name === 'AbortError') {
                setError('Connection timed out. Is ZAP running?');
            } else {
                setError(err.message || 'Could not connect to ZAP.');
            }
        } finally {
            setIsChecking(false);
        }
    };

    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-slate-900 text-slate-200">
            <div className="w-full max-w-xs space-y-6">

                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center shadow-lg mx-auto border border-slate-700">
                        <img src={chrome.runtime.getURL('Icons/OWASP_ZAP_Logo.png')} alt="Logo" className="w-10 h-10 object-contain" />
                    </div>
                    <h1 className="text-xl font-bold text-white merriweather-font">Connect to ZAP</h1>
                    <p className="text-xs text-slate-400">Enter your ZAP credentials to start.</p>
                </div>

                {/* Form */}
                <div className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">ZAP Host</label>
                        <input
                            type="text"
                            value={hostInput}
                            onChange={(e) => setHostInput(e.target.value)}
                            placeholder="http://localhost:8080"
                            className="w-full bg-slate-800 text-sm p-3 rounded border border-slate-700 focus:border-cyan-500 outline-none transition-colors"
                        />
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center gap-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">API Key</label>
                            <InfoTooltip
                                text="Open ZAP Desktop → Tools Menu → Options → API → Copy 'API Key'"
                            />
                        </div>
                        <input
                            type="password"
                            value={apiKeyInput}
                            onChange={(e) => setApiKeyInput(e.target.value)}
                            placeholder="Enter your API Key"
                            className="w-full bg-slate-800 text-sm p-3 rounded border border-slate-700 focus:border-cyan-500 outline-none transition-colors"
                        />
                    </div>

                    {/* Remember Me */}
                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="rememberMe"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-600 text-cyan-500 focus:ring-offset-slate-900 focus:ring-cyan-500 bg-slate-800"
                        />
                        <label htmlFor="rememberMe" className="text-xs text-slate-300 select-none cursor-pointer">
                            Remember Me
                        </label>
                    </div>
                </div>

                {/* Feedback Messages */}
                {error && (
                    <div className="p-3 bg-red-900/20 border border-red-500/50 rounded text-red-300 text-xs text-center animate-fade-in">
                        {error}
                    </div>
                )}
                {zapVersion && !error && (
                    <div className="p-3 bg-green-900/20 border border-green-500/50 rounded text-green-300 text-xs text-center animate-fade-in">
                        Connected! {zapVersion}
                    </div>
                )}

                {/* Button */}
                <button
                    onClick={handleConnect}
                    disabled={isChecking || !!zapVersion}
                    className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded shadow-lg shadow-cyan-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isChecking ? 'Connecting...' : zapVersion ? 'Redirecting...' : 'Connect'}
                </button>
            </div>
        </div>
    );
};
