import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Browser from 'webextension-polyfill';
import * as ZapApi from '../../../utils/zapApi';

// Mock ZAP API
vi.mock('../../../utils/zapApi', () => ({
    checkSpiderStatus: vi.fn(),
    checkAjaxSpiderStatus: vi.fn(),
    checkActiveScanStatus: vi.fn(),
}));

// We need to capture the event listeners registered by the background script
const listeners: any = {
    onChanged: null,
    onAlarm: null,
    onInstalled: null,
};

// Mock Browser API structure specifically for Background listeners
vi.mock('webextension-polyfill', () => ({
    default: {
        storage: {
            local: { get: vi.fn(), set: vi.fn() },
            onChanged: { addListener: (fn: any) => listeners.onChanged = fn },
        },
        alarms: {
            create: vi.fn(),
            clear: vi.fn(),
            onAlarm: { addListener: (fn: any) => listeners.onAlarm = fn },
        },
        action: {
            setBadgeText: vi.fn(),
            setBadgeBackgroundColor: vi.fn(),
        },
        notifications: {
            create: vi.fn(),
        },
        runtime: {
            onInstalled: { addListener: (fn: any) => listeners.onInstalled = fn },
        }
    }
}));

describe('Background Script Logic', () => {
    // Dynamically import the background script to trigger listener registration
    beforeEach(async () => {
        vi.clearAllMocks();
        // Reset listeners
        listeners.onChanged = null;
        listeners.onAlarm = null;
        // Import the file to run its top-level code (register listeners)
        // Note: In a real build, we might separate logic from side-effects, 
        // but here we rely on the mock setup.
        await import('../index');
    });

    afterEach(() => {
        vi.resetModules(); // Important to re-evaluate the module for fresh listeners
        document.body.innerHTML = ''; // Cleanup
    });

    it('TC-BG-01: Registers listeners on load', () => {
        expect(listeners.onChanged).toBeDefined();
        expect(listeners.onAlarm).toBeDefined();
    });

    it('TC-BG-02: Starts Alarm when activeScan is added to storage', () => {
        const changes = {
            activeScan: {
                newValue: { id: '123', type: 'spider' }
            }
        };

        // Simulate Storage Change
        listeners.onChanged(changes, 'local');

        expect(Browser.alarms.create).toHaveBeenCalledWith('zap-scan-poller', expect.objectContaining({ periodInMinutes: 0.1 }));
        expect(Browser.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
    });

    it('TC-BG-03: Clears Alarm when activeScan is removed', () => {
        const changes = {
            activeScan: {
                oldValue: { id: '123' },
                newValue: undefined // Deleted
            }
        };

        listeners.onChanged(changes, 'local');

        expect(Browser.alarms.clear).toHaveBeenCalledWith('zap-scan-poller');
    });

    it('TC-BG-04: Polls API and Sends Notification on Completion (Spider)', async () => {
        // Mock Storage Get
        (Browser.storage.local.get as any).mockResolvedValue({
            activeScan: { id: '101', type: 'spider', host: 'http://loc', apiKey: 'key' }
        });

        // Mock API Progress (100%)
        (ZapApi.checkSpiderStatus as any).mockResolvedValue(100);

        // Simulate Alarm Trigger
        await listeners.onAlarm({ name: 'zap-scan-poller' });

        // Expectations
        expect(ZapApi.checkSpiderStatus).toHaveBeenCalledWith('http://loc', 'key', '101');

        // Should create notification
        expect(Browser.notifications.create).toHaveBeenCalledWith(expect.objectContaining({
            title: 'ZAPatchex Scan Complete',
            message: expect.stringContaining('spider scan is complete')
        }));

        // Should set Green Badge
        expect(Browser.action.setBadgeText).toHaveBeenCalledWith({ text: '●' });
        expect(Browser.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#00FF00' });

        // Should Clear Alarm
        expect(Browser.alarms.clear).toHaveBeenCalledWith('zap-scan-poller');
    });

    it('TC-BG-05: Does not notify if scan is still running', async () => {
        (Browser.storage.local.get as any).mockResolvedValue({
            activeScan: { id: '101', type: 'spider', host: 'http://loc', apiKey: 'key' }
        });

        // Mock API Progress (50%)
        (ZapApi.checkSpiderStatus as any).mockResolvedValue(50);

        await listeners.onAlarm({ name: 'zap-scan-poller' });

        expect(Browser.notifications.create).not.toHaveBeenCalled();
        expect(Browser.alarms.clear).not.toHaveBeenCalled();
    });
});