import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        '../backend/vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        '../backend/storage/framework/views/*.php',
        '../backend/resources/views/**/*.blade.php',
        './src/**/*.vue',
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ['lusail', ...defaultTheme.fontFamily.sans],
            },
            colors: {
                brand: {
                    DEFAULT: '#8A1538',
                    light: '#A52D52',
                    dark: '#6E1029',
                    muted: '#F3E4E9',
                },
                accent: {
                    gold: '#C9A227',
                },
            },
            spacing: {
                sidebar: '16rem',
                'sidebar-collapsed': '4.5rem',
                18: '4.5rem',
            },
            width: {
                sidebar: '16rem',
                'sidebar-collapsed': '4.5rem',
            },
        },
    },

    plugins: [forms],

    safelist: [
        'lg:mr-sidebar',
        'lg:mr-sidebar-collapsed',
        'w-sidebar',
        'w-sidebar-collapsed',
    ],
};
