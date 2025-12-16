import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Cleanup after each test case (e.g., clearing mocks)
afterEach(() => {
    vi.clearAllMocks();
});

// Mock the global Chrome/Browser API if it's accessed directly
global.chrome = {
    runtime: {
        getURL: (path: string) => path,
    },
} as any;