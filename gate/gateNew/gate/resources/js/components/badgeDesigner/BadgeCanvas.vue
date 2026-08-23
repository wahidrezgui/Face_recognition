<script setup lang="ts">
import { trans } from 'laravel-vue-i18n';
import { ref } from 'vue';
import BadgeCanvasElement from '@/components/badgeDesigner/BadgeCanvasElement.vue';
import type { BadgeElement, BadgeToken } from '@/types';

interface Props {
    elements: BadgeElement[];
    width: number;
    height: number;
    selectedElementId: string | null;
    tokenKeys: BadgeToken[];
    locale: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
    select: [id: string | null];
    update: [id: string, patch: Partial<BadgeElement>];
}>();

const canvasRef = ref<HTMLElement | null>(null);

function elementLabel(element: BadgeElement): string {
    if (element.type === 'rectangle') {
        return trans('badgeDesigner.elements.rectangle');
    }

    if (element.type === 'line') {
        return trans('badgeDesigner.elements.line');
    }

    if (element.type === 'zones') {
        return trans('badgeDesigner.elements.zones');
    }

    if (element.type === 'image') {
        const token = props.tokenKeys.find((t) => t.key === element.token);

        return token
            ? props.locale === 'en'
                ? token.label_en
                : token.label_ar
            : (element.token ?? '');
    }

    if (element.token) {
        const token = props.tokenKeys.find((t) => t.key === element.token);

        return token
            ? props.locale === 'en'
                ? token.label_en
                : token.label_ar
            : `{{${element.token}}}`;
    }

    return element.staticText || trans('badgeDesigner.elements.emptyText');
}
</script>

<template>
    <div
        ref="canvasRef"
        class="relative overflow-hidden rounded border border-surface-300 bg-white shadow-inner dark:border-surface-600"
        :style="{ width: `${width}mm`, height: `${height}mm` }"
        @pointerdown.self="emit('select', null)"
    >
        <BadgeCanvasElement
            v-for="element in elements"
            :key="element.id"
            :element="element"
            :card-width="width"
            :card-height="height"
            :container-el="canvasRef"
            :selected="element.id === selectedElementId"
            :label="elementLabel(element)"
            @select="emit('select', element.id)"
            @update="(patch) => emit('update', element.id, patch)"
        />
    </div>
</template>
