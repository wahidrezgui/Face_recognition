import { createI18n } from 'vue-i18n';
import ar from './locales/ar.json';
import en from './locales/en.json';

export const SUPPORTED_LOCALES = ['ar', 'en'];
export const LOCALE_STORAGE_KEY = 'gate_locale';
const RTL_LOCALES = new Set(['ar']);

function readStoredLocale() {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return SUPPORTED_LOCALES.includes(stored) ? stored : 'ar';
}

export function applyDocumentDirection(locale) {
    document.documentElement.lang = locale;
    document.documentElement.dir = RTL_LOCALES.has(locale) ? 'rtl' : 'ltr';
}

const i18n = createI18n({
    legacy: false,
    globalInjection: true,
    locale: readStoredLocale(),
    fallbackLocale: 'ar',
    messages: { ar, en },
});

export function setLocale(locale) {
    if (!SUPPORTED_LOCALES.includes(locale)) {
        return;
    }
    i18n.global.locale.value = locale;
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    applyDocumentDirection(locale);
}

applyDocumentDirection(i18n.global.locale.value);

export default i18n;
