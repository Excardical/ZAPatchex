import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('clipboardy', () => ({ default: { write: vi.fn() } }));
const mockQuestion = vi.fn();
const mockClose = vi.fn();
vi.mock('readline', () => ({
    default: { createInterface: vi.fn(() => ({ question: mockQuestion, close: mockClose })) },
}));

global.fetch = vi.fn();

describe('ZAP Extractor Script', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
    });

    it('TC-SCRIPT-01: Quits immediately if user enters "q"', async () => {
        mockQuestion
            .mockImplementationOnce((q, cb) => cb('123')) // API Key
            .mockImplementationOnce((q, cb) => cb('q'));   // Quit

        // FIXED: Must return alerts to reach the second question (menu)
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ alerts: [{ name: 'Test' }] }),
        });

        await import('../zap-extractor');
        expect(mockQuestion).toHaveBeenCalledTimes(2);
        expect(mockClose).toHaveBeenCalled();
    });

    it('TC-SCRIPT-03: Copies formatted alert to clipboard', async () => {
        mockQuestion
            .mockImplementationOnce((q, cb) => cb('123'))
            .mockImplementationOnce((q, cb) => cb('0'))
            .mockImplementationOnce((q, cb) => cb('q'));

        const mockAlerts = [
            {
                name: 'SQL Injection',
                risk: 'High',
                description: 'Bad code',
                solution: 'Fix it',
                url: 'http://vuln.com'
            }
        ];

        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ alerts: mockAlerts }),
        });

        const clipboardy = await import('clipboardy');
        await import('../zap-extractor');

        // FIXED: The script formats a large string. We just check if it contains key parts.
        expect(clipboardy.default.write).toHaveBeenCalledWith(
            expect.stringContaining('SQL Injection')
        );
        expect(clipboardy.default.write).toHaveBeenCalledWith(
            expect.stringContaining('http://vuln.com')
        );
    });
});