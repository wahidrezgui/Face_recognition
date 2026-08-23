import { onMounted, onUnmounted, ref } from 'vue';
import { lookup as lookupAction } from '@/actions/App/Http/Controllers/Inertia/GateController';
import { csrfPost } from '@/lib/csrfFetch';
import {
    isOnline,
    startConnectivityWatch,
    stopConnectivityWatch,
} from '@/lib/gateOffline/connectivity';
import {
    lookupById,
    lookupByQrcode,
    searchDirectory,
    seedDirectory,
} from '@/lib/gateOffline/directoryCache';
import {
    isSyncing,
    pendingCount,
    refreshPendingCount,
    submitMovement,
    syncPendingMovements,
} from '@/lib/gateOffline/syncEngine';
import type {
    DirectoryEmployee,
    EmployeePreview,
    MovementType,
} from '@/types/gate';

const SYNC_RETRY_INTERVAL_MS = 15_000;

/** Reduced-fidelity card built from the local roster cache when offline — no
 * alerts/access/timing, since those are only computed server-side. */
function toOfflinePreview(employee: DirectoryEmployee): EmployeePreview {
    return {
        emp_id: employee.id,
        military_number: employee.military_number,
        qrcode: employee.qrcode,
        photo: employee.photo,
        fullname_en: employee.fullname_en,
        fullname_ar: employee.fullname_ar,
        remarks: null,
        bloodtype: null,
        department_ar: employee.department_ar,
        department_en: employee.department_en,
        rank_ar: employee.rank_ar,
        rank_en: employee.rank_en,
        rank_category_ar: null,
        rank_category_en: null,
        base_ar: null,
        base_en: null,
        expiry_date: null,
        last_movement_type: null,
        access: 0,
        timing: null,
        alerts: [],
        is_expired: false,
    };
}

export interface SubmitOptions {
    mvtype: MovementType;
    baseId: number;
    gateId: number;
    automatic: boolean;
    platenumber?: string | null;
    mvdate?: string;
    mvtime?: string;
}

export function useGateCheck() {
    const directoryReady = ref(false);
    const directoryCount = ref(0);

    const selectedEmployee = ref<EmployeePreview | null>(null);
    const previewIsOffline = ref(false);
    const lookupError = ref<'not_found' | null>(null);
    const lookupLoading = ref(false);

    const searchResults = ref<DirectoryEmployee[]>([]);

    let syncTimer: ReturnType<typeof setInterval> | undefined;

    async function initialize(): Promise<void> {
        startConnectivityWatch();
        await refreshPendingCount();

        try {
            directoryCount.value = await seedDirectory();
        } catch {
            // No network on first load — whatever roster is already cached from a
            // previous session (possibly none) stays in use.
        }

        directoryReady.value = true;

        void syncPendingMovements();
        syncTimer = setInterval(
            () => void syncPendingMovements(),
            SYNC_RETRY_INTERVAL_MS,
        );
    }

    function teardown(): void {
        stopConnectivityWatch();
        clearInterval(syncTimer);
    }

    function clearSelection(): void {
        selectedEmployee.value = null;
        previewIsOffline.value = false;
        lookupError.value = null;
    }

    /** Two-phase lookup — no side effect. A separate submit() call actually writes the movement. */
    async function lookupEmployee(
        params: { qrcode?: string; employeeId?: number },
        baseId: number | null,
    ): Promise<void> {
        lookupLoading.value = true;
        lookupError.value = null;
        selectedEmployee.value = null;
        previewIsOffline.value = false;

        try {
            if (isOnline.value) {
                try {
                    const payload = params.qrcode
                        ? { qrcode: params.qrcode, base_id: baseId }
                        : { employee_id: params.employeeId, base_id: baseId };
                    selectedEmployee.value = await csrfPost<EmployeePreview>(
                        lookupAction.url(),
                        payload,
                    );

                    return;
                } catch {
                    // Network/server failure — fall back to the local cache below.
                }
            }

            const cached = params.qrcode
                ? await lookupByQrcode(params.qrcode)
                : params.employeeId
                  ? await lookupById(params.employeeId)
                  : undefined;

            if (!cached) {
                lookupError.value = 'not_found';

                return;
            }

            selectedEmployee.value = toOfflinePreview(cached);
            previewIsOffline.value = true;
        } finally {
            lookupLoading.value = false;
        }
    }

    async function search(query: string): Promise<void> {
        // Always searches the local roster index (seeded on load) — works
        // identically online or offline since the full directory is cached client-side.
        searchResults.value = await searchDirectory(query);
    }

    async function submit(
        options: SubmitOptions,
    ): Promise<{ queued: boolean; duplicate: boolean } | null> {
        if (!selectedEmployee.value) {
            return null;
        }

        const outcome = await submitMovement({
            emp_id: selectedEmployee.value.emp_id,
            mvtype: options.mvtype,
            base_id: options.baseId,
            gate_id: options.gateId,
            automatic: options.automatic,
            platenumber: options.platenumber || null,
            mvdate: options.mvdate,
            mvtime: options.mvtime,
        });

        // Clearing is left to the caller: the manual-confirm flow clears
        // immediately, the auto-scan flow keeps the card up briefly so the
        // guard can visually verify the photo against the person.
        return outcome;
    }

    onMounted(() => void initialize());
    onUnmounted(teardown);

    return {
        directoryReady,
        directoryCount,
        isOnline,
        isSyncing,
        pendingCount,
        selectedEmployee,
        previewIsOffline,
        lookupError,
        lookupLoading,
        searchResults,
        clearSelection,
        lookupEmployee,
        search,
        submit,
    };
}
