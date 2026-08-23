<script setup lang="ts">
import { BringToFront, SendToBack, Trash2 } from '@lucide/vue';
import { trans } from 'laravel-vue-i18n';
import InputNumber from 'primevue/inputnumber';
import Select from 'primevue/select';
import { computed } from 'vue';
import AppButton from '@/components/AppButton.vue';
import type { BadgeElement, BadgeToken } from '@/types';

interface Props {
    element: BadgeElement;
    tokenKeys: BadgeToken[];
    locale: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
    update: [patch: Partial<BadgeElement>];
    delete: [];
    reorder: [direction: 'front' | 'back'];
}>();

const textTokenOptions = computed(() => [
    { key: '', label: trans('badgeDesigner.properties.staticText') },
    ...props.tokenKeys
        .filter((t) => t.group === 'text')
        .map((t) => ({
            key: t.key,
            label: props.locale === 'en' ? t.label_en : t.label_ar,
        })),
]);

const imageTokenOptions = computed(() =>
    props.tokenKeys
        .filter((t) => t.group === 'image')
        .map((t) => ({
            key: t.key,
            label: props.locale === 'en' ? t.label_en : t.label_ar,
        })),
);

const alignOptions = [
    { value: 'left', label: trans('badgeDesigner.properties.alignLeft') },
    { value: 'center', label: trans('badgeDesigner.properties.alignCenter') },
    { value: 'right', label: trans('badgeDesigner.properties.alignRight') },
];

const directionOptions = [
    { value: 'rtl', label: trans('badgeDesigner.properties.directionRtl') },
    { value: 'ltr', label: trans('badgeDesigner.properties.directionLtr') },
];

const orientationOptions = [
    {
        value: 'horizontal',
        label: trans('badgeDesigner.properties.orientationHorizontal'),
    },
    {
        value: 'vertical',
        label: trans('badgeDesigner.properties.orientationVertical'),
    },
];

const filledOptions = [
    { value: true, label: trans('badgeDesigner.properties.filledSolid') },
    { value: false, label: trans('badgeDesigner.properties.filledOutline') },
];

const weightOptions = [
    { value: 'normal', label: trans('badgeDesigner.properties.weightNormal') },
    { value: 'bold', label: trans('badgeDesigner.properties.weightBold') },
];

function onTextTokenChange(key: string) {
    emit(
        'update',
        key
            ? { token: key, staticText: null }
            : { token: null, staticText: props.element.staticText ?? '' },
    );
}

// Image tokens are named `..._circle`/`..._circleb` vs `..._square`/`..._squareb` (see
// BadgeDesignerService::tokenKeys()) — the same convention useBadgeDesigner.addElement()
// uses to build them. `shape` drives the wrapper's border-radius in the serializer, so it
// must stay in sync with the token or a photo picked as "square" still renders clipped to
// the circle it was created with.
function onImageTokenChange(key: string) {
    emit('update', {
        token: key,
        shape: key.includes('circle') ? 'circle' : 'square',
    });
}

// Swap width/height alongside the orientation flip — a 40x5mm horizontal line/label turning
// "vertical" in place would stay 40 wide and 5 tall, i.e. still visually horizontal. Swapping
// the box dimensions makes the toggle actually look like what it says on first click.
function onOrientationChange(value: 'horizontal' | 'vertical') {
    if (value === props.element.orientation) {
        return;
    }

    emit('update', {
        orientation: value,
        width: props.element.height,
        height: props.element.width,
    });
}
</script>

