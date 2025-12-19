import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginPanel } from '@pages/popup/LoginPanel';
import Browser from 'webextension-polyfill';

vi.mock('webextension-polyfill');
global.fetch = vi.fn();

describe('LoginPanel Component', () => {
    const mockSuccess = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('TC-LOGIN-01: Validates empty inputs', async () => {
        render(<LoginPanel onLoginSuccess={mockSuccess} />);

        fireEvent.click(screen.getByText('Connect'));

        await waitFor(() => {
            expect(screen.getByText(/Must fill in API key/i)).toBeInTheDocument();
        });
    });

    it('TC-LOGIN-02: Handles successful connection', async () => {
        // Mock version check
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ version: '2.14.0' })
        });

        render(<LoginPanel onLoginSuccess={mockSuccess} />);

        fireEvent.change(screen.getByPlaceholderText(/localhost/i), { target: { value: 'http://test:8080' } });
        fireEvent.change(screen.getByPlaceholderText(/Enter your API Key/i), { target: { value: 'secret' } });

        fireEvent.click(screen.getByText('Connect'));

        await waitFor(() => {
            expect(screen.getByText(/Connected!/i)).toBeInTheDocument();
        });

        // Wait for timeout to trigger parent callback
        await waitFor(() => {
            expect(mockSuccess).toHaveBeenCalledWith('http://test:8080', 'secret');
        }, { timeout: 1000 });
    });

    it('TC-LOGIN-03: Handles connection error/timeout', async () => {
        // Mock AbortError or Network Error
        (global.fetch as any).mockRejectedValue(new Error('Failed to fetch'));

        render(<LoginPanel onLoginSuccess={mockSuccess} />);

        fireEvent.change(screen.getByPlaceholderText(/Enter your API Key/i), { target: { value: 'key' } });
        fireEvent.click(screen.getByText('Connect'));

        await waitFor(() => {
            expect(screen.getByText(/Failed to fetch/i)).toBeInTheDocument();
        });
    });

    it('TC-LOGIN-04: Persists API key only when "Remember Me" is checked', async () => {
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ version: '2.14.0' })
        });

        render(<LoginPanel onLoginSuccess={vi.fn()} />);

        // Case 1: Checked
        fireEvent.change(screen.getByPlaceholderText(/localhost/i), { target: { value: 'http://host:8080' } });
        fireEvent.change(screen.getByPlaceholderText(/Enter your API Key/i), { target: { value: 'secret_key' } });
        fireEvent.click(screen.getByLabelText('Remember Me'));

        fireEvent.click(screen.getByText('Connect'));

        await waitFor(() => {
            // Call 1: Host and Remember flag
            expect(Browser.storage.local.set).toHaveBeenCalledWith(expect.objectContaining({
                zapHost: 'http://host:8080',
                rememberMe: true
            }));
            // Call 2: API Key (because Remember Me is true)
            expect(Browser.storage.local.set).toHaveBeenCalledWith(expect.objectContaining({
                zapApiKey: 'secret_key'
            }));
        });
    });
});