<script setup lang="ts">
import { Printer } from '@lucide/vue';
import { trans } from 'laravel-vue-i18n';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import { computed, ref } from 'vue';
import AppButton from '@/components/AppButton.vue';
import { useLocale } from '@/composables/useLocale';
import {
    BADGE_DESIGNER_ELEMENT_STYLE,
    PRINT_COLOR_ADJUST_STYLE,
    renderAccessCardSide,
} from '@/lib/employees/accessCardRender';
import { localizedLabel } from '@/lib/employees/employeeFormUi';
import type { BaseWithZones, BulkAccessCardEntry } from '@/types';

interface Props {
    cards: BulkAccessCardEntry[];
    loading: boolean;
    count: number;
    bases: BaseWithZones[];
}

const props = defineProps<Props>();

const visible = defineModel<boolean>('visible', { required: true });
const baseId = defineModel<number | null>('baseId', { required: true });

const emit = defineEmits<{
    printed: [];
}>();

const { locale } = useLocale();

const printableCards = computed(() =>
    props.cards.filter((card) => card.front || card.back),
);
const hasNoTemplates = computed(
    () =>
        !props.loading &&
        props.cards.length > 0 &&
        printableCards.value.length === 0,
);

const printFrame = ref<HTMLIFrameElement | null>(null);

// One recto-verso job per employee, concatenated into a single paginated print doc —
// mirrors EmployeeAccessCardTab.vue's combinedPrintDoc, just looped over N employees
// instead of 1. Page size comes from the first printable card: a bulk selection is a
// department/company-scoped batch in practice, so front/back dimensions are uniform
// across it.
const combinedPrintDoc = computed(() => {
    if (printableCards.value.length === 0) {
        return null;
    }

    const pages: string[] = [];

    for (const card of printableCards.value) {
        if (card.front) {
            const html = renderAccessCardSide(
                card.front.content,
                card,
                locale.value,
            );
            pages.push(
                `<div class="side" style="position:relative;width:${card.front.width}mm;height:${card.front.height}mm;">${html}</div>`,
            );
        }

        if (card.back) {
            const html = renderAccessCardSide(
                card.back.content,
                card,
                locale.value,
            );
            pages.push(
                `<div class="side" style="position:relative;width:${card.back.width}mm;height:${card.back.height}mm;">${html}</div>`,
            );
        }
    }

    const first = printableCards.value[0];
    const firstSize = first.front ?? first.back!;

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        @page { margin: 0; size: ${firstSize.width}mm ${firstSize.height}mm; }
        html, body { margin: 0; padding: 0; }
        body { direction: rtl; font-family: inherit; }
        .side { overflow: hidden; box-sizing: border-box; break-after: page; page-break-after: always; }
        .side:last-child { break-after: auto; page-break-after: auto; }
        img { max-width: 100%; }
        ${BADGE_DESIGNER_ELEMENT_STYLE}
        ${PRINT_COLOR_ADJUST_STYLE}
    </style></head><body>${pages.join('')}</body></html>`;
});

// Only record the print (which lets the caller close this dialog, per its onSuccess)
// once the iframe has actually finished loading *and* window.print() has been invoked.
// Emitting eagerly — before the iframe's (image-inclusive) load — used to race the
// dialog close against that load: PrimeVue's Dialog unmounts its content, iframe
// included, as soon as `visible` flips to false, which could tear the iframe down
// before its photos finished loading and print() ever ran, silently cutting a bulk job
// (several employees' photos to fetch) down to whatever had rendered so far.
function printCards() {
    const frame = printFrame.value;

    if (!frame || !combinedPrintDoc.value) {
        return;
    }

    frame.onload = () => {
        frame.contentWindow?.print();
        emit('printed');
    };
    frame.srcdoc = combinedPrintDoc.value;
}

function cancel() {
    visible.value = false;
}
</script>

<template>
    <Dialog
        v-model:visible="visible"
        modal
        :header="trans('employees.bulk.printAccessCardsDialogTitle')"
        :style="{ width: '26rem' }"
    >
        <p class="mb-4 text-sm text-surface-600 dark:text-surface-400">
            {{
                trans('employees.bulk.printAccessCardsCount', {
                    count: String(count),
                })
            }}
        </p>

        <div
            v-if="loading"
            class="py-4 text-center text-sm text-surface-500 dark:text-surface-400"
        >
            {{ trans('common.loading') }}
        </div>

        <template v-else>
            <div
                v-if="hasNoTemplates"
                class="py-2 text-sm text-surface-500 dark:text-surface-400"
            >
                {{ trans('employees.accessCard.noTemplate') }}
            </div>

            <div
                v-else-if="bases.length > 0"
                class="flex flex-col gap-2"
            >
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
                    fluid
                    size="small"
                />
            </div>
        </template>

        <template #footer>
            <AppButton severity="secondary" outlined @click="cancel">
                {{ trans('common.cancel') }}
            </AppButton>
            <AppButton
                :disabled="loading || printableCards.length === 0"
                @click="printCards"
            >
                <Printer :size="14" />
                {{ trans('employees.accessCard.print') }}
            </AppButton>
        </template>

        <iframe
            ref="printFrame"
            class="fixed -top-[9999px] -left-[9999px] h-0 w-0 border-0"
            aria-hidden="true"
        />
    </Dialog>
</template>
