<script setup lang="ts">
import DatePicker from 'primevue/datepicker';
import { computed } from 'vue';

/**
 * Time-only field that speaks H:i or H:i:s strings to callers while using
 * PrimeVue DatePicker so it follows the app theme.
 */
const model = defineModel<string>({ default: '' });

const props = withDefaults(
    defineProps<{
        invalid?: boolean;
        placeholder?: string;
        fluid?: boolean;
        /** When true, emit/accept seconds (H:i:s); otherwise H:i. */
        withSeconds?: boolean;
        inputId?: string;
    }>(),
    {
        invalid: false,
        placeholder: undefined,
        fluid: true,
        withSeconds: false,
        inputId: undefined,
    },
);

function parseTime(value: string | undefined): Date | null {
    if (!value) {
        return null;
    }

    const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(value);

    if (!match) {
        return null;
    }

    const date = new Date();
    date.setHours(Number(match[1]), Number(match[2]), Number(match[3] ?? 0), 0);

    return date;
}

function formatTime(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    if (props.withSeconds) {
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return `${hours}:${minutes}:${seconds}`;
    }

    return `${hours}:${minutes}`;
}

const timeValue = computed<Date | null>({
    get: () => parseTime(model.value),
    set: (value) => {
        model.value = value ? formatTime(value) : '';
    },
});
</script>

<template>
    <DatePicker
        v-model="timeValue"
        time-only
        hour-format="24"
        :show-seconds="props.withSeconds"
        :invalid="props.invalid"
        :placeholder="props.placeholder"
        :fluid="props.fluid"
        :input-id="props.inputId"
        show-icon
        icon-display="input"
    />
</template>
