import html2pdf from 'html2pdf.js';
import {
    bulkApproveEmployees,
    fetchBadgeBackPreview,
    fetchBadgePreview,
} from '../../api/employees';
import { buildBadgeTemplateValues } from './badgeTemplateHelpers';
import {
    createBadgeContainerOuterHtml,
    extractBadgeDimensions,
    getBadgeContainerStyle,
    renderBadgeHtml,
} from './badgeRenderCore';
import { inlineDomImages, inlineHtmlImages, removeBrokenImages } from './inlineHtmlImages';

const HTML2CANVAS_DEFAULTS = { useCORS: true, allowTaint: false, logging: false };

function renderBadgeSideHtml(data, side, options = {}) {
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

export async function buildCombinedBadgeHtml(guestIds, options = {}) {
    let frontHtml = '';
    let backHtml = '';

    await Promise.all(guestIds.map(async (guestId) => {
        const frontData = await fetchBadgeSide(guestId, 'front');
        frontHtml += renderBadgeSideHtml(frontData, 'front', options);
    }));

    await Promise.all(guestIds.map(async (guestId) => {
        const backData = await fetchBadgeSide(guestId, 'back');
        backHtml += renderBadgeSideHtml(backData, 'back', options);
    }));

    return `<div>${frontHtml}</div><div style="page-break-before: always;">${backHtml}</div>`;
}

export async function buildFrontBadgeHtml(guestIds, options = {}) {
    let html = '';
    await Promise.all(guestIds.map(async (guestId) => {
        const data = await fetchBadgeSide(guestId, 'front');
        html += renderBadgeSideHtml(data, 'front', options);
    }));
    return html;
}

export async function buildBackBadgeHtml(guestIds, options = {}) {
    let html = '';
    await Promise.all(guestIds.map(async (guestId) => {
        const data = await fetchBadgeSide(guestId, 'back');
        html += renderBadgeSideHtml(data, 'back', {
            ...options,
            backContainerStyle: options.backContainerStyle ?? 'compact',
        });
    }));
    return html;
}

export async function printHtmlAsPdf(html, pdfConfig) {
    const inlined = await inlineHtmlImages(html);
    const host = document.createElement('div');
    host.style.position = 'fixed';
    host.style.left = '-10000px';
    host.style.top = '0';
    host.style.width = '0';
    host.style.height = '0';
    host.style.overflow = 'hidden';
    host.innerHTML = inlined;
    document.body.appendChild(host);

    try {
        await inlineDomImages(host);
        await waitForImages(host);
        removeBrokenImages(host);
        const pdfObj = await html2pdf().from(host).set({
            ...pdfConfig,
            html2canvas: { ...HTML2CANVAS_DEFAULTS, ...pdfConfig?.html2canvas },
        }).outputPdf().get('pdf');
        pdfObj.autoPrint();
        window.open(pdfObj.output('bloburl'), 'F');
    } finally {
        host.remove();
    }
}

function waitForImages(root, timeoutMs = 4000) {
    const images = [...root.querySelectorAll('img')];
    if (images.length === 0) {
        return Promise.resolve();
    }

    return Promise.all(images.map((img) => new Promise((resolve) => {
        if (img.complete) {
            resolve();
            return;
        }

        const done = () => resolve();
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
        setTimeout(done, timeoutMs);
    })));
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
    const html = await buildCombinedBadgeHtml(guestIds, { plateSeparator, frontPlateSeparator });
    const pdfFormat = await resolvePdfFormat(guestIds, 'front', [54, 94.0]);
    if (markPrinted) {
        await bulkApproveEmployees({ guests: guestIds, by: userName, status: 2 });
        await onRefresh?.(guestIds);
    }

    await openBadgePdf(html, {
        margin: -9,
        filename: 'badge_combined.pdf',
        image: { type: 'jpeg', quality: 2 },
        html2canvas: { scale: 5 },
        jsPDF: { unit: 'mm', format: pdfFormat, orientation: 'portrait' },
    });
}

export async function printFrontBadges(guestIds, {
    userName,
    markPrinted = true,
    plateSeparator = ' (2) ',
    onRefresh,
} = {}) {
    const html = await buildFrontBadgeHtml(guestIds, { plateSeparator });
    const pdfFormat = await resolvePdfFormat(guestIds, 'front', [54, 94.0]);
    if (markPrinted) {
        await bulkApproveEmployees({ guests: guestIds, by: userName, status: 2 });
        await onRefresh?.(guestIds);
    }

    await openBadgePdf(html, {
        margin: -9,
        filename: 'badge2.pdf',
        image: { type: 'jpeg', quality: 2 },
        html2canvas: { scale: 5 },
        jsPDF: { unit: 'mm', format: pdfFormat, orientation: 'portrait' },
    });
}

export async function printBackBadges(guestIds, {
    userName,
    markPrinted = true,
    plateSeparator = ' // ',
    onRefresh,
} = {}) {
    const html = await buildBackBadgeHtml(guestIds, { plateSeparator, backContainerStyle: 'compact' });
    const pdfFormat = await resolvePdfFormat(guestIds, 'back', [54, 86.0]);
    if (markPrinted) {
        await bulkApproveEmployees({ guests: guestIds, by: userName, status: 2 });
        await onRefresh?.(guestIds);
    }

    await openBadgePdf(html, {
        margin: 0,
        filename: 'badge2.pdf',
        image: { type: 'jpeg', quality: 2 },
        html2canvas: { scale: 5 },
        jsPDF: { unit: 'mm', format: pdfFormat, orientation: 'portrait' },
    });
}

export async function printSingleCombinedBadge(employeeId, {
    userName,
    markPrinted = true,
    plateSeparator = ' // ',
} = {}) {
    const frontData = await fetchBadgeSide(employeeId, 'front');
    const frontHtml = renderBadgeSideHtml(frontData, 'front', { plateSeparator });

    if (markPrinted) {
        await bulkApproveEmployees({ guests: [employeeId], by: userName, status: 2 });
    }

    const backData = await fetchBadgeSide(employeeId, 'back');
    const backHtml = renderBadgeSideHtml(backData, 'back', { plateSeparator });
    const html = `<div>${frontHtml}</div><div style="page-break-before: always;">${backHtml}</div>`;
    const pdfFormat = pdfFormatFromDimensions(
        extractBadgeDimensions(frontData?.badge2),
        [54, 94.0],
    );

    await openBadgePdf(html, {
        margin: -9,
        filename: `badge_${employeeId}.pdf`,
        image: { type: 'jpeg', quality: 2 },
        html2canvas: { scale: 5 },
        jsPDF: { unit: 'mm', format: pdfFormat, orientation: 'portrait' },
    });
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
