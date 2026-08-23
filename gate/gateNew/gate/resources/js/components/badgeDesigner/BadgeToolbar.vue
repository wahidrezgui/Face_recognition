<script setup lang="ts">
import { IdCard, Image, Minus, QrCode, Square, Type, Users } from '@lucide/vue';
import { trans } from 'laravel-vue-i18n';
import Checkbox from 'primevue/checkbox';
import InputNumber from 'primevue/inputnumber';
import AppButton from '@/components/AppButton.vue';
import { SEVERITY_STYLES } from '@/lib/severityStyles';
import { cn } from '@/lib/utils';

interface Props {
    width: number;
    height: number;
    childCount: number;
    saving: boolean;
}

defineProps<Props>();

const applyToChildren = defineModel<boolean>('applyToChildren', {
    required: true,
});

const emit = defineEmits<{
    'add-text': [];
    'add-photo': [];
    'add-qr': [];
    'add-base-photo': [];
    'add-zones': [];
    'add-rectangle': [];
    'add-line': [];
    'update:width': [value: number];
    'update:height': [value: number];
    save: [];
}>();
</script>

<template>
    <div
        class="space-y-3 rounded-lg border border-surface-200 bg-surface-50 p-3 dark:border-surface-800 dark:bg-surface-950/50"
    >
        <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex flex-wrap items-center gap-2">
                <AppButton
                    size="small"
                    severity="secondary"
                    outlined
                    @click="emit('add-text')"
                >
                    <Type :size="14" />
                    {{ trans('badgeDesigner.toolbar.addText') }}
                </AppButton>
                <AppButton
                    size="small"
                    severity="secondary"
                    outlined
                    @click="emit('add-photo')"
                >
                    <Image :size="14" />
                    {{ trans('badgeDesigner.toolbar.addPhoto') }}
                </AppButton>
                <AppButton
                    size="small"
                    severity="secondary"
                    outlined
                    @click="emit('add-qr')"
                >
                    <QrCode :size="14" />
                    {{ trans('badgeDesigner.toolbar.addQr') }}
                </AppButton>
                <AppButton
                    size="small"
                    severity="secondary"
                    outlined
                    @click="emit('add-base-photo')"
                >
                    <IdCard :size="14" />
                    {{ trans('badgeDesigner.toolbar.addBasePhoto') }}
                </AppButton>
                <AppButton
                    size="small"
                    severity="secondary"
                    outlined
                    @click="emit('add-zones')"
                >
                    <Users :size="14" />
                    {{ trans('badgeDesigner.toolbar.addZones') }}
                </AppButton>
                <AppButton
                    size="small"
                    severity="secondary"
                    outlined
                    @click="emit('add-rectangle')"
                >
                    <Square :size="14" />
                    {{ trans('badgeDesigner.toolbar.addRectangle') }}
                </AppButton>
                <AppButton
                    size="small"
                    severity="secondary"
                    outlined
                    @click="emit('add-line')"
                >
                    <Minus :size="14" />
                    {{ trans('badgeDesigner.toolbar.addLine') }}
                </AppButton>
            </div>

            <div class="flex flex-wrap items-center gap-3">
                <div class="flex items-center gap-1">
                    <label
                        class="text-xs font-medium text-surface-600 dark:text-surface-400"
                        >{{ trans('badgeDesigner.toolbar.width') }}</label
                    >
                    <InputNumber
                        :model-value="width"
                        :min="1"
                        style="width: 5rem"
                        suffix=" mm"
                        @update:model-value="
                            (v) => emit('update:width', v ?? width)
                        "
                    />
                </div>
                <div class="flex items-center gap-1">
                    <label
                        class="text-xs font-medium text-surface-600 dark:text-surface-400"
                        >{{ trans('badgeDesigner.toolbar.height') }}</label
                    >
                    <InputNumber
                        :model-value="height"
                        :min="1"
                        style="width: 5rem"
                        suffix=" mm"
                        @update:model-value="
                            (v) => emit('update:height', v ?? height)
                        "
                    />
                </div>

                <AppButton size="small" :loading="saving" @click="emit('save')">
                    {{ trans('badgeDesigner.toolbar.save') }}
                </AppButton>
            </div>
        </div>

        <label
            v-if="childCount > 0"
            :class="
                cn(
                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm',
                    SEVERITY_STYLES.warn.banner,
                    SEVERITY_STYLES.warn.bannerText,
                )
            "
        >
            <Checkbox v-model="applyToChildren" binary />
            <span>{{
                trans('badgeDesigner.toolbar.applyToChildren', {
                    count: String(childCount),
                })
            }}</span>
        </label>
    </div>
</template>
