import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ZAPScannerPanel } from '@pages/popup/ZAPScannerPanel';
import * as ZapApi from '@utils/zapApi';
import Browser from 'webextension-polyfill';

// Mock API
vi.mock('../../utils/zapApi', () => ({
    startSpiderScan: vi.fn(),
    startAjaxSpiderScan: vi.fn(),
    startActiveScan: vi.fn(),
    checkSpiderStatus: vi.fn(),
    checkAjaxSpiderStatus: vi.fn(),
    checkActiveScanStatus: vi.fn(),
    stopSpiderScan: vi.fn(),
    stopAjaxSpiderScan: vi.fn(),
    stopActiveScan: vi.fn(),
    createNewSession: vi.fn(),
    saveSession: vi.fn(),
    getZapHomePath: vi.fn(),
    shutdownZAP: vi.fn(),
}));

describe('ZAPScannerPanel Component', () => {
    const defaultProps = {
        host: 'http://localhost:8080',
        apiKey: '123',
        onScanStart: vi.fn(),
        onScanComplete: vi.fn(),
        onViewReports: vi.fn(),
        onDisconnect: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('TC-SCAN-01: Validates Target URL input', async () => {
        render(<ZAPScannerPanel {...defaultProps} />);

        const startBtn = screen.getByText('START SCAN');
        fireEvent.click(startBtn);

        // Expect Error Message
        expect(screen.getByText(/Please enter a target URL/i)).toBeInTheDocument();
    });

    it('TC-SCAN-02: Starts Spider Scan and Polls Progress', async () => {
        (ZapApi.startSpiderScan as any).mockResolvedValue('101');
        (ZapApi.checkSpiderStatus as any)
            .mockResolvedValueOnce(0)
            .mockResolvedValueOnce(50)
            .mockResolvedValueOnce(100);

        render(<ZAPScannerPanel {...defaultProps} />);

        // Input URL
        const input = screen.getByPlaceholderText('https://example.com');
        fireEvent.change(input, { target: { value: 'http://test.com' } });

        // Start Scan
        fireEvent.click(screen.getByText('START SCAN'));

        // Check if API called
        expect(ZapApi.startSpiderScan).toHaveBeenCalledWith(defaultProps.host, defaultProps.apiKey, 'http://test.com');

        // Check Loading State
        expect(screen.getByText(/Starting spider.../i)).toBeInTheDocument();

        // Advance Time for Polling (3 ticks)
        await act(async () => {
            vi.advanceTimersByTime(1000); // 0%
        });
        await act(async () => {
            vi.advanceTimersByTime(1000); // 50%
        });
        expect(screen.getByText('Spider: 50%')).toBeInTheDocument();

        await act(async () => {
            vi.advanceTimersByTime(1000); // 100%
        });

        expect(screen.getByText(/Spider Complete/i)).toBeInTheDocument();

        // Wait for onScanComplete timeout
        await act(async () => {
            vi.advanceTimersByTime(1500);
        });
        expect(defaultProps.onScanComplete).toHaveBeenCalled();
    });

    it('TC-SCAN-03: Toggles Attack Mode (Active Scan)', async () => {
        render(<ZAPScannerPanel {...defaultProps} />);

        // Click "Attack" card
        fireEvent.click(screen.getByText('Attack'));

        // Button should change text
        expect(screen.getByText('LAUNCH ATTACK')).toBeInTheDocument();

        // Start
        const input = screen.getByPlaceholderText('https://example.com');
        fireEvent.change(input, { target: { value: 'http://hack.me' } });
        fireEvent.click(screen.getByText('LAUNCH ATTACK'));

        expect(ZapApi.startActiveScan).toHaveBeenCalled();
    });

    it('TC-SCAN-04: Handles Session Saving', async () => {
        (ZapApi.saveSession as any).mockResolvedValue('OK');
        (ZapApi.getZapHomePath as any).mockResolvedValue('/home/zap');

        render(<ZAPScannerPanel {...defaultProps} />);

        // Open Modal
        fireEvent.click(screen.getByText('Save Session'));
        expect(screen.getByText('Enter a filename for the ZAP session:')).toBeInTheDocument();

        // Enter Name and Confirm
        const nameInput = screen.getByPlaceholderText('my_session_name');
        fireEvent.change(nameInput, { target: { value: 'test_session' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        expect(ZapApi.saveSession).toHaveBeenCalledWith(defaultProps.host, defaultProps.apiKey, 'test_session');

        // Verify success message
        await act(async () => {
            expect(screen.getByText(/Session saved as 'test_session'/i)).toBeInTheDocument();
        });
    });

    it('TC-SCAN-05: Restores Active Scan state from Storage', async () => {
        // Mock stored state
        (Browser.storage.local.get as any).mockResolvedValue({
            activeScan: {
                id: '999',
                type: 'spider',
                url: 'http://resumed.com',
                ajax: false
            }
        });

        render(<ZAPScannerPanel {...defaultProps} />);

        // Should automatically enter loading/polling state
        expect(await screen.findByText(/Resuming spider.../i)).toBeInTheDocument();
        expect(screen.queryByPlaceholderText('https://example.com')).not.toBeInTheDocument(); // Input hidden during scan
    });
});