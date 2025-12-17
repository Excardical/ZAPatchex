import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { DashboardPanel } from '../DashboardPanel';
import * as ZapApi from '@utils/zapApi';

// 1. Correctly mock the module so methods are spies
vi.mock('../../utils/zapApi', () => ({
    getSites: vi.fn(),
}));

vi.mock('webextension-polyfill');

describe('DashboardPanel Component', () => {
    const mockAlerts = [
        { risk: 'High' }, { risk: 'High' },
        { risk: 'Medium' },
        { risk: 'Informational' }
    ] as any[];

    const defaultProps = {
        alerts: mockAlerts,
        onViewList: vi.fn(),
        host: 'http://loc',
        apiKey: 'key',
        selectedSite: '',
        onSiteSelect: vi.fn()
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // Now this works because getSites is a vi.fn()
        (ZapApi.getSites as any).mockResolvedValue(['site-a', 'site-b']);
    });

    it('TC-DASH-01: Calculates Risk Counts Correctly', () => {
        render(<DashboardPanel {...defaultProps} />);

        // Target specific cards to avoid ambiguity
        const highRiskCard = screen.getByText('High Risk').closest('div');
        expect(within(highRiskCard!).getByText('2')).toBeInTheDocument();

        const medRiskCard = screen.getByText('Medium Risk').closest('div');
        expect(within(medRiskCard!).getByText('1')).toBeInTheDocument();
    });

    it('TC-DASH-02: Fetches and displays Sites in dropdown', async () => {
        render(<DashboardPanel {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText('site-a')).toBeInTheDocument();
            expect(screen.getByText('site-b')).toBeInTheDocument();
        });
    });

    it('TC-DASH-03: Filter change triggers callback', async () => {
        render(<DashboardPanel {...defaultProps} />);

        // Wait for async sites to load
        await waitFor(() => expect(screen.getByText('site-a')).toBeInTheDocument());

        const select = screen.getByRole('combobox');
        fireEvent.change(select, { target: { value: 'site-a' } });

        expect(defaultProps.onSiteSelect).toHaveBeenCalledWith('site-a');
    });

    it('TC-DASH-04: "Review Vulnerabilities" button works', () => {
        render(<DashboardPanel {...defaultProps} />);
        fireEvent.click(screen.getByText(/Review Vulnerabilities/i));
        expect(defaultProps.onViewList).toHaveBeenCalled();
    });
});