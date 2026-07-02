import api, { ensureCsrfCookie, isNetworkError } from '../api/client';
import { createRequestId } from './uuid';
import { movementSubmitResponseSchema } from '../schemas/movements';
import {
    clearSyncedMovements,
    enqueueMovement,
    getPendingMovements,
    isOnline,
} from './offline-queue';

export async function submitMovementWithOffline(payload) {
    const body = {
        ...payload,
        client_request_id: payload.client_request_id ?? createRequestId(),
    };

    if (!isOnline()) {
        enqueueMovement({
            ...body,
            queued_at: new Date().toISOString(),
            mode: body.mvdate ? 'manual' : 'auto',
        });
        return movementSubmitResponseSchema.parse({ success: true, queued: true });
    }

    try {
        await ensureCsrfCookie();
        const { data } = await api.post('/api/movements/check/submit', body);
        return movementSubmitResponseSchema.parse(data);
    } catch (error) {
        if (isNetworkError(error)) {
            enqueueMovement({
                ...body,
                queued_at: new Date().toISOString(),
                mode: body.mvdate ? 'manual' : 'auto',
            });
            return movementSubmitResponseSchema.parse({ success: true, queued: true });
        }
        throw error;
    }
}

export async function syncPendingMovements() {
    const pending = getPendingMovements();
    if (!pending.length || !isOnline()) {
        return { synced: [], failed: [] };
    }

    await ensureCsrfCookie();
    const { data } = await api.post('/api/movements/sync', { items: pending });
    const syncedIds = (data.results ?? [])
        .filter((row) => row.status === 'synced' || row.status === 'duplicate')
        .map((row) => row.client_request_id);

    clearSyncedMovements(syncedIds);

    return {
        synced: syncedIds,
        failed: (data.results ?? []).filter((row) => row.status === 'failed'),
    };
}
