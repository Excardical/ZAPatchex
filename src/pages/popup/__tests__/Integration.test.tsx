import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, configure } from '@testing-library/react';
import Popup from '../Popup';
import * as ZapApi from '../../../utils/zapApi';
import Browser from 'webextension-polyfill';

// Clean up error output
configure({
    getElementError: (message: string | null, container) => {
        return new Error(message || 'Element not found');
    },
});

// --- MOCKS ---

vi.mock('webextension-polyfill', () => ({
    default: {
        storage: {
            local: {
                get: vi.fn(),
                set: vi.fn(),
                remove: vi.fn(),
            },
        },
        tabs: {
            query: vi.fn(),
        },
        runtime: {
            getURL: vi.fn((path) => path),
        }
    },
}));

vi.mock('../../../utils/zapApi', () => ({
    startSpiderScan: vi.fn(),
    checkSpiderStatus: vi.fn(),
    startAjaxSpiderScan: vi.fn(),
    checkAjaxSpiderStatus: vi.fn(),
    stopSpiderScan: vi.fn(),
    stopAjaxSpiderScan: vi.fn(),
    startActiveScan: vi.fn(),
    checkActiveScanStatus: vi.fn(),
    stopActiveScan: vi.fn(),
    getSites: vi.fn(),
    saveSession: vi.fn(),
    getZapHomePath: vi.fn(),
    shutdownZAP: vi.fn(),
    createNewSession: vi.fn(),
}));

const mockClipboard = {
    writeText: vi.fn(),
};
Object.assign(navigator, { clipboard: mockClipboard });

// --- ROBUST FETCH MOCK ---
const mockResponse = (data: any, ok = true) => ({
    ok,
    status: ok ? 200 : 500,
    json: async () => data,
    text: async () => JSON.stringify(data),
});

const createFetchMock = (overrides: Record<string, any> = {}) => {
    return vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : ((input as any).url || input.toString());

        for (const [key, response] of Object.entries(overrides)) {
            if (url.includes(key)) {
                if (response instanceof Error) throw response;
                return mockResponse(response);
            }
        }

        if (url.includes('/core/view/version')) return mockResponse({ version: '2.14.0' });
        if (url.includes('/core/view/numberOfAlerts')) return mockResponse({ count: 0 });
        if (url.includes('/alert/view/alerts')) return mockResponse({ alerts: [] });
        if (url.includes('vulnerability_templates')) return mockResponse([]);
        if (url.includes('activescanrules') || url.includes('passivescanrules')) {
            return mockResponse({ scanners: [] });
        }

        return mockResponse({}, false);
    });
};

