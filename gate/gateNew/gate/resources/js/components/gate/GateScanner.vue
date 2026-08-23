<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

/**
 * Keyboard-wedge barcode scanner support: the hardware fires keydown events
 * (fast, machine-speed) wherever focus happens to be, terminated by Enter.
 * Distinguish it from human typing by inter-key timing rather than requiring
 * the operator to click into a dedicated field first.
 */
const RESET_GAP_MS = 300;
const SCANNER_MAX_AVG_GAP_MS = 40;
const MIN_SCAN_LENGTH = 3;

const emit = defineEmits<{ scan: [value: string] }>();

const active = ref(true);
let buffer = '';
let gaps: number[] = [];
let lastKeyTime = 0;

function isTypingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
        return false;
    }

    return (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
    );
}

function resetBuffer(): void {
    buffer = '';
    gaps = [];
}

function handleKeydown(event: KeyboardEvent): void {
    if (!active.value || isTypingTarget(event.target)) {
        return;
    }

    const now = performance.now();
    const gap = lastKeyTime ? now - lastKeyTime : 0;
    lastKeyTime = now;

    if (gap > RESET_GAP_MS) {
        resetBuffer();
    }

    if (event.key === 'Enter') {
        const avgGap =
            gaps.length > 0
                ? gaps.reduce((sum, value) => sum + value, 0) / gaps.length
                : Infinity;

        if (
            buffer.length >= MIN_SCAN_LENGTH &&
            avgGap <= SCANNER_MAX_AVG_GAP_MS
        ) {
            emit('scan', buffer);
        }

        resetBuffer();

        return;
    }

    if (event.key.length === 1) {
        if (buffer.length > 0) {
            gaps.push(gap);
        }

        buffer += event.key;
    }
}

function setActive(value: boolean): void {
    active.value = value;
    resetBuffer();
}

onMounted(() => window.addEventListener('keydown', handleKeydown));
onUnmounted(() => window.removeEventListener('keydown', handleKeydown));

defineExpose({ setActive });
</script>

<template>
    <span class="sr-only" aria-hidden="true" />
</template>
