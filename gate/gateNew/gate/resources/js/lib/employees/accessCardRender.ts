import qrcode from 'qrcode-generator';
import { buildZoneSvgMarkup } from '@/lib/zones/zoneStyleCore';
import type { AccessCardResponse, AccessCardZone } from '@/types';
import { employeePhotoUrl } from './employeeFormUi';

function buildQrCodeMarkup(data: string): string {
    if (!data) {
        return '';
    }

    const qr = qrcode(0, 'M');
    qr.addData(data);
    qr.make();

    return `<img src="${qr.createDataURL(6, 4)}" style="width:100%;max-width:110px;display:block;" alt="" />`;
}

function buildPhotoMarkup(
    photoPath: string | null,
    shape: 'circle' | 'square',
): string {
    const borderRadius = shape === 'circle' ? '50%' : '6%';

    return `<img src="${employeePhotoUrl(photoPath)}" style="width:100%;max-width:110px;aspect-ratio:1;object-fit:cover;border-radius:${borderRadius};" alt="" />`;
}

function buildZonesMarkup(zones: AccessCardZone[]): string {
    if (zones.length === 0) {
        return '';
    }

    const items = zones
        .map((zone) => {
            const swatch = buildZoneSvgMarkup(zone, {
                width: 20,
                height: 18,
                strokeWidth: 2,
            });

            return `<li style="display:inline-flex;align-items:center;gap:2px;margin:0 2px;">${swatch}</li>`;
        })
        .join('');

    return `<ul style="list-style:none;display:flex;flex-wrap:wrap;justify-content:center;padding:0;margin:0;">${items}</ul>`;
}

/**
 * Shared CSS for any print/preview shell that renders badge HTML — scoped to the Badge
 * Designer's own `data-badge-type` wrapper attribute, so it only affects designer-authored
 * elements. Legacy-authored template rows never carry this attribute and are unaffected;
 * their images keep the deterministic `max-width:110px` sizing from `buildQrCodeMarkup`/
 * `buildPhotoMarkup` above, which several live templates depend on.
 */
export const BADGE_DESIGNER_ELEMENT_STYLE = `
    [data-badge-type="image"] img { width:100%; height:100%; object-fit:cover; }
    [data-badge-type="image"][data-badge-shape="qr"] img { object-fit:contain; }
    [data-badge-type="zones"] > ul { width:100%; height:100%; }
`;

/**
 * Forces the browser to paint background colors/images when printing, regardless of the
 * print dialog's "Background graphics" checkbox — without `!important` on every element
 * (not just `body`), solid-color badge elements (e.g. the number bar, zone swatches) are
 * silently dropped from the printed/PDF output even though they render fine on screen.
 */
export const PRINT_COLOR_ADJUST_STYLE = `
    *, *::before, *::after {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
    }
`;

/**
 * Combines the backend's plain-text substitutions with client-rendered markup tokens
 * (QR image, photos, zone swatches) into one flat {{token}} -> value map, then performs
 * a straight string replace against the template content — mirrors legacy's
 * `buildBadgeTemplateValues` + `replaceTemplateValues`, minus the tokens confirmed dead
 * in production (`guest_photo_*t`, since `employees.photot` isn't a real column).
 */
export function renderAccessCardSide(
    content: string,
    payload: AccessCardResponse,
    locale: string,
): string {
    // Kept for call-site compatibility (BadgeDesignerPreviewPanel.vue, EmployeeAccessCardTab.vue
    // both still pass it) even though the zone chips no longer render a localized label.
    void locale;

    const values: Record<string, string> = {
        ...payload.values,
        qrcode: buildQrCodeMarkup(payload.qrcode),
        guest_photo_circle: buildPhotoMarkup(payload.photoPath, 'circle'),
        guest_photo_square: buildPhotoMarkup(payload.photoPath, 'square'),
        guest_photo_circlet: buildPhotoMarkup(null, 'circle'),
        guest_photo_squaret: buildPhotoMarkup(null, 'square'),
        guest_photo_circleb: buildPhotoMarkup(payload.basePhotoPath, 'circle'),
        guest_photo_squareb: buildPhotoMarkup(payload.basePhotoPath, 'square'),
        zones: buildZonesMarkup(payload.zones),
    };

    let rendered = content;

    for (const [key, value] of Object.entries(values)) {
        rendered = rendered.replaceAll(`{{${key}}}`, value ?? '');
    }

    return rendered;
}
