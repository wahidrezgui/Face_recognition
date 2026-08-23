<script setup lang="ts">
import { Printer } from '@lucide/vue';
import { trans } from 'laravel-vue-i18n';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Select from 'primevue/select';
import { useConfirm } from 'primevue/useconfirm';
import { computed, ref } from 'vue';
import AppButton from '@/components/AppButton.vue';
import { useLocale } from '@/composables/useLocale';
import {
    BADGE_DESIGNER_ELEMENT_STYLE,
    PRINT_COLOR_ADJUST_STYLE,
    renderAccessCardSide,
} from '@/lib/employees/accessCardRender';
import { localizedLabel } from '@/lib/employees/employeeFormUi';
import type { AccessCardResponse, BaseWithZones } from '@/types';

interface Props {
    accessCard: AccessCardResponse | null;
    loading: boolean;
    canManage: boolean;
    employeeStatus: number | null;
    bases: BaseWithZones[];
}

const props = defineProps<Props>();

const baseId = defineModel<number | null>('baseId', { required: true });

const emit = defineEmits<{
    printed: [];
    'return-card': [badgeLogId: number];
}>();

const { locale } = useLocale();
const confirm = useConfirm();

const ownedCards = computed(() => props.accessCard?.badgeLogs.filter((log) => !log.returned_at) ?? []);

function confirmReturn(badgeLogId: number) {
    confirm.require({
        message: trans('employees.accessCard.returnConfirmMessage'),
        header: trans('employees.accessCard.returnConfirmTitle'),
        acceptProps: { severity: 'danger', label: trans('common.confirm') },
        rejectProps: { severity: 'secondary', outlined: true, label: trans('common.cancel') },
        accept: () => emit('return-card', badgeLogId),
    });
}

// Status 0 = Pending (see App\Domain\Personnel\EmployeeStatus) — badges can only be
// printed once an employee has been approved.
const isPending = computed(() => props.employeeStatus === 0);

const printFrame = ref<HTMLIFrameElement | null>(null);

function buildSideDocument(
    content: string,
    width: number,
    height: number,
): string {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        @page { size: ${width}mm ${height}mm; margin: 0; }
        html, body { margin: 0; padding: 0; }
        body { position: relative; width: ${width}mm; height: ${height}mm; overflow: hidden; direction: rtl; box-sizing: border-box; font-family: inherit; }
        img { max-width: 100%; }
        ${BADGE_DESIGNER_ELEMENT_STYLE}
        ${PRINT_COLOR_ADJUST_STYLE}
    </style></head><body>${content}</body></html>`;
}

const frontRendered = computed(() => {
    if (!props.accessCard?.front) {
        return null;
    }

    const { content, width, height } = props.accessCard.front;

    return {
        html: renderAccessCardSide(content, props.accessCard, locale.value),
        width,
        height,
    };
});

const backRendered = computed(() => {
    if (!props.accessCard?.back) {
        return null;
    }

    const { content, width, height } = props.accessCard.back;

    return {
        html: renderAccessCardSide(content, props.accessCard, locale.value),
        width,
        height,
    };
});

const frontDoc = computed(() =>
    frontRendered.value
        ? buildSideDocument(
              frontRendered.value.html,
              frontRendered.value.width,
              frontRendered.value.height,
          )
        : null,
);
const backDoc = computed(() =>
    backRendered.value
        ? buildSideDocument(
              backRendered.value.html,
              backRendered.value.width,
              backRendered.value.height,
          )
        : null,
);

// A single recto-verso print job (front = page 1, back = page 2), not two separate prints —
// each page gets its own physical size via `@page :first` (front) then the general `@page`
// rule (back), since the two sides aren't necessarily the same dimensions.
const combinedPrintDoc = computed(() => {
    const front = frontRendered.value;
    const back = backRendered.value;

    if (!front && !back) {
        return null;
    }

    const pages: string[] = [];

    if (front) {
        pages.push(
            `<div class="side" style="position:relative;width:${front.width}mm;height:${front.height}mm;">${front.html}</div>`,
        );
    }

    if (back) {
        pages.push(
            `<div class="side" style="position:relative;width:${back.width}mm;height:${back.height}mm;">${back.html}</div>`,
        );
    }

    const firstSize = front ?? back!;
    const restSize = back ?? front!;

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        @page { margin: 0; size: ${restSize.width}mm ${restSize.height}mm; }
        @page :first { size: ${firstSize.width}mm ${firstSize.height}mm; }
        html, body { margin: 0; padding: 0; }
        body { direction: rtl; font-family: inherit; }
        .side { overflow: hidden; box-sizing: border-box; break-after: page; page-break-after: always; }
        .side:last-child { break-after: auto; page-break-after: auto; }
        img { max-width: 100%; }
        ${BADGE_DESIGNER_ELEMENT_STYLE}
        ${PRINT_COLOR_ADJUST_STYLE}
    </style></head><body>${pages.join('')}</body></html>`;
});

