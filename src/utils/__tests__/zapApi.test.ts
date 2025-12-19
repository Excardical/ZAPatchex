import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    startSpiderScan,
    checkSpiderStatus,
    startAjaxSpiderScan,
    checkAjaxSpiderStatus,
    startActiveScan,
    checkActiveScanStatus,
    stopSpiderScan,
    stopAjaxSpiderScan,
    stopActiveScan,
    shutdownZAP,
    saveSession,
    createNewSession,
    getZapHomePath,
    getSites
} from '../zapApi';

global.fetch = vi.fn();

describe('ZAP API Utilities', () => {
    const MOCK_HOST = 'http://localhost:8080';
    const MOCK_KEY = '12345';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('TC-ZAPI-01: startSpiderScan should call the correct URL and return scan ID', async () => {
        (global.fetch as any).mockResolvedValue({
            json: async () => ({ scan: '5' }),
        });

        const scanId = await startSpiderScan(MOCK_HOST, MOCK_KEY, 'http://target.com');

        expect(scanId).toBe('5');
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/JSON/spider/action/scan/'),
            expect.objectContaining({ method: 'GET' })
        );
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('apikey=12345'),
            expect.anything()
        );
    });

    it('TC-ZAPI-02: checkSpiderStatus should return status as number', async () => {
        (global.fetch as any).mockResolvedValue({
            json: async () => ({ status: '45' }),
        });

        const status = await checkSpiderStatus(MOCK_HOST, MOCK_KEY, '5');
        expect(status).toBe(45);
    });

    it('TC-ZAPI-03: startAjaxSpiderScan should return running status on success', async () => {
        (global.fetch as any).mockResolvedValue({
            json: async () => ({ Result: 'OK' }),
        });

        const result = await startAjaxSpiderScan(MOCK_HOST, MOCK_KEY, 'http://target.com');
        expect(result).toBe('ajax_scan_running');
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/JSON/ajaxSpider/action/scan/'),
            expect.anything()
        );
    });

    it('TC-ZAPI-04: checkAjaxSpiderStatus should return status string', async () => {
        (global.fetch as any).mockResolvedValue({
            json: async () => ({ status: 'running' }),
        });

        const status = await checkAjaxSpiderStatus(MOCK_HOST, MOCK_KEY);
        expect(status).toBe('running');
    });

    it('TC-ZAPI-05: startActiveScan should initiate scan and return ID', async () => {
        (global.fetch as any).mockResolvedValue({
            json: async () => ({ scan: '10' }),
        });

        const scanId = await startActiveScan(MOCK_HOST, MOCK_KEY, 'http://target.com');
        expect(scanId).toBe('10');
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/JSON/ascan/action/scan/'),
            expect.anything()
        );
    });

    it('TC-ZAPI-06: checkActiveScanStatus should return percentage as number', async () => {
        (global.fetch as any).mockResolvedValue({
            json: async () => ({ status: '80' }),
        });

        const status = await checkActiveScanStatus(MOCK_HOST, MOCK_KEY, '10');
        expect(status).toBe(80);
    });

    it('TC-ZAPI-07: stopSpiderScan should call stop action', async () => {
        (global.fetch as any).mockResolvedValue({
            json: async () => ({ Result: 'OK' }),
        });

        const result = await stopSpiderScan(MOCK_HOST, MOCK_KEY, '5');
        expect(result).toBe('OK');
        // FIXED: Removed expect.anything() as stopSpiderScan calls fetch with only URL
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/JSON/spider/action/stop/')
        );
    });

    it('TC-ZAPI-08: stopAjaxSpiderScan should call stop action', async () => {
        (global.fetch as any).mockResolvedValue({
            json: async () => ({ Result: 'OK' }),
        });

        const result = await stopAjaxSpiderScan(MOCK_HOST, MOCK_KEY);
        expect(result).toBe('OK');
    });

    it('TC-ZAPI-09: stopActiveScan should call stop action', async () => {
        (global.fetch as any).mockResolvedValue({
            json: async () => ({ Result: 'OK' }),
        });

        const result = await stopActiveScan(MOCK_HOST, MOCK_KEY, '10');
        expect(result).toBe('OK');
    });

    it('TC-ZAPI-10: shutdownZAP should call shutdown endpoint', async () => {
        (global.fetch as any).mockResolvedValue({
            json: async () => ({ Result: 'OK' }),
        });

        const result = await shutdownZAP(MOCK_HOST, MOCK_KEY);
        expect(result).toBe('ZAP Shutdown Initiated');
        // FIXED: Removed expect.anything()
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/JSON/core/action/shutdown/')
        );
    });

    it('TC-ZAPI-11: saveSession should call core save action', async () => {
        (global.fetch as any).mockResolvedValue({
            json: async () => ({ Result: 'OK' }),
        });

        const result = await saveSession(MOCK_HOST, MOCK_KEY, 'my_report');
        expect(result).toBe('Session Saved');
        // FIXED: Removed expect.anything()
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/JSON/core/action/saveSession/')
        );
    });

    it('TC-ZAPI-12: createNewSession should reset session', async () => {
        (global.fetch as any).mockResolvedValue({
            json: async () => ({ Result: 'OK' }),
        });

        const result = await createNewSession(MOCK_HOST, MOCK_KEY);
        expect(result).toBe('Session Reset Successful');
    });

    it('TC-ZAPI-13: getZapHomePath should return path string', async () => {
        (global.fetch as any).mockResolvedValue({
            json: async () => ({ zapHomePath: '/home/zap' }),
        });

        const path = await getZapHomePath(MOCK_HOST, MOCK_KEY);
        expect(path).toBe('/home/zap');
    });

    it('TC-ZAPI-14: getSites should return list of sites', async () => {
        (global.fetch as any).mockResolvedValue({
            json: async () => ({ sites: ['http://a.com', 'http://b.com'] }),
        });

        const sites = await getSites(MOCK_HOST, MOCK_KEY);
        expect(sites).toHaveLength(2);
        expect(sites).toContain('http://a.com');
    });
});