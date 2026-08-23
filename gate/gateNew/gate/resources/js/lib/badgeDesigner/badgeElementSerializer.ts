import type { BadgeElement, BadgeFormat } from '@/types';

const MARKER_ATTR = 'data-badge-el';

/**
 * Every element property that must round-trip is stored as its own `data-badge-*`
 * attribute — the canonical source of truth for `deserializeSide()`. The inline `style`
 * built alongside it is for rendering only and is never read back, since a browser's
 * CSSOM can normalize inline style values on read (e.g. `#000000` reflecting back as
 * `rgb(0, 0, 0)`, `bold` as `700`) even on a detached `DOMParser` node — attributes don't
 * have that problem, they're plain strings.
 */
function elementAttributes(element: BadgeElement): Record<string, string> {
    const attrs: Record<string, string> = {
        [MARKER_ATTR]: element.id,
        'data-badge-type': element.type,
        'data-badge-token': element.token ?? '',
        'data-badge-x': String(element.x),
        'data-badge-y': String(element.y),
        'data-badge-w': String(element.width),
        'data-badge-h': String(element.height),
    };

    if (element.shape) {
        attrs['data-badge-shape'] = element.shape;
    }

    if (element.type === 'text') {
        attrs['data-badge-font-size'] = String(element.fontSize);
        attrs['data-badge-color'] = element.color;
        attrs['data-badge-font-weight'] = element.fontWeight;
        attrs['data-badge-text-align'] = element.textAlign;
        attrs['data-badge-direction'] = element.direction;
        attrs['data-badge-orientation'] = element.orientation ?? 'horizontal';
    }

    if (element.type === 'rectangle') {
        attrs['data-badge-color'] = element.color;
        attrs['data-badge-filled'] = String(element.filled ?? true);
        attrs['data-badge-thickness'] = String(element.thickness ?? 1);
    }

    if (element.type === 'line') {
        attrs['data-badge-color'] = element.color;
        attrs['data-badge-thickness'] = String(element.thickness ?? 1);
        attrs['data-badge-orientation'] = element.orientation ?? 'horizontal';
    }

    return attrs;
}

function elementInlineStyle(element: BadgeElement): string {
    const rules = [
        'position:absolute',
        `left:${element.x}mm`,
        `top:${element.y}mm`,
        `width:${element.width}mm`,
        `height:${element.height}mm`,
        'box-sizing:border-box',
        'overflow:hidden',
        `direction:${element.direction}`,
        `text-align:${element.textAlign}`,
    ];

    if (element.type === 'text') {
        rules.push(
            `font-size:${element.fontSize}pt`,
            `color:${element.color}`,
            `font-weight:${element.fontWeight}`,
        );

        if (element.orientation === 'vertical') {
            rules.push('writing-mode:vertical-rl', 'text-orientation:mixed');
        }
    }

    if (element.type === 'image' && element.shape === 'circle') {
        rules.push('border-radius:50%');
    }

    if (element.type === 'rectangle') {
        if (element.filled === false) {
            rules.push(
                'background-color:transparent',
                `border:${element.thickness ?? 1}mm solid ${element.color}`,
            );
        } else {
            rules.push(`background-color:${element.color}`);
        }
    }

    if (element.type === 'line') {
        const size =
            element.orientation === 'vertical'
                ? `${element.thickness ?? 1}mm 100%`
                : `100% ${element.thickness ?? 1}mm`;
        rules.push(
            `background:linear-gradient(${element.color},${element.color}) center / ${size} no-repeat`,
        );
    }

    return `${rules.join(';')};`;
}

function elementDisplayContent(element: BadgeElement): string {
    if (element.type === 'text') {
        return element.token
            ? `{{${element.token}}}`
            : (element.staticText ?? '');
    }

    // image / zones are always bound to a token — the literal `{{token}}` text is what
    // renderAccessCardSide() substitutes with real markup at render time.
    return element.token ? `{{${element.token}}}` : '';
}

/**
 * Builds the flattened HTML string that gets POSTed to `badges`/`badges2.content`. Uses
 * DOM APIs (not string-template concatenation) so admin-entered static text is
 * HTML-escaped for free and the output is guaranteed byte-symmetric with what
 * `deserializeSide()` expects to read back.
 */
export function serializeSide(elements: BadgeElement[]): string {
    const container = document.createElement('div');

    for (const element of elements) {
        const wrapper = document.createElement('div');

        for (const [name, value] of Object.entries(
            elementAttributes(element),
        )) {
            wrapper.setAttribute(name, value);
        }

        wrapper.setAttribute('style', elementInlineStyle(element));
        wrapper.textContent = elementDisplayContent(element);
        container.appendChild(wrapper);
    }

    return container.innerHTML;
}

function numericAttr(node: Element, name: string, fallback: number): number {
    const raw = node.getAttribute(name);
    const parsed = raw === null ? NaN : parseFloat(raw);

    return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Reconstructs the element list from a saved template's HTML. Distinguishes three states
 * so the caller can render an appropriate UI rather than guessing from string emptiness:
 * - 'empty'    — no content saved yet, blank canvas.
 * - 'designer' — content was built by this serializer, fully editable.
 * - 'raw'      — content exists but wasn't authored here (legacy or hand-edited HTML);
 *                still renders/prints fine via renderAccessCardSide(), just not editable
 *                as discrete elements.
 */
export function deserializeSide(html: string | null | undefined): {
    format: BadgeFormat;
    elements: BadgeElement[];
} {
    if (!html || html.trim() === '') {
        return { format: 'empty', elements: [] };
    }

    const doc = new DOMParser().parseFromString(html, 'text/html');
    const nodes = Array.from(doc.querySelectorAll(`[${MARKER_ATTR}]`));

    if (nodes.length === 0) {
        return { format: 'raw', elements: [] };
    }

    const elements: BadgeElement[] = nodes.map((node, index) => {
        const type =
            (node.getAttribute('data-badge-type') as BadgeElement['type']) ||
            'text';
        const token = node.getAttribute('data-badge-token') || null;
        const shape =
            (node.getAttribute('data-badge-shape') as BadgeElement['shape']) ||
            null;
        const thickness = node.hasAttribute('data-badge-thickness')
            ? numericAttr(node, 'data-badge-thickness', 1)
            : null;
        const filled = node.hasAttribute('data-badge-filled')
            ? node.getAttribute('data-badge-filled') !== 'false'
            : null;
        const orientation = node.hasAttribute('data-badge-orientation')
            ? ((node.getAttribute(
                  'data-badge-orientation',
              ) as BadgeElement['orientation']) ?? 'horizontal')
            : null;

        return {
            id: node.getAttribute(MARKER_ATTR) || `el-${index}`,
            type,
            token,
            staticText: type === 'text' && !token ? node.textContent : null,
            shape,
            thickness,
            filled,
            orientation,
            x: numericAttr(node, 'data-badge-x', 0),
            y: numericAttr(node, 'data-badge-y', 0),
            width: numericAttr(node, 'data-badge-w', 10),
            height: numericAttr(node, 'data-badge-h', 10),
            fontSize: numericAttr(node, 'data-badge-font-size', 10),
            color: node.getAttribute('data-badge-color') || '#000000',
            fontWeight:
                node.getAttribute('data-badge-font-weight') === 'bold'
                    ? 'bold'
                    : 'normal',
            textAlign:
                (node.getAttribute(
                    'data-badge-text-align',
                ) as BadgeElement['textAlign']) || 'center',
            direction:
                (node.getAttribute(
                    'data-badge-direction',
                ) as BadgeElement['direction']) || 'rtl',
        };
    });

    return { format: 'designer', elements };
}
