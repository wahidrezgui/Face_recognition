<script setup lang="ts">
import { trans } from 'laravel-vue-i18n';
import { computed } from 'vue';
import FormField from '@/components/FormField.vue';
import SegmentedTabs from '@/components/SegmentedTabs.vue';
import { defaultZoneStyleFields } from '@/lib/zones/zoneStyleCore';
import type { ZoneStyle } from '@/lib/zones/zoneStyleCore';
import ZoneSwatch from './ZoneSwatch.vue';

interface Props {
    modelValue: ZoneStyle;
    fieldId?: string;
}

const props = withDefaults(defineProps<Props>(), {
    fieldId: 'zone-style',
});

const emit = defineEmits<{
    'update:modelValue': [value: ZoneStyle];
}>();

const patternTabItems = computed(() => [
    { value: 'none', label: trans('bases.zoneStyle.patternNone') },
    { value: 'line', label: trans('bases.zoneStyle.patternLine') },
    { value: 'cross', label: trans('bases.zoneStyle.patternCross') },
]);

const patternType = computed({
    get: () => props.modelValue.pattern_type,
    set: (value: string) => updatePatternType(value),
});

function updateField(field: keyof ZoneStyle, value: string) {
    emit('update:modelValue', { ...props.modelValue, [field]: value });
}

function updatePatternType(patternTypeValue: string) {
    const defaults = defaultZoneStyleFields();
    const next: ZoneStyle = {
        ...defaults,
        ...props.modelValue,
        pattern_type: patternTypeValue,
    };

    if (patternTypeValue === 'none') {
        next.pattern_color = defaults.pattern_color;
    } else if (!next.pattern_color) {
        next.pattern_color = defaults.pattern_color;
    }

    emit('update:modelValue', next);
}
</script>

<template>
    <div class="space-y-4">
        <FormField
            :label="trans('bases.zoneStyle.backgroundColor')"
            :input-id="`${fieldId}-color`"
            v-slot="{ id }"
        >
            <input
                :id="id"
                type="color"
                class="h-12 w-full cursor-pointer rounded-lg border border-surface-200 bg-surface-0 p-1 dark:border-surface-700 dark:bg-surface-900"
                :value="modelValue.color"
                @input="
                    updateField(
                        'color',
                        ($event.target as HTMLInputElement).value,
                    )
                "
            />
        </FormField>

        <div>
            <span
                class="mb-1 block text-sm font-medium text-surface-700 dark:text-surface-300"
                >{{ trans('bases.zoneStyle.pattern') }}</span
            >
            <SegmentedTabs v-model="patternType" :items="patternTabItems" />
        </div>

        <FormField
            v-if="modelValue.pattern_type !== 'none'"
            :label="trans('bases.zoneStyle.lineColor')"
            :input-id="`${fieldId}-pattern-color`"
            v-slot="{ id }"
        >
            <input
                :id="id"
                type="color"
                class="h-12 w-full cursor-pointer rounded-lg border border-surface-200 bg-surface-0 p-1 dark:border-surface-700 dark:bg-surface-900"
                :value="modelValue.pattern_color ?? '#FFFFFF'"
                @input="
                    updateField(
                        'pattern_color',
                        ($event.target as HTMLInputElement).value,
                    )
                "
            />
        </FormField>

        <div
            class="rounded-xl border border-dashed border-surface-200 bg-surface-50 p-3 dark:border-surface-700 dark:bg-surface-950/40"
        >
            <span
                class="mb-2 block text-sm font-medium text-surface-700 dark:text-surface-300"
                >{{ trans('bases.zoneStyle.preview') }}</span
            >
            <div class="flex items-center gap-4">
                <ZoneSwatch :zone="modelValue" size="xl" shape="rect" />
                <ZoneSwatch :zone="modelValue" size="lg" shape="circle" />
            </div>
        </div>
    </div>
</template>
