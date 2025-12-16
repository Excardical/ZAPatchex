import { vi } from 'vitest';

const browserMock = {
    storage: {
        local: {
            get: vi.fn().mockResolvedValue({}),
            set: vi.fn().mockResolvedValue(undefined),
            remove: vi.fn().mockResolvedValue(undefined),
        },
    },
    runtime: {
        sendMessage: vi.fn(),
    },
    tabs: {
        query: vi.fn().mockResolvedValue([]),
    },
};

export default browserMock;