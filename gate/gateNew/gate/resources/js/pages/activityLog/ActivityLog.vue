<script setup lang="ts">
import { Head } from '@inertiajs/vue3';
import { trans } from 'laravel-vue-i18n';
import ActivityLogFiltersBar from '@/components/activityLog/ActivityLogFiltersBar.vue';
import ActivityLogTable from '@/components/activityLog/ActivityLogTable.vue';
import PageContainer from '@/components/PageContainer.vue';
import { useActivityLogPage } from '@/composables/useActivityLogPage';
import AppLayout from '@/layouts/AppLayout.vue';

defineOptions({ layout: AppLayout });

const {
    logs,
    userOptions,
    createdById,
    employeeSearch,
    task,
    fromDate,
    toDate,
    ipAddress,
    resetFilters,
    onDataTableChange,
} = useActivityLogPage();
</script>

<template>
    <Head :title="trans('activityLog.page.title')" />

    <PageContainer
        :title="trans('activityLog.page.title')"
        :description="trans('activityLog.page.description')"
    >
        <ActivityLogFiltersBar
            v-model:created-by-id="createdById"
            v-model:employee-search="employeeSearch"
            v-model:task="task"
            v-model:from-date="fromDate"
            v-model:to-date="toDate"
            v-model:ip-address="ipAddress"
            :user-options="userOptions"
            @reset-filter="resetFilters"
        />

        <ActivityLogTable :logs="logs" @change="onDataTableChange" />
    </PageContainer>
</template>
