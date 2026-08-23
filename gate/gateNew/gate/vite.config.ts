import inertia from '@inertiajs/vite';
import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import laravel from 'laravel-vite-plugin';
import { bunny } from 'laravel-vite-plugin/fonts';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import i18n from 'laravel-vue-i18n/vite';

export default defineConfig({
    server: {
        // Node/Windows resolves "localhost" to the IPv6 loopback ([::1]) by
        // default, which some browsers/VPN network stacks can't reach even
        // though plain sockets (curl) succeed. Pin to IPv4 loopback instead.
        host: '127.0.0.1',
    },
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.ts'],
            refresh: true,
            fonts: [
                bunny('Instrument Sans', {
                    weights: [400, 500, 600],
                }),
            ],
        }),
        inertia(),
        tailwindcss(),
        vue({
            template: {
                transformAssetUrls: {
                    base: null,
                    includeAbsolute: false,
                },
            },
        }),
        VitePWA({
            // No index.html to inject into (Laravel/Inertia renders via Blade) —
            // registered manually from app.ts via virtual:pwa-register instead.
            injectRegister: false,
            registerType: 'autoUpdate',
            manifest: false,
            workbox: {
                // The gate kiosk is the only page that needs to keep working with
                // zero network — cache its shell (NetworkFirst, falls back to the
                // last-cached response when offline) and employee photos.
                runtimeCaching: [
                    {
                        urlPattern: ({ url, sameOrigin }) => sameOrigin && /^\/gate(\/.*)?$/.test(url.pathname),
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'gate-shell',
                            networkTimeoutSeconds: 3,
                        },
                    },
                    {
                        urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/uploads/'),
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'gate-photos',
                            expiration: { maxEntries: 5000, maxAgeSeconds: 60 * 60 * 24 * 30 },
                            cacheableResponse: { statuses: [0, 200] },
                        },
                    },
                ],
            },
        }),
        i18n(),
        wayfinder({
            formVariants: true,
        }),
    ],
});
