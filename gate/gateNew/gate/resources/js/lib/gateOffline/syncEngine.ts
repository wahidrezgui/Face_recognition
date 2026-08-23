import { ref } from 'vue';
import {
    submit as submitAction,
    sync as syncAction,
} from '@/actions/App/Http/Controllers/Inertia/GateController';
import { csrfPost } from '@/lib/csrfFetch';
import type { MovementSubmitPayload, MovementSubmitResult } from '@/types/gate';
import { isOnline } from './connectivity';
import { gateDb } from './gateDb';
import type { QueuedMovement } from './gateDb';
import { generateClientRequestId } from './uuid';

export const pendingCount = ref(0);
export const isSyncing = ref(false);

export async function refreshPendingCount(): Promise<void> {
    pendingCount.value = await gateDb.movementQueue.count();
}

export interface SubmitOutcome {
    queued: boolean;
    duplicate: boolean;
}

/**
 * Tries a live submit first; queues locally instead of throwing when offline
 * or the request fails, so the kiosk UI never blocks on network state.
 */
export async function submitMovement(
    payload: Omit<MovementSubmitPayload, 'client_request_id'>,
): Promise<SubmitOutcome> {
    const fullPayload: MovementSubmitPayload = {
        ...payload,
        client_request_id: generateClientRequestId(),
    };

    if (isOnline.value) {
        try {
            const result = await csrfPost<MovementSubmitResult>(
                submitAction.url(),
                fullPayload,
            );

            return { queued: false, duplicate: result.duplicate };
        } catch {
            // Network/server failure — fall through to the offline queue below.
        }
    }

    await queueMovement(fullPayload);

    return { queued: true, duplicate: false };
}

async function queueMovement(payload: MovementSubmitPayload): Promise<void> {
    const entry: QueuedMovement = {
        client_request_id: payload.client_request_id,
        payload,
        queued_at: new Date().toISOString(),
        status: 'pending',
    };

    await gateDb.movementQueue.put(entry);
    await refreshPendingCount();
}

interface SyncResponse {
    results: {
        client_request_id: string;
        status: 'synced' | 'duplicate' | 'failed';
        message?: string;
    }[];
}

export async function syncPendingMovements(): Promise<void> {
    if (isSyncing.value || !isOnline.value) {
        return;
    }

    const queued = await gateDb.movementQueue.toArray();

    if (queued.length === 0) {
        return;
    }

    isSyncing.value = true;

    try {
        const items = queued.map((entry) => ({
            ...entry.payload,
            queued_at: entry.queued_at,
        }));
        const response = await csrfPost<SyncResponse>(syncAction.url(), {
            items,
        });

        const settledIds = response.results
            .filter(
                (result) =>
                    result.status === 'synced' || result.status === 'duplicate',
            )
            .map((result) => result.client_request_id);

        if (settledIds.length > 0) {
            await gateDb.movementQueue.bulkDelete(settledIds);
        }

        await refreshPendingCount();
    } catch {
        // Left queued — retried on the next reconnect/heartbeat tick.
    } finally {
        isSyncing.value = false;
    }
}
