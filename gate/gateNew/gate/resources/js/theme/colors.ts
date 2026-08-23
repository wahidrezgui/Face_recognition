import { PRIMARY_HEX, SURFACE_LIGHT } from './preset';

/**
 * Raw brand hex/rgb for the few consumers that can't reach Tailwind classes
 * or PrimeVue CSS vars: the detached print window, inline computed styles,
 * and the Inertia progress-bar option (needed before any CSS has loaded).
 * Sourced from preset.ts so there's one place that defines the palette.
 */
export const BRAND_COLORS = {
    primary: PRIMARY_HEX,
    primaryRgb: '138, 21, 56',
    neutralRgb: '168, 159, 149', // SURFACE_LIGHT[400]
    pageBg: SURFACE_LIGHT[50],
    headerBg: SURFACE_LIGHT[100],
    border: SURFACE_LIGHT[200],
    mutedText: SURFACE_LIGHT[500],
    text: SURFACE_LIGHT[900],
} as const;

// Mirrors severityStyles.ts's `danger` chip (red-100/red-800) for the detached
// print window, which can't reach Tailwind classes.
export const STATUS_COLORS = {
    dangerBg: '#fee2e2',
    dangerText: '#991b1b',
} as const;

export function withAlpha(rgb: string, alpha: number): string {
    return `rgba(${rgb}, ${alpha})`;
}
