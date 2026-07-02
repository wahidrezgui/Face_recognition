import { toRaw } from 'vue';
import { fetchDepartmentTree } from '../api/organization';
import { fetchRanksTree, fetchBasesTree, fetchGatesByBases } from '../api/lookups';

export function todayIso() {
    return new Date().toISOString().substr(0, 10);
}

export function createDefaultFilters() {
    return {
        militaryNumber: '',
        fromDate: todayIso(),
        toDate: todayIso(),
        date: todayIso(),
        selectedDepartment: null,
        selectedRanks: {},
        selectedBases: {},
        selectedGates: {},
        employeeName: '',
        selectedGender: '',
        selectedType: '',
    };
}

export function resetFilters(filters) {
    const defaults = createDefaultFilters();
    Object.keys(defaults).forEach((key) => {
        filters[key] = defaults[key];
    });
}

function extractCheckedIds(selection) {
    const raw = toRaw(selection);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return [];
    }

    return Object.keys(raw).filter((id) => raw[id]?.checked);
}

function applyEmployeeSearchParams(params, filters) {
    const query = String(filters.employeeName ?? '').trim();
    const pickedMilitary = String(filters.militaryNumber ?? '').trim();

    if (pickedMilitary) {
        params.military_number = pickedMilitary;
        params.fullname_ar = '';
        return;
    }

    if (!query) {
        params.military_number = '';
        params.fullname_ar = '';
        return;
    }

    if (/^\d+$/.test(query)) {
        params.military_number = query;
        params.fullname_ar = '';
        return;
    }

    params.military_number = '';
    params.fullname_ar = query;
}

export function buildReportParams(filters, preset, pagination = {}) {
    const params = {
        page: pagination.page ?? 1,
        per_page: pagination.perPage ?? 55,
        military_number: '',
        fullname_ar: '',
        gender: filters.selectedGender,
        mvtype: filters.selectedType,
        userName: localStorage.getItem('user_name'),
        ...preset.extraParams,
    };

    if (preset.dateMode === 'single') {
        params.date = filters.date;
    } else {
        params.from_date = filters.fromDate;
        params.to_date = filters.toDate;
    }

    if (filters.selectedDepartment && Object.keys(filters.selectedDepartment).length > 0) {
        params.department_id = Object.keys(filters.selectedDepartment)[0];
    } else {
        params.department_id = localStorage.getItem('dep_id');
    }

    const rankIds = extractCheckedIds(filters.selectedRanks);
    if (rankIds.length > 0) {
        params.rank_ids = rankIds;
    }

    const baseIds = extractCheckedIds(filters.selectedBases);
    if (baseIds.length > 0) {
        params.base_ids = baseIds;
    }

    const gateIds = extractCheckedIds(filters.selectedGates);
    if (gateIds.length > 0) {
        params.gate_ids = gateIds;
    }

    applyEmployeeSearchParams(params, filters);

    return params;
}

let lookupsCache = null;
let lookupsInflight = null;

export function getCachedReportLookups(depId) {
    if (lookupsCache && lookupsCache.depId === String(depId)) {
        return lookupsCache.data;
    }
    return null;
}

export function clearReportLookupsCache() {
    lookupsCache = null;
    lookupsInflight = null;
}

export async function fetchReportLookups(depId, { force = false } = {}) {
    const cacheKey = String(depId);

    if (!force) {
        const cached = getCachedReportLookups(cacheKey);
        if (cached) {
            return cached;
        }
        if (lookupsInflight) {
            return lookupsInflight;
        }
    }

    lookupsInflight = Promise.all([
        fetchDepartmentTree(depId),
        fetchRanksTree(),
        fetchBasesTree(),
    ])
        .then(([departmentsRes, ranksRes, basesRes]) => {
            const data = {
                departments: departmentsRes.data.departments,
                ranks: ranksRes.data.ranks,
                bases: basesRes.data.bases,
                gates: [],
            };
            lookupsCache = { depId: cacheKey, data };
            return data;
        })
        .finally(() => {
            lookupsInflight = null;
        });

    return lookupsInflight;
}

export async function fetchGatesForBases(depId) {
    const { data } = await fetchGatesByBases({ dep_id: depId });
    return data.gates ?? [];
}

export function useReportFilters(depId) {
    return {
        createDefaultFilters,
        resetFilters,
        buildReportParams,
        fetchReportLookups: () => fetchReportLookups(depId),
        fetchGatesForBases: () => fetchGatesForBases(depId),
    };
}
