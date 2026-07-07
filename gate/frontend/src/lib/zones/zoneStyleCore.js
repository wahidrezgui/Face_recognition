export const ZONE_PATTERN_TYPES = ['none', 'line', 'cross'];

export const ZONE_PATTERN_OPTIONS = [
  { value: 'none', label: 'بدون' },
  { value: 'line', label: 'خط' },
  { value: 'cross', label: 'تقاطع' },
];

const NAMED_COLORS = {
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

export function normalizeZoneColor(color) {
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

export function normalizeZone(zone = {}) {
  const rawPattern = zone.pattern_type ?? 'none';
  const patternType = ZONE_PATTERN_TYPES.includes(rawPattern) ? rawPattern : 'none';

  return {
    color: normalizeZoneColor(zone.color),
    pattern_type: patternType,
    pattern_color: patternType === 'none'
      ? null
      : normalizeZoneColor(zone.pattern_color || DEFAULT_PATTERN_COLOR),
  };
}

export function hasUserPattern(zone) {
  const normalized = normalizeZone(zone);
  return normalized.pattern_type !== 'none';
}

export function needsAutoContrastLine(color) {
  if (!color) {
    return false;
  }

  if (color.startsWith('rgb(')) {
    const rgb = color.match(/\d+/g);
    if (rgb && rgb.length >= 3) {
      const brightness = (parseInt(rgb[0], 10) * 299
        + parseInt(rgb[1], 10) * 587
        + parseInt(rgb[2], 10) * 114) / 1000;
      return brightness > 180;
    }

    return false;
  }

  const normalized = normalizeZoneColor(color);
  return AUTO_CONTRAST_COLORS.has(normalized);
}

export function needsSwatchBorder(zone) {
  const normalized = normalizeZone(zone);
  if (hasUserPattern(normalized)) {
    return false;
  }

  const lightColors = new Set(['#FFFFFF', '#FFFF00', '#00FFFF', '#FFCC00', '#FFF', '#FACC15']);
  return lightColors.has(normalizeZoneColor(normalized.color));
}

function diagonalGradient(color, width, height) {
  const thickness = Math.max(2, Math.round(Math.min(width, height) * 0.12));
  const center = 50;
  const edge = thickness / 2;

  return `linear-gradient(to top right, transparent calc(${center}% - ${edge}px), ${color} calc(${center}% - ${edge}px), ${color} calc(${center}% + ${edge}px), transparent calc(${center}% + ${edge}px))`;
}

export function buildZoneCssBackground(zone) {
  const normalized = normalizeZone(zone);
  const layers = [];

  if (normalized.pattern_type === 'line' || normalized.pattern_type === 'cross') {
    const stroke = normalized.pattern_color;
    layers.push(diagonalGradient(stroke, 25, 20));

    if (normalized.pattern_type === 'cross') {
      layers.push('linear-gradient(to top left, transparent calc(50% - 1.5px), '
        + `${stroke} calc(50% - 1.5px), ${stroke} calc(50% + 1.5px), transparent calc(50% + 1.5px))`);
    }
  } else if (needsAutoContrastLine(normalized.color)) {
    layers.push(diagonalGradient('#FFFFFF', 25, 20));
  }

  layers.push(normalized.color);

  return layers.join(', ');
}

export function buildZoneSvgLines(zone, { width = 25, height = 20, strokeWidth = 3 } = {}) {
  const normalized = normalizeZone(zone);
  let lines = '';

  if (normalized.pattern_type === 'line' || normalized.pattern_type === 'cross') {
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

export function buildZoneSvgMarkup(zone, { width = 25, height = 20, strokeWidth = 3 } = {}) {
  const normalized = normalizeZone(zone);
  const lines = buildZoneSvgLines(normalized, { width, height, strokeWidth });

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true"><rect width="${width}" height="${height}" fill="${normalized.color}"/>${lines}</svg>`;
}

export function defaultZoneStyleFields() {
  return {
    color: DEFAULT_ZONE_COLOR,
    pattern_type: 'none',
    pattern_color: DEFAULT_PATTERN_COLOR,
  };
}
