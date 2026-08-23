<script setup lang="ts">
import type { InertiaForm } from '@inertiajs/vue3';
import { trans } from 'laravel-vue-i18n';
import InputText from 'primevue/inputtext';
import { computed } from 'vue';
import AppButton from '@/components/AppButton.vue';
import AppSidePanel from '@/components/AppSidePanel.vue';
import FormField from '@/components/FormField.vue';
import InputError from '@/components/InputError.vue';
import ZoneStyleEditor from '@/components/zones/ZoneStyleEditor.vue';
import type { ZoneStyle } from '@/lib/zones/zoneStyleCore';

interface ZoneFormData extends ZoneStyle {
    name_en: string;
    name_ar: string;
}

interface Props {
    open: boolean;
    title: string;
    subtitle: string;
    saveLabel: string;
    form: InertiaForm<ZoneFormData>;
    fieldId: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
    'update:open': [value: boolean];
    submit: [];
}>();

// ZoneStyleEditor works with a standalone {color, pattern_type, pattern_color}
// object and emits a full replacement on change; bridge that to the form's own
// flat fields (Inertia's useForm needs each field assigned individually, not
// the whole reactive object replaced).
const zoneStyle = computed<ZoneStyle>({
    get: () => ({
        color: props.form.color,
        pattern_type: props.form.pattern_type,
        pattern_color: props.form.pattern_color,
    }),
    set: (value) => {
        /* eslint-disable vue/no-mutating-props -- `form` is an Inertia useForm() instance, passed down intentionally. */
        props.form.color = value.color;
        props.form.pattern_type = value.pattern_type;
        props.form.pattern_color = value.pattern_color;
        /* eslint-enable vue/no-mutating-props */
    },
});
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
                    :invalid="!!form.errors.name_en"
                />
            </FormField>
            <FormField :label="trans('bases.form.nameAr')" v-slot="{ id }">
                <InputText :id="id" v-model="form.name_ar" fluid />
            </FormField>

            <ZoneStyleEditor v-model="zoneStyle" :field-id="fieldId" />
            <InputError :message="form.errors.pattern_color" />
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
