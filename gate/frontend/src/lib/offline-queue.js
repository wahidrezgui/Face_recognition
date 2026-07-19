export {
    getPendingMovements,
    countPendingMovements,
    enqueueMovement,
    clearSyncedMovements,
} from './gate-offline/sync-engine';

export {
    isBrowserOnline as isOnline,
    isApiReachable,
    shouldUseOfflineQueue,
    onConnectivityChange,
    onConnectionStateChange,
    getConnectionState,
    startConnectivityHeartbeat,
    stopConnectivityHeartbeat,
} from './gate-offline/connectivity';
