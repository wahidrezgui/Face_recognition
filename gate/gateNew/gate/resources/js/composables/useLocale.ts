import { router, usePage } from '@inertiajs/vue3';
import { loadLanguageAsync } from 'laravel-vue-i18n';
import { computed } from 'vue';
import { update as updateLocale } from '@/routes/locale';

export type Locale = 'en' | 'ar';

const RTL_LOCALES = new Set<Locale>(['ar']);

function applyDocumentDirection(locale: Locale) {
    document.documentElement.lang = locale;
    document.documentElement.dir = RTL_LOCALES.has(locale) ? 'rtl' : 'ltr';
}

export function useLocale() {
    const page = usePage<{ locale: Locale }>();

    const locale = computed(() => page.props.locale);

    async function setLocale(next: Locale) {
        if (next === locale.value) {
            return;
        }

        await loadLanguageAsync(next);
        applyDocumentDirection(next);

        router.post(
            updateLocale.url(),
            { locale: next },
            { preserveScroll: true, preserveState: true },
        );
    }

    return { locale, setLocale };
}
