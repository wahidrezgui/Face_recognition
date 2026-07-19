import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGet = vi.fn();

vi.mock('../api/client', () => ({
    default: {
        get: (...args) => mockGet(...args),
    },
    isNetworkError: (error) => !error?.response,
}));

import {
    pingApi,
    getConnectionState,
    onConnectionStateChange,
    resetConnectivityStateForTests,
} from '../lib/gate-offline/connectivity';

describe('connectivity', () => {
    beforeEach(() => {
        mockGet.mockReset();
        resetConnectivityStateForTests({ online: true, reachable: true });
        Object.defineProperty(globalThis, 'navigator', {
            configurable: true,
            value: { onLine: true },
        });
    });

    it('marks offline when ping fails with network error', async () => {
        mockGet.mockRejectedValueOnce({ code: 'ERR_NETWORK' });
        const reachable = await pingApi();
        expect(reachable).toBe(false);
        expect(getConnectionState()).toBe('offline');
    });

    it('marks online when ping succeeds', async () => {
        mockGet.mockResolvedValueOnce({ data: { status: 'ok' } });
        const reachable = await pingApi();
        expect(reachable).toBe(true);
        expect(getConnectionState()).toBe('online');
    });

    it('notifies subscribers on state change', async () => {
        const states = [];
        onConnectionStateChange((state) => states.push(state));

        mockGet.mockRejectedValueOnce({ code: 'ERR_NETWORK' });
        await pingApi();

        expect(states).toContain('offline');
    });

    it('shouldUseOfflineQueue when connection state is offline', async () => {
        const { shouldUseOfflineQueue, resetConnectivityStateForTests } = await import('../lib/gate-offline/connectivity');
        resetConnectivityStateForTests({ online: true, reachable: true });
        // simulate offline banner state
        mockGet.mockRejectedValueOnce({ code: 'ERR_NETWORK' });
        await pingApi();
        expect(shouldUseOfflineQueue()).toBe(true);
    });
});
