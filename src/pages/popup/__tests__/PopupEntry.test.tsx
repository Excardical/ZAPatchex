import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';

// 1. Mock ReactDOM Client
// We want to verify that 'createRoot' and 'render' are called
const mockRender = vi.fn();
const mockCreateRoot = vi.fn(() => ({ render: mockRender }));

vi.mock('react-dom/client', () => ({
    createRoot: mockCreateRoot,
}));

// 2. Mock the Popup Component
// We don't want to test the entire app tree here, just that it attempts to render
vi.mock('@pages/popup/Popup', () => ({
    default: () => <div data-testid="mock-popup">MockPopup</div>
}));

describe('Unit Testing: Popup Entry Point', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        // Clear DOM before each test
        document.body.innerHTML = '';
        vi.resetModules(); // Vital for testing side-effects of imports
    });

    it('TC-ENTRY-01: Successfully mounts Popup to the #__root element', async () => {
        // Setup: Create the root element that index.tsx expects
        const rootDiv = document.createElement('div');
        rootDiv.id = '__root';
        document.body.appendChild(rootDiv);

        // Action: Dynamic import triggers the code in src/pages/popup/index.tsx
        await import('@pages/popup/index');

        // Assertions
        expect(mockCreateRoot).toHaveBeenCalledWith(rootDiv);
        expect(mockRender).toHaveBeenCalled();

        // Verify it rendered the MockPopup (conceptually)
        // Since we mocked the component, we just check the render function was called with React Node
        expect(mockRender.mock.calls[0][0].type).toBeDefined();
    });

    it('TC-ENTRY-02: Throws an error if #__root element is missing', async () => {
        // Setup: Ensure document body is empty (No #__root)
        document.body.innerHTML = '';

        // Action & Assertion
        // Because index.tsx runs immediately on import, it should throw
        // We add a query param (?bust) to ensure it re-imports fresh
        await expect(import(`../index?bust=${Date.now()}`))
            .rejects
            .toThrow("Can't find Popup root element");
    });
});