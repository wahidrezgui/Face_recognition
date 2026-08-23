import { definePreset, palette } from '@primevue/themes';
import Aura from '@primevue/themes/aura';

/**
 * MoD Gate UI — Al Adaam burgundy (#8A1538) on pearl white.
 *
 * Light (default): pearl page #f6f3ef, white cards, soft-black type #1f1b19.
 * Dark (opt-in): warm charcoal — scale inverted like Aura so text utilities stay readable.
 */
export const PRIMARY_HEX = '#8A1538';

export const SURFACE_LIGHT = {
    0: '#ffffff',
    50: '#f6f3ef',
    100: '#efebe6',
    200: '#e4dfd8',
    300: '#d2cbc2',
    400: '#a89f95',
    500: '#7c746c',
    600: '#5c564f',
    700: '#45403b',
    800: '#2f2b28',
    900: '#1f1b19',
    950: '#141211',
} as const;

export const SURFACE_DARK = {
    0: '#1f1b19',
    50: '#141211',
    100: '#2a2623',
    200: '#3a3531',
    300: '#524c47',
    400: '#7c746c',
    500: '#a89f95',
    600: '#c4bbb0',
    700: '#d2cbc2',
    800: '#e4dfd8',
    900: '#efebe6',
    950: '#0c0a09',
} as const;

const primary = palette(PRIMARY_HEX);

export const AppPreset = definePreset(Aura, {
    semantic: {
        primary,
        colorScheme: {
            light: {
                surface: SURFACE_LIGHT,
            },
            dark: {
                surface: SURFACE_DARK,
                // Aura's own dark-mode component tokens (Card, Select/Dialog
                // overlays, menu hover states, form fields) assume a surface
                // scale where higher indices are darker — the opposite of ours
                // above, which is deliberately inverted so bare `bg-surface-0` /
                // `text-surface-900` utilities read correctly in both schemes
                // without a `dark:` prefix. Re-point PrimeVue's own aliases to
                // the equivalent index in our inverted scale so native
                // components (not just our own markup) render correctly dark.
                content: {
                    background: '{surface.0}',
                    hoverBackground: '{surface.100}',
                    borderColor: '{surface.200}',
                },
                text: {
                    color: '{surface.900}',
                    hoverColor: '{surface.900}',
                },
                overlay: {
                    select: {
                        background: '{surface.0}',
                        borderColor: '{surface.200}',
                    },
                    popover: {
                        background: '{surface.0}',
                        borderColor: '{surface.200}',
                    },
                    modal: {
                        background: '{surface.0}',
                        borderColor: '{surface.200}',
                    },
                },
                navigation: {
                    item: {
                        focusBackground: '{surface.100}',
                        activeBackground: '{surface.100}',
                    },
                },
                list: {
                    option: {
                        focusBackground: '{surface.100}',
                    },
                },
                formField: {
                    background: '{surface.0}',
                    disabledBackground: '{surface.200}',
                    filledBackground: '{surface.100}',
                    filledHoverBackground: '{surface.100}',
                    filledFocusBackground: '{surface.100}',
                    borderColor: '{surface.300}',
                    color: '{surface.900}',
                },
            },
        },
    },
});
