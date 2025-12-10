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
    const regex = `${targetUrl}.*`;
    url.searchParams.append('regex', regex);

    const response = await fetch(url.toString());
    const data = await response.json();
    if (data.Result !== 'OK') throw new Error('Failed to update scope');
    return 'Target added to Scope';
};

export const setZapMode = async (host: string, apiKey: string, mode: 'safe' | 'protected' | 'standard' | 'attack'): Promise<string> => {
    const url = new URL(`${host}/JSON/core/action/setMode/`);
    url.searchParams.append('apikey', apiKey);
    url.searchParams.append('mode', mode);

    const response = await fetch(url.toString());
    const data = await response.json();
    if (data.Result !== 'OK') throw new Error('Failed to set mode');
    return `Mode switched to ${mode}`;
};

export const toggleGlobalBreakpoint = async (host: string, apiKey: string, enable: boolean): Promise<string> => {
    const action = enable ? 'break' : 'continue';
    const url = new URL(`${host}/JSON/break/action/${action}/`);
    url.searchParams.append('apikey', apiKey);

    if (enable) {
        url.searchParams.append('type', 'http-all');
        url.searchParams.append('state', 'true');
    }

    const response = await fetch(url.toString());
    const data = await response.json();
    if (data.Result !== 'OK') throw new Error('Failed to toggle interception');
    return enable ? 'Interception ON' : 'Interception OFF';
};

export const createNewSession = async (host: string, apiKey: string): Promise<string> => {
    const url = new URL(`${host}/JSON/core/action/newSession/`);
    url.searchParams.append('apikey', apiKey);
    url.searchParams.append('overwrite', 'true');

    const response = await fetch(url.toString());
    const data = await response.json();
    if (data.Result !== 'OK') throw new Error('Failed to reset session');
    return 'Session Reset Successful';
};

export const getSites = async (host: string, apiKey: string): Promise<string[]> => {
    const url = new URL(`${host}/JSON/core/view/sites/`);
    url.searchParams.append('apikey', apiKey);

    const response = await fetch(url.toString());
    const data = await response.json();
    return data.sites || [];
};

export const saveSession = async (host: string, apiKey: string, fileName: string): Promise<string> => {
    const url = new URL(`${host}/JSON/core/action/saveSession/`);
    url.searchParams.append('apikey', apiKey);
    url.searchParams.append('name', fileName);
    url.searchParams.append('overwrite', 'true');

    const response = await fetch(url.toString());
    const data = await response.json();
    if (data.Result !== 'OK') throw new Error('Failed to save session');
    return 'Session Saved';
};

export const getZapHomePath = async (host: string, apiKey: string): Promise<string> => {
    const url = new URL(`${host}/JSON/core/view/zapHomePath/`);
    url.searchParams.append('apikey', apiKey);
    const response = await fetch(url.toString());
    const data = await response.json();
    return data.zapHomePath || '';
};

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

export const shutdownZAP = async (host: string, apiKey: string): Promise<string> => {
    const url = new URL(`${host}/JSON/core/action/shutdown/`);
    url.searchParams.append('apikey', apiKey);
    const response = await fetch(url.toString());
    const data = await response.json();
    if (data.Result !== 'OK') throw new Error('Failed to shutdown ZAP');
    return 'ZAP Shutdown Initiated';
};