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