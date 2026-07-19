import { beforeEach, describe, expect, it } from 'vitest';
import { gateDb, ensureGateDbMigrated, QUEUE_META_KEY } from '../lib/gate-offline/gate-db';
import {
    enqueueMovement,
    countPendingMovements,
    clearSyncedMovements,
} from '../lib/gate-offline/sync-engine';

describe('sync-engine queue', () => {
    beforeEach(async () => {
        await ensureGateDbMigrated();
        await gateDb.meta.delete(QUEUE_META_KEY);
    });

    it('enqueues and counts pending movements', async () => {
        await enqueueMovement({
            client_request_id: '22222222-2222-2222-2222-222222222222',
            emp_id: 7,
            mvtype: 'Check-Out',
            base_id: 1,
            gate_id: 1,
            queued_at: new Date().toISOString(),
            mode: 'auto',
        });

        expect(await countPendingMovements()).toBe(1);
    });

    it('clears synced movements from queue', async () => {
        const id = '33333333-3333-3333-3333-333333333333';
        await enqueueMovement({
            client_request_id: id,
            emp_id: 7,
            mvtype: 'Check-In',
            base_id: 1,
            gate_id: 1,
            queued_at: new Date().toISOString(),
            mode: 'manual',
        });

        await clearSyncedMovements([id]);
        expect(await countPendingMovements()).toBe(0);
    });
});

describe('gate-config storage', () => {
    beforeEach(async () => {
        await ensureGateDbMigrated();
        await gateDb.gateConfig.clear();
    });

    it('stores gates as json without clone errors', async () => {
        const { saveGateConfig, loadGateConfig } = await import('../lib/gate-offline/gate-cache');
        const gates = [{ id: 9, name_ar: 'بوابة 1' }];

        await saveGateConfig({
            base_id: 3,
            base_name: 'قاعدة',
            gate_id: 9,
            gates,
        });

        const loaded = await loadGateConfig();
        expect(loaded?.gates).toEqual(gates);
        expect(loaded?.base_name).toBe('قاعدة');
    });
});
