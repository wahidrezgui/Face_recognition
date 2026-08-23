<script setup lang="ts">
import { Head, Link, usePage } from '@inertiajs/vue3';
import { trans } from 'laravel-vue-i18n';
import Select from 'primevue/select';
import SelectButton from 'primevue/selectbutton';
import { computed, onMounted, ref, watch } from 'vue';
import AppButton from '@/components/AppButton.vue';
import FormField from '@/components/FormField.vue';
import EmployeeCard from '@/components/gate/EmployeeCard.vue';
import GateConnectivityBar from '@/components/gate/GateConnectivityBar.vue';
import GateScanner from '@/components/gate/GateScanner.vue';
import MilitarySearchPicker from '@/components/gate/MilitarySearchPicker.vue';
import PageContainer from '@/components/PageContainer.vue';
import { useGateCheck } from '@/composables/useGateCheck';
import { useLocale } from '@/composables/useLocale';
import { useToast } from '@/composables/useToast';
import GateLayout from '@/layouts/GateLayout.vue';
import {
    playDuplicateCue,
    playErrorCue,
    playSuccessCue,
} from '@/lib/gateOffline/audioCues';
import { mirrorSession } from '@/lib/gateOffline/kioskSession';
import { plateSearch } from '@/routes/gate';
import type { DirectoryEmployee, GateBase, MovementType } from '@/types/gate';

defineOptions({ layout: GateLayout });

const props = defineProps<{ bases: GateBase[] }>();

const page = usePage();
const toast = useToast();
const { locale } = useLocale();

const {
    directoryCount,
    isOnline,
    isSyncing,
    pendingCount,
    selectedEmployee,
    previewIsOffline,
    lookupError,
    searchResults,
    clearSelection,
    lookupEmployee,
    search,
    submit,
} = useGateCheck();

// The kiosk is tied to one physical base — never a free pick. Locked to the
// operator's own account (default_base), matching legacy exactly (it shows
// the base as a read-only label, only the gate within it is selectable).
// Falls back to the first configured base only if the account has none set.
const selectedBaseId = ref<number | null>(
    page.props.auth.user?.default_base || props.bases[0]?.id || null,
);
const selectedGateId = ref<number | null>(null);
const movementType = ref<MovementType>('Check-In');
const cardMode = ref<'auto' | 'manual'>('auto');
const submitting = ref(false);
const scannerRef = ref<InstanceType<typeof GateScanner> | null>(null);

const selectedBase = computed(
    () => props.bases.find((base) => base.id === selectedBaseId.value) ?? null,
);

watch(
    selectedBaseId,
    (baseId) => {
        const base = props.bases.find((b) => b.id === baseId);
        selectedGateId.value = base?.gates[0]?.id ?? null;
    },
    { immediate: true },
);

const movementTypeOptions = computed(() => [
    {
        label: trans('gate.movementType.checkIn'),
        value: 'Check-In' as MovementType,
    },
    {
        label: trans('gate.movementType.checkOut'),
        value: 'Check-Out' as MovementType,
    },
]);

function baseOptionLabel(base: GateBase): string {
    return locale.value === 'ar' ? base.name_ar : base.name_en;
}

function gateOptionLabel(gate: { name_ar: string; name_en: string }): string {
    return locale.value === 'ar' ? gate.name_ar : gate.name_en;
}

onMounted(() => {
    if (page.props.auth.user) {
        void mirrorSession(page.props.auth.user);
    }
});

let autoClearTimer: ReturnType<typeof setTimeout> | undefined;

function announceOutcome(outcome: {
    queued: boolean;
    duplicate: boolean;
}): void {
    if (outcome.queued) {
        toast.success(trans('gate.toast.queued'));
        playSuccessCue();
    } else if (outcome.duplicate) {
        toast.success(trans('gate.toast.duplicate'));
        playDuplicateCue();
    } else {
        toast.success(trans('gate.toast.checked'));
        playSuccessCue();
    }
}

async function handleScan(value: string): Promise<void> {
    if (!selectedBaseId.value || !selectedGateId.value) {
        toast.error(trans('gate.toast.selectFirst'));
        playErrorCue();

        return;
    }

    clearTimeout(autoClearTimer);
    cardMode.value = 'auto';
    await lookupEmployee({ qrcode: value }, selectedBaseId.value);

    if (lookupError.value) {
        toast.error(trans('gate.toast.notFound'));
        playErrorCue();

        return;
    }

    if (!selectedEmployee.value) {
        return;
    }

    submitting.value = true;
    const outcome = await submit({
        mvtype: movementType.value,
        baseId: selectedBaseId.value,
        gateId: selectedGateId.value,
        automatic: true,
    });
    submitting.value = false;

    if (outcome) {
        announceOutcome(outcome);
    }

    // Auto path has no confirm step — keep the card up briefly so the guard
    // can visually check the photo against the person, then clear itself.
    autoClearTimer = setTimeout(() => clearSelection(), 4000);
}

