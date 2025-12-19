import '@testing-library/jest-dom';
import { vi, afterEach, beforeAll } from 'vitest';

// --- TOTAL SILENCE FOR CLEAN REPORT ---
beforeAll(() => {
    // Completely silence console.log and console.error
    // This removes all "stdout" and "stderr" noise from the test report
    global.console.log = vi.fn();
    global.console.error = vi.fn();
    global.console.warn = vi.fn();
    global.console.info = vi.fn();
    global.console.debug = vi.fn();
    process.env.DEBUG_PRINT_LIMIT = '0';
});
// --------------------------------------

// Cleanup after each test case
afterEach(() => {
    vi.clearAllMocks();
});

// Global Chrome/Browser mock
global.chrome = {
    runtime: {
        getURL: (path: string) => path,
    },
} as any;