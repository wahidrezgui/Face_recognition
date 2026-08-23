import { toRaw } from 'vue';

function extractCheckedIdsFromObjectKeys(selectionObject) {
    if (!selectionObject || typeof selectionObject !== 'object') {
        return [];
    }

    return Object.keys(selectionObject).filter((id) => selectionObject[id].checked);
}

export function extractRankIds(selectedRanks) {
    return extractCheckedIdsFromObjectKeys(toRaw(selectedRanks));
}

export function extractBaseIds(selectedBases) {
    return extractCheckedIdsFromObjectKeys(toRaw(selectedBases));
}

export function extractGateIds(selectedGates) {
    return extractCheckedIdsFromObjectKeys(toRaw(selectedGates));
}

export function resolveDepartmentId(selectedDepartment, fallbackDepId) {
    if (selectedDepartment && Object.keys(selectedDepartment).length > 0) {
        return Object.keys(selectedDepartment)[0];
    }
    return fallbackDepId ?? localStorage.getItem('dep_id');
}

export function buildReportSearchParams({
    page,
    perPage,
    militaryNumber,
    employeeName,
    selectedGender,
    selectedType,
    date,
    fromDate,
    toDate,
    selectedDepartment,
    selectedRanks,
    selectedBases,
    selectedGates,
    depId,
}) {
    const params = {
        page,
        per_page: perPage,
        military_number: militaryNumber,
        fullname_ar: employeeName,
        gender: selectedGender,
        mvtype: selectedType,
        userFullName: localStorage.getItem('user_fullname'),
    };

    if (date) {
        params.date = date;
    }
    if (fromDate) {
        params.from_date = fromDate;
    }
    if (toDate) {
        params.to_date = toDate;
    }

    params.department_id = resolveDepartmentId(selectedDepartment, depId);

    const rankIds = extractRankIds(selectedRanks);
    if (rankIds.length > 0) {
        params.rank_ids = rankIds;
    }

    const baseIds = extractBaseIds(selectedBases);
    if (baseIds.length > 0) {
        params.base_ids = baseIds;
    }

    const gateIds = extractGateIds(selectedGates);
    if (gateIds.length > 0) {
        params.gate_ids = gateIds;
    }

    return params;
}
