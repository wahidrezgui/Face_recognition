import type { BadgeElement, BadgeElementType, BadgeImageShape } from '@/types';

export const MIN_ELEMENT_SIZE_MM = 5;

let counter = 0;

function nextId(): string {
    counter += 1;

    return `el-${Date.now()}-${counter}`;
}

function baseDefaults(
    type: BadgeElementType,
): Omit<
    BadgeElement,
    | 'id'
    | 'type'
    | 'token'
    | 'staticText'
    | 'shape'
    | 'thickness'
    | 'filled'
    | 'orientation'
> {
    return {
        x: 5,
        y: 5,
        width: type === 'text' ? 40 : 20,
        height: type === 'text' ? 10 : 20,
        fontSize: 10,
        color: '#000000',
        fontWeight: 'normal',
        textAlign: 'center',
        direction: 'rtl',
    };
}

export function createTextElement(token: string | null = null): BadgeElement {
    return {
        id: nextId(),
        type: 'text',
        token,
        staticText: token ? null : '',
        shape: null,
        thickness: null,
        filled: null,
        orientation: 'horizontal',
        ...baseDefaults('text'),
    };
}

export function createImageElement(
    token: string,
    shape: BadgeImageShape,
): BadgeElement {
    return {
        id: nextId(),
        type: 'image',
        token,
        staticText: null,
        shape,
        thickness: null,
        filled: null,
        orientation: null,
        ...baseDefaults('image'),
    };
}

export function createZonesElement(): BadgeElement {
    return {
        id: nextId(),
        type: 'zones',
        token: 'zones',
        staticText: null,
        shape: null,
        thickness: null,
        filled: null,
        orientation: null,
        ...baseDefaults('zones'),
        width: 60,
        height: 15,
    };
}

export function createRectangleElement(): BadgeElement {
    return {
        id: nextId(),
        type: 'rectangle',
        token: null,
        staticText: null,
        shape: null,
        thickness: 1,
        filled: true,
        orientation: null,
        ...baseDefaults('rectangle'),
        color: '#3B82F6',
        width: 30,
        height: 15,
    };
}

export function createLineElement(): BadgeElement {
    return {
        id: nextId(),
        type: 'line',
        token: null,
        staticText: null,
        shape: null,
        thickness: 1,
        filled: null,
        orientation: 'horizontal',
        ...baseDefaults('line'),
        color: '#000000',
        width: 40,
        height: MIN_ELEMENT_SIZE_MM,
    };
}

/** Clamps a position/size pair so the element never extends past the card bounds. */
export function clampToCard(
    element: BadgeElement,
    cardWidth: number,
    cardHeight: number,
): BadgeElement {
    const width = Math.max(
        MIN_ELEMENT_SIZE_MM,
        Math.min(element.width, cardWidth),
    );
    const height = Math.max(
        MIN_ELEMENT_SIZE_MM,
        Math.min(element.height, cardHeight),
    );
    const x = Math.max(0, Math.min(element.x, cardWidth - width));
    const y = Math.max(0, Math.min(element.y, cardHeight - height));

    return { ...element, x, y, width, height };
}
