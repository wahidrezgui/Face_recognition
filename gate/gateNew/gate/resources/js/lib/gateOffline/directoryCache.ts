import MiniSearch from 'minisearch';
import { directory as directoryAction } from '@/actions/App/Http/Controllers/Inertia/GateController';
import type { DirectoryEmployee } from '@/types/gate';
import { gateDb } from './gateDb';

let searchIndex: MiniSearch<DirectoryEmployee> | null = null;

function buildIndex(
    employees: DirectoryEmployee[],
): MiniSearch<DirectoryEmployee> {
    const index = new MiniSearch<DirectoryEmployee>({
        idField: 'id',
        fields: ['fullname_ar', 'fullname_en', 'military_number', 'qrcode'],
        storeFields: [
            'id',
            'military_number',
            'qrcode',
            'fullname_ar',
            'fullname_en',
            'photo',
            'department_ar',
            'department_en',
        ],
        searchOptions: { prefix: true, fuzzy: 0.2 },
    });

    index.addAll(employees);

    return index;
}

/** Bulk roster fetch — seeds IndexedDB and the in-memory search index. Online only. */
export async function seedDirectory(): Promise<number> {
    const response = await fetch(directoryAction.url(), {
        headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
        throw new Error(
            `Directory fetch failed with status ${response.status}`,
        );
    }

    const data: { employees: DirectoryEmployee[] } = await response.json();

    await gateDb.employees.clear();
    await gateDb.employees.bulkPut(data.employees);
    searchIndex = buildIndex(data.employees);

    return data.employees.length;
}

async function ensureIndex(): Promise<MiniSearch<DirectoryEmployee>> {
    if (searchIndex) {
        return searchIndex;
    }

    const employees = await gateDb.employees.toArray();
    searchIndex = buildIndex(employees);

    return searchIndex;
}

export async function searchDirectory(
    query: string,
    limit = 20,
): Promise<DirectoryEmployee[]> {
    if (!query.trim()) {
        return [];
    }

    const index = await ensureIndex();

    return (index.search(query) as unknown as DirectoryEmployee[]).slice(
        0,
        limit,
    );
}

export async function lookupByQrcode(
    qrcode: string,
): Promise<DirectoryEmployee | undefined> {
    return gateDb.employees.where('qrcode').equals(qrcode).first();
}

export async function lookupById(
    id: number,
): Promise<DirectoryEmployee | undefined> {
    return gateDb.employees.get(id);
}
