import type { User } from '@/types';
import { gateDb } from './gateDb';
import type { KioskSessionEntry } from './gateDb';

/**
 * Mirrors the authenticated actor into IndexedDB so the kiosk UI can keep
 * showing "signed in as ..." through a network blip. Client-side UX
 * continuity only — it does not extend the real server session; a request
 * that actually reaches the server while the session has expired still gets
 * a real auth failure.
 */
export async function mirrorSession(user: User): Promise<void> {
    await gateDb.kioskSession.put({
        key: 'current',
        id: user.id,
        username: user.username,
        firstname: user.firstname,
        lastname: user.lastname,
        default_base: user.default_base ?? null,
    });
}

export async function getMirroredSession(): Promise<
    KioskSessionEntry | undefined
> {
    return gateDb.kioskSession.get('current');
}
