import MiniSearch from 'minisearch';
import { fetchGateDirectory } from '../api/employees';
import { gateDb, META_KEY, ensureGateDbMigrated } from './gate-offline/gate-db';

let searchIndex = null;
let directoryStatus = {
    ready: false,
    count: 0,
    syncedAt: null,
    version: null,
};

function normalizeEmployee(employee) {
    return {
        id: employee.id,
        military_number: employee.military_number ?? '',
        qrcode: employee.qrcode ?? '',
        fullname_ar: employee.fullname_ar ?? '',
        fullname_en: employee.fullname_en ?? '',
        photo: employee.photo ?? null,
        department: employee.department ?? '',
        rank_name_ar: employee.rank_name_ar ?? '',
        expiry_date: employee.expiry_date ?? null,
        remarks: employee.remarks ?? '',
        last_movement_type: employee.last_movement_type ?? null,
        is_expired: Boolean(employee.is_expired),
        alerts: employee.alerts ?? [],
        cached_at: employee.cached_at ?? null,
        empl: employee.fullname_ar || employee.fullname_en || '',
    };
}

function buildSearchIndex(employees) {
    const index = new MiniSearch({
        fields: ['military_number', 'fullname_ar', 'fullname_en', 'qrcode'],
        storeFields: [
            'id',
            'military_number',
            'qrcode',
            'fullname_ar',
            'fullname_en',
            'photo',
            'department',
            'rank_name_ar',
            'empl',
        ],
        searchOptions: {
            prefix: true,
            fuzzy: 0.15,
            boost: {
                military_number: 3,
                fullname_ar: 2,
                fullname_en: 1,
            },
        },
    });

    index.addAll(employees.map((emp) => ({
        ...emp,
        id: String(emp.id),
    })));

    return index;
}

async function loadFromDatabase() {
    await ensureGateDbMigrated();
    const employees = await gateDb.employees.toArray();
    const meta = await gateDb.meta.get(META_KEY);

    if (!employees.length || !meta) {
        directoryStatus = { ready: false, count: 0, syncedAt: null, version: null };
        searchIndex = null;
        return false;
    }

    searchIndex = buildSearchIndex(employees);
    directoryStatus = {
        ready: true,
        count: employees.length,
        syncedAt: meta.syncedAt ?? null,
        version: meta.version ?? null,
    };

    return true;
}

export function getDirectoryStatus() {
    return { ...directoryStatus };
}

export function isDirectoryReady() {
    return directoryStatus.ready && searchIndex != null;
}

export async function initEmployeeDirectory() {
    if (directoryStatus.ready && searchIndex) {
        return getDirectoryStatus();
    }

    await loadFromDatabase();
    return getDirectoryStatus();
}

export async function syncEmployeeDirectory() {
    const { data } = await fetchGateDirectory();
    const syncedAt = new Date().toISOString();
    const employees = (data.employees || []).map((employee) =>
        normalizeEmployee({ ...employee, cached_at: syncedAt })
    );

    await ensureGateDbMigrated();
    await gateDb.transaction('rw', gateDb.employees, gateDb.meta, async () => {
        await gateDb.employees.clear();
        await gateDb.employees.bulkPut(employees);
        await gateDb.meta.put({
            key: META_KEY,
            version: data.version ?? syncedAt,
            count: data.count ?? employees.length,
            syncedAt,
        });
    });

    searchIndex = buildSearchIndex(employees);
    directoryStatus = {
        ready: true,
        count: employees.length,
        syncedAt,
        version: data.version ?? syncedAt,
    };

    return getDirectoryStatus();
}

export async function clearEmployeeDirectory() {
    await ensureGateDbMigrated();
    await gateDb.transaction('rw', gateDb.employees, gateDb.meta, async () => {
        await gateDb.employees.clear();
        await gateDb.meta.clear();
    });

    searchIndex = null;
    directoryStatus = {
        ready: false,
        count: 0,
        syncedAt: null,
        version: null,
    };
}

export function searchEmployeesLocal(query, limit = 25) {
    const needle = String(query ?? '').trim();
    if (needle.length < 2 || !searchIndex) {
        return [];
    }

    const results = searchIndex.search(needle, { limit });

    return results.map((hit) => ({
        id: Number(hit.id),
        military_number: hit.military_number,
        fullname_ar: hit.fullname_ar,
        fullname_en: hit.fullname_en,
        photo: hit.photo,
        department: hit.department,
        rank_name_ar: hit.rank_name_ar,
        empl: hit.empl || hit.fullname_ar || hit.fullname_en,
    }));
}
