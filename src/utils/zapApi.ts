// src/utils/zapApi.ts

/**
 * Common ZAP API interactions
 */

export const startSpiderScan = async (host: string, apiKey: string, targetUrl: string): Promise<string> => {
    const url = new URL(`${host}/JSON/spider/action/scan/`);
    url.searchParams.append('apikey', apiKey);
    url.searchParams.append('url', targetUrl);
    url.searchParams.append('recurse', 'true');

    const response = await fetch(url.toString(), { method: 'GET' });
    const data = await response.json();
    if (!data.scan) throw new Error('Spider start failed');
    return data.scan;
};

export const startAjaxSpiderScan = async (host: string, apiKey: string, targetUrl: string): Promise<string> => {
    const url = new URL(`${host}/JSON/ajaxSpider/action/scan/`);
    url.searchParams.append('apikey', apiKey);
    url.searchParams.append('url', targetUrl);
    url.searchParams.append('inScope', 'true');
    url.searchParams.append('subtreeOnly', 'true');

    const response = await fetch(url.toString(), { method: 'GET' });
    const data = await response.json();
    // AJAX Spider returns "OK" usually, status is tracked differently, 
    // but we return a dummy ID "ajax" to track state consistent with standard spider
    if (data.Result !== 'OK') throw new Error('AJAX Spider start failed');
    return 'ajax_scan_running';
};

export const checkSpiderStatus = async (host: string, apiKey: string, scanId: string): Promise<number> => {
    const url = new URL(`${host}/JSON/spider/view/status/`);
    url.searchParams.append('apikey', apiKey);
    url.searchParams.append('scanId', scanId);
    const response = await fetch(url.toString());
    const data = await response.json();
    return parseInt(data.status, 10);
};

export const checkAjaxSpiderStatus = async (host: string, apiKey: string): Promise<string> => {
    const url = new URL(`${host}/JSON/ajaxSpider/view/status/`);
    url.searchParams.append('apikey', apiKey);
    const response = await fetch(url.toString());
    const data = await response.json();
    // Returns "running" or "stopped"
    return data.status;
};

export const startActiveScan = async (host: string, apiKey: string, targetUrl: string, recurse = true): Promise<string> => {
    const url = new URL(`${host}/JSON/ascan/action/scan/`);
    url.searchParams.append('apikey', apiKey);
    url.searchParams.append('url', targetUrl);
    url.searchParams.append('recurse', String(recurse));
    url.searchParams.append('inScopeOnly', 'false');

    const response = await fetch(url.toString(), { method: 'GET' });
    const data = await response.json();
    if (!data.scan) throw new Error('Active Scan start failed');
    return data.scan;
};

export const checkActiveScanStatus = async (host: string, apiKey: string, scanId: string): Promise<number> => {
    const url = new URL(`${host}/JSON/ascan/view/status/`);
    url.searchParams.append('apikey', apiKey);
    url.searchParams.append('scanId', scanId);
    const response = await fetch(url.toString());
    const data = await response.json();
    return parseInt(data.status, 10);
};

export const generateHtmlReport = async (host: string, apiKey: string): Promise<Blob> => {
    const url = new URL(`${host}/OTHER/core/other/htmlreport/`);
    url.searchParams.append('apikey', apiKey);

    const response = await fetch(url.toString(), { method: 'GET' });
    if (!response.ok) throw new Error('Failed to generate report');
    return await response.blob();
};

// --- 1. CONTEXT / SCOPE MANAGER ---
export const getContextList = async (host: string, apiKey: string): Promise<string[]> => {
    const url = new URL(`${host}/JSON/context/view/contextList/`);
    url.searchParams.append('apikey', apiKey);
    const response = await fetch(url.toString());
    const data = await response.json();
    return data.contextList || ['Default Context'];
};

