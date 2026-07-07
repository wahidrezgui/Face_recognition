import { replaceTemplateValues } from './badgeTemplateHelpers';

export const FRONT_CONTAINER_STYLE = {
    height: '94.0mm',
    padding: '6mm',
    backgroundImage: 'url("/uploads/012.png")',
    backgroundColor: 'white',
    backgroundPosition: 'center center',
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
};

export const BACK_CONTAINER_STYLE = {
    height: '93.0mm',
    padding: '1mm',
    backgroundImage: 'url("/uploads/20.png")',
    backgroundPosition: 'center center',
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
};

export const BACK_ONLY_CONTAINER_STYLE = {
    height: '86.0mm',
    padding: '1mm',
    backgroundImage: 'url("/uploads/20.png")',
    backgroundPosition: 'center center',
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
};

export function getBadgeContainerStyle(side, options = {}) {
    if (side === 'front') {
        return { ...FRONT_CONTAINER_STYLE };
    }

    return options.backContainerStyle === 'compact'
        ? { ...BACK_ONLY_CONTAINER_STYLE }
        : { ...BACK_CONTAINER_STYLE };
}

/** Read width/heigth from a badges or badges2 API record (guest preview uses `badge2` key). */
export function extractBadgeDimensions(record) {
    if (!record || typeof record !== 'object') {
        return {};
    }

    const width = Number(record.width);
    const heigth = Number(record.heigth);

    return {
        width: Number.isFinite(width) && width > 0 ? width : undefined,
        heigth: Number.isFinite(heigth) && heigth > 0 ? heigth : undefined,
    };
}

export function applyBadgeDimensions(style, dimensions = {}) {
    const next = { ...style };

    if (dimensions.width) {
        next.width = `${dimensions.width}mm`;
    }

    if (dimensions.heigth) {
        next.height = `${dimensions.heigth}mm`;
    }

    return next;
}

function extractBackgroundImageUrl(style = {}) {
    const raw = style.backgroundImage || '';
    const match = String(raw).match(/url\(\s*["']?([^"')]+)["']?\s*\)/i);
    return match?.[1] ?? null;
}

function appendPrintBackgroundLayer(container, backgroundUrl) {
    if (!backgroundUrl || backgroundUrl.startsWith('data:')) {
        return;
    }

    const bgImg = document.createElement('img');
    bgImg.src = backgroundUrl;
    bgImg.alt = '';
    bgImg.setAttribute('aria-hidden', 'true');
    Object.assign(bgImg.style, {
        position: 'absolute',
        inset: '0',
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        objectPosition: 'center center',
        zIndex: '0',
        pointerEvents: 'none',
    });
    container.appendChild(bgImg);
}

export function stripDocumentLeakingMarkup(html) {
    if (!html) {
        return '';
    }

    return html
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<link\b[^>]*rel=["']?stylesheet["']?[^>]*>/gi, '')
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
}

export function renderBadgeHtml(content, side, templateValues, dimensions = {}, options = {}) {
    if (!content) {
        return '';
    }

    let replaced = replaceTemplateValues(content, templateValues);

    if (options.sandboxPreview) {
        replaced = stripDocumentLeakingMarkup(replaced);
    }
    const container = document.createElement('div');
    const baseStyle = getBadgeContainerStyle(side, options);
    const style = applyBadgeDimensions(baseStyle, dimensions);
    const backgroundUrl = extractBackgroundImageUrl(style);
    const printMode = options.forPrint === true;

    if (printMode && backgroundUrl) {
        delete style.backgroundImage;
    }

    Object.assign(container.style, style);

    container.setAttribute('dir', 'rtl');
    container.style.direction = 'rtl';
    container.style.boxSizing = 'border-box';
    container.style.overflow = 'hidden';
    container.style.position = 'relative';

    if (printMode && backgroundUrl) {
        appendPrintBackgroundLayer(container, backgroundUrl);
    }

    const contentLayer = document.createElement('div');
    Object.assign(contentLayer.style, {
        position: 'relative',
        zIndex: '1',
        width: '100%',
        height: '100%',
    });
    contentLayer.innerHTML = replaced;
    container.appendChild(contentLayer);

    return container.outerHTML;
}

export function createBadgeContainerOuterHtml(html, style) {
    const containerDiv = document.createElement('div');
    Object.assign(containerDiv.style, style);
    containerDiv.innerHTML = html;
    return containerDiv.outerHTML;
}
