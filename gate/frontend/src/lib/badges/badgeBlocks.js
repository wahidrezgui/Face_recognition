export const BADGE_BLOCKS = [
    {
        id: 'header_org',
        label: 'ترويسة القوات',
        icon: 'pi-flag',
        html: `<tr>
<td style="padding: 20px 15px 0px; width: 100%; text-align: center;" colspan="2"><span style="font-size: 10pt; color: black;"><strong>القوات الجوية الأميرية القطرية</strong></span></td>
</tr>`,
    },
    {
        id: 'header_base',
        label: 'القاعدة',
        icon: 'pi-map-marker',
        html: `<tr>
<td style="text-align: center; padding: 1px 15px 2px; width: 100%; vertical-align: top;" colspan="2"><span style="font-size: 10pt; color: black;"><strong>{{default_base}}</strong></span></td>
</tr>`,
    },
    {
        id: 'photo_qr_row',
        label: 'صورة + QR',
        icon: 'pi-qrcode',
        html: `<tr>
<td style="padding: 5px; width: 50%; border: 1px solid #ccc; height: 120px;"><center>{{guest_photo_square}}</center></td>
<td style="padding: 5px; width: 50%; border: 1px solid #ccc; height: 120px;"><center>{{qrcode}}</center></td>
</tr>`,
    },
    {
        id: 'zones_row',
        label: 'المناطق',
        icon: 'pi-th-large',
        html: `<tr>
<td style="text-align: center; width: 100%; line-height: 1;" colspan="2"><span style="font-size: 12pt;"><strong>{{zones}}</strong></span></td>
</tr>`,
    },
    {
        id: 'military_band',
        label: 'الرقم العسكري',
        icon: 'pi-hashtag',
        html: `<tr>
<td style="background-color: white; font-size: 18pt; color: black; text-align: center; width: 100%;" colspan="2"><strong>{{military_number}}</strong></td>
</tr>`,
    },
    {
        id: 'jobs_row',
        label: 'الوظيفة',
        icon: 'pi-briefcase',
        html: `<tr>
<td style="text-align: left; padding: 0px 15px; width: 50%;"><span style="font-size: 8pt;"><strong>{{Job_En}}</strong></span></td>
<td style="text-align: right; padding: 0px 15px; width: 50%;"><span style="font-size: 8pt;"><strong>{{Job_Arabic}}</strong></span></td>
</tr>`,
    },
    {
        id: 'names_row',
        label: 'الأسماء',
        icon: 'pi-user',
        html: `<tr>
<td style="text-align: center; padding: 0px 15px; width: 100%; white-space: nowrap;" colspan="2"><span style="font-size: 10pt;"><strong>{{fullname_ar}}</strong></span></td>
</tr>
<tr>
<td style="text-align: center; padding: 0px 15px; width: 100%; white-space: nowrap;" colspan="2"><span style="font-size: 10pt;"><strong>{{fullname_en}}</strong></span></td>
</tr>`,
    },
    {
        id: 'cars_table',
        label: 'جدول المركبات',
        icon: 'pi-car',
        html: `<tr>
<td style="padding: 8px 15px; width: 100%;" colspan="2">
<table style="width: 100%; border-collapse: collapse; font-size: 9pt;" border="1">
<tbody>
<tr style="background-color: #f1f5f9;">
<td style="padding: 4px; text-align: center; font-weight: bold;">رقم اللوحة</td>
</tr>
<tr>
<td style="padding: 6px; text-align: center;"><strong>{{plate_numbers}}</strong></td>
</tr>
</tbody>
</table>
</td>
</tr>`,
    },
];

export function getBadgeBlock(blockId) {
    return BADGE_BLOCKS.find((block) => block.id === blockId) ?? null;
}

export function insertBadgeBlockHtml(currentContent, blockHtml) {
    const trimmed = (currentContent ?? '').trim();

    if (!trimmed) {
        return `<table style="border-collapse: collapse; width: 100%;" border="0"><tbody>${blockHtml}</tbody></table>`;
    }

    if (/<\/tbody>/i.test(trimmed)) {
        return trimmed.replace(/<\/tbody>/i, `${blockHtml}</tbody>`);
    }

    if (/<table/i.test(trimmed)) {
        return `${trimmed}${blockHtml}`;
    }

    return `${trimmed}\n${blockHtml}`;
}

export function contentUsesTag(content, tag) {
    if (!content || !tag) {
        return false;
    }

    const pattern = new RegExp(`\\{\\{\\s*${tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\}\\}`, 'i');
    return pattern.test(content);
}
