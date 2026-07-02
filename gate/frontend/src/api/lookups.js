import api from './client';

export function fetchRanks() {
    return api.get('/api/lookups/ranks');
}

export function fetchRankCategories() {
    return api.get('/api/lookups/ranks/categories');
}

export function fetchNationalities() {
    return api.get('/api/lookups/nationalities');
}

export function fetchRanksTree() {
    return api.get('/api/lookups/ranks/tree');
}

export function fetchBasesTree() {
    return api.get('/api/lookups/bases/tree');
}

export function fetchGatesByBases(params) {
    return api.get('/api/lookups/gates/by-bases', { params });
}
