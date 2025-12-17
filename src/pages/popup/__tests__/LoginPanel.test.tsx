import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginPanel } from '@pages/popup/LoginPanel';
import Browser from 'webextension-polyfill';

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
            expect(screen.getByText(/Could not connect/i)).toBeInTheDocument();
        });
    });
});