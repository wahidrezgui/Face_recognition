<script setup lang="ts">
import { useDraggable } from '@vueuse/core';
import { computed, ref } from 'vue';
import { MIN_ELEMENT_SIZE_MM } from '@/lib/badgeDesigner/badgeElementFactory';
import { BRAND_COLORS, withAlpha } from '@/theme/colors';
import type { BadgeElement } from '@/types';

interface Props {
    element: BadgeElement;
    cardWidth: number;
    cardHeight: number;
    containerEl: HTMLElement | null;
    selected: boolean;
    label: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
    select: [];
    update: [patch: Partial<BadgeElement>];
}>();

const elementRef = ref<HTMLElement | null>(null);

function pxPerMm(): number {
    const rect = props.containerEl?.getBoundingClientRect();

    return rect && props.cardWidth > 0 ? rect.width / props.cardWidth : 1;
}

// useDraggable is used purely as a pointer-gesture detector — position/size stay in mm
// (the source of truth) and are rendered via literal CSS mm units, so the conversion
// only needs to happen going the other way, from the drag gesture's pixels back to mm.
useDraggable(elementRef, {
    containerElement: computed(() => props.containerEl ?? undefined),
    initialValue: { x: 0, y: 0 },
    onMove: (position) => {
        const ratio = pxPerMm();
        const x = Math.max(
            0,
            Math.min(position.x / ratio, props.cardWidth - props.element.width),
        );
        const y = Math.max(
            0,
            Math.min(
                position.y / ratio,
                props.cardHeight - props.element.height,
            ),
        );
        emit('update', { x, y });
    },
});

type ResizeHandle = 'se' | 'sw' | 'ne' | 'nw';

function startResize(handle: ResizeHandle, downEvent: PointerEvent) {
    downEvent.stopPropagation();
    (downEvent.target as HTMLElement).setPointerCapture(downEvent.pointerId);

    const ratio = pxPerMm();
    const start = { x: downEvent.clientX, y: downEvent.clientY };
    const original = {
        x: props.element.x,
        y: props.element.y,
        width: props.element.width,
        height: props.element.height,
    };

    function onMove(moveEvent: PointerEvent) {
        const deltaXMm = (moveEvent.clientX - start.x) / ratio;
        const deltaYMm = (moveEvent.clientY - start.y) / ratio;

        const patch: Partial<BadgeElement> = {};

        if (handle === 'se' || handle === 'ne') {
            patch.width = Math.max(
                MIN_ELEMENT_SIZE_MM,
                original.width + deltaXMm,
            );
        }

        if (handle === 'sw' || handle === 'nw') {
            const width = Math.max(
                MIN_ELEMENT_SIZE_MM,
                original.width - deltaXMm,
            );
            patch.width = width;
            patch.x = original.x + (original.width - width);
        }

        if (handle === 'se' || handle === 'sw') {
            patch.height = Math.max(
                MIN_ELEMENT_SIZE_MM,
                original.height + deltaYMm,
            );
        }

        if (handle === 'ne' || handle === 'nw') {
            const height = Math.max(
                MIN_ELEMENT_SIZE_MM,
                original.height - deltaYMm,
            );
            patch.height = height;
            patch.y = original.y + (original.height - height);
        }

        emit('update', patch);
    }

    function onUp(upEvent: PointerEvent) {
        (upEvent.target as HTMLElement).releasePointerCapture(
            upEvent.pointerId,
        );
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
}

const elementStyle = computed(() => {
    let background: string | undefined;
    let border: string | undefined;

    if (props.element.type === 'rectangle') {
        if (props.element.filled === false) {
            background = 'transparent';
            border = `${props.element.thickness ?? 1}mm solid ${props.element.color}`;
        } else {
            background = props.element.color;
        }
    } else if (props.element.type === 'line') {
        const size =
            props.element.orientation === 'vertical'
                ? `${props.element.thickness ?? 1}mm 100%`
                : `100% ${props.element.thickness ?? 1}mm`;
        background = `linear-gradient(${props.element.color}, ${props.element.color}) center / ${size} no-repeat`;
    } else {
        // Matches the selected-state ring/border below: burgundy when selected,
        // a neutral surface tint otherwise.
        background = props.selected
            ? withAlpha(BRAND_COLORS.primaryRgb, 0.08)
            : withAlpha(BRAND_COLORS.neutralRgb, 0.08);
    }

    return {
        position: 'absolute' as const,
        left: `${props.element.x}mm`,
        top: `${props.element.y}mm`,
        width: `${props.element.width}mm`,
        height: `${props.element.height}mm`,
        direction: props.element.direction,
        textAlign: props.element.textAlign,
        fontSize:
            props.element.type === 'text'
                ? `${props.element.fontSize}pt`
                : undefined,
        color: props.element.type === 'text' ? props.element.color : undefined,
        fontWeight:
            props.element.type === 'text'
                ? props.element.fontWeight
                : undefined,
        writingMode:
            props.element.type === 'text' &&
            props.element.orientation === 'vertical'
                ? ('vertical-rl' as const)
                : undefined,
        textOrientation:
            props.element.type === 'text' &&
            props.element.orientation === 'vertical'
                ? ('mixed' as const)
                : undefined,
        overflow: 'hidden',
        boxSizing: 'border-box' as const,
        background,
        border,
    };
});
</script>

<template>
    <div
        ref="elementRef"
        class="cursor-move border"
        :class="
            selected
                ? 'z-10 border-primary-500 ring-2 ring-primary-400'
                : 'border-dashed border-surface-400 hover:border-primary-400'
        "
        :style="elementStyle"
        @pointerdown="emit('select')"
    >
        <span
            v-if="element.type !== 'rectangle' && element.type !== 'line'"
            class="pointer-events-none block truncate px-1 text-[8px] leading-tight text-surface-600 dark:text-surface-300"
            >{{ label }}</span
        >

        <template v-if="selected">
            <span
                v-for="handle in ['nw', 'ne', 'sw', 'se'] as const"
                :key="handle"
                class="absolute h-2.5 w-2.5 rounded-full border border-primary-600 bg-white"
                :class="{
                    'top-[-5px] left-[-5px] cursor-nwse-resize':
                        handle === 'nw',
                    'top-[-5px] right-[-5px] cursor-nesw-resize':
                        handle === 'ne',
                    'bottom-[-5px] left-[-5px] cursor-nesw-resize':
                        handle === 'sw',
                    'right-[-5px] bottom-[-5px] cursor-nwse-resize':
                        handle === 'se',
                }"
                @pointerdown="startResize(handle, $event)"
            />
        </template>
    </div>
</template>