// One button: opens the print dialog AND (via the `printed` emit) logs the print + marks
// the employee's status Printed — no separate confirm step, matching how this is meant to
// be a single action from the user's point of view.
function printBadge() {
    const frame = printFrame.value;

    if (!frame || !combinedPrintDoc.value) {
        return;
    }

    // Attach the load handler *before* assigning srcdoc — the reverse order races the
    // (async) srcdoc load against handler attachment and can silently drop the print call.
    frame.onload = () => {
        frame.contentWindow?.print();
    };
    frame.srcdoc = combinedPrintDoc.value;

    emit('printed');
}
</script>

<template>
    <div
        v-if="loading"
        class="py-8 text-center text-sm text-surface-500 dark:text-surface-400"
    >
        {{ trans('common.loading') }}
    </div>

    <div
        v-else-if="!accessCard || (!accessCard.front && !accessCard.back)"
        class="py-8 text-center text-sm text-surface-500 dark:text-surface-400"
    >
        {{ trans('employees.accessCard.noTemplate') }}
    </div>

    <div v-else class="space-y-6">
        <div
            v-if="canManage || bases.length > 0"
            class="flex items-center justify-end gap-3"
        >
            <template v-if="bases.length > 0">
                <label
                    class="text-xs font-medium text-surface-600 dark:text-surface-400"
                >
                    {{ trans('employees.accessCard.selectBase') }}
                </label>
                <Select
                    v-model="baseId"
                    :options="bases"
                    :option-label="(item) => localizedLabel(item, locale)"
                    option-value="id"
                    show-clear
                    size="small"
                    style="min-width: 12rem"
                />
            </template>

            <template v-if="canManage">
                <span
                    v-if="isPending"
                    class="text-xs text-surface-500 dark:text-surface-400"
                >
                    {{ trans('employees.accessCard.pendingHint') }}
                </span>
                <AppButton
                    size="small"
                    :disabled="isPending"
                    :title="
                        isPending
                            ? trans('employees.accessCard.pendingHint')
                            : undefined
                    "
                    @click="printBadge"
                >
                    <Printer :size="14" />
                    {{ trans('employees.accessCard.print') }}
                </AppButton>
            </template>
        </div>

        <div class="flex flex-wrap justify-center gap-8">
            <div v-if="frontDoc" class="flex flex-col items-center gap-2">
                <span
                    class="text-xs font-medium text-surface-500 dark:text-surface-400"
                    >{{ trans('employees.accessCard.front') }}</span
                >
                <iframe
                    :srcdoc="frontDoc"
                    class="rounded border border-surface-200 bg-white shadow-sm dark:border-surface-700"
                    :style="{
                        width: `${accessCard!.front!.width}mm`,
                        height: `${accessCard!.front!.height}mm`,
                    }"
                />
            </div>

            <div v-if="backDoc" class="flex flex-col items-center gap-2">
                <span
                    class="text-xs font-medium text-surface-500 dark:text-surface-400"
                    >{{ trans('employees.accessCard.back') }}</span
                >
                <iframe
                    :srcdoc="backDoc"
                    class="rounded border border-surface-200 bg-white shadow-sm dark:border-surface-700"
                    :style="{
                        width: `${accessCard!.back!.width}mm`,
                        height: `${accessCard!.back!.height}mm`,
                    }"
                />
            </div>
        </div>

        <div>
            <h3
                class="mb-2 text-sm font-semibold text-surface-700 dark:text-surface-300"
            >
                {{ trans('employees.accessCard.ownedCards') }}
            </h3>
            <DataTable
                :value="ownedCards"
                data-key="id"
                striped-rows
                size="small"
            >
                <template #empty>
                    <div
                        class="py-6 text-center text-sm text-surface-500 dark:text-surface-400"
                    >
                        {{ trans('employees.accessCard.ownedCardsEmpty') }}
                    </div>
                </template>
                <Column
                    field="date_printed"
                    :header="trans('employees.accessCard.datePrinted')"
                />
                <Column
                    field="printed_by"
                    :header="trans('employees.accessCard.printedBy')"
                >
                    <template #body="{ data }">{{
                        data.printed_by ?? '—'
                    }}</template>
                </Column>
                <Column
                    field="base"
                    :header="trans('employees.accessCard.base')"
                >
                    <template #body="{ data }">{{
                        data.base ? localizedLabel(data.base, locale) : '—'
                    }}</template>
                </Column>
                <Column
                    field="badge_expiry_date"
                    :header="trans('employees.accessCard.badgeExpiry')"
                >
                    <template #body="{ data }">{{
                        data.badge_expiry_date ?? '—'
                    }}</template>
                </Column>
                <Column
                    v-if="canManage"
                    :header="trans('employees.accessCard.actions')"
                >
                    <template #body="{ data }">
                        <AppButton
                            size="small"
                            severity="danger"
                            outlined
                            @click="confirmReturn(data.id)"
                        >
                            {{ trans('employees.accessCard.return') }}
                        </AppButton>
                    </template>
                </Column>
            </DataTable>
        </div>

        <div>
            <h3
                class="mb-2 text-sm font-semibold text-surface-700 dark:text-surface-300"
            >
                {{ trans('employees.accessCard.printHistory') }}
            </h3>
            <DataTable
                :value="accessCard.badgeLogs"
                data-key="id"
                striped-rows
                size="small"
            >
                <template #empty>
                    <div
                        class="py-6 text-center text-sm text-surface-500 dark:text-surface-400"
                    >
                        {{ trans('employees.accessCard.printHistoryEmpty') }}
                    </div>
                </template>
                <Column
                    field="date_printed"
                    :header="trans('employees.accessCard.datePrinted')"
                />
                <Column
                    field="printed_by"
                    :header="trans('employees.accessCard.printedBy')"
                >
                    <template #body="{ data }">{{
                        data.printed_by ?? '—'
                    }}</template>
                </Column>
                <Column
                    field="base"
                    :header="trans('employees.accessCard.base')"
                >
                    <template #body="{ data }">{{
                        data.base ? localizedLabel(data.base, locale) : '—'
                    }}</template>
                </Column>
                <Column
                    field="badge_expiry_date"
                    :header="trans('employees.accessCard.badgeExpiry')"
                >
                    <template #body="{ data }">{{
                        data.badge_expiry_date ?? '—'
                    }}</template>
                </Column>
                <Column
                    field="returned_at"
                    :header="trans('employees.accessCard.returned')"
                >
                    <template #body="{ data }">
                        <span v-if="data.returned_at">
                            {{ data.returned_at
                            }}<span v-if="data.returned_by">
                                — {{ data.returned_by }}</span
                            >
                        </span>
                        <span v-else class="text-surface-400">{{
                            trans('employees.accessCard.notReturned')
                        }}</span>
                    </template>
                </Column>
            </DataTable>
        </div>

        <!-- Off-screen iframe used solely to build the combined recto-verso print job. -->
        <iframe
            ref="printFrame"
            class="fixed -top-[9999px] -left-[9999px] h-0 w-0 border-0"
            aria-hidden="true"
        />
    </div>
</template>
