import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendPublic = path.resolve(__dirname, '../backend/public');

export default defineConfig({
    envDir: path.resolve(__dirname, '../backend'),
    build: {
        emptyOutDir: true,
    },
    server: {
        port: 8081,
        strictPort: true,
        hmr: {
            host: 'localhost',
        },
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true,
                secure: false,
            },
            '/sanctum': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true,
                secure: false,
            },
            '/uploads': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true,
                secure: false,
            },
        },
    },
    plugins: [
        laravel({
            input: [
                'src/styles/app.css',
                'src/app.js',
            ],
            publicDirectory: backendPublic,
            buildDirectory: 'build',
            refresh: [
                path.resolve(__dirname, '../backend/resources/views/**'),
                path.resolve(__dirname, '../backend/routes/**'),
            ],
        }),
        vue({
            template: {
                transformAssetUrls: {
                    base: null,
                    includeAbsolute: false,
                },
            },
        }),
        VitePWA({
            registerType: 'autoUpdate',
            injectRegister: null,
            scope: '/',
            includeAssets: ['pwa-icon.svg'],
            manifest: {
                name: 'Gate — بوابة الدخول',
                short_name: 'Gate',
                description: 'نظام الدخول والخروج — بوابة التسجيل',
                start_url: '/gate',
                scope: '/',
                display: 'standalone',
                background_color: '#f5f5f4',
                theme_color: '#0f766e',
                lang: 'ar',
                dir: 'rtl',
                icons: [
                    {
                        src: '/pwa-icon.svg',
                        sizes: '192x192',
                        type: 'image/svg+xml',
                        purpose: 'any',
                    },
                    {
                        src: '/pwa-icon.svg',
                        sizes: '512x512',
                        type: 'image/svg+xml',
                        purpose: 'any',
                    },
                    {
                        src: '/pwa-icon.svg',
                        sizes: '512x512',
                        type: 'image/svg+xml',
                        purpose: 'maskable',
                    },
                ],
            },
            workbox: {
                navigateFallback: '/',
                navigateFallbackDenylist: [/^\/api/, /^\/sanctum/],
                maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,woff,ttf,webmanifest}'],
                runtimeCaching: [
                    {
                        urlPattern: /^\/uploads\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'gate-uploads',
                            expiration: {
                                maxEntries: 300,
                                maxAgeSeconds: 60 * 60 * 24 * 7,
                            },
                        },
                    },
                    {
                        urlPattern: ({ request }) => request.mode === 'navigate',
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'gate-pages',
                            networkTimeoutSeconds: 3,
                        },
                    },
                ],
            },
            devOptions: {
                enabled: false,
            },
        }),
    ],
    test: {
        environment: 'node',
        setupFiles: ['./src/tests/setup.js'],
        include: ['src/tests/**/*.test.js'],
    },
    resolve: {
        alias: {
            vue: 'vue/dist/vue.esm-bundler.js',
        },
    },
});
