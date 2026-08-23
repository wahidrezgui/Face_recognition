<script setup lang="ts">
import { computed } from 'vue';
import {
    buildZoneSvgMarkup,
    needsSwatchBorder,
    normalizeZone,
} from '@/lib/zones/zoneStyleCore';
import type { ZoneStyle } from '@/lib/zones/zoneStyleCore';

interface Props {
    zone: Partial<ZoneStyle>;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    shape?: 'circle' | 'rect';
}

const props = withDefaults(defineProps<Props>(), {
    size: 'md',
    shape: 'circle',
});

const SIZE_MAP: Record<string, number> = { sm: 16, md: 20, lg: 40, xl: 56 };
const RECT_RATIOS: Record<string, { width: number; height: number }> = {
    sm: { width: 20, height: 16 },
    md: { width: 25, height: 20 },
    lg: { width: 40, height: 32 },
    xl: { width: 56, height: 44 },
};

const normalizedZone = computed(() => normalizeZone(props.zone));

const dimensions = computed(() => {
    if (props.shape === 'rect') {
        return RECT_RATIOS[props.size] ?? RECT_RATIOS.md;
    }

    const edge = SIZE_MAP[props.size] ?? SIZE_MAP.md;

    return { width: edge, height: edge };
});

const strokeWidth = computed(() => {
    const scale = dimensions.value.width / 25;

    return Math.max(2, Math.round(3 * scale));
});

const svgMarkup = computed(() =>
    buildZoneSvgMarkup(normalizedZone.value, {
        width: dimensions.value.width,
        height: dimensions.value.height,
        strokeWidth: strokeWidth.value,
    }),
);

const showBorder = computed(() => needsSwatchBorder(normalizedZone.value));
</script>

<template>
    <span
        class="zone-swatch inline-flex shrink-0 overflow-hidden align-middle"
        :class="[
            shape === 'circle' ? 'rounded-full' : 'rounded-[0.35rem]',
            { 'zone-swatch--bordered': showBorder },
            {
                'h-4 w-4': size === 'sm',
                'h-5 w-5': size === 'md',
                'h-10 w-10': size === 'lg',
                'h-14 w-14': size === 'xl',
            },
        ]"
        aria-hidden="true"
    >
        <span
            class="flex h-full w-full items-center justify-center"
            v-html="svgMarkup"
        />
    </span>
</template>

<style scoped>
.zone-swatch--bordered {
    box-shadow:
        inset 0 0 0 2px var(--p-surface-0),
        0 0 0 1px var(--p-surface-200);
}

.zone-swatch :deep(svg) {
    display: block;
    width: 100%;
    height: 100%;
}
</style>
