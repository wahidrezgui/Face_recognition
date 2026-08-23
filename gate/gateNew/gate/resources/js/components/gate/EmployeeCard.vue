<script setup lang="ts">
import { trans } from 'laravel-vue-i18n';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Tag from 'primevue/tag';
import { computed, ref } from 'vue';
import AppButton from '@/components/AppButton.vue';
import AppDateInput from '@/components/AppDateInput.vue';
import AppTimeInput from '@/components/AppTimeInput.vue';
import FormField from '@/components/FormField.vue';
import { useLocale } from '@/composables/useLocale';
import { employeePhotoUrl } from '@/lib/employees/employeeFormUi';
import type { EmployeePreview } from '@/types/gate';

const props = defineProps<{
    employee: EmployeePreview;
    offline: boolean;
    mode: 'auto' | 'manual';
    submitting: boolean;
}>();

const emit = defineEmits<{
    confirm: [
        payload: { mvdate: string; mvtime: string; platenumber: string | null },
    ];
    cancel: [];
}>();

const { locale } = useLocale();

const name = computed(() =>
    locale.value === 'ar'
        ? props.employee.fullname_ar || props.employee.fullname_en
        : props.employee.fullname_en,
);
const department = computed(
    () =>
        (locale.value === 'ar'
            ? props.employee.department_ar
            : props.employee.department_en) || '—',
);
const rank = computed(
    () =>
        (locale.value === 'ar'
            ? props.employee.rank_ar
            : props.employee.rank_en) || '—',
);
const base = computed(() =>
    locale.value === 'ar' ? props.employee.base_ar : props.employee.base_en,
);

function alertMessage(alert: EmployeePreview['alerts'][number]): string {
    if (alert.type === 'remark') {
        return alert.remarks ?? '';
    }

    return trans(`gate.alerts.${alert.type}`, {
        date: alert.expiry_date ?? '',
    });
}

// PrimeVue's Message uses `severity="error"` for the danger case (Tag is the
// only component that spells it "danger").
const ALERT_SEVERITY_MAP: Record<
    EmployeePreview['alerts'][number]['severity'],
    'error' | 'warn' | 'info'
> = {
    danger: 'error',
    warning: 'warn',
    info: 'info',
};

function localIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

const now = new Date();
const platenumber = ref('');
const mvdate = ref(localIsoDate(now));
const mvtime = ref(now.toTimeString().slice(0, 5));

function confirm(): void {
    emit('confirm', {
        mvdate: mvdate.value,
        mvtime: mvtime.value,
        platenumber: platenumber.value || null,
    });
}
</script>

<template>
    <div
        class="rounded-2xl border border-surface-200 bg-surface-0 p-5 shadow-sm dark:border-surface-700 dark:bg-surface-900"
    >
        <div v-if="props.offline" class="mb-3">
            <Tag
                severity="secondary"
                :value="trans('gate.card.offlinePreview')"
            />
        </div>

        <div class="flex items-start gap-4">
            <img
                :src="employeePhotoUrl(props.employee.photo)"
                alt=""
                class="h-24 w-24 shrink-0 rounded-xl object-cover"
            />
            <div class="min-w-0 flex-1">
                <h2
                    class="truncate text-xl font-bold text-surface-900 dark:text-surface-100"
                >
                    {{ name }}
                </h2>
                <p class="text-sm text-surface-500 dark:text-surface-400">
                    {{ rank }} — {{ department }}
                </p>
                <p
                    v-if="props.employee.military_number"
                    class="mt-1 font-mono text-sm text-surface-600 dark:text-surface-300"
                >
                    {{ trans('gate.card.militaryNumber') }}:
                    {{ props.employee.military_number }}
                </p>

                <div class="mt-2 flex flex-wrap gap-2">
                    <Tag
                        v-if="props.employee.last_movement_type"
                        :severity="
                            props.employee.last_movement_type === 'in'
                                ? 'success'
                                : 'secondary'
                        "
                        :value="
                            trans(
                                props.employee.last_movement_type === 'in'
                                    ? 'gate.card.lastIn'
                                    : 'gate.card.lastOut',
                            )
                        "
                    />
                    <Tag v-if="base" severity="info" :value="base" />
                    <Tag
                        v-if="props.employee.access"
                        severity="success"
                        :value="
                            trans('gate.card.zonesGranted', {
                                count: String(props.employee.access),
                            })
                        "
                    />
                </div>
            </div>
        </div>

        <div v-if="props.employee.alerts.length" class="mt-4 space-y-2">
            <Message
                v-for="(alert, index) in props.employee.alerts"
                :key="index"
                :severity="ALERT_SEVERITY_MAP[alert.severity]"
                :closable="false"
            >
                {{ alertMessage(alert) }}
            </Message>
        </div>

        <Message
            v-if="props.employee.timing"
            severity="warn"
            variant="simple"
            :closable="false"
            class="mt-3"
        >
            {{
                trans('gate.card.outsideWindow', {
                    start: props.employee.timing.start_time,
                    end: props.employee.timing.end_time,
                })
            }}
        </Message>

        <template v-if="props.mode === 'manual'">
            <div
                class="mt-5 grid grid-cols-2 gap-3 border-t border-surface-200 pt-4 dark:border-surface-700"
            >
                <FormField :label="trans('gate.card.date')" v-slot="{ id }">
                    <AppDateInput
                        :input-id="id"
                        v-model="mvdate"
                        :max="localIsoDate(now)"
                    />
                </FormField>
                <FormField :label="trans('gate.card.time')" v-slot="{ id }">
                    <AppTimeInput :input-id="id" v-model="mvtime" />
                </FormField>
                <FormField
                    class="col-span-2"
                    :label="trans('gate.card.plateNumber')"
                    v-slot="{ id }"
                >
                    <InputText :id="id" v-model="platenumber" fluid dir="ltr" />
                </FormField>
            </div>

            <div class="mt-4 flex justify-end gap-2">
                <AppButton
                    severity="secondary"
                    outlined
                    :label="trans('common.cancel')"
                    @click="emit('cancel')"
                />
                <AppButton
                    :loading="props.submitting"
                    :label="trans('gate.card.confirm')"
                    @click="confirm"
                />
            </div>
        </template>
    </div>
</template>
