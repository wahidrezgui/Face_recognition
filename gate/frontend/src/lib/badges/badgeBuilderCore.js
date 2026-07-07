import { buildBadgeTemplateValues } from './badgeTemplateHelpers';
import { renderBadgeHtml } from './badgeRenderCore';

export const BADGE_SIDES = {
    front: 'front',
    back: 'back',
};

export const BADGE_SIDE_LABELS = {
    front: 'الوجه الأمامي',
    back: 'الوجه الخلفي',
};

export const BADGE_DEFAULT_DIMENSIONS = {
    front: { width: 90, heigth: 140 },
    back: { width: 54, heigth: 85 },
};

const DEFAULT_FRONT_TEMPLATE = `<table style="border-collapse: collapse; width: 100%; border-spacing: 0px; margin-left: auto; margin-right: auto;" border="0">
<tbody>
<tr>
<td style="padding: 20px 15px 0px; width: 100%; text-align: center;" colspan="2"><span style="font-size: 10pt; color: black;"><strong>القوات الجوية الأميرية القطرية</strong></span></td>
</tr>
<tr>
<td style="text-align: center; padding: 1px 15px 2px; width: 100%; vertical-align: top;" colspan="2"><span style="font-size: 10pt; color: black;"><strong>{{default_base}}</strong></span></td>
</tr>
<tr>
<td style="padding: 5px; width: 50%; border: 1px solid #ccc;"><center>{{guest_photo_square}}</center></td>
<td style="padding: 5px; width: 50%; border: 1px solid #ccc;"><center>{{qrcode}}</center></td>
</tr>
<tr>
<td style="text-align: center; width: 100%;" colspan="2"><span style="font-size: 12pt;"><strong>{{zones}}</strong></span></td>
</tr>
<tr>
<td style="text-align: center; width: 100%;" colspan="2"><strong>{{military_number}}</strong></td>
</tr>
<tr>
<td style="text-align: left; padding: 0px 15px; width: 50%;"><span style="font-size: 8pt;"><strong>{{Job_En}}</strong></span></td>
<td style="text-align: right; padding: 0px 15px; width: 50%;"><span style="font-size: 8pt;"><strong>{{Job_Arabic}}</strong></span></td>
</tr>
<tr>
<td style="text-align: center; padding: 0px 15px; width: 100%;" colspan="2"><span style="font-size: 10pt;"><strong>{{fullname_ar}}</strong></span></td>
</tr>
<tr>
<td style="text-align: center; padding: 0px 15px; width: 100%;" colspan="2"><span style="font-size: 10pt;"><strong>{{fullname_en}}</strong></span></td>
</tr>
</tbody>
</table>`;

const DEFAULT_BACK_TEMPLATE = `<div style="font-family: times new roman; width: 60mm; padding: 20mm 10mm 0 10mm;">
<div style="border: 1px solid #000; padding: 2mm; margin-bottom: 2mm;"><strong>{{fullname_ar}}</strong></div>
<div style="border: 1px solid #000; padding: 2mm; margin-bottom: 2mm;"><strong>{{department}}</strong></div>
<div style="border: 1px solid #000; padding: 2mm; margin-bottom: 2mm;"><strong>{{expiry_date}}</strong></div>
<div style="border: 1px solid #000; padding: 2mm; text-align: center;"><strong>{{plate_numbers}}</strong></div>
</div>`;

export const BADGE_EDITOR_TAGS = [
    {
        group: 'صور وبيانات', items: [
            { text: 'QR Code', tag: 'qrcode' },
            { text: 'صورة دائرية', tag: 'guest_photo_circle' },
            { text: 'صورة مربعة', tag: 'guest_photo_square' },
            { text: 'صورة ثانوية دائرية', tag: 'guest_photo_circlet' },
            { text: 'صورة ثانوية مربعة', tag: 'guest_photo_squaret' },
            { text: 'صورة القاعدة دائرية', tag: 'guest_photo_circleb' },
            { text: 'صورة القاعدة مربعة', tag: 'guest_photo_squareb' },
            { text: 'المناطق', tag: 'zones' },
        ]
    },
    {
        group: 'وظيفة ورتبة', items: [
            { text: 'الرقم العسكري', tag: 'military_number' },
            { text: 'الوظيفة بالإنجليزية', tag: 'Job_En' },
            { text: 'الوظيفة بالعربية', tag: 'Job_Arabic' },
            { text: 'الاسم بالعربية', tag: 'fullname_ar' },
            { text: 'الاسم بالإنجليزية', tag: 'fullname_en' },
            { text: 'الرتبة', tag: 'rank' },
            { text: 'الرتبة EN', tag: 'ranke' },
            { text: 'فصيلة الدم', tag: 'bloodtype' },
        ]
    },
    {
        group: 'وحدة وقاعدة', items: [
            { text: 'الوحدة', tag: 'department' },
            { text: 'القاعدة الافتراضية', tag: 'default_base' },
            { text: 'اسم الوحدة', tag: 'dep_name' },
            { text: 'الوحدة EN', tag: 'dep3' },
            { text: 'تاريخ الانتهاء', tag: 'expiry_date' },
            { text: 'رقم اللوحة', tag: 'plate_number' },
            { text: 'أرقام اللوحات', tag: 'plate_numbers' },
            { text: 'المرافق', tag: 'Escort' },
            { text: 'الجهاز', tag: 'device' },
            { text: 'وقت البداية', tag: 'StartTime' },
            { text: 'وقت النهاية', tag: 'EndTime' },
            { text: 'الجنسية', tag: 'nationality' },
            { text: 'الجنسية EN', tag: 'nationalitye' },
            { text: 'ملاحظات', tag: 'remarks' },
            { text: 'رقم الضيف', tag: 'idguest' },
        ]
    },
];

