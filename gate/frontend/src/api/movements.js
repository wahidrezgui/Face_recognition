import api, { ensureCsrfCookie } from './client';
import {
    movementCheckPayloadSchema,
    movementCheckResponseSchema,
} from '../schemas/movements';
import { submitMovementWithOffline } from '../lib/sync-movements';

export async function checkMovement(payload) {
    const body = movementCheckPayloadSchema.parse(payload);
    await ensureCsrfCookie();
    const { data } = await api.post('/api/movements/check', body);
    return { data: movementCheckResponseSchema.parse(data) };
}

export async function checkManual(payload) {
    await ensureCsrfCookie();
    return api.post('/api/movements/check/manual', payload);
}

export async function submitMovement(payload) {
    return { data: await submitMovementWithOffline(payload) };
}

export async function syncMovements(items) {
    await ensureCsrfCookie();
    return api.post('/api/movements/sync', { items });
}

export function fetchLatestMovements(employeeId) {
    return api.get(`/api/employees/${employeeId}/movements/latest`);
}

export function fetchCompanyCheckInOut(companyId) {
    return api.get(`/api/companies/${companyId}/check-in-out`);
}

export { searchByPlate } from './employees';
