import Dexie from 'dexie';
import type { Table } from 'dexie';
import type { DirectoryEmployee, MovementSubmitPayload } from '@/types/gate';

export interface QueuedMovement {
    client_request_id: string;
    payload: MovementSubmitPayload;
    /** Real event time, captured at scan/queue time — not sync time. */
    queued_at: string;
    status: 'pending' | 'failed';
    error?: string;
}

export interface GateConfigEntry {
    key: string;
    value: unknown;
}

export interface KioskSessionEntry {
    key: 'current';
    id: number;
    username: string;
    firstname: string;
    lastname: string;
    default_base: number | null;
}

class GateDatabase extends Dexie {
    employees!: Table<DirectoryEmployee, number>;
    movementQueue!: Table<QueuedMovement, string>;
    gateConfig!: Table<GateConfigEntry, string>;
    kioskSession!: Table<KioskSessionEntry, string>;

    constructor() {
        super('gate-kiosk');
        this.version(1).stores({
            employees: 'id, qrcode, military_number',
            movementQueue: 'client_request_id, status',
            gateConfig: 'key',
            kioskSession: 'key',
        });
    }
}

export const gateDb = new GateDatabase();
