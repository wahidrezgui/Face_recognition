<script setup lang="ts">
import Select from 'primevue/select';
import { computed } from 'vue';
import { useLocale } from '@/composables/useLocale';
import type { Gender } from '@/types';

const props = withDefaults(
    defineProps<{
        genders: Gender[];
        /** 'name_ar' matches the backend's locale-independent filter key (see
         * ReportQueryService::applyEmployeeStatusFilters/applyPersonFilters) — keep as
         * the default for filter bars. 'id' is for form fields that set a real value. */
        valueMode?: 'id' | 'name_ar';
        placeholder?: string;
        showClear?: boolean;
    }>(),
    { valueMode: 'name_ar', showClear: true },
);

const model = defineModel<string | number | null>();

const { locale } = useLocale();

const genderOptions = computed(() =>
    props.genders.map((g) => ({
        value: props.valueMode === 'id' ? g.id : g.name_ar,
        label: locale.value === 'en' ? g.name_en : g.name_ar,
    })),
);
</script>

<template>
    <Select
        v-model="model"
        :options="genderOptions"
        option-label="label"
        option-value="value"
        fluid
        :show-clear="showClear"
        :placeholder="placeholder"
    />
</template>
