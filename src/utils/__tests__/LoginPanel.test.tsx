import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginPanel } from '@pages/popup/LoginPanel';

// --- CRITICAL FIX: Inline Mock for webextension-polyfill ---
// This tells Vitest: "Don't use the real library. Use this fake object instead."
vi.mock('webextension-polyfill', () => {
    return {
        default: {
            storage: {
                local: {
                    set: vi.fn(),
                    get: vi.fn().mockResolvedValue({}),
                    remove: vi.fn(),
                },
            },
            runtime: {
                getURL: vi.fn().mockReturnValue('mock-image-url.png'),
            },
        },
    };
});

// Import the mocked library so we can spy on it in tests
import Browser from 'webextension-polyfill';

// Mock global fetch for ZAP API calls
global.fetch = vi.fn();

describe('LoginPanel Component', () => {
    const mockOnLoginSuccess = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the connection form correctly', () => {
        render(<LoginPanel onLoginSuccess={mockOnLoginSuccess} />);

        expect(screen.getByText('Connect to ZAP')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('http://localhost:8080')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter your API Key')).toBeInTheDocument();
    });

    it('shows error when API Key is empty', async () => {
        render(<LoginPanel onLoginSuccess={mockOnLoginSuccess} />);

        const connectBtn = screen.getByRole('button', { name: /Connect/i });
        fireEvent.click(connectBtn);

        await waitFor(() => {
            expect(screen.getByText(/Must fill in API key first/i)).toBeInTheDocument();
        });
    });

    it('successfully connects and saves to storage', async () => {
        // 1. Mock successful ZAP version check response
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ version: '2.14.0' }),
        });

        render(<LoginPanel onLoginSuccess={mockOnLoginSuccess} />);

        // 2. Simulate User Input
        const hostInput = screen.getByPlaceholderText('http://localhost:8080');
        const keyInput = screen.getByPlaceholderText('Enter your API Key');
        const rememberMe = screen.getByLabelText('Remember Me');

        fireEvent.change(hostInput, { target: { value: 'http://localhost:8080' } });
        fireEvent.change(keyInput, { target: { value: 'super-secret-key' } });
        fireEvent.click(rememberMe);

        // 3. Click Connect
        const connectBtn = screen.getByRole('button', { name: /Connect/i });
        fireEvent.click(connectBtn);

        // 4. Verify Success UI
        await waitFor(() => {
            expect(screen.getByText(/Connected! 2.14.0/i)).toBeInTheDocument();
        });

        // 5. Verify Storage was called (using the mocked object)
        expect(Browser.storage.local.set).toHaveBeenCalledWith({
            zapHost: 'http://localhost:8080',
            rememberMe: true
        });

        // 6. Verify Parent Callback
        await waitFor(() => {
            expect(mockOnLoginSuccess).toHaveBeenCalledWith('http://localhost:8080', 'super-secret-key');
        });
    });
});