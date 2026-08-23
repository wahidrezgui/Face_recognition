<script setup lang="ts">
import { trans } from 'laravel-vue-i18n';
import Textarea from 'primevue/textarea';
import { useConfirm } from 'primevue/useconfirm';
import { ref, watch } from 'vue';
import { movements as movementsAction } from '@/actions/App/Http/Controllers/Inertia/EmployeeController';
import AppButton from '@/components/AppButton.vue';
import AppSidePanel from '@/components/AppSidePanel.vue';
import { useLocale } from '@/composables/useLocale';
import { formatMovementDateTime } from '@/lib/movementFormatting';
import type { EmployeeMovement } from '@/types';
import type { ReportPreset, ReportRow } from '@/types/reports';

const NOTE_EDITABLE_PRESETS = new Set(['issues', 'justified', 'unjustified']);

const props = defineProps<{
    open: boolean;
    preset: ReportPreset;
    row: ReportRow | null;
}>();

const emit = defineEmits<{
    'update:open': [value: boolean];
    save: [payload: { empId: number; mvdate: string; notes: string }];
    delete: [payload: { empId: number; mvdate: string }];
}>();

const { locale } = useLocale();
const confirm = useConfirm();

const movements = ref<EmployeeMovement[]>([]);
const movementsLoading = ref(false);
const noteText = ref('');

function noteDate(mvdate: string | null | undefined): string {
    return String(mvdate ?? '').split('T')[0];
}

function formatNoteAt(value: string | null | undefined): string {
    if (!value) {
        return '';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    const localeTag = locale.value === 'ar' ? 'ar-QA' : 'en-GB';

    return `${date.toLocaleDateString(localeTag)} ${date.toLocaleTimeString(localeTag, { hour: '2-digit', minute: '2-digit' })}`;
}

async function loadMovements(): Promise<void> {
    if (!props.row) {
        return;
    }

    movementsLoading.value = true;

    try {
        const response = await fetch(movementsAction.url(props.row.id), {
            headers: { Accept: 'application/json' },
        });

        if (!response.ok) {
            movements.value = [];

            return;
        }

        const payload = await response.json();
        movements.value = payload.movements ?? [];
    } catch {
        movements.value = [];
    } finally {
        movementsLoading.value = false;
    }
}

watch(
    () => props.row,
    (row) => {
        noteText.value = row?.notes ?? '';

        if (row && props.open) {
            void loadMovements();
        }
    },
);

function save(): void {
    if (!props.row) {
        return;
    }

    const mvdate = noteDate(props.row.mvdate);
    const notes = noteText.value.trim();

    if (!mvdate || notes === '') {
        return;
    }

    emit('save', { empId: props.row.id, mvdate, notes });
}

function confirmDelete(): void {
    if (!props.row) {
        return;
    }

    const row = props.row;
    confirm.require({
        message: trans('reports.notes.deleteConfirmMessage'),
        header: trans('reports.notes.deleteConfirmHeader'),
        acceptProps: { severity: 'danger', label: trans('common.confirm') },
        rejectProps: {
            severity: 'secondary',
            outlined: true,
            label: trans('common.cancel'),
        },
        accept: () =>
            emit('delete', { empId: row.id, mvdate: noteDate(row.mvdate) }),
    });
}
</script>

<template>
    <AppSidePanel
        :model-value="props.open"
        width="480px"
        :close-aria-label="trans('common.cancel')"
        @update:model-value="emit('update:open', $event)"
        @close="emit('update:open', false)"
    >
        <template v-if="props.row" #header>
            <h2
                class="text-lg font-semibold text-surface-800 dark:text-surface-100"
            >
                {{
                    locale === 'ar'
                        ? props.row.fullname_ar
                        : props.row.fullname_en
                }}
            </h2>
            <p class="mt-1 text-sm text-surface-500 dark:text-surface-400">
                {{ props.row.military_number }} — {{ props.row.department }}
            </p>
        </template>

        <template v-if="props.row">
            <template v-if="NOTE_EDITABLE_PRESETS.has(props.preset.key)">
                <h3
                    class="mb-2 text-sm font-semibold text-surface-700 dark:text-surface-300"
                >
                    {{ trans('reports.notes.title') }}
                </h3>
                <Textarea v-model="noteText" fluid rows="3" class="mb-2" />
                <p
                    v-if="props.row.created_by"
                    class="mb-2 text-xs text-surface-500 dark:text-surface-400"
                >
                    {{
                        trans('reports.notes.authoredBy', {
                            name: props.row.created_by,
                            at: formatNoteAt(props.row.notes_created_at),
                        })
                    }}
                </p>
                <div class="mb-6 flex gap-2">
                    <AppButton
                        size="small"
                        :label="trans('reports.notes.save')"
                        @click="save"
                    />
                    <AppButton
                        v-if="props.preset.allowDeleteNote && props.row.notes"
                        size="small"
                        severity="danger"
                        outlined
                        :label="trans('reports.notes.delete')"
                        @click="confirmDelete"
                    />
                </div>
            </template>

            <h3
                class="mb-2 text-sm font-semibold text-surface-700 dark:text-surface-300"
            >
                {{ trans('reports.detail.movementHistory') }}
            </h3>
            <div v-if="movementsLoading" class="text-sm text-surface-400">
                {{ trans('common.loading') }}
            </div>
            <ul v-else class="space-y-2">
                <li
                    v-for="movement in movements"
                    :key="movement.id"
                    class="rounded-lg border border-surface-200 px-3 py-2 text-sm dark:border-surface-700"
                >
                    <span class="font-medium">{{ movement.mvtype }}</span>
                    — {{ formatMovementDateTime(movement, locale) }}
                    <span class="text-surface-500 dark:text-surface-400">
                        ({{
                            locale === 'ar'
                                ? movement.base?.name_ar
                                : movement.base?.name_en
                        }},
                        {{
                            locale === 'ar'
                                ? movement.gate?.name_ar
                                : movement.gate?.name_en
                        }})
                    </span>
                </li>
                <li v-if="!movements.length" class="text-sm text-surface-400">
                    {{ trans('reports.detail.noMovements') }}
                </li>
            </ul>
        </template>
    </AppSidePanel>
</template>
