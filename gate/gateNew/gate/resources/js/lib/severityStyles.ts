export type Severity =
    'primary' | 'success' | 'info' | 'warn' | 'danger' | 'secondary';

interface SeverityStyle {
    /** Icon circle / chip / avatar tint (bg+text) — stat cards, table issue cells. */
    chip: string;
    /** Border-only accent — stat card border. */
    border: string;
    /** Box container border+bg for custom markup a `<Message>` can't hold (e.g. checkbox+label). */
    banner: string;
    /** Higher-contrast text sitting inside a `banner` box. */
    bannerText: string;
}

// A small semantic palette (mirroring PrimeVue's own severities) so every
// status indicator across the app reads as one theme instead of ad-hoc
// colors invented per file. Conventional hues are kept on purpose — this is
// an access-control app where danger=red / warn=amber / success=green are
// safety-critical conventions, not a place to re-skin with the brand color.
export const SEVERITY_STYLES: Record<Severity, SeverityStyle> = {
    primary: {
        chip: 'bg-primary-600 text-white',
        border: 'border-primary-200 dark:border-primary-800',
        banner: 'border border-primary-200 bg-primary-50 dark:border-primary-800 dark:bg-primary-950/30',
        bannerText: 'text-primary-800 dark:text-primary-300',
    },
    success: {
        chip: 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300',
        border: 'border-green-200 dark:border-green-800',
        banner: 'border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30',
        bannerText: 'text-green-800 dark:text-green-300',
    },
    info: {
        chip: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
        border: 'border-sky-200 dark:border-sky-800',
        banner: 'border border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/30',
        bannerText: 'text-sky-800 dark:text-sky-300',
    },
    warn: {
        chip: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
        border: 'border-amber-200 dark:border-amber-800',
        banner: 'border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30',
        bannerText: 'text-amber-800 dark:text-amber-300',
    },
    danger: {
        chip: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300',
        border: 'border-red-200 dark:border-red-800',
        banner: 'border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30',
        bannerText: 'text-red-800 dark:text-red-300',
    },
    secondary: {
        chip: 'bg-surface-100 text-surface-700 dark:bg-surface-800 dark:text-surface-300',
        border: 'border-surface-200 dark:border-surface-700',
        banner: 'border border-surface-200 bg-surface-50 dark:border-surface-700 dark:bg-surface-800',
        bannerText: 'text-surface-800 dark:text-surface-200',
    },
};
