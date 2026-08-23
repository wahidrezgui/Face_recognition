import { createInertiaApp } from '@inertiajs/vue3';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { i18nVue } from 'laravel-vue-i18n';
import PrimeVue from 'primevue/config';
import ConfirmationService from 'primevue/confirmationservice';
import ToastService from 'primevue/toastservice';
import Tooltip from 'primevue/tooltip';
import { registerSW } from 'virtual:pwa-register';
import { createApp, h } from 'vue';
import 'vue3-side-panel/dist/vue3-side-panel.css';
import { initColorModeEarly } from '@/composables/useColorMode';
import { BRAND_COLORS } from '@/theme/colors';
import { AppPreset } from '@/theme/preset';

// Site-wide registration is harmless — the service worker only actively
// caches/intercepts the gate kiosk routes (see vite.config.ts), everything
// else passes straight through to the network as before.
registerSW({ immediate: true });

initColorModeEarly();

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    resolve: (name) =>
        // TypeScript overload mismatch: ensure the resolver returns a component or a promise resolving to one.
        // Wrap resolvePageComponent in an async function so the return type is Promise<DefineComponent>.
        (async () =>
            (await resolvePageComponent(
                `./pages/${name}.vue`,
                import.meta.glob('./pages/**/*.vue'),
            )) as any)(),
    setup({ el, App, props, plugin }) {
        const app = createApp({
            render: () => h(App, props),
        });

        app.use(plugin);

        app.use(PrimeVue, {
            theme: {
                preset: AppPreset,
                options: {
                    // Class-based so useColorMode can override OS preference.
                    darkModeSelector: '.dark',
                    cssLayer: {
                        name: 'primevue',
                        order: 'base, primevue',
                    },
                },
            },
        });
        app.use(ToastService);
        app.use(ConfirmationService);
        app.directive('tooltip', Tooltip);

        app.use(i18nVue, {
            resolve: async (lang: string) => {
                const langs = import.meta.glob('../../lang/*.json', {
                    eager: false,
                });

                const key = Object.keys(langs).find((key) =>
                    key.endsWith(`${lang}.json`),
                );

                if (!key) {
                    throw new Error(`Missing language file: ${lang}`);
                }

                return await langs[key]();
            },
        });

        app.mount(el);
    },
    progress: {
        // Follows the active primary token (falls back if vars not ready yet).
        color: `var(--p-primary-color, ${BRAND_COLORS.primary})`,
    },
});
