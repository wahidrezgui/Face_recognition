<script setup lang="ts">
import { trans } from 'laravel-vue-i18n';
import Message from 'primevue/message';
import Select from 'primevue/select';
import { computed, ref } from 'vue';
import { useLocale } from '@/composables/useLocale';
import { serializeSide } from '@/lib/badgeDesigner/badgeElementSerializer';
import {
    BADGE_DESIGNER_ELEMENT_STYLE,
    renderAccessCardSide,
} from '@/lib/employees/accessCardRender';
import { localizedLabel } from '@/lib/employees/employeeFormUi';
import type { AccessCardResponse, AccessCardZone } from '@/types';
import type { BadgeElement, BaseWithZones } from '@/types';

interface Props {
    elements: BadgeElement[];
    width: number;
    height: number;
    format: 'empty' | 'designer' | 'raw';
    rawContent: string | null;
    bases: BaseWithZones[];
}

const props = defineProps<Props>();

const { locale } = useLocale();

const selectedBaseId = ref<number | null>(null);

// Intentionally long name / large zone count — a fixed-size mm box won't auto-grow, so
// previewing against realistic-worst-case sample data catches overflow early instead of
// only showing up against a real employee later.
const SAMPLE_DATA: AccessCardResponse = {
    front: null,
    back: null,
    values: {
        fullname_ar: 'محمد عبدالرحمن سالم النعيمي الكبيسي',
        fullname_en: 'Mohammed Abdulrahman Salem Al-Nuaimi Al-Kubaisi',
        Job_Arabic: 'ضابط عمليات',
        Job_En: 'Operations Officer',
        military_number: '123456',
        bloodtype: 'O+',
        expiry_date: '2028-12-31',
        remarks: 'عينة تجريبية',
        Escort: '',
        device: '',
        StartTime: '06:00',
        EndTime: '18:00',
        rank: 'عقيد',
        ranke: 'Colonel',
        department: 'القوات الجوية الأميرية القطرية',
        dep_name: 'سرب الطيران الأول',
        dep3: 'First Flying Squadron',
        default_base: 'قاعدة الدوحة الجوية',
        selected_base: '',
        nationality: 'قطر',
        nationalitye: 'Qatar',
        plate_numbers: '11455  White MG<br>1234  Black Mercedes',
        idguest: '0',
    },
    zones: [
        {
            id: 1,
            name_ar: 'المنطقة الأولى',
            name_en: 'Zone One',
            color: '#3B82F6',
            pattern_type: 'none',
            pattern_color: null,
        },
        {
            id: 2,
            name_ar: 'المنطقة الثانية',
            name_en: 'Zone Two',
            color: '#22C55E',
            pattern_type: 'line',
            pattern_color: '#FFFFFF',
        },
        {
            id: 3,
            name_ar: 'المنطقة الثالثة',
            name_en: 'Zone Three',
            color: '#F97316',
            pattern_type: 'none',
            pattern_color: null,
        },
        {
            id: 4,
            name_ar: 'المنطقة الرابعة',
            name_en: 'Zone Four',
            color: '#A855F7',
            pattern_type: 'cross',
            pattern_color: '#FFFFFF',
        },
    ],
    qrcode: 'SAMPLE-QR-0000000000',
    photoPath: null,
    basePhotoPath: null,
    badgeLogs: [],
};

const content = computed(() =>
    props.format === 'raw'
        ? (props.rawContent ?? '')
        : serializeSide(props.elements),
);

// When a base is picked, preview against that base's real zones instead of the 4
// hardcoded sample ones, so the "zones" placeholder reflects what will actually print.
const previewZones = computed<AccessCardZone[]>(() => {
    const base = props.bases.find((b) => b.id === selectedBaseId.value);

    if (!base) {
        return SAMPLE_DATA.zones;
    }

    return base.zones.map((zone) => ({
        id: zone.id,
        name_ar: zone.name_ar,
        name_en: zone.name_en,
        color: zone.color,
        pattern_type: zone.pattern_type,
        pattern_color: zone.pattern_color,
    }));
});

// Mirrors AccessCardService::buildForEmployee()'s `selected_base` token: only the base
// explicitly picked here, independent of the (always-static) `default_base` sample above.
const selectedBaseName = computed(
    () => props.bases.find((b) => b.id === selectedBaseId.value)?.name_ar ?? '',
);

const previewData = computed<AccessCardResponse>(() => ({
    ...SAMPLE_DATA,
    zones: previewZones.value,
    values: { ...SAMPLE_DATA.values, selected_base: selectedBaseName.value },
}));

const previewHtml = computed(() =>
    renderAccessCardSide(content.value, previewData.value, locale.value),
);

const previewDoc = computed(
    () => `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        html, body { margin: 0; padding: 0; }
        body { position: relative; width: ${props.width}mm; height: ${props.height}mm; overflow: hidden; direction: rtl; box-sizing: border-box; font-family: inherit; }
        img { max-width: 100%; }
        ${BADGE_DESIGNER_ELEMENT_STYLE}
    </style></head><body>${previewHtml.value}</body></html>`,
);
</script>

<template>
    <div class="flex flex-col items-center gap-2">
        <span
            class="text-xs font-medium text-surface-500 dark:text-surface-400"
            >{{ trans('badgeDesigner.preview.title') }}</span
        >
        <Message
            v-if="format === 'raw'"
            severity="warn"
            variant="simple"
            :closable="false"
            class="max-w-xs text-center text-xs"
        >
            {{ trans('badgeDesigner.preview.rawNotice') }}
        </Message>
        <div v-if="bases.length > 0" class="flex items-center gap-2">
            <label
                class="text-xs font-medium text-surface-600 dark:text-surface-400"
                >{{ trans('badgeDesigner.preview.selectBase') }}</label
            >
            <Select
                v-model="selectedBaseId"
                :options="bases"
                :option-label="(item) => localizedLabel(item, locale)"
                option-value="id"
                show-clear
                size="small"
                style="min-width: 10rem"
            />
        </div>
        <iframe
            :srcdoc="previewDoc"
            class="rounded border border-surface-200 bg-white shadow-sm dark:border-surface-700"
            :style="{ width: `${width}mm`, height: `${height}mm` }"
        />
    </div>
</template>