export const includeInContext = async (host: string, apiKey: string, contextName: string, targetUrl: string): Promise<string> => {
    const url = new URL(`${host}/JSON/context/action/includeInContext/`);
    url.searchParams.append('apikey', apiKey);
    url.searchParams.append('contextName', contextName);
    // Regex to match the domain and all sub-resources
    const regex = `${targetUrl}.*`;
    url.searchParams.append('regex', regex);

    const response = await fetch(url.toString());
    const data = await response.json();
    if (data.Result !== 'OK') throw new Error('Failed to update scope');
    return 'Target added to Scope';
};

// --- 2. ZAP MODE ---
export const setZapMode = async (host: string, apiKey: string, mode: 'safe' | 'protected' | 'standard' | 'attack'): Promise<string> => {
    const url = new URL(`${host}/JSON/core/action/setMode/`);
    url.searchParams.append('apikey', apiKey);
    url.searchParams.append('mode', mode);

    const response = await fetch(url.toString());
    const data = await response.json();
    if (data.Result !== 'OK') throw new Error('Failed to set mode');
    return `Mode switched to ${mode}`;
};

// --- 3. GLOBAL BREAKPOINT (INTERCEPT) ---
export const toggleGlobalBreakpoint = async (host: string, apiKey: string, enable: boolean): Promise<string> => {
    // 'break' turns it ON, 'continue' turns it OFF
    const action = enable ? 'break' : 'continue';
    const url = new URL(`${host}/JSON/break/action/${action}/`);
    url.searchParams.append('apikey', apiKey);

    if (enable) {
        // http-all intercepts both Requests and Responses
        url.searchParams.append('type', 'http-all');
        url.searchParams.append('state', 'true');
    }

    const response = await fetch(url.toString());
    const data = await response.json();
    if (data.Result !== 'OK') throw new Error('Failed to toggle interception');
    return enable ? 'Interception ON' : 'Interception OFF';
};

// --- 4. NEW SESSION (RESET) ---
export const createNewSession = async (host: string, apiKey: string): Promise<string> => {
    const url = new URL(`${host}/JSON/core/action/newSession/`);
    url.searchParams.append('apikey', apiKey);
    url.searchParams.append('overwrite', 'true');

    const response = await fetch(url.toString());
    const data = await response.json();
    if (data.Result !== 'OK') throw new Error('Failed to reset session');
    return 'Session Reset Successful';
};

// --- 5. SITE TREE (DISCOVERY) ---
export const getSites = async (host: string, apiKey: string): Promise<string[]> => {
    const url = new URL(`${host}/JSON/core/view/sites/`);
    url.searchParams.append('apikey', apiKey);

    const response = await fetch(url.toString());
    const data = await response.json();
    return data.sites || [];
};

// --- 6. SNAPSHOT (SAVE SESSION) ---
export const saveSession = async (host: string, apiKey: string, fileName: string): Promise<string> => {
    const url = new URL(`${host}/JSON/core/action/snapshot/`);
    url.searchParams.append('apikey', apiKey);
    // Note: ZAP saves this to its local directory unless full path is given
    url.searchParams.append('name', fileName);

    const response = await fetch(url.toString());
    const data = await response.json();
    if (data.Result !== 'OK') throw new Error('Failed to save session');
    return 'Session Saved';
};

// --- 7. STOP SCANS ---
export const stopSpiderScan = async (host: string, apiKey: string, scanId: string): Promise<string> => {
    const url = new URL(`${host}/JSON/spider/action/stop/`);
    url.searchParams.append('apikey', apiKey);
    url.searchParams.append('scanId', scanId);

    const response = await fetch(url.toString());
    const data = await response.json();
    return data.Result;
};

export const stopAjaxSpiderScan = async (host: string, apiKey: string): Promise<string> => {
    const url = new URL(`${host}/JSON/ajaxSpider/action/stop/`);
    url.searchParams.append('apikey', apiKey);

    const response = await fetch(url.toString());
    const data = await response.json();
    return data.Result;
};

export const stopActiveScan = async (host: string, apiKey: string, scanId: string): Promise<string> => {
    const url = new URL(`${host}/JSON/ascan/action/stop/`);
    url.searchParams.append('apikey', apiKey);
    url.searchParams.append('scanId', scanId);

    const response = await fetch(url.toString());
    const data = await response.json();
    return data.Result;
};