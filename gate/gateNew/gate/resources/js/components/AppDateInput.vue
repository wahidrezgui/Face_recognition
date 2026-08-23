<script setup lang="ts">
import DatePicker from 'primevue/datepicker';
import { computed } from 'vue';

/**
 * Date-only field that speaks Y-m-d strings to callers (filters, forms) while
 * using PrimeVue DatePicker so it follows the app theme.
 */
const model = defineModel<string>({ default: '' });

const props = withDefaults(
    defineProps<{
        max?: string;
        min?: string;
        invalid?: boolean;
        placeholder?: string;
        fluid?: boolean;
        showIcon?: boolean;
        inputId?: string;
    }>(),
    {
        max: undefined,
        min: undefined,
        invalid: false,
        placeholder: undefined,
        fluid: true,
        showIcon: true,
        inputId: undefined,
    },
);

function parseYmd(value: string | undefined): Date | null {
    if (!value) {
        return null;
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);

    if (!match) {
        return null;
    }

    const date = new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3]),
    );

    return Number.isNaN(date.getTime()) ? null : date;
}

function formatYmd(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

const dateValue = computed<Date | null>({
    get: () => parseYmd(model.value),
    set: (value) => {
        model.value = value ? formatYmd(value) : '';
    },
});

const maxDate = computed(() => parseYmd(props.max) ?? undefined);
const minDate = computed(() => parseYmd(props.min) ?? undefined);
</script>

<template>
    <DatePicker
        v-model="dateValue"
        date-format="yy-mm-dd"
        :max-date="maxDate"
        :min-date="minDate"
        :invalid="props.invalid"
        :placeholder="props.placeholder"
        :fluid="props.fluid"
        :show-icon="props.showIcon"
        :input-id="props.inputId"
        show-button-bar
    />
</template>
