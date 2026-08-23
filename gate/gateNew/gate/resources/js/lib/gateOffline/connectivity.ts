import { ref } from 'vue';

const HEARTBEAT_INTERVAL_MS = 25_000;
const HEARTBEAT_TIMEOUT_MS = 4_000;

/**
 * navigator.onLine alone doesn't catch "on the LAN but the backend is
 * unreachable" — heartbeat against Laravel's own default /up health route
 * (already registered, no dedicated ping endpoint needed) to confirm the
 * server is actually reachable, not just the network interface.
 */
export const isOnline = ref(navigator.onLine);

let heartbeatTimer: ReturnType<typeof setInterval> | undefined;

async function pingServer(): Promise<boolean> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HEARTBEAT_TIMEOUT_MS);

    try {
        const response = await fetch('/up', {
            method: 'GET',
            cache: 'no-store',
            signal: controller.signal,
        });

        return response.ok;
    } catch {
        return false;
    } finally {
        clearTimeout(timeout);
    }
}

async function heartbeat(): Promise<void> {
    isOnline.value = navigator.onLine && (await pingServer());
}

export function startConnectivityWatch(): void {
    window.addEventListener('online', heartbeat);
    window.addEventListener('offline', () => {
        isOnline.value = false;
    });

    void heartbeat();
    heartbeatTimer = setInterval(() => void heartbeat(), HEARTBEAT_INTERVAL_MS);
}

export function stopConnectivityWatch(): void {
    clearInterval(heartbeatTimer);
}
