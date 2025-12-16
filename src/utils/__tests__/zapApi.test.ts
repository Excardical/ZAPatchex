import { describe, it, expect, vi, beforeEach } from 'vitest';
import { startSpiderScan, checkSpiderStatus } from '../zapApi';

// Mock the global fetch function
global.fetch = vi.fn();

describe('ZAP API Utilities', () => {
    const MOCK_HOST = 'http://localhost:8080';
    const MOCK_KEY = '12345';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('startSpiderScan should call the correct URL and return scan ID', async () => {
        // Mock a successful response
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

    it('checkSpiderStatus should return status as number', async () => {
        (global.fetch as any).mockResolvedValue({
            json: async () => ({ status: '45' }),
        });

        const status = await checkSpiderStatus(MOCK_HOST, MOCK_KEY, '5');
        expect(status).toBe(45);
    });
});