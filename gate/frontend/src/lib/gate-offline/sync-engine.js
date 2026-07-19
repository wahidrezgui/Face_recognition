import api, { ensureCsrfCookie, isNetworkError } from '../../api/client';
import { createRequestId } from '../uuid';
import { movementSubmitResponseSchema } from '../../schemas/movements';
import { gateDb, ensureGateDbMigrated } from './gate-db';
import { isApiReachable, shouldUseOfflineQueue } from './connectivity';

const API_TIMEOUT_MS = 8000;
const QUEUE_META_KEY = 'movement_queue';

async function readQueue() {
    await ensureGateDbMigrated();
    const row = await gateDb.meta.get(QUEUE_META_KEY);
    if (!row?.items_json) {
        return [];
    }
    try {
        const items = JSON.parse(row.items_json);
        return Array.isArray(items) ? items : [];
    } catch {
        return [];
    }
}

async function writeQueue(items) {
    await gateDb.meta.put({
        key: QUEUE_META_KEY,
        items_json: JSON.stringify(items),
        updated_at: new Date().toISOString(),
    });
}

function normalizeMovementItem(item) {
    const empId = item.emp_id ?? item.empl_id ?? null;
    return {
        client_request_id: String(item.client_request_id),
        emp_id: empId != null ? Number(empId) : null,
        empl_id: item.empl_id != null ? Number(item.empl_id) : null,
        mvtype: String(item.mvtype),
        base_id: Number(item.base_id),
        gate_id: Number(item.gate_id),
        platenumber: String(item.platenumber ?? ''),
        mvdate: item.mvdate ? String(item.mvdate) : null,
        mvtime: item.mvtime ? String(item.mvtime) : null,
        qrcode: item.qrcode ? String(item.qrcode) : null,
        createdby_id: item.createdby_id != null ? Number(item.createdby_id) : null,
        mode: item.mode === 'manual' ? 'manual' : 'auto',
        queued_at: String(item.queued_at ?? new Date().toISOString()),
        status: item.status === 'failed' ? 'failed' : 'pending',
        sync_error: item.sync_error ? String(item.sync_error) : null,
    };
}

async function queueMovement(body, mode) {
    await enqueueMovement({
        ...body,
        queued_at: new Date().toISOString(),
        mode,
    });
    return movementSubmitResponseSchema.parse({ success: true, queued: true });
}

export async function getPendingMovements() {
    const items = await readQueue();
    return items.filter((row) => row.status === 'pending' || row.status === 'failed');
}

export async function countPendingMovements() {
    const items = await getPendingMovements();
    return items.length;
}

export async function enqueueMovement(item) {
    const record = normalizeMovementItem(item);
    const pending = await readQueue();
    const next = pending.filter((row) => row.client_request_id !== record.client_request_id);
    next.push(record);
    await writeQueue(next);
    return next.filter((row) => row.status === 'pending' || row.status === 'failed').length;
}

export async function clearSyncedMovements(clientRequestIds) {
    const ids = new Set(clientRequestIds);
    const pending = await readQueue();
    const next = pending.filter((row) => !ids.has(row.client_request_id));
    await writeQueue(next);
    return next.filter((row) => row.status === 'pending' || row.status === 'failed').length;
}

export async function markMovementsFailed(failures) {
    const byId = new Map(failures.map((row) => [row.client_request_id, row.message ?? 'Sync failed']));
    const pending = await readQueue();
    const next = pending.map((row) => {
        if (!byId.has(row.client_request_id)) {
            return row;
        }
        return {
            ...row,
            status: 'failed',
            sync_error: byId.get(row.client_request_id),
        };
    });
    await writeQueue(next);
}

export async function resetFailedToPending() {
    const pending = await readQueue();
    const next = pending.map((row) => (
        row.status === 'failed'
            ? { ...row, status: 'pending', sync_error: null }
            : row
    ));
    await writeQueue(next);
}

export async function submitMovementWithOffline(payload) {
    const body = {
        ...payload,
        client_request_id: payload.client_request_id ?? createRequestId(),
    };
    const mode = (body.empl_id || (body.mvdate && body.mvtime)) ? 'manual' : 'auto';

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return queueMovement(body, mode);
    }
    if (shouldUseOfflineQueue()) {
        return queueMovement(body, mode);
    }
    if (!(await isApiReachable(true))) {
        return queueMovement(body, mode);
    }

    try {
        await ensureCsrfCookie();
        const endpoint = mode === 'manual'
            ? '/api/movements/check/manual'
            : '/api/movements/check/submit';
        const { data } = await api.post(endpoint, body, { timeout: API_TIMEOUT_MS });
        return movementSubmitResponseSchema.parse(data);
    } catch (error) {
        if (isNetworkError(error) || shouldUseOfflineQueue()) {
            return queueMovement(body, mode);
        }
        throw error;
    }
}

export async function syncPendingMovements() {
    await resetFailedToPending();
    const pending = await getPendingMovements();
    if (!pending.length || !(await isApiReachable(true))) {
        return { synced: [], duplicates: [], failed: [], syncedAt: null };
    }

    await ensureCsrfCookie();
    const { data } = await api.post('/api/movements/sync', { items: pending }, { timeout: API_TIMEOUT_MS });
    const results = data.results ?? [];

    const syncedIds = results
        .filter((row) => row.status === 'synced' || row.status === 'duplicate')
        .map((row) => row.client_request_id);

    const duplicateIds = results
        .filter((row) => row.status === 'duplicate')
        .map((row) => row.client_request_id);

    const failed = results.filter((row) => row.status === 'failed');

    await clearSyncedMovements(syncedIds);
    if (failed.length) {
        await markMovementsFailed(failed);
    }

    const syncedAt = new Date().toISOString();
    return {
        synced: syncedIds.filter((id) => !duplicateIds.includes(id)),
        duplicates: duplicateIds,
        failed,
        syncedAt,
    };
}
