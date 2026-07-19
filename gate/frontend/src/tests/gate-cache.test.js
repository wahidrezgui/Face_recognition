import { beforeEach, describe, expect, it, vi } from 'vitest';
import { gateDb, ensureGateDbMigrated } from '../lib/gate-offline/gate-db';
import {
    lookupGateCardByQrcode,
    lookupGateCardByEmployeeId,
} from '../lib/gate-offline/gate-cache';
import { enqueueMovement } from '../lib/gate-offline/sync-engine';

describe('gate-cache', () => {
    beforeEach(async () => {
        await ensureGateDbMigrated();
        await gateDb.employees.clear();
        await gateDb.movements.clear();
        await gateDb.employees.put({
            id: 42,
            military_number: '12345',
            qrcode: 'QR-ABC',
            fullname_ar: 'اختبار',
            fullname_en: 'Test User',
            photo: null,
            department: 'قسم',
            rank_name_ar: 'رتبة',
            expiry_date: '2030-01-01',
            remarks: '',
            last_movement_type: 'out',
            is_expired: false,
            alerts: [],
        });
    });

    it('looks up employee card by qrcode', async () => {
        const card = await lookupGateCardByQrcode('QR-ABC');
        expect(card).not.toBeNull();
        expect(card.emp_id).toBe(42);
        expect(card.offline_cached).toBe(true);
    });

    it('looks up employee card by id', async () => {
        const card = await lookupGateCardByEmployeeId(42);
        expect(card?.military_number).toBe('12345');
    });

    it('overlays pending movement on last_movement_type', async () => {
        await enqueueMovement({
            client_request_id: '11111111-1111-1111-1111-111111111111',
            emp_id: 42,
            mvtype: 'Check-In',
            base_id: 1,
            gate_id: 1,
            queued_at: new Date().toISOString(),
            mode: 'auto',
            status: 'pending',
        });

        const card = await lookupGateCardByEmployeeId(42);
        expect(card.last_movement_type).toBe('in');
    });
});
