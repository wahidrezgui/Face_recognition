<script setup lang="ts">
import type { InertiaForm } from '@inertiajs/vue3';
import { trans } from 'laravel-vue-i18n';
import Select from 'primevue/select';
import { computed } from 'vue';
import AppButton from '@/components/AppButton.vue';
import AppSidePanel from '@/components/AppSidePanel.vue';
import AppTimeInput from '@/components/AppTimeInput.vue';
import FormField from '@/components/FormField.vue';
import InputError from '@/components/InputError.vue';
import { useLocale } from '@/composables/useLocale';
import type { RankCategory } from '@/types';
import type { Gender } from '@/types';

interface CheckTimeFormData {
    dep_id: number;
    gender_id: number | null;
    rank_id: number | null;
    start_time: string;
    end_time: string;
}

interface Props {
    open: boolean;
    title: string;
    subtitle: string;
    saveLabel: string;
    form: InertiaForm<CheckTimeFormData>;
    genders: Gender[];
    rankCategories: RankCategory[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
    'update:open': [value: boolean];
    submit: [];
}>();

const { locale } = useLocale();

const genderOptions = computed(() =>
    props.genders.map((g) => ({
        id: g.id,
        label: locale.value === 'en' ? g.name_en : g.name_ar,
    })),
);
const rankCategoryOptions = computed(() =>
    props.rankCategories.map((r) => ({
        id: r.id,
        label: locale.value === 'en' ? r.name_en : r.name_ar,
    })),
);
</script>

<!-- eslint-disable vue/no-mutating-props -- `form` is an Inertia useForm() instance, passed down intentionally so v-model can write straight into its fields. -->
<template>
    <AppSidePanel
        :model-value="open"
        as-form
        width="420px"
        :title="title"
        :subtitle="subtitle"
        :close-aria-label="trans('settings.form.cancel')"
        @update:model-value="emit('update:open', $event)"
        @closed="form.reset()"
        @submit="emit('submit')"
        @close="emit('update:open', false)"
    >
        <div class="space-y-4">
            <FormField
                :label="trans('settings.form.gender')"
                required
                :error="form.errors.gender_id"
                v-slot="{ id }"
            >
                <Select
                    :input-id="id"
                    v-model="form.gender_id"
                    :options="genderOptions"
                    option-label="label"
                    option-value="id"
                    fluid
                    :invalid="!!form.errors.gender_id"
                />
            </FormField>

            <FormField
                :label="trans('settings.form.rankCategory')"
                required
                :error="form.errors.rank_id"
                v-slot="{ id }"
            >
                <Select
                    :input-id="id"
                    v-model="form.rank_id"
                    :options="rankCategoryOptions"
                    option-label="label"
                    option-value="id"
                    fluid
                    :invalid="!!form.errors.rank_id"
                />
            </FormField>

            <FormField
                :label="trans('settings.form.startTime')"
                required
                :error="form.errors.start_time"
                v-slot="{ id }"
            >
                <AppTimeInput
                    :input-id="id"
                    v-model="form.start_time"
                    :invalid="!!form.errors.start_time"
                />
            </FormField>

            <FormField
                :label="trans('settings.form.endTime')"
                required
                :error="form.errors.end_time"
                v-slot="{ id }"
            >
                <AppTimeInput
                    :input-id="id"
                    v-model="form.end_time"
                    :invalid="!!form.errors.end_time"
                />
            </FormField>

            <InputError :message="form.errors.dep_id" />
        </div>

        <template #footer>
            <div class="flex justify-end gap-3">
                <AppButton
                    type="button"
                    severity="secondary"
                    outlined
                    :label="trans('settings.form.cancel')"
                    @click="emit('update:open', false)"
                />
                <AppButton
                    type="submit"
                    :loading="form.processing"
                    :label="
                        form.processing
                            ? trans('settings.form.saving')
                            : saveLabel
                    "
                />
            </div>
        </template>
    </AppSidePanel>
</template>