<template>
    <div class="space-y-4">
        <div class="flex items-center justify-between">
            <h3
                class="text-sm font-semibold text-surface-700 dark:text-surface-300"
            >
                {{ trans('badgeDesigner.properties.title') }}
            </h3>
            <div class="flex gap-1">
                <AppButton
                    text
                    rounded
                    size="small"
                    severity="secondary"
                    :aria-label="trans('badgeDesigner.properties.sendToBack')"
                    @click="emit('reorder', 'back')"
                >
                    <SendToBack :size="14" />
                </AppButton>
                <AppButton
                    text
                    rounded
                    size="small"
                    severity="secondary"
                    :aria-label="trans('badgeDesigner.properties.bringToFront')"
                    @click="emit('reorder', 'front')"
                >
                    <BringToFront :size="14" />
                </AppButton>
                <AppButton
                    text
                    rounded
                    size="small"
                    severity="danger"
                    :aria-label="trans('badgeDesigner.properties.delete')"
                    @click="emit('delete')"
                >
                    <Trash2 :size="14" />
                </AppButton>
            </div>
        </div>

        <div class="grid grid-cols-2 gap-2">
            <div>
                <label
                    class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400"
                    >{{ trans('badgeDesigner.properties.x') }}</label
                >
                <InputNumber
                    :model-value="element.x"
                    fluid
                    suffix=" mm"
                    @update:model-value="(v) => emit('update', { x: v ?? 0 })"
                />
            </div>
            <div>
                <label
                    class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400"
                    >{{ trans('badgeDesigner.properties.y') }}</label
                >
                <InputNumber
                    :model-value="element.y"
                    fluid
                    suffix=" mm"
                    @update:model-value="(v) => emit('update', { y: v ?? 0 })"
                />
            </div>
            <div>
                <label
                    class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400"
                    >{{ trans('badgeDesigner.properties.width') }}</label
                >
                <InputNumber
                    :model-value="element.width"
                    fluid
                    suffix=" mm"
                    @update:model-value="
                        (v) => emit('update', { width: v ?? 1 })
                    "
                />
            </div>
            <div>
                <label
                    class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400"
                    >{{ trans('badgeDesigner.properties.height') }}</label
                >
                <InputNumber
                    :model-value="element.height"
                    fluid
                    suffix=" mm"
                    @update:model-value="
                        (v) => emit('update', { height: v ?? 1 })
                    "
                />
            </div>
        </div>

        <template v-if="element.type === 'text'">
            <div>
                <label
                    class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400"
                    >{{ trans('badgeDesigner.properties.content') }}</label
                >
                <Select
                    :model-value="element.token ?? ''"
                    :options="textTokenOptions"
                    option-label="label"
                    option-value="key"
                    fluid
                    @update:model-value="onTextTokenChange"
                />
            </div>
            <div v-if="!element.token">
                <label
                    class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400"
                    >{{ trans('badgeDesigner.properties.staticText') }}</label
                >
                <input
                    :value="element.staticText ?? ''"
                    class="w-full rounded-md border border-surface-300 px-3 py-2 text-sm dark:border-surface-600 dark:bg-surface-800"
                    @input="
                        emit('update', {
                            staticText: ($event.target as HTMLInputElement)
                                .value,
                        })
                    "
                />
            </div>

            <div class="grid grid-cols-2 gap-2">
                <div>
                    <label
                        class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400"
                        >{{ trans('badgeDesigner.properties.fontSize') }}</label
                    >
                    <InputNumber
                        :model-value="element.fontSize"
                        fluid
                        suffix=" pt"
                        @update:model-value="
                            (v) => emit('update', { fontSize: v ?? 8 })
                        "
                    />
                </div>
                <div>
                    <label
                        class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400"
                        >{{ trans('badgeDesigner.properties.color') }}</label
                    >
                    <input
                        type="color"
                        :value="element.color"
                        class="h-9 w-full rounded-md border border-surface-300 dark:border-surface-600"
                        @input="
                            emit('update', {
                                color: ($event.target as HTMLInputElement)
                                    .value,
                            })
                        "
                    />
                </div>
            </div>

            <div class="grid grid-cols-2 gap-2">
                <div>
                    <label
                        class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400"
                        >{{ trans('badgeDesigner.properties.weight') }}</label
                    >
                    <Select
                        :model-value="element.fontWeight"
                        :options="weightOptions"
                        option-label="label"
                        option-value="value"
                        fluid
                        @update:model-value="
                            (v) => emit('update', { fontWeight: v })
                        "
                    />
                </div>
                <div>
                    <label
                        class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400"
                        >{{ trans('badgeDesigner.properties.align') }}</label
                    >
                    <Select
                        :model-value="element.textAlign"
                        :options="alignOptions"
                        option-label="label"
                        option-value="value"
                        fluid
                        @update:model-value="
                            (v) => emit('update', { textAlign: v })
                        "
                    />
                </div>
                <div>
                    <label
                        class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400"
                        >{{
                            trans('badgeDesigner.properties.direction')
                        }}</label
                    >
                    <Select
                        :model-value="element.direction"
                        :options="directionOptions"
                        option-label="label"
                        option-value="value"
                        fluid
                        @update:model-value="
                            (v) => emit('update', { direction: v })
                        "
                    />
                </div>
                <div>
                    <label
                        class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400"
                        >{{
                            trans('badgeDesigner.properties.orientation')
                        }}</label
                    >
                    <Select
                        :model-value="element.orientation ?? 'horizontal'"
                        :options="orientationOptions"
                        option-label="label"
                        option-value="value"
                        fluid
                        @update:model-value="onOrientationChange"
                    />
                </div>
            </div>
        </template>

        <template v-else-if="element.type === 'image'">
            <div v-if="element.shape !== 'qr'">
                <label
                    class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400"
                    >{{ trans('badgeDesigner.properties.content') }}</label
                >
                <Select
                    :model-value="element.token"
                    :options="imageTokenOptions"
                    option-label="label"
                    option-value="key"
                    fluid
                    @update:model-value="onImageTokenChange"
                />
            </div>
        </template>

        <template v-else-if="element.type === 'rectangle'">
            <div class="grid grid-cols-2 gap-2">
                <div>
                    <label
                        class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400"
                        >{{ trans('badgeDesigner.properties.color') }}</label
                    >
                    <input
                        type="color"
                        :value="element.color"
                        class="h-9 w-full rounded-md border border-surface-300 dark:border-surface-600"
                        @input="
                            emit('update', {
                                color: ($event.target as HTMLInputElement)
                                    .value,
                            })
                        "
                    />
                </div>
                <div>
                    <label
                        class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400"
                        >{{
                            trans('badgeDesigner.properties.fillStyle')
                        }}</label
                    >
                    <Select
                        :model-value="element.filled ?? true"
                        :options="filledOptions"
                        option-label="label"
                        option-value="value"
                        fluid
                        @update:model-value="
                            (v) => emit('update', { filled: v })
                        "
                    />
                </div>
            </div>
            <div v-if="element.filled === false">
                <label
                    class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400"
                    >{{ trans('badgeDesigner.properties.thickness') }}</label
                >
                <InputNumber
                    :model-value="element.thickness"
                    fluid
                    :min="0.1"
                    :step="0.1"
                    :min-fraction-digits="1"
                    :max-fraction-digits="2"
                    suffix=" mm"
                    @update:model-value="
                        (v) => emit('update', { thickness: v ?? 1 })
                    "
                />
            </div>
        </template>

        <template v-else-if="element.type === 'line'">
            <div class="grid grid-cols-2 gap-2">
                <div>
                    <label
                        class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400"
                        >{{ trans('badgeDesigner.properties.color') }}</label
                    >
                    <input
                        type="color"
                        :value="element.color"
                        class="h-9 w-full rounded-md border border-surface-300 dark:border-surface-600"
                        @input="
                            emit('update', {
                                color: ($event.target as HTMLInputElement)
                                    .value,
                            })
                        "
                    />
                </div>
                <div>
                    <label
                        class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400"
                        >{{
                            trans('badgeDesigner.properties.thickness')
                        }}</label
                    >
                    <InputNumber
                        :model-value="element.thickness"
                        fluid
                        :min="0.1"
                        :step="0.1"
                        :min-fraction-digits="1"
                        :max-fraction-digits="2"
                        suffix=" mm"
                        @update:model-value="
                            (v) => emit('update', { thickness: v ?? 1 })
                        "
                    />
                </div>
                <div>
                    <label
                        class="mb-1 block text-xs font-medium text-surface-600 dark:text-surface-400"
                        >{{
                            trans('badgeDesigner.properties.orientation')
                        }}</label
                    >
                    <Select
                        :model-value="element.orientation ?? 'horizontal'"
                        :options="orientationOptions"
                        option-label="label"
                        option-value="value"
                        fluid
                        @update:model-value="onOrientationChange"
                    />
                </div>
            </div>
        </template>
    </div>
</template>