async function handleSearchSelect(employee: DirectoryEmployee): Promise<void> {
    scannerRef.value?.setActive(false);
    cardMode.value = 'manual';
    await lookupEmployee({ employeeId: employee.id }, selectedBaseId.value);
    scannerRef.value?.setActive(true);

    if (lookupError.value) {
        toast.error(trans('gate.toast.notFound'));
    }
}

async function handleConfirm(payload: {
    mvdate: string;
    mvtime: string;
    platenumber: string | null;
}): Promise<void> {
    if (!selectedBaseId.value || !selectedGateId.value) {
        return;
    }

    submitting.value = true;
    const outcome = await submit({
        mvtype: movementType.value,
        baseId: selectedBaseId.value,
        gateId: selectedGateId.value,
        automatic: false,
        platenumber: payload.platenumber,
        mvdate: payload.mvdate,
        mvtime: payload.mvtime,
    });
    submitting.value = false;

    if (outcome) {
        announceOutcome(outcome);
    }

    clearSelection();
}
</script>

<template>
    <Head :title="trans('gate.page.title')" />

    <PageContainer :title="trans('gate.page.title')">
        <template #actions>
            <GateConnectivityBar
                :online="isOnline"
                :syncing="isSyncing"
                :pending-count="pendingCount"
            />
            <Link :href="plateSearch.url()">
                <AppButton
                    severity="secondary"
                    outlined
                    icon="pi pi-car"
                    :label="trans('gate.page.plateSearchLink')"
                />
            </Link>
        </template>

        <GateScanner ref="scannerRef" @scan="handleScan" />

        <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div class="space-y-4 lg:col-span-1">
                <div
                    class="rounded-2xl border border-surface-200 bg-surface-0 p-4 dark:border-surface-700 dark:bg-surface-900"
                >
                    <FormField
                        :label="trans('gate.controls.base')"
                        v-slot="{ id }"
                    >
                        <div
                            :id="id"
                            class="rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-surface-700 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300"
                        >
                            {{
                                selectedBase
                                    ? baseOptionLabel(selectedBase)
                                    : '—'
                            }}
                        </div>
                    </FormField>

                    <FormField
                        class="mt-4"
                        :label="trans('gate.controls.gate')"
                        v-slot="{ id }"
                    >
                        <Select
                            :input-id="id"
                            v-model="selectedGateId"
                            :options="selectedBase?.gates ?? []"
                            option-value="id"
                            :option-label="gateOptionLabel"
                            fluid
                            :disabled="!selectedBase?.gates.length"
                        />
                    </FormField>

                    <FormField
                        class="mt-4"
                        :label="trans('gate.controls.movementType')"
                    >
                        <SelectButton
                            v-model="movementType"
                            :options="movementTypeOptions"
                            option-label="label"
                            option-value="value"
                            :allow-empty="false"
                        />
                    </FormField>
                </div>

                <div
                    class="rounded-2xl border border-surface-200 bg-surface-0 p-4 dark:border-surface-700 dark:bg-surface-900"
                >
                    <FormField :label="trans('gate.search.label')">
                        <MilitarySearchPicker
                            :results="searchResults"
                            @search="search"
                            @select="handleSearchSelect"
                        />
                    </FormField>
                    <p
                        class="mt-2 text-xs text-surface-500 dark:text-surface-400"
                    >
                        {{
                            trans('gate.directoryStatus', {
                                count: String(directoryCount),
                            })
                        }}
                    </p>
                </div>
            </div>

            <div class="lg:col-span-2">
                <EmployeeCard
                    v-if="selectedEmployee"
                    :employee="selectedEmployee"
                    :offline="previewIsOffline"
                    :mode="cardMode"
                    :submitting="submitting"
                    @confirm="handleConfirm"
                    @cancel="clearSelection"
                />
                <div
                    v-else
                    class="flex h-full min-h-[300px] items-center justify-center rounded-2xl border-2 border-dashed border-surface-200 text-surface-400 dark:border-surface-700"
                >
                    {{ trans('gate.idleHint') }}
                </div>
            </div>
        </div>
    </PageContainer>
</template>
