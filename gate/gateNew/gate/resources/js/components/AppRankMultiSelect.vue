<script setup lang="ts">
import MultiSelect from 'primevue/multiselect';
import { computed } from 'vue';
import { useLocale } from '@/composables/useLocale';
import type { Rank } from '@/types';

const props = defineProps<{
    ranks: Rank[];
    placeholder?: string;
}>();

const model = defineModel<number[]>({ required: true });

const { locale } = useLocale();

const rankGroups = computed(() => {
    const groups = new Map<number, { label: string; items: Rank[] }>();

    for (const rank of props.ranks) {
        const catId = rank.category?.id ?? 0;

        if (!groups.has(catId)) {
            groups.set(catId, {
                label: (locale.value === 'ar' ? rank.category?.name_ar : rank.category?.name_en) || '',
                items: [],
            });
        }

        groups.get(catId)!.items.push(rank);
    }

    return Array.from(groups.values());
});
</script>

<template>
    <MultiSelect
        v-model="model"
        :options="rankGroups"
        option-group-label="label"
        option-group-children="items"
        :option-label="(r: Rank) => (locale === 'en' ? r.name_en : r.name_ar)"
        option-value="id"
        filter
        fluid
        :placeholder="placeholder"
    />
</template>
