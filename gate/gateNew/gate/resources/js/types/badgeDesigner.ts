export type BadgeElementType =
    'text' | 'image' | 'zones' | 'rectangle' | 'line';
export type BadgeImageShape = 'circle' | 'square' | 'qr';
export type BadgeFormat = 'empty' | 'designer' | 'raw';

export interface BadgeElement {
    id: string;
    type: BadgeElementType;
    /** Bound `{{token}}` name, or null for static text. */
    token: string | null;
    /** Only meaningful for type 'text' when token is null. */
    staticText: string | null;
    /** Only meaningful for type 'image'. */
    shape: BadgeImageShape | null;
    /**
     * Only meaningful for type 'line' (stroke thickness) and 'rectangle' when `filled` is
     * false (border thickness). Kept independent of `height` (the draggable bounding box) so
     * a line can render thinner than MIN_ELEMENT_SIZE_MM while still keeping a
     * comfortably-sized handle to select/drag.
     */
    thickness: number | null;
    /** Only meaningful for type 'rectangle': solid fill (true) vs outline-only (false). */
    filled: boolean | null;
    /** Only meaningful for types 'text' and 'line'. */
    orientation: 'horizontal' | 'vertical' | null;
    /** All position/size fields are in millimeters. */
    x: number;
    y: number;
    width: number;
    height: number;
    fontSize: number;
    color: string;
    fontWeight: 'normal' | 'bold';
    textAlign: 'left' | 'center' | 'right';
    direction: 'ltr' | 'rtl';
}

export interface BadgeSide {
    format: BadgeFormat;
    elements: BadgeElement[];
    width: number;
    height: number;
    rawContent: string | null;
}

export interface BadgeSideRecord {
    content: string;
    width: number;
    height: number;
    format: BadgeFormat;
}

export interface BadgeDesignerLoadResponse {
    front: BadgeSideRecord | null;
    back: BadgeSideRecord | null;
}

export interface BadgeToken {
    key: string;
    label_ar: string;
    label_en: string;
    group: 'text' | 'image' | 'special';
}

/** A flat "pick a company" option for the Company Access Badge page — unlike
 * DepartmentNode, a company has no children of its own here. */
export interface BadgeCompanyOption {
    id: number;
    key: number;
    label: string;
    name_ar: string;
    name_en: string;
}
