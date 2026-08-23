<script setup lang="ts">
import type { InertiaForm } from '@inertiajs/vue3';
import { trans } from 'laravel-vue-i18n';
import InputText from 'primevue/inputtext';
import AppButton from '@/components/AppButton.vue';
import AppSidePanel from '@/components/AppSidePanel.vue';
import FormField from '@/components/FormField.vue';

interface NameFormData {
    name_en: string;
    name_ar: string;
}

interface Props {
    open: boolean;
    title: string;
    subtitle: string;
    saveLabel: string;
    form: InertiaForm<NameFormData>;
    nameEnPlaceholder?: string;
    nameArPlaceholder?: string;
}

withDefaults(defineProps<Props>(), {
    nameEnPlaceholder: '',
    nameArPlaceholder: '',
});

const emit = defineEmits<{
    'update:open': [value: boolean];
    submit: [];
}>();
</script>

<!-- eslint-disable vue/no-mutating-props -- `form` is an Inertia useForm() instance, passed down intentionally so v-model can write straight into its fields. -->
<template>
    <AppSidePanel
        :model-value="open"
        as-form
        width="480px"
        :title="title"
        :subtitle="subtitle"
        :close-aria-label="trans('bases.form.cancel')"
        @update:model-value="emit('update:open', $event)"
        @closed="form.reset()"
        @submit="emit('submit')"
        @close="emit('update:open', false)"
    >
        <div class="space-y-4">
            <FormField
                :label="trans('bases.form.nameEn')"
                required
                :error="form.errors.name_en"
                v-slot="{ id }"
            >
                <InputText
                    :id="id"
                    v-model="form.name_en"
                    fluid
                    dir="ltr"
                    :placeholder="nameEnPlaceholder"
                    :invalid="!!form.errors.name_en"
                />
            </FormField>
            <FormField :label="trans('bases.form.nameAr')" v-slot="{ id }">
                <InputText
                    :id="id"
                    v-model="form.name_ar"
                    fluid
                    :placeholder="nameArPlaceholder"
                />
            </FormField>
        </div>

        <template #footer>
            <div class="flex justify-end gap-3">
                <AppButton
                    type="button"
                    severity="secondary"
                    outlined
                    :label="trans('bases.form.cancel')"
                    @click="emit('update:open', false)"
                />
                <AppButton
                    type="submit"
                    :loading="form.processing"
                    :label="
                        form.processing ? trans('bases.form.saving') : saveLabel
                    "
                />
            </div>
        </template>
    </AppSidePanel>
</template>
