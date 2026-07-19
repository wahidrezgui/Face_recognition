import { reactive, onMounted, onUnmounted } from 'vue';
import { checkMovement } from '../api/movements';
import { submitMovementWithOffline } from '../lib/sync-movements';
import {
    countPendingMovements,
    onConnectivityChange,
    onConnectionStateChange,
    startConnectivityHeartbeat,
    stopConnectivityHeartbeat,
    isApiReachable,
} from '../lib/offline-queue';
import { syncPendingMovements } from '../lib/sync-movements';
import { createRequestId } from '../lib/uuid';
import {
    setConnectionStateSyncing,
    restoreConnectionStateAfterSync,
} from '../lib/gate-offline/connectivity';

export function useGateCheck() {
    const gate = reactive({
        loading: false,
        error: false,
        data: null,
        connectionState: 'online',
        offline: false,
        pendingCount: 0,
        isSubmitting: false,
        lastSyncAt: null,
        lastSyncResult: null,
        syncError: null,

        async refreshPendingCount() {
            gate.pendingCount = await countPendingMovements();
        },

        async flushQueue() {
            if (!(await isApiReachable(true)) || gate.pendingCount === 0) {
                return null;
            }

            setConnectionStateSyncing();
            gate.connectionState = 'syncing';
            gate.syncError = null;

            try {
                const result = await syncPendingMovements();
                gate.lastSyncResult = result;
                gate.lastSyncAt = result.syncedAt;
                if (result.failed?.length) {
                    gate.syncError = `${result.failed.length} failed`;
                }
                gate.pendingCount = await countPendingMovements();
                return result;
            } catch (error) {
                gate.syncError = error?.message ?? 'Sync failed';
                throw error;
            } finally {
                restoreConnectionStateAfterSync();
                gate.connectionState = gate.offline ? 'offline' : 'online';
            }
        },

        async check(payload) {
            gate.loading = true;
            gate.error = false;
            try {
                const response = await checkMovement(payload);
                gate.data = response.data;
                return response.data;
            } catch (e) {
                gate.error = true;
                throw e;
            } finally {
                gate.loading = false;
            }
        },

        async checkManualEntry(payload) {
            const body = {
                ...payload,
                client_request_id: payload.client_request_id ?? createRequestId(),
            };
            return submitMovementWithOffline(body);
        },

        async submit(payload) {
            const body = {
                ...payload,
                client_request_id: payload.client_request_id ?? createRequestId(),
            };
            return submitMovementWithOffline(body);
        },
    });

    let stopConnectivityListener = null;
    let stopStateListener = null;

    function applyConnectionState(state) {
        gate.connectionState = state;
        gate.offline = state === 'offline';
    }

    onMounted(async () => {
        await gate.refreshPendingCount();
        startConnectivityHeartbeat();

        stopStateListener = onConnectionStateChange(applyConnectionState);

        stopConnectivityListener = onConnectivityChange(async () => {
            if (gate.connectionState !== 'offline' && gate.pendingCount > 0) {
                await gate.flushQueue();
            }
        });

        if (gate.connectionState !== 'offline' && gate.pendingCount > 0) {
            gate.flushQueue();
        }
    });

    onUnmounted(() => {
        stopConnectivityListener?.();
        stopStateListener?.();
        stopConnectivityHeartbeat();
    });

    return gate;
}