export function normalizeBadgeRecord(payload) {
    if (!payload || typeof payload !== 'object') {
        return null;
    }

    if (payload.exists === false && payload.data === null) {
        return null;
    }

    if (payload.status === 'success' && payload.data) {
        return payload.data;
    }

    if (payload.id || payload.dep_id) {
        return payload;
    }

    return null;
}

export function createEmptyBadgeSide(depId, side) {
    const dimensions = BADGE_DEFAULT_DIMENSIONS[side];
    const content = side === BADGE_SIDES.front
        ? DEFAULT_FRONT_TEMPLATE
        : DEFAULT_BACK_TEMPLATE;

    return {
        id: null,
        dep_id: depId,
        content,
        width: dimensions.width,
        heigth: dimensions.heigth,
    };
}

export function cloneBadgeSide(side, sideKey = BADGE_SIDES.front) {
    if (!side) {
        return null;
    }

    const defaults = BADGE_DEFAULT_DIMENSIONS[sideKey] ?? BADGE_DEFAULT_DIMENSIONS.front;

    return {
        id: side.id ?? null,
        dep_id: side.dep_id ?? null,
        content: side.content ?? '',
        width: side.width ?? defaults.width,
        heigth: side.heigth ?? defaults.heigth,
    };
}

export function badgeSidesEqual(a, b) {
    if (!a && !b) {
        return true;
    }

    if (!a || !b) {
        return false;
    }

    return a.content === b.content
        && String(a.width) === String(b.width)
        && String(a.heigth) === String(b.heigth);
}

export function buildPreviewSampleEmployeeData() {
    return {
        qrcode: '123456789',
        photo: 'uploads/nopic.png',
        photot: 'uploads/nopic.png',
        base_photo: null,
        fullname_en: 'John Smith',
        fullname_ar: 'محمد أحمد',
        Job_En: 'Engineer',
        Job_Arabic: 'مهندس',
        department: 'قسم الهندسة',
        dep_name: 'قسم الهندسة',
        dep3: 'Engineering Dept',
        rank: 'رائد',
        ranke: 'Major',
        bloodtype: 'O+',
        military_number: '12345',
        default_base: 'قاعدة العديد',
        ZoneColor: [
            { color: '#ff0000' },
            { color: '#E7DF04' },
        ],
        expiry_date: '2026-12-31',
        plate_numbers: ['1234', '5678'],
        remarks: 'ملاحظة تجريبية',
        Escort: 'مرافق',
        device: 'جهاز',
        StartTime: '08:00',
        EndTime: '16:00',
        nationality: 'قطري',
        nationalitye: 'Qatari',
        idguest: '1001',
        id: '1001',
    };
}

/** @deprecated use buildPreviewTemplateValues */
export function buildPreviewSampleValues() {
    return buildPreviewTemplateValues(buildPreviewSampleEmployeeData());
}

export function buildPreviewTemplateValues(employeeData) {
    if (!employeeData) {
        return buildBadgeTemplateValues(buildPreviewSampleEmployeeData());
    }

    return buildBadgeTemplateValues(employeeData);
}

export function buildBadgePreviewHtml(content, side, options = {}) {
    const {
        width,
        heigth,
        templateValues,
        backContainerStyle,
    } = options;

    const values = templateValues ?? buildPreviewTemplateValues(buildPreviewSampleEmployeeData());

    return renderBadgeHtml(
        content,
        side,
        values,
        { width, heigth },
        { backContainerStyle, sandboxPreview: true },
    );
}
