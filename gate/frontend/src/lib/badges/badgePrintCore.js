import {
    bulkApproveEmployees,
    fetchBadgeBackPreview,
    fetchBadgePreview,
    fetchBulkBadgePreview,
} from '../../api/employees';
import { buildBadgeTemplateValues } from './badgeTemplateHelpers';
import {
    extractBadgeDimensions,
    renderBadgeHtml,
} from './badgeRenderCore';
import { inlineHtmlImages, resolveAssetUrl } from './inlineHtmlImages';

function assertPrintableHtml(html) {
    if (!html?.trim()) {
        throw new Error('Badge print: empty HTML');
    }

    const text = html.replace(/<[^>]+>/g, '').replace(/\s+/g, '').trim();
    const hasVisual = /<(img|svg|table|strong|center)\b/i.test(html);
    if (!text && !hasVisual) {
        throw new Error('Badge print: template rendered without visible content');
    }
}

function assertBadgeTemplate(data, side) {
    const record = data?.badge2;
    const template = record?.content ?? data?.content ?? '';
    if (!String(template).trim()) {
        throw new Error(`Badge print: missing ${side} template for this employee`);
    }
}

function absolutizeHtmlAssetUrls(html) {
    return html
        .replace(/src=["'](?!https?:|data:|blob:)([^"']+)["']/gi, (_, path) => {
            const normalized = path.startsWith('/') ? path : `/${path}`;
            return `src="${resolveAssetUrl(normalized)}"`;
        })
        .replace(/url\(\s*["']?(?!https?:|data:|blob:)([^"')]+)["']?\s*\)/gi, (_, path) => {
            const normalized = path.startsWith('/') ? path : `/${path}`;
            return `url("${resolveAssetUrl(normalized)}")`;
        });
}

async function preparePrintableBadgeHtml(html, { inlineImages = false } = {}) {
    if (inlineImages) {
        const inlined = await inlineHtmlImages(html);
        return absolutizeHtmlAssetUrls(inlined);
    }

    return absolutizeHtmlAssetUrls(html);
}

function waitForImages(root, timeoutMs = 2000) {
    const images = [...root.querySelectorAll('img')];
    if (images.length === 0) {
        return Promise.resolve();
    }

    return Promise.all(images.map((img) => new Promise((resolve) => {
        if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
        }

        const done = () => resolve();
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
        setTimeout(done, timeoutMs);
    })));
}

function getPageSizeMm(pdfConfig = {}) {
    const format = pdfConfig.jsPDF?.format ?? [90, 140];
    const widthMm = Array.isArray(format) ? Number(format[0]) || 90 : 90;
    const heightMm = Array.isArray(format) ? Number(format[1]) || 140 : 140;
    return { widthMm, heightMm };
}

