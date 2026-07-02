import Dexie from 'dexie';
import MiniSearch from 'minisearch';
import { fetchGateDirectory } from '../api/employees';

const DB_NAME = 'gate-employee-directory';
const META_KEY = 'sync';

let searchIndex = null;
let directoryStatus = {
    ready: false,
    count: 0,
    syncedAt: null,
    version: null,
};

const db = new Dexie(DB_NAME);
db.version(1).stores({
    employees: 'id, military_number, fullname_ar, fullname_en',
    meta: 'key',
});

function normalizeEmployee(employee) {
    return {
        id: employee.id,
        military_number: employee.military_number ?? '',
        fullname_ar: employee.fullname_ar ?? '',
        fullname_en: employee.fullname_en ?? '',
        photo: employee.photo ?? null,
        department: employee.department ?? '',
        rank_name_ar: employee.rank_name_ar ?? '',
        empl: employee.fullname_ar || employee.fullname_en || '',
    };
}

function buildSearchIndex(employees) {
    const index = new MiniSearch({
        fields: ['military_number', 'fullname_ar', 'fullname_en'],
        storeFields: [
            'id',
            'military_number',
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
    const employees = await db.employees.toArray();
    const meta = await db.meta.get(META_KEY);

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
    const employees = (data.employees || []).map(normalizeEmployee);
    const syncedAt = new Date().toISOString();

    await db.transaction('rw', db.employees, db.meta, async () => {
        await db.employees.clear();
        await db.employees.bulkPut(employees);
        await db.meta.put({
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
    await db.transaction('rw', db.employees, db.meta, async () => {
        await db.employees.clear();
        await db.meta.clear();
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
