import { gateDb, KIOSK_SESSION_ID, ensureGateDbMigrated } from './gate-db';
import { syncLegacyStorage } from '../../api/auth';

function toStorable(value) {
    return JSON.parse(JSON.stringify(value));
}

export async function saveKioskSession(user) {
    if (!user) {
        return;
    }

    await ensureGateDbMigrated();
    const plainUser = toStorable(user);
    syncLegacyStorage(plainUser);
    await gateDb.kioskSession.put({
        id: KIOSK_SESSION_ID,
        user_json: JSON.stringify(plainUser),
        cached_at: new Date().toISOString(),
    });
}

export async function getKioskSession() {
    await ensureGateDbMigrated();
    const row = await gateDb.kioskSession.get(KIOSK_SESSION_ID);
    if (!row) {
        return null;
    }
    if (row.user_json) {
        try {
            return JSON.parse(row.user_json);
        } catch {
            return null;
        }
    }
    return row.user ?? null;
}

export async function hasKioskSession() {
    const user = await getKioskSession();
    return user != null;
}

export async function clearKioskSession() {
    await ensureGateDbMigrated();
    await gateDb.kioskSession.delete(KIOSK_SESSION_ID);
}
