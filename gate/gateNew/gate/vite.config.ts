import inertia from '@inertiajs/vite';
import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import laravel from 'laravel-vite-plugin';
import { bunny } from 'laravel-vite-plugin/fonts';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import i18n from 'laravel-vue-i18n/vite';

export default defineConfig(({ mode }) => {
    // URL prefix the app is deployed under (e.g. "/newgate" behind a WAMP Apache
    // Alias, set via ASSET_URL in .env — the same var laravel-vite-plugin already
    // reads to prefix built asset paths). Empty in local dev. Re-exposed to client
    // code as import.meta.env.VITE_BASE_PATH via `define` below, since Vite only
    // auto-exposes `VITE_`-prefixed vars and ASSET_URL deliberately isn't one.
    const env = loadEnv(mode, process.cwd(), '');
    const basePath = (env.ASSET_URL ?? '').replace(/\/$/, '');

    // vite-plugin-pwa (workbox-build) serializes function-based `urlPattern`
    // matchers via Function.prototype.toString() and re-evaluates the resulting
    // source standalone inside the generated service worker file — that function
    // cannot close over `basePath` (or anything else from this config file); the
    // literal text `${basePath}` would end up in sw.js verbatim, undefined at
    // runtime. Built via `new Function` instead so the resolved pattern is baked
    // in as a literal string, not a variable reference.
    function sameOriginPathMatcher(pattern: string) {
        return new Function(
            'arg',
            `return arg.sameOrigin && new RegExp(${JSON.stringify(pattern)}).test(arg.url.pathname);`,
        ) as (arg: { url: URL; sameOrigin: boolean }) => boolean;
    }

    return {
        server: {
            // Node/Windows resolves "localhost" to the IPv6 loopback ([::1]) by
            // default, which some browsers/VPN network stacks can't reach even
            // though plain sockets (curl) succeed. Pin to IPv4 loopback instead.
            host: '127.0.0.1',
        },
        define: {
            'import.meta.env.VITE_BASE_PATH': JSON.stringify(basePath),
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
                            // basePath-prefixed so this still matches when deployed under a URL
                            // subdirectory (see basePath const above) — plain /^\/gate.../ would
                            // silently stop matching under e.g. /newgate/gate.
                            urlPattern: sameOriginPathMatcher(
                                `^${basePath}/gate(/.*)?$`,
                            ),
                            handler: 'NetworkFirst',
                            options: {
                                cacheName: 'gate-shell',
                                networkTimeoutSeconds: 3,
                            },
                        },
                        {
                            urlPattern: sameOriginPathMatcher(
                                `^${basePath}/uploads/`,
                            ),
                            handler: 'CacheFirst',
                            options: {
                                cacheName: 'gate-photos',
                                expiration: {
                                    maxEntries: 5000,
                                    maxAgeSeconds: 60 * 60 * 24 * 30,
                                },
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
    };
});
