import api, { isNetworkError } from '../../api/client';

const HEARTBEAT_MS = 25000;
const PING_TIMEOUT_MS = 5000;

let browserOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
let apiReachable = browserOnline;
let heartbeatTimer = null;
let heartbeatSubscribers = new Set();
let connectionState = browserOnline && apiReachable ? 'online' : 'offline';

function notifySubscribers() {
    const nextState = !browserOnline || !apiReachable ? 'offline' : 'online';
    if (connectionState !== 'syncing') {
        connectionState = nextState;
    }
    heartbeatSubscribers.forEach((cb) => cb(connectionState));
}

export function getConnectionState() {
    return connectionState;
}

export function setConnectionStateSyncing() {
    connectionState = 'syncing';
    heartbeatSubscribers.forEach((cb) => cb(connectionState));
}

export function restoreConnectionStateAfterSync() {
    connectionState = !browserOnline || !apiReachable ? 'offline' : 'online';
    heartbeatSubscribers.forEach((cb) => cb(connectionState));
}

export function isBrowserOnline() {
    return browserOnline;
}

export async function pingApi() {
    if (!browserOnline) {
        apiReachable = false;
        notifySubscribers();
        return false;
    }

    try {
        const { data } = await api.get('/api/ping', { timeout: PING_TIMEOUT_MS });
        apiReachable = data?.status === 'ok';
    } catch (error) {
        apiReachable = isNetworkError(error) ? false : browserOnline;
    }

    notifySubscribers();
    return apiReachable;
}

export async function isApiReachable(force = false) {
    if (!browserOnline) {
        apiReachable = false;
        return false;
    }
    if (force || !apiReachable) {
        await pingApi();
    }
    return apiReachable;
}

export function shouldUseOfflineQueue() {
    return !browserOnline || connectionState === 'offline' || !apiReachable;
}

export function onConnectionStateChange(callback) {
    heartbeatSubscribers.add(callback);
    callback(connectionState);
    return () => heartbeatSubscribers.delete(callback);
}

export function onConnectivityChange(callback) {
    const handler = () => {
        browserOnline = navigator.onLine;
        pingApi().then(() => callback());
    };
    window.addEventListener('online', handler);
    window.addEventListener('offline', handler);
    return () => {
        window.removeEventListener('online', handler);
        window.removeEventListener('offline', handler);
    };
}

export function startConnectivityHeartbeat() {
    if (heartbeatTimer) {
        return;
    }
    pingApi();
    heartbeatTimer = window.setInterval(() => {
        pingApi();
    }, HEARTBEAT_MS);
}

export function stopConnectivityHeartbeat() {
    if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
    }
}

/** @internal test helper */
export function resetConnectivityStateForTests({ online = true, reachable = true } = {}) {
    browserOnline = online;
    apiReachable = reachable;
    connectionState = online && reachable ? 'online' : 'offline';
}
