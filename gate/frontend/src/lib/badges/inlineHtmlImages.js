const IMAGE_EXT_PATTERN = /\.(png|jpe?g|gif|webp|svg|bmp|ico)(\?.*)?$/i;
const dataUrlCache = new Map();

const TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

export function resolveAssetUrl(path) {
    if (!path || path.startsWith('data:') || path.startsWith('blob:')) {
        return path;
    }
    if (/^https?:\/\//i.test(path)) {
        return path;
    }
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `${window.location.origin}${normalized}`;
}

function isSameOrigin(url) {
    try {
        return new URL(resolveAssetUrl(url)).origin === window.location.origin;
    } catch {
        return true;
    }
}

function looksLikeImagePath(url) {
    const path = String(url).split('?')[0].split('#')[0];
    return IMAGE_EXT_PATTERN.test(path);
}

function isImageResponse(blob, contentType = '', url = '') {
    const type = (blob?.type || contentType || '').toLowerCase();
    if (type.startsWith('image/')) {
        return true;
    }
    if (type.includes('text/html') || type.includes('text/plain')) {
        return false;
    }
    if (!type || type.includes('octet-stream')) {
        return looksLikeImagePath(url);
    }
    return false;
}

async function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

async function loadImageViaCanvas(url) {
    const absolute = resolveAssetUrl(url);

    return new Promise((resolve, reject) => {
        const img = new Image();
        if (!isSameOrigin(url)) {
            img.crossOrigin = 'anonymous';
        }

        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = Math.max(img.naturalWidth || 1, 1);
                canvas.height = Math.max(img.naturalHeight || 1, 1);
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            } catch (error) {
                reject(error);
            }
        };

        img.onerror = () => reject(new Error(`Image load failed: ${absolute}`));
        img.src = absolute;
    });
}

export async function urlToDataUrl(url) {
    if (!url || url.startsWith('data:') || url.startsWith('blob:')) {
        return url;
    }

    const cacheKey = resolveAssetUrl(url);
    if (dataUrlCache.has(cacheKey)) {
        return dataUrlCache.get(cacheKey);
    }

    const absolute = cacheKey;

    try {
        const response = await fetch(absolute, { credentials: 'same-origin' });
        if (response.ok) {
            const contentType = response.headers.get('content-type') || '';
            const blob = await response.blob();
            if (isImageResponse(blob, contentType, absolute)) {
                const dataUrl = await blobToDataUrl(blob);
                dataUrlCache.set(cacheKey, dataUrl);
                return dataUrl;
            }
        }
    } catch {
        // Fall through to canvas loader.
    }

    const dataUrl = await loadImageViaCanvas(url);
    dataUrlCache.set(cacheKey, dataUrl);
    return dataUrl;
}

function collectImageUrls(html) {
    const urls = new Set();
    const patterns = [
        /src=["']([^"']+)["']/gi,
        /url\(\s*["']?([^"')]+)["']?\s*\)/gi,
    ];

    for (const pattern of patterns) {
        let match = pattern.exec(html);
        while (match) {
            const url = match[1]?.trim();
            if (url && !url.startsWith('data:') && !url.startsWith('blob:')) {
                urls.add(url);
            }
            match = pattern.exec(html);
        }
    }

    return [...urls];
}

function urlVariants(url) {
    const variants = new Set([url]);
    try {
        const absolute = resolveAssetUrl(url);
        variants.add(absolute);
        const parsed = new URL(absolute);
        variants.add(parsed.pathname);
    } catch {
        // ignore
    }
    return [...variants];
}

export async function inlineHtmlImages(html) {
    const urls = collectImageUrls(html);
    const replacements = await Promise.all(urls.map(async (url) => {
        try {
            const dataUrl = await urlToDataUrl(url);
            return { url, dataUrl };
        } catch (error) {
            console.warn('Badge print: could not inline image', url, error);
            return null;
        }
    }));

    let result = html;
    for (const entry of replacements) {
        if (!entry) {
            continue;
        }
        for (const variant of urlVariants(entry.url)) {
            result = result.split(variant).join(entry.dataUrl);
        }
    }
    return result;
}

export async function inlineDomImages(root) {
    const images = [...root.querySelectorAll('img')];

    await Promise.all(images.map(async (img) => {
        const src = img.getAttribute('src');
        if (!src || src.startsWith('data:') || src.startsWith('blob:')) {
            return;
        }

        try {
            const dataUrl = await urlToDataUrl(src);
            img.setAttribute('src', dataUrl);
            img.removeAttribute('crossorigin');
        } catch (error) {
            console.warn('Badge print: could not inline image', src, error);
            if (img.getAttribute('aria-hidden') === 'true') {
                img.remove();
            } else {
                img.setAttribute('src', TRANSPARENT_PIXEL);
            }
        }
    }));
}

export function removeBrokenImages(root) {
    for (const img of root.querySelectorAll('img')) {
        const src = img.getAttribute('src') || '';
        if (!src.startsWith('data:') && (!img.complete || img.naturalWidth === 0)) {
            img.remove();
        }
    }
}

export function transparentPixelDataUrl() {
    return TRANSPARENT_PIXEL;
}