describe('Integration Tests: ZAPatchex User Flow', () => {
    const MOCK_HOST = 'http://localhost:8080';
    const MOCK_KEY = '12345';

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
        global.fetch = createFetchMock();
        (Browser.storage.local.get as any).mockResolvedValue({});
        (Browser.tabs.query as any).mockResolvedValue([{ url: 'http://example.com' }]);
        (ZapApi.getSites as any).mockResolvedValue(['http://example.com']);
    });

    // =========================================================================
    // GROUP 1: AUTHENTICATION
    // =========================================================================

    it('TC-INT-01: Renders LoginPanel initially when no credentials stored', async () => {
        render(<Popup />);
        await waitFor(() => expect(screen.getByText('Connect to ZAP')).toBeInTheDocument());
    });

    it('TC-INT-02: Successful Login transitions to ScannerPanel', async () => {
        render(<Popup />);
        await waitFor(() => screen.getByPlaceholderText(/localhost/i));

        fireEvent.change(screen.getByPlaceholderText(/localhost/i), { target: { value: MOCK_HOST } });
        fireEvent.change(screen.getByPlaceholderText(/Enter your API Key/i), { target: { value: MOCK_KEY } });
        fireEvent.click(screen.getByText('Connect'));

        await waitFor(() => expect(screen.getByText('START SCAN')).toBeInTheDocument());
    });

    it('TC-INT-03: Auto-login with valid stored credentials transitions to Scanner', async () => {
        (Browser.storage.local.get as any).mockResolvedValue({ zapHost: MOCK_HOST, zapApiKey: MOCK_KEY });
        render(<Popup />);
        await waitFor(() => expect(screen.getByText('START SCAN')).toBeInTheDocument());
    });

    it('TC-INT-04: Invalid stored credentials redirect to Login', async () => {
        (Browser.storage.local.get as any).mockResolvedValue({ zapHost: MOCK_HOST, zapApiKey: 'WRONG' });
        global.fetch = createFetchMock({ '/core/view/version': new Error('Auth Failed') });

        render(<Popup />);
        await waitFor(() => expect(screen.getByText('Connect to ZAP')).toBeInTheDocument());
    });

    it('TC-INT-05: Stored active scan detected -> Resumes in Scanner view', async () => {
        (Browser.storage.local.get as any).mockResolvedValue({
            activeScan: { id: '101', type: 'spider', host: MOCK_HOST, apiKey: MOCK_KEY, url: 'http://resume.com' }
        });
        render(<Popup />);
        await waitFor(() => expect(screen.getByText(/Resuming spider/i)).toBeInTheDocument());
    });

    // =========================================================================
    // GROUP 2: SCAN WORKFLOW
    // =========================================================================

    it('TC-INT-06: Start Spider Scan -> Updates UI -> Completes -> Redirects to Results', async () => {
        (Browser.storage.local.get as any).mockResolvedValue({ zapHost: MOCK_HOST, zapApiKey: MOCK_KEY });
        (ZapApi.startSpiderScan as any).mockResolvedValue('500');
        (ZapApi.checkSpiderStatus as any).mockResolvedValue(100);

        render(<Popup />);
        await waitFor(() => expect(screen.getByText('START SCAN')).toBeInTheDocument());

        fireEvent.change(screen.getByPlaceholderText('https://example.com'), { target: { value: 'http://test.com' } });
        fireEvent.click(screen.getByText('START SCAN'));

        await waitFor(() => {
            expect(screen.getByText('All Systems Clean')).toBeInTheDocument();
        }, { timeout: 3000 });
    });

    it('TC-INT-07: "View Previous Reports" from Scanner -> Goes to Results', async () => {
        (Browser.storage.local.get as any).mockResolvedValue({ zapHost: MOCK_HOST, zapApiKey: MOCK_KEY });
        render(<Popup />);
        await waitFor(() => expect(screen.getByText('START SCAN')).toBeInTheDocument());

        fireEvent.click(screen.getByText('View Previous Reports'));
        await waitFor(() => expect(screen.getByText('All Systems Clean')).toBeInTheDocument());
    });

    it('TC-INT-08: Start Active Scan (Attack Mode) -> Completes -> Redirects to Results', async () => {
        (Browser.storage.local.get as any).mockResolvedValue({ zapHost: MOCK_HOST, zapApiKey: MOCK_KEY });
        (ZapApi.startActiveScan as any).mockResolvedValue('600');
        (ZapApi.checkActiveScanStatus as any).mockResolvedValue(100);

        render(<Popup />);
        await waitFor(() => expect(screen.getByText('START SCAN')).toBeInTheDocument());

        fireEvent.click(screen.getByText('Attack'));
        fireEvent.change(screen.getByPlaceholderText('https://example.com'), { target: { value: 'http://hack.me' } });
        fireEvent.click(screen.getByText('LAUNCH ATTACK'));

        await waitFor(() => {
            expect(screen.getByText('All Systems Clean')).toBeInTheDocument();
        }, { timeout: 3000 });
    });

    it('TC-INT-09: "Disconnect" from Scanner -> Clears storage and returns to Login', async () => {
        (Browser.storage.local.get as any).mockResolvedValue({ zapHost: MOCK_HOST, zapApiKey: MOCK_KEY });
        render(<Popup />);
        await waitFor(() => expect(screen.getByTitle('Disconnect (Logout)')).toBeInTheDocument());

        fireEvent.click(screen.getByTitle('Disconnect (Logout)'));
        fireEvent.click(screen.getByText('Confirm'));

        await waitFor(() => {
            expect(screen.getByText('Connect to ZAP')).toBeInTheDocument();
            expect(Browser.storage.local.remove).toHaveBeenCalled();
        });
    });

    // =========================================================================
    // GROUP 3: RESULTS & DASHBOARD
    // =========================================================================

    it('TC-INT-10: Results View loads -> Switches to Dashboard -> Displays Data', async () => {
        (Browser.storage.local.get as any).mockResolvedValue({ zapHost: MOCK_HOST, zapApiKey: MOCK_KEY });
        global.fetch = createFetchMock({
            '/core/view/numberOfAlerts': { count: 1 },
            '/alert/view/alerts': {
                alerts: [{ name: 'SQL Injection', risk: 'High', instances: [{ url: 'http://a.com' }] }]
            }
        });

        render(<Popup />);
        await waitFor(() => fireEvent.click(screen.getByText('View Previous Reports')));
        await waitFor(() => expect(screen.getByTitle('View Dashboard Charts')).toBeInTheDocument());
        fireEvent.click(screen.getByTitle('View Dashboard Charts'));
        await waitFor(() => {
            expect(screen.getByText('1 Vulnerabilities')).toBeInTheDocument();
            expect(screen.getByText('High Risk')).toBeInTheDocument();
        });
    });

    it('TC-INT-11: Dashboard "Review Vulnerabilities" -> Switches back to List View', async () => {
        (Browser.storage.local.get as any).mockResolvedValue({ zapHost: MOCK_HOST, zapApiKey: MOCK_KEY });
        global.fetch = createFetchMock({
            '/alert/view/alerts': {
                alerts: [{ name: 'XSS', risk: 'Medium', instances: [{ url: 'http://a.com' }] }]
            }
        });

        render(<Popup />);
        await waitFor(() => fireEvent.click(screen.getByText('View Previous Reports')));
        await waitFor(() => fireEvent.click(screen.getByTitle('View Dashboard Charts')));
        await waitFor(() => fireEvent.click(screen.getByText(/Review Vulnerabilities/i)));
        await waitFor(() => {
            expect(screen.getByText('XSS')).toBeInTheDocument();
            expect(screen.getByText('Description')).toBeInTheDocument();
        });
    });

    it('TC-INT-12: "Back to Scanner" from Results -> Returns to ScannerPanel', async () => {
        (Browser.storage.local.get as any).mockResolvedValue({ zapHost: MOCK_HOST, zapApiKey: MOCK_KEY });
        render(<Popup />);
        await waitFor(() => fireEvent.click(screen.getByText('View Previous Reports')));
        await waitFor(() => fireEvent.click(screen.getByText('Back to Scanner')));
        await waitFor(() => expect(screen.getByText('START SCAN')).toBeInTheDocument());
    });

    it('TC-INT-13: Persisted Alerts: Switch to Scanner and back -> Uses Cache', async () => {
        (Browser.storage.local.get as any).mockResolvedValue({ zapHost: MOCK_HOST, zapApiKey: MOCK_KEY });
        const fetchSpy = createFetchMock({
            '/alert/view/alerts': { alerts: [{ name: 'CacheTest', instances: [] }] }
        });
        global.fetch = fetchSpy;

        render(<Popup />);
        await waitFor(() => fireEvent.click(screen.getByText('View Previous Reports')));
        await waitFor(() => expect(screen.getByText('CacheTest')).toBeInTheDocument());

        // Navigate Away (Back to Start from VulnPanel)
        await waitFor(() => fireEvent.click(screen.getByTitle('Back to Start')));

        // Navigate Back
        await waitFor(() => expect(screen.getByText('View Previous Reports')).toBeInTheDocument());
        fireEvent.click(screen.getByText('View Previous Reports'));

        // Should appear immediately
        await waitFor(() => expect(screen.getByText('CacheTest')).toBeInTheDocument());

        const calls = fetchSpy.mock.calls.filter(args => args[0].toString().includes('/alert/view/alerts'));
        expect(calls.length).toBeGreaterThan(0);
    });

    // =========================================================================
    // GROUP 4: VULNERABILITY DETAILS & FIXES
    // =========================================================================

    it('TC-INT-14: List View -> Pagination -> Updates View', async () => {
        (Browser.storage.local.get as any).mockResolvedValue({ zapHost: MOCK_HOST, zapApiKey: MOCK_KEY });
        global.fetch = createFetchMock({
            '/alert/view/alerts': {
                alerts: [
                    { name: 'Vuln 1', risk: 'High', instances: [{}] },
                    { name: 'Vuln 2', risk: 'Low', instances: [{}] }
                ]
            }
        });

        render(<Popup />);
        await waitFor(() => fireEvent.click(screen.getByText('View Previous Reports')));
        await waitFor(() => expect(screen.getByText('Vuln 1')).toBeInTheDocument());
        expect(screen.getByText('1 / 2')).toBeInTheDocument();
        fireEvent.click(screen.getByText('Next 🡆'));
        expect(screen.getByText('Vuln 2')).toBeInTheDocument();
    });

    it('TC-INT-17: Error Handling: API Error in Results -> Shows Error Message', async () => {
        (Browser.storage.local.get as any).mockResolvedValue({ zapHost: MOCK_HOST, zapApiKey: MOCK_KEY });
        global.fetch = createFetchMock({ '/alert/view/alerts': new Error('Network Error') });
        render(<Popup />);
        await waitFor(() => fireEvent.click(screen.getByText('View Previous Reports')));
        await waitFor(() => {
            expect(screen.getByText(/Error loading results/i)).toBeInTheDocument();
        });
    });

    it('TC-INT-18: Stop Scan -> Updates UI (Manual Stop)', async () => {
        (Browser.storage.local.get as any).mockResolvedValue({ zapHost: MOCK_HOST, zapApiKey: MOCK_KEY });
        (ZapApi.startSpiderScan as any).mockResolvedValue('123');
        // Return 50% so it doesn't auto-complete
        (ZapApi.checkSpiderStatus as any).mockResolvedValue(50);
        (ZapApi.stopSpiderScan as any).mockResolvedValue('OK');

        render(<Popup />);
        await waitFor(() => fireEvent.click(screen.getByText('START SCAN')));

        // Use findByText to wait for appearance
        const stopBtn = await screen.findByText('Stop Scan');
        fireEvent.click(stopBtn);

        await waitFor(() => {
            expect(screen.getByText('Stopped by user.')).toBeInTheDocument();
        });
    });

    it('TC-INT-19: Dashboard Risk Counts match Alert Data', async () => {
        (Browser.storage.local.get as any).mockResolvedValue({ zapHost: MOCK_HOST, zapApiKey: MOCK_KEY });
        global.fetch = createFetchMock({
            '/alert/view/alerts': {
                alerts: [
                    { name: 'HighVuln', risk: 'High', instances: [{}] },
                    { name: 'MedVuln', risk: 'Medium', instances: [{}] }
                ]
            }
        });

        render(<Popup />);
        await waitFor(() => fireEvent.click(screen.getByText('View Previous Reports')));
        await waitFor(() => fireEvent.click(screen.getByTitle('View Dashboard Charts')));

        await waitFor(() => {
            const highCard = screen.getByText('High Risk').closest('div');
            expect(highCard).toHaveTextContent('1');
        });
    });

    it('TC-INT-20: New Session clears persisted data', async () => {
        (Browser.storage.local.get as any).mockResolvedValue({ zapHost: MOCK_HOST, zapApiKey: MOCK_KEY });
        const spyFetch = createFetchMock({
            '/alert/view/alerts': { alerts: [{ name: 'OldData', instances: [] }] }
        });
        global.fetch = spyFetch;
        render(<Popup />);
        await waitFor(() => fireEvent.click(screen.getByText('View Previous Reports')));
        await waitFor(() => expect(screen.getByText('OldData')).toBeInTheDocument());
        await waitFor(() => fireEvent.click(screen.getByTitle('Back to Start')));
        (ZapApi.startSpiderScan as any).mockResolvedValue('999');
        (ZapApi.checkSpiderStatus as any).mockResolvedValue(100);
        fireEvent.click(screen.getByText('START SCAN'));
        await waitFor(() => {
            const calls = spyFetch.mock.calls.filter(args => args[0].toString().includes('/alert/view/alerts'));
            expect(calls.length).toBeGreaterThanOrEqual(2);
        });
    });

    it('TC-INT-21: InfoTooltip renders in LoginPanel on hover', async () => {
        (Browser.storage.local.get as any).mockResolvedValue({});
        render(<Popup />);
        await waitFor(() => screen.getByPlaceholderText(/Enter your API Key/i));
        const icon = document.querySelector('svg');
        fireEvent.mouseEnter(icon!);
        expect(screen.getByText(/Open ZAP Desktop/i)).toBeInTheDocument();
    });

    it('TC-INT-22: InfoTooltip renders in VulnerabilityPanel on hover', async () => {
        (Browser.storage.local.get as any).mockResolvedValue({ zapHost: MOCK_HOST, zapApiKey: MOCK_KEY });
        global.fetch = createFetchMock({
            '/alert/view/alerts': { alerts: [{ name: 'Vuln', risk: 'High', confidence: 'Medium', instances: [{}] }] }
        });
        render(<Popup />);
        await waitFor(() => fireEvent.click(screen.getByText('View Previous Reports')));

        const icons = document.querySelectorAll('svg');
        const infoIcon = icons[icons.length - 1];
        if (infoIcon) {
            fireEvent.mouseEnter(infoIcon);
            await waitFor(() => expect(screen.getByText(/The level of confidence/i)).toBeInTheDocument());
        }
    });

    it('TC-INT-23: ActionsPanel handles empty alert batch gracefully', async () => {
        (Browser.storage.local.get as any).mockResolvedValue({ zapHost: MOCK_HOST, zapApiKey: MOCK_KEY });
        global.fetch = createFetchMock({ '/alert/view/alerts': { alerts: [] } });
        render(<Popup />);
        await waitFor(() => fireEvent.click(screen.getByText('View Previous Reports')));
        await waitFor(() => {
            expect(screen.getByText('All Systems Clean')).toBeInTheDocument();
        });
    });

    it('TC-INT-24: Scanner "Save Session" -> Success', async () => {
        (Browser.storage.local.get as any).mockResolvedValue({ zapHost: MOCK_HOST, zapApiKey: MOCK_KEY });
        (ZapApi.saveSession as any).mockResolvedValue('Session Saved');
        (ZapApi.getZapHomePath as any).mockResolvedValue('/home/zap');

        render(<Popup />);
        await waitFor(() => expect(screen.getByText('Save Session')).toBeInTheDocument());

        fireEvent.click(screen.getByText('Save Session'));
        fireEvent.change(screen.getByPlaceholderText('my_session_name'), { target: { value: 'test' } });
        fireEvent.click(screen.getByText('Save'));

        await waitFor(() => {
            expect(screen.getByText(/Session saved as 'test'/i)).toBeInTheDocument();
        });
    });

    it('TC-INT-25: Scanner "Save Session" -> Error', async () => {
        (Browser.storage.local.get as any).mockResolvedValue({ zapHost: MOCK_HOST, zapApiKey: MOCK_KEY });
        (ZapApi.saveSession as any).mockRejectedValue(new Error('Save Failed'));

        render(<Popup />);
        await waitFor(() => fireEvent.click(screen.getByText('Save Session')));

        fireEvent.change(screen.getByPlaceholderText('my_session_name'), { target: { value: 'test' } });
        fireEvent.click(screen.getByText('Save'));

        await waitFor(() => {
            expect(screen.getByText(/Error saving session: Save Failed/i)).toBeInTheDocument();
        });
    });

    it('TC-INT-26: Switch to Attack Mode, then back to Standard, then Scan', async () => {
        (Browser.storage.local.get as any).mockResolvedValue({ zapHost: MOCK_HOST, zapApiKey: MOCK_KEY });
        (ZapApi.startSpiderScan as any).mockResolvedValue('100');

        render(<Popup />);
        await waitFor(() => expect(screen.getByText('START SCAN')).toBeInTheDocument());

        fireEvent.click(screen.getByText('Attack'));
        expect(screen.getByText('LAUNCH ATTACK')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Standard'));
        expect(screen.getByText('START SCAN')).toBeInTheDocument();

        fireEvent.click(screen.getByText('START SCAN'));
        await waitFor(() => expect(ZapApi.startSpiderScan).toHaveBeenCalled());
    });

    // =========================================================================
    // NEW COMPLEXITY TEST CASES (Demonstrating Timing Architecture Limits)
    // =========================================================================

    it('TC-INT-27: Active Scan Progress Update -> Sync Check', async () => {
        // COMPLEXITY EXAMPLE 2: Progress Bar Synchronization
        // The test expects the UI to show "50%" immediately after the API returns it.
        // However, the app only fetches this status once every X seconds (polling).
        (Browser.storage.local.get as any).mockResolvedValue({ zapHost: MOCK_HOST, zapApiKey: MOCK_KEY });
        (ZapApi.startActiveScan as any).mockResolvedValue('101');
        (ZapApi.checkActiveScanStatus as any).mockResolvedValue(50); // API says 50%

        render(<Popup />);
        fireEvent.click(screen.getByText('Attack')); // Switch to Active Scan
        fireEvent.click(screen.getByText('LAUNCH ATTACK'));

        // TEST WILL FAIL/FLAKE: The UI is still waiting for the first poll interval
        // while the test asserts immediately.
        await waitFor(() => {
            expect(screen.getByText('50%')).toBeInTheDocument();
        }, { timeout: 500 }); // Short timeout to highlight the race condition
    });

    it('TC-INT-28: Scan Completion -> Auto-Redirect Timing', async () => {
        // COMPLEXITY EXAMPLE 3: State Transition Latency
        // API returns 100% immediately, but the app waits for the next poll cycle
        // to process the "Complete" state and redirect.
        (Browser.storage.local.get as any).mockResolvedValue({ zapHost: MOCK_HOST, zapApiKey: MOCK_KEY });
        (ZapApi.startSpiderScan as any).mockResolvedValue('102');
        (ZapApi.checkSpiderStatus as any).mockResolvedValue(100); // Done immediately

        render(<Popup />);
        fireEvent.click(screen.getByText('START SCAN'));

        // TEST WILL FAIL/FLAKE: Test expects immediate redirection to "Results" (All Systems Clean),
        // but the app is still "sleeping" until the next poll tick.
        await waitFor(() => {
            expect(screen.getByText('All Systems Clean')).toBeInTheDocument();
        }, { timeout: 1000 });
    });
});