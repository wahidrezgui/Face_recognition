export const ZONE_PATTERN_TYPES = ['none', 'line', 'cross'] as const;
export type ZonePatternType = (typeof ZONE_PATTERN_TYPES)[number];

export interface ZoneStyle {
    color: string;
    pattern_type: string;
    pattern_color: string | null;
}

const NAMED_COLORS: Record<string, string> = {
    green: '#008000',
    red: '#FF0000',
    blue: '#0000FF',
    yellow: '#FFFF00',
    white: '#FFFFFF',
    black: '#000000',
    orange: '#FFA500',
    purple: '#800080',
    gray: '#808080',
    grey: '#808080',
};

const AUTO_CONTRAST_COLORS = new Set(['#020202', '#87CEEB']);

const DEFAULT_ZONE_COLOR = '#3B82F6';
const DEFAULT_PATTERN_COLOR = '#FFFFFF';

export function normalizeZoneColor(color: string | null | undefined): string {
    if (!color) {
        return DEFAULT_ZONE_COLOR;
    }

    const trimmed = String(color).trim();

    if (!trimmed) {
        return DEFAULT_ZONE_COLOR;
    }

    const named = NAMED_COLORS[trimmed.toLowerCase()];

    if (named) {
        return named;
    }

    if (trimmed.startsWith('#')) {
        if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
            const [, r, g, b] = trimmed;

            return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
        }

        return trimmed.toUpperCase();
    }

    if (/^[0-9a-fA-F]{6}$/.test(trimmed)) {
        return `#${trimmed.toUpperCase()}`;
    }

    return trimmed;
}

export function normalizeZone(zone: Partial<ZoneStyle> = {}): ZoneStyle {
    const rawPattern = zone.pattern_type ?? 'none';
    const patternType = (ZONE_PATTERN_TYPES as readonly string[]).includes(
        rawPattern,
    )
        ? rawPattern
        : 'none';

    return {
        color: normalizeZoneColor(zone.color),
        pattern_type: patternType,
        pattern_color:
            patternType === 'none'
                ? null
                : normalizeZoneColor(
                      zone.pattern_color || DEFAULT_PATTERN_COLOR,
                  ),
    };
}

export function hasUserPattern(zone: Partial<ZoneStyle>): boolean {
    return normalizeZone(zone).pattern_type !== 'none';
}

export function needsAutoContrastLine(
    color: string | null | undefined,
): boolean {
    if (!color) {
        return false;
    }

    if (color.startsWith('rgb(')) {
        const rgb = color.match(/\d+/g);

        if (rgb && rgb.length >= 3) {
            const brightness =
                (parseInt(rgb[0], 10) * 299 +
                    parseInt(rgb[1], 10) * 587 +
                    parseInt(rgb[2], 10) * 114) /
                1000;

            return brightness > 180;
        }

        return false;
    }

    return AUTO_CONTRAST_COLORS.has(normalizeZoneColor(color));
}

export function needsSwatchBorder(zone: Partial<ZoneStyle>): boolean {
    const normalized = normalizeZone(zone);

    if (hasUserPattern(normalized)) {
        return false;
    }

    const lightColors = new Set([
        '#FFFFFF',
        '#FFFF00',
        '#00FFFF',
        '#FFCC00',
        '#FFF',
        '#FACC15',
    ]);

    return lightColors.has(normalizeZoneColor(normalized.color));
}

export function buildZoneSvgLines(
    zone: Partial<ZoneStyle>,
    { width = 25, height = 20, strokeWidth = 3 } = {},
): string {
    const normalized = normalizeZone(zone);
    let lines = '';

    if (
        normalized.pattern_type === 'line' ||
        normalized.pattern_type === 'cross'
    ) {
        const stroke = normalized.pattern_color;
        lines += `<line x1="0" y1="${height}" x2="${width}" y2="0" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round"/>`;

        if (normalized.pattern_type === 'cross') {
            lines += `<line x1="0" y1="0" x2="${width}" y2="${height}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round"/>`;
        }
    } else if (needsAutoContrastLine(normalized.color)) {
        lines += `<line x1="0" y1="${height}" x2="${width}" y2="0" stroke="white" stroke-width="${strokeWidth}" stroke-linecap="round"/>`;
    }

    return lines;
}

export function buildZoneSvgMarkup(
    zone: Partial<ZoneStyle>,
    { width = 25, height = 20, strokeWidth = 3 } = {},
): string {
    const normalized = normalizeZone(zone);
    const lines = buildZoneSvgLines(normalized, { width, height, strokeWidth });

    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true"><rect width="${width}" height="${height}" fill="${normalized.color}"/>${lines}</svg>`;
}

export function defaultZoneStyleFields(): ZoneStyle {
    return {
        color: DEFAULT_ZONE_COLOR,
        pattern_type: 'none',
        pattern_color: DEFAULT_PATTERN_COLOR,
    };
}
