<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3';
import { trans } from 'laravel-vue-i18n';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import { computed, ref } from 'vue';
import { search as resultsAction } from '@/actions/App/Http/Controllers/Inertia/PlateMovementController';
import AppButton from '@/components/AppButton.vue';
import AppCard from '@/components/AppCard.vue';
import AppDateInput from '@/components/AppDateInput.vue';
import AppFiltersBar from '@/components/AppFiltersBar.vue';
import FormField from '@/components/FormField.vue';
import PageContainer from '@/components/PageContainer.vue';
import { useLocale } from '@/composables/useLocale';
import GateLayout from '@/layouts/GateLayout.vue';
import { movementTypeOptions } from '@/lib/gate/movementTypeOptions';
import { formatMovementDateTime } from '@/lib/movementFormatting';
import { gate as gateRoute } from '@/routes';
import type {
    MovementType,
    PlateMovementRow,
    PlateSearchResult,
} from '@/types/gate';

defineOptions({ layout: GateLayout });

const { locale } = useLocale();

const PER_PAGE = 25;

const platenumber = ref('');
const mvtype = ref<MovementType | ''>('');
const dateFrom = ref('');
const dateTo = ref('');

const loading = ref(false);
const searched = ref(false);
const result = ref<PlateSearchResult | null>(null);

const mvtypeOptions = computed(() => movementTypeOptions(true));

async function runSearch(targetPage = 1): Promise<void> {
    if (!platenumber.value.trim()) {
        return;
    }

    loading.value = true;
    searched.value = true;

    try {
        const response = await fetch(
            resultsAction.url({
                query: {
                    platenumber: platenumber.value,
                    mvtype: mvtype.value || undefined,
                    date_from: dateFrom.value || undefined,
                    date_to: dateTo.value || undefined,
                    page: targetPage,
                    per_page: PER_PAGE,
                },
            }),
            { headers: { Accept: 'application/json' } },
        );
        result.value = await response.json();
    } finally {
        loading.value = false;
    }
}

function formatDate(mvdate: string): string {
    return mvdate.slice(0, 10);
}

function employeeName(row: PlateMovementRow): string {
    return (
        (locale.value === 'ar' ? row.employee_ar : row.employee_en) ||
        row.employee_en ||
        '—'
    );
}

function gateName(row: PlateMovementRow): string {
    return (locale.value === 'ar' ? row.gate_ar : row.gate_en) || '—';
}

function baseName(row: PlateMovementRow): string {
    return (locale.value === 'ar' ? row.base_ar : row.base_en) || '—';
}

function onPageChange(event: { page: number }): void {
    void runSearch(event.page + 1);
}
</script>

<template>
    <Head :title="trans('gate.plateSearch.page.title')" />

    <PageContainer :title="trans('gate.plateSearch.page.title')">
        <template #actions>
            <Link :href="gateRoute.url()">
                <AppButton
                    severity="secondary"
                    outlined
                    icon="pi pi-arrow-left"
                    :label="trans('gate.plateSearch.backToKiosk')"
                />
            </Link>
        </template>

        <AppCard padding="md" class="mb-4">
            <form novalidate @submit.prevent="runSearch(1)">
                <AppFiltersBar density="dense">
                    <FormField
                        class="sm:col-span-2"
                        :label="trans('gate.plateSearch.filters.plate')"
                        v-slot="{ id }"
                    >
                        <InputText :id="id" v-model="platenumber" fluid dir="ltr" />
                    </FormField>
                    <FormField
                        :label="trans('gate.plateSearch.filters.type')"
                        v-slot="{ id }"
                    >
                        <Select
                            :input-id="id"
                            v-model="mvtype"
                            :options="mvtypeOptions"
                            option-label="label"
                            option-value="value"
                            fluid
                        />
                    </FormField>
                    <FormField
                        :label="trans('gate.plateSearch.filters.from')"
                        v-slot="{ id }"
                    >
                        <AppDateInput :input-id="id" v-model="dateFrom" />
                    </FormField>
                    <FormField
                        :label="trans('gate.plateSearch.filters.to')"
                        v-slot="{ id }"
                    >
                        <AppDateInput :input-id="id" v-model="dateTo" />
                    </FormField>
                    <template #actions>
                        <AppButton
                            type="submit"
                            :loading="loading"
                            :label="trans('gate.plateSearch.filters.search')"
                        />
                    </template>
                </AppFiltersBar>
            </form>
        </AppCard>

        <AppCard
            v-if="result?.lastMovement"
            padding="md"
            class="mb-4"
            :title="trans('gate.plateSearch.lastMovementTitle')"
        >
            <p class="text-sm text-surface-700 dark:text-surface-300">
                {{ employeeName(result.lastMovement) }} —
                {{ result.lastMovement.mvtype }} —
                {{ formatMovementDateTime(result.lastMovement, locale) }}
                ({{ gateName(result.lastMovement) }},
                {{ baseName(result.lastMovement) }})
            </p>
        </AppCard>

        <AppCard padding="none">
            <DataTable
                :value="result?.data.data ?? []"
                :loading="loading"
                lazy
                paginator
                :rows="PER_PAGE"
                :total-records="result?.total ?? 0"
                :first="((result?.data.current_page ?? 1) - 1) * PER_PAGE"
                @page="onPageChange"
            >
                <template #empty>
                    <span>{{
                        searched
                            ? trans('gate.plateSearch.noResults')
                            : trans('gate.plateSearch.enterPlate')
                    }}</span>
                </template>
                <Column :header="trans('gate.plateSearch.table.date')">
                    <template #body="{ data }">{{
                        formatDate(data.mvdate)
                    }}</template>
                </Column>
                <Column
                    field="mvtime"
                    :header="trans('gate.plateSearch.table.time')"
                />
                <Column :header="trans('gate.plateSearch.table.type')">
                    <template #body="{ data }">{{ data.mvtype }}</template>
                </Column>
                <Column
                    field="platenumber"
                    :header="trans('gate.plateSearch.table.plate')"
                />
                <Column :header="trans('gate.plateSearch.table.employee')">
                    <template #body="{ data }">{{
                        employeeName(data)
                    }}</template>
                </Column>
                <Column
                    field="military_number"
                    :header="trans('gate.plateSearch.table.militaryNumber')"
                />
                <Column :header="trans('gate.plateSearch.table.gate')">
                    <template #body="{ data }">{{ gateName(data) }}</template>
                </Column>
                <Column :header="trans('gate.plateSearch.table.base')">
                    <template #body="{ data }">{{ baseName(data) }}</template>
                </Column>
            </DataTable>
        </AppCard>
    </PageContainer>
</template>
