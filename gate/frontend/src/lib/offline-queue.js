const STORAGE_KEY = 'gate.offline.movements';

function readQueue() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function writeQueue(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function getPendingMovements() {
    return readQueue();
}

export function countPendingMovements() {
    return readQueue().length;
}

export function enqueueMovement(item) {
    const queue = readQueue();
    queue.push(item);
    writeQueue(queue);
    return queue.length;
}

export function removeMovement(clientRequestId) {
    const queue = readQueue().filter((item) => item.client_request_id !== clientRequestId);
    writeQueue(queue);
    return queue.length;
}

export function clearSyncedMovements(clientRequestIds) {
    const ids = new Set(clientRequestIds);
    const queue = readQueue().filter((item) => !ids.has(item.client_request_id));
    writeQueue(queue);
    return queue.length;
}

export function isOnline() {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

export function onConnectivityChange(callback) {
    window.addEventListener('online', callback);
    window.addEventListener('offline', callback);
    return () => {
        window.removeEventListener('online', callback);
        window.removeEventListener('offline', callback);
    };
}
