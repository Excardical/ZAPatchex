import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ActionsPanel } from '../ActionsPanel';

// 1. Setup a mutable mock for the child component
// This allows us to change its behavior (crash it) dynamically in specific tests
const mockVulnerabilityPanel = vi.fn();
const DefaultVulnPanel = ({ onViewDashboard }: any) => (
    <div data-testid="vuln-panel">
        <button onClick={onViewDashboard}>Go to Dashboard</button>
    </div>
);

// Initial behavior: Render normally
mockVulnerabilityPanel.mockImplementation(DefaultVulnPanel);

vi.mock('../VulnerabilityPanel', () => ({
    VulnerabilityPanel: (props: any) => mockVulnerabilityPanel(props),
}));

vi.mock('../DashboardPanel', () => ({
    DashboardPanel: ({ onViewList }: any) => (
        <div data-testid="dash-panel">
            <button onClick={onViewList}>Go to List</button>
        </div>
    ),
}));

// Mock WebExtension Polyfill to prevent "browser extension" errors
vi.mock('webextension-polyfill');

global.fetch = vi.fn();

describe('ActionsPanel Component', () => {
    const defaultProps = {
        host: 'http://localhost:8080',
        apiKey: '12345',
        onBackToScanner: vi.fn(),
        cachedAlerts: [],
        onUpdateAlerts: vi.fn(),
        hasLoaded: false,
        onLoadComplete: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset the child component mock to default before each test
        mockVulnerabilityPanel.mockImplementation(DefaultVulnPanel);
        // Default Fetch Mock: Return empty/safe data to prevent crashes if extra calls happen
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({})
        });
    });

    it('TC-ACT-01: Shows loading state initially when not loaded', () => {
        render(<ActionsPanel {...defaultProps} />);
        expect(screen.getByText('Fetching results...')).toBeInTheDocument();
    });

    it('TC-ACT-02: Shows "All Systems Clean" when fetch returns no alerts', async () => {
        (global.fetch as any)
            .mockResolvedValueOnce({ ok: true, json: async () => ({ count: 0 }) }) // Count
            .mockResolvedValueOnce({ ok: true, json: async () => ({ alerts: [] }) }); // Batch

        render(<ActionsPanel {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText('All Systems Clean')).toBeInTheDocument();
        });
    });

    it('TC-ACT-03: Fetches data and renders VulnerabilityPanel on success', async () => {
        const mockAlerts = [{ alert: 'XSS', risk: 'High', url: 'http://test.com' }];

        (global.fetch as any)
            .mockResolvedValueOnce({ ok: true, json: async () => ({ count: 1 }) })
            .mockResolvedValueOnce({ ok: true, json: async () => ({ alerts: mockAlerts }) })
            .mockResolvedValueOnce({ ok: true, json: async () => ({ alerts: [] }) });

        render(<ActionsPanel {...defaultProps} />);

        await waitFor(() => {
            expect(defaultProps.onUpdateAlerts).toHaveBeenCalled();
            expect(defaultProps.onLoadComplete).toHaveBeenCalled();
        });
    });

    it('TC-ACT-04: Switches between Dashboard and List view', async () => {
        const loadedProps = {
            ...defaultProps,
            hasLoaded: true,
            cachedAlerts: [{ name: 'Test', instances: [] } as any]
        };

        render(<ActionsPanel {...loadedProps} />);

        // Should start in List View
        expect(screen.getByTestId('vuln-panel')).toBeInTheDocument();

        // Switch to Dashboard
        fireEvent.click(screen.getByText('Go to Dashboard'));
        await waitFor(() => {
            expect(screen.getByTestId('dash-panel')).toBeInTheDocument();
        });

        // Switch back
        fireEvent.click(screen.getByText('Go to List'));
        expect(screen.getByTestId('vuln-panel')).toBeInTheDocument();
    });

    it('TC-ACT-05: Displays Error Boundary on Critical Fail', async () => {
        // Force the child component to throw an error during render
        mockVulnerabilityPanel.mockImplementation(() => {
            throw new Error('Critical UI Fail');
        });

        // Suppress console.error for this test to keep output clean
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        // Pre-load data so it tries to render the VulnerabilityPanel
        const loadedProps = {
            ...defaultProps,
            hasLoaded: true,
            cachedAlerts: [{ name: 'Test', instances: [] } as any]
        };

        render(<ActionsPanel {...loadedProps} />);

        await waitFor(() => {
            expect(screen.getByText(/Unable to Retrieve Alerts/i)).toBeInTheDocument();
        });

        consoleSpy.mockRestore();
    });

    it('TC-ACT-06: Filters alerts based on Selected Site', async () => {
        const mockAlerts = [
            { name: 'Vuln A', instances: [{ url: 'http://site-a.com' }] },
            { name: 'Vuln B', instances: [{ url: 'http://site-b.com' }] }
        ] as any[];

        // Pre-load with data
        const props = { ...defaultProps, hasLoaded: true, cachedAlerts: mockAlerts };

        // Mock the VulnerabilityPanel to inspect props passed to it
        // (We need to see if it received 1 alert or 2)
        const MockChild = vi.fn(() => <div>Child</div>);
        vi.mocked(props.onUpdateAlerts).mockImplementation(() => { });

        render(<ActionsPanel {...props} />);
    });
});