import Dexie from 'dexie';

export const DB_NAME = 'gate-employee-directory';
export const META_KEY = 'sync';
export const QUEUE_META_KEY = 'movement_queue';
export const GATE_CONFIG_ID = 'default';
export const KIOSK_SESSION_ID = 'default';
const LEGACY_QUEUE_KEY = 'gate.offline.movements';

export const gateDb = new Dexie(DB_NAME);

gateDb.version(1).stores({
    employees: 'id, military_number, fullname_ar, fullname_en',
    meta: 'key',
});

gateDb.version(2).stores({
    employees: 'id, military_number, qrcode, fullname_ar, fullname_en',
    meta: 'key',
    movements: 'client_request_id, emp_id, status',
    gateConfig: 'id',
    kioskSession: 'id',
});

let migrationPromise = null;

function normalizeLegacyItem(item) {
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

async function migrateLegacyQueue() {
    const existing = await gateDb.meta.get(QUEUE_META_KEY);
    if (existing?.items_json) {
        return;
    }

    const merged = [];

    try {
        const raw = localStorage.getItem(LEGACY_QUEUE_KEY);
        if (raw) {
            const items = JSON.parse(raw);
            if (Array.isArray(items)) {
                merged.push(...items.map(normalizeLegacyItem));
            }
            localStorage.removeItem(LEGACY_QUEUE_KEY);
        }
    } catch {
        // ignore
    }

    try {
        const tableRows = await gateDb.movements?.toArray?.();
        if (Array.isArray(tableRows) && tableRows.length) {
            merged.push(...tableRows.map(normalizeLegacyItem));
            await gateDb.movements.clear();
        }
    } catch {
        // ignore
    }

    if (merged.length) {
        const byId = new Map();
        merged.forEach((row) => byId.set(row.client_request_id, row));
        await gateDb.meta.put({
            key: QUEUE_META_KEY,
            items_json: JSON.stringify([...byId.values()]),
            updated_at: new Date().toISOString(),
        });
    }
}

export async function ensureGateDbMigrated() {
    if (!migrationPromise) {
        migrationPromise = migrateLegacyQueue();
    }
    return migrationPromise;
}
