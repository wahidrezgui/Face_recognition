import { reactive, onMounted, onUnmounted } from 'vue';
import { useMutation, useQueryClient } from '@tanstack/vue-query';
import { checkMovement, checkManual, submitMovement } from '../api/movements';
import { countPendingMovements, isOnline, onConnectivityChange } from '../lib/offline-queue';
import { syncPendingMovements } from '../lib/sync-movements';
import { createRequestId } from '../lib/uuid';

export function useGateCheck() {
    const queryClient = useQueryClient();

    const submitMutation = useMutation({
        mutationFn: async (payload) => {
            const response = await submitMovement(payload);
            return response.data;
        },
        onSuccess: (result) => {
            if (!result.queued) {
                queryClient.invalidateQueries({ queryKey: ['movements'] });
            }
            gate.pendingCount = countPendingMovements();
        },
    });

    const gate = reactive({
        loading: false,
        error: false,
        data: null,
        offline: !isOnline(),
        pendingCount: countPendingMovements(),
        isSubmitting: false,

        async flushQueue() {
            if (!isOnline() || gate.pendingCount === 0) {
                return null;
            }
            const result = await syncPendingMovements();
            gate.pendingCount = countPendingMovements();
            return result;
        },

        async check(payload) {
            gate.loading = true;
            gate.error = false;
            try {
                const response = await checkMovement(payload);
                gate.data = response.data;
                return response.data;
            } catch (e) {
                gate.error = true;
                throw e;
            } finally {
                gate.loading = false;
            }
        },

        async checkManualEntry(payload) {
            gate.isSubmitting = true;
            try {
                const response = await checkManual({
                    ...payload,
                    client_request_id: payload.client_request_id ?? createRequestId(),
                });
                return response.data;
            } finally {
                gate.isSubmitting = false;
            }
        },

        async submit(payload) {
            gate.isSubmitting = true;
            try {
                return await submitMutation.mutateAsync(payload);
            } finally {
                gate.isSubmitting = false;
            }
        },
    });

    let stopConnectivityListener = null;

    onMounted(() => {
        stopConnectivityListener = onConnectivityChange(async () => {
            gate.offline = !isOnline();
            if (isOnline()) {
                await gate.flushQueue();
            }
        });
        if (isOnline() && gate.pendingCount > 0) {
            gate.flushQueue();
        }
    });

    onUnmounted(() => {
        stopConnectivityListener?.();
    });

    return gate;
}