async function printPreparedHtml(preparedHtml, pdfConfig = {}) {
    const { widthMm, heightMm } = getPageSizeMm(pdfConfig);
    const origin = window.location.origin;

    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = `position:fixed;left:-10000px;top:0;width:${widthMm}mm;height:${heightMm}mm;border:0;`;
    document.body.appendChild(frame);

    const doc = frame.contentDocument || frame.contentWindow?.document;
    if (!doc) {
        frame.remove();
        throw new Error('Badge print: could not create print frame');
    }

    doc.open();
    doc.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8" />
<base href="${origin}/" />
<title>Badge</title>
<style>
@page { size: ${widthMm}mm ${heightMm}mm; margin: 0; }
html, body { margin: 0; padding: 0; background: #fff; }
body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
img { max-width: 100%; height: auto; }
table { border-collapse: collapse; }
</style>
</head>
<body>${preparedHtml}</body>
</html>`);
    doc.close();

    await new Promise((resolve) => { setTimeout(resolve, 150); });
    await waitForImages(doc.body);

    const printWindow = frame.contentWindow;
    if (!printWindow) {
        frame.remove();
        throw new Error('Badge print: print frame unavailable');
    }

    printWindow.focus();
    printWindow.print();

    // Do not wait for the user to close the print dialog — that kept the UI loader stuck.
    setTimeout(() => {
        frame.remove();
    }, 2000);
}

function renderBadgeSideHtml(data, side, options = {}) {
    assertBadgeTemplate(data, side);

    const record = data?.badge2;
    const template = record?.content ?? data.content ?? '';
    const dimensions = extractBadgeDimensions(record);
    const plateSeparator = side === 'front' && options.frontPlateSeparator
        ? options.frontPlateSeparator
        : options.plateSeparator ?? ' // ';
    const values = buildBadgeTemplateValues(data, {
        plateSeparator,
        qrSize: options.qrSize ?? 300,
    });

    return renderBadgeHtml(template, side, values, dimensions, {
        ...options,
        forPrint: true,
    });
}

function pdfFormatFromDimensions(dimensions, fallback) {
    if (dimensions.width && dimensions.heigth) {
        return [dimensions.width, dimensions.heigth];
    }

    return fallback;
}

async function resolvePdfFormat(guestIds, side, fallback) {
    const guestId = guestIds?.[0];
    if (!guestId) {
        return fallback;
    }

    const data = await fetchBadgeSide(guestId, side);
    return pdfFormatFromDimensions(extractBadgeDimensions(data?.badge2), fallback);
}

async function fetchBadgeSide(guestId, side) {
    const { data } = side === 'front'
        ? await fetchBadgePreview(guestId)
        : await fetchBadgeBackPreview(guestId);
    return data;
}

function pickGuestBadgePayload(sideMap, guestId) {
    if (!sideMap) {
        return null;
    }

    return sideMap[String(guestId)] ?? sideMap[guestId] ?? null;
}

async function loadBulkBadgePreview(guestIds, sides) {
    if (guestIds.length === 0) {
        return {};
    }

    if (guestIds.length === 1) {
        const guestId = guestIds[0];
        const payload = {};
        if (sides.includes('front')) {
            payload.front = { [String(guestId)]: await fetchBadgeSide(guestId, 'front') };
        }
        if (sides.includes('back')) {
            payload.back = { [String(guestId)]: await fetchBadgeSide(guestId, 'back') };
        }
        return payload;
    }

    const { data } = await fetchBulkBadgePreview({ guestIds, sides });
    return data ?? {};
}

export async function buildCombinedBadgeHtml(guestIds, options = {}) {
    const { front = {}, back = {} } = await loadBulkBadgePreview(guestIds, ['front', 'back']);

    const frontHtml = guestIds
        .map((guestId) => {
            const frontData = pickGuestBadgePayload(front, guestId);
            return frontData ? renderBadgeSideHtml(frontData, 'front', options) : '';
        })
        .join('');

    const backHtml = guestIds
        .map((guestId) => {
            const backData = pickGuestBadgePayload(back, guestId);
            return backData ? renderBadgeSideHtml(backData, 'back', options) : '';
        })
        .join('');

    return `<div>${frontHtml}</div><div style="page-break-before: always;">${backHtml}</div>`;
}

export async function buildFrontBadgeHtml(guestIds, options = {}) {
    const { front = {} } = await loadBulkBadgePreview(guestIds, ['front']);

    return guestIds
        .map((guestId) => {
            const data = pickGuestBadgePayload(front, guestId);
            return data ? renderBadgeSideHtml(data, 'front', options) : '';
        })
        .join('');
}

export async function buildBackBadgeHtml(guestIds, options = {}) {
    const { back = {} } = await loadBulkBadgePreview(guestIds, ['back']);

    return guestIds
        .map((guestId) => {
            const data = pickGuestBadgePayload(back, guestId);
            return data ? renderBadgeSideHtml(data, 'back', {
                ...options,
                backContainerStyle: options.backContainerStyle ?? 'compact',
            }) : '';
        })
        .join('');
}

export async function printHtmlAsPdf(html, pdfConfig) {
    const prepared = await preparePrintableBadgeHtml(html);
    assertPrintableHtml(prepared);
    await printPreparedHtml(prepared, pdfConfig);
}

export async function openBadgePdf(html, pdfConfig) {
    await printHtmlAsPdf(html, pdfConfig);
}

export async function printCombinedBadges(guestIds, {
    userName,
    markPrinted = true,
    plateSeparator = ' // ',
    frontPlateSeparator,
    onRefresh,
} = {}) {
    if (!guestIds?.length) {
        throw new Error('Badge print: no employees selected');
    }

    const html = await buildCombinedBadgeHtml(guestIds, { plateSeparator, frontPlateSeparator });
    const pdfFormat = await resolvePdfFormat(guestIds, 'front', [54, 94.0]);

    await openBadgePdf(html, {
        filename: 'badge_combined.pdf',
        jsPDF: { unit: 'mm', format: pdfFormat, orientation: 'portrait' },
    });

    if (markPrinted) {
        await bulkApproveEmployees({ guests: guestIds, by: userName, status: 2 });
        await onRefresh?.(guestIds);
    }
}

export async function printFrontBadges(guestIds, {
    userName,
    markPrinted = true,
    plateSeparator = ' (2) ',
    onRefresh,
} = {}) {
    if (!guestIds?.length) {
        throw new Error('Badge print: no employees selected');
    }

    const html = await buildFrontBadgeHtml(guestIds, { plateSeparator });
    const pdfFormat = await resolvePdfFormat(guestIds, 'front', [54, 94.0]);

    await openBadgePdf(html, {
        filename: 'badge2.pdf',
        jsPDF: { unit: 'mm', format: pdfFormat, orientation: 'portrait' },
    });

    if (markPrinted) {
        await bulkApproveEmployees({ guests: guestIds, by: userName, status: 2 });
        await onRefresh?.(guestIds);
    }
}

export async function printBackBadges(guestIds, {
    userName,
    markPrinted = true,
    plateSeparator = ' // ',
    onRefresh,
} = {}) {
    if (!guestIds?.length) {
        throw new Error('Badge print: no employees selected');
    }

    const html = await buildBackBadgeHtml(guestIds, { plateSeparator, backContainerStyle: 'compact' });
    const pdfFormat = await resolvePdfFormat(guestIds, 'back', [54, 86.0]);

    await openBadgePdf(html, {
        filename: 'badge2.pdf',
        jsPDF: { unit: 'mm', format: pdfFormat, orientation: 'portrait' },
    });

    if (markPrinted) {
        await bulkApproveEmployees({ guests: guestIds, by: userName, status: 2 });
        await onRefresh?.(guestIds);
    }
}

export async function printSingleCombinedBadge(employeeId, {
    userName,
    markPrinted = true,
    plateSeparator = ' // ',
} = {}) {
    const [frontData, backData] = await Promise.all([
        fetchBadgeSide(employeeId, 'front'),
        fetchBadgeSide(employeeId, 'back'),
    ]);

    const frontHtml = renderBadgeSideHtml(frontData, 'front', { plateSeparator });
    const backHtml = renderBadgeSideHtml(backData, 'back', { plateSeparator });
    const html = `<div>${frontHtml}</div><div style="page-break-before: always;">${backHtml}</div>`;
    const pdfFormat = pdfFormatFromDimensions(
        extractBadgeDimensions(frontData?.badge2),
        [54, 94.0],
    );

    await openBadgePdf(html, {
        filename: `badge_${employeeId}.pdf`,
        jsPDF: { unit: 'mm', format: pdfFormat, orientation: 'portrait' },
    });

    if (markPrinted) {
        await bulkApproveEmployees({ guests: [employeeId], by: userName, status: 2 });
    }
}

export {
    FRONT_CONTAINER_STYLE,
    BACK_CONTAINER_STYLE,
    BACK_ONLY_CONTAINER_STYLE,
    getBadgeContainerStyle,
    extractBadgeDimensions,
    applyBadgeDimensions,
    renderBadgeHtml,
    createBadgeContainerOuterHtml,
} from './badgeRenderCore';
