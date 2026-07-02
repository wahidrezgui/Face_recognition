import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendPublic = path.resolve(__dirname, '../backend/public');

export default defineConfig({
    server: {
        hmr: {
            host: 'localhost',
        },
        proxy: {
            '/api': {
                target: 'http://gate.local',
                changeOrigin: true,
                secure: false,
            },
            '/sanctum': {
                target: 'http://gate.local',
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
    ],
    resolve: {
        alias: {
            vue: 'vue/dist/vue.esm-bundler.js',
        },
    },
});
