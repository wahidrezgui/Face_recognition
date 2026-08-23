<script setup lang="ts">
import { Search } from '@lucide/vue';
import { trans } from 'laravel-vue-i18n';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import AppButton from '@/components/AppButton.vue';
import AppCard from '@/components/AppCard.vue';
import AppDateInput from '@/components/AppDateInput.vue';
import AppFiltersBar from '@/components/AppFiltersBar.vue';

interface Props {
    userOptions: { value: string; label: string }[];
}

defineProps<Props>();

const createdById = defineModel<string>('createdById', { required: true });
const employeeSearch = defineModel<string>('employeeSearch', {
    required: true,
});
const task = defineModel<string>('task', { required: true });
const fromDate = defineModel<string>('fromDate', { required: true });
const toDate = defineModel<string>('toDate', { required: true });
const ipAddress = defineModel<string>('ipAddress', { required: true });

const emit = defineEmits<{ 'reset-filter': [] }>();
</script>

<template>
    <AppCard padding="md" class="mb-4">
        <AppFiltersBar density="dense">
            <Select
                v-model="createdById"
                :options="userOptions"
                option-label="label"
                option-value="value"
                filter
                show-clear
                fluid
                :placeholder="trans('activityLog.filters.actor')"
            />
            <InputText
                v-model="employeeSearch"
                :placeholder="trans('activityLog.filters.employee')"
                fluid
            />
            <InputText
                v-model="task"
                :placeholder="trans('activityLog.filters.task')"
                fluid
            />
            <InputText
                v-model="ipAddress"
                :placeholder="trans('activityLog.filters.ipAddress')"
                fluid
            />
            <AppDateInput
                v-model="fromDate"
                :placeholder="trans('activityLog.filters.fromDate')"
            />
            <AppDateInput
                v-model="toDate"
                :placeholder="trans('activityLog.filters.toDate')"
            />

            <template #actions>
                <AppButton
                    text
                    size="small"
                    severity="secondary"
                    @click="emit('reset-filter')"
                >
                    <Search :size="14" />
                    {{ trans('activityLog.filters.reset') }}
                </AppButton>
            </template>
        </AppFiltersBar>
    </AppCard>
</template>
