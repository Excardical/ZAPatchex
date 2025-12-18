import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ZAPScannerPanel } from '@pages/popup/ZAPScannerPanel';
import * as ZapApi from '@utils/zapApi';
import Browser from 'webextension-polyfill';

// Mock API
vi.mock('@utils/zapApi', () => ({
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
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('TC-SCAN-01: Validates Target URL input', async () => {
        render(<ZAPScannerPanel {...defaultProps} />);
        fireEvent.click(screen.getByText('START SCAN'));
        expect(screen.getByText(/Please enter a target URL/i)).toBeInTheDocument();
    });

    // ✅ FIXED: Now waits for the 1.5s success timeout
    it('TC-SCAN-02: Starts and completes a spider scan', async () => {
        // Mock immediate API success
        (ZapApi.startSpiderScan as any).mockResolvedValue('101');
        // Return 100% immediately so the next poll resets the UI
        (ZapApi.checkSpiderStatus as any).mockResolvedValue(100);

        render(<ZAPScannerPanel {...defaultProps} />);

        // 1. Enter URL
        fireEvent.change(
            screen.getByPlaceholderText('https://example.com'),
            { target: { value: 'http://test.com' } }
        );

        // 2. Start Scan
        fireEvent.click(screen.getByText('START SCAN'));

        // 3. Verify Scan UI appears (Look for "Stop Scan" button)
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /stop scan/i })).toBeInTheDocument();
        });

        // 4. Verify Scan Completes and UI Resets (Start button returns)
        // We allow 4000ms to ensure the polling interval has time to fire.
        await waitFor(() => {
            expect(screen.getByText('START SCAN')).toBeInTheDocument();
        }, { timeout: 4000 });

        // 5. Verify Completion Callback
        // CRITICAL FIX: The component has a setTimeout(..., 1500) before calling this.
        // We must wait for that delay using waitFor.
        await waitFor(() => {
            expect(defaultProps.onScanComplete).toHaveBeenCalled();
        }, { timeout: 3000 });
    });

    it('TC-SCAN-03: Toggles Attack Mode (Active Scan)', async () => {
        render(<ZAPScannerPanel {...defaultProps} />);
        fireEvent.click(screen.getByText('Attack'));
        expect(screen.getByText('LAUNCH ATTACK')).toBeInTheDocument();

        const input = screen.getByPlaceholderText('https://example.com');
        fireEvent.change(input, { target: { value: 'http://hack.me' } });
        fireEvent.click(screen.getByText('LAUNCH ATTACK'));

        expect(ZapApi.startActiveScan).toHaveBeenCalled();
    });

    it('TC-SCAN-04: Handles Session Saving', async () => {
        (ZapApi.saveSession as any).mockResolvedValue('OK');
        (ZapApi.getZapHomePath as any).mockResolvedValue('/home/zap');

        render(<ZAPScannerPanel {...defaultProps} />);

        fireEvent.click(screen.getByText('Save Session'));
        const nameInput = screen.getByPlaceholderText('my_session_name');
        fireEvent.change(nameInput, { target: { value: 'test_session' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        expect(ZapApi.saveSession).toHaveBeenCalledWith(defaultProps.host, defaultProps.apiKey, 'test_session');

        await waitFor(() => {
            expect(screen.getByText(/Session saved as 'test_session'/i)).toBeInTheDocument();
        });
    });

    it('TC-SCAN-05: Restores Active Scan state from Storage', async () => {
        (Browser.storage.local.get as any).mockResolvedValue({
            activeScan: {
                id: '999',
                type: 'spider',
                url: 'http://resumed.com',
                ajax: false
            }
        });

        render(<ZAPScannerPanel {...defaultProps} />);

        expect(await screen.findByText(/Resuming spider.../i)).toBeInTheDocument();
        expect(screen.queryByPlaceholderText('https://example.com')).not.toBeInTheDocument();
    });
});