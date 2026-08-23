<script setup lang="ts">
import { Moon, Sun } from '@lucide/vue';
import { trans } from 'laravel-vue-i18n';
import AppButton from '@/components/AppButton.vue';
import { useColorMode } from '@/composables/useColorMode';
import { useLocale } from '@/composables/useLocale';
import { cn } from '@/lib/utils';

interface Props {
    maxWidth?: 'md' | '2xl';
}

const props = withDefaults(defineProps<Props>(), {
    maxWidth: 'md',
});

const { locale, setLocale } = useLocale();
const { isDark, toggleMode } = useColorMode();

function toggleLocale() {
    setLocale(locale.value === 'ar' ? 'en' : 'ar');
}
</script>

<template>
    <div
        class="min-h-screen bg-gradient-to-b from-surface-50 via-surface-50 to-surface-100 px-4 py-6 text-surface-900 dark:to-surface-0"
    >
        <div class="fixed start-4 top-4 z-10 flex items-center gap-2">
            <AppButton
                severity="secondary"
                outlined
                rounded
                size="small"
                class="bg-surface-0! dark:bg-surface-900!"
                :aria-label="
                    isDark
                        ? trans('header.toggleLight')
                        : trans('header.toggleDark')
                "
                @click="toggleMode"
            >
                <Sun v-if="isDark" :size="16" />
                <Moon v-else :size="16" />
            </AppButton>
            <AppButton
                severity="secondary"
                outlined
                rounded
                size="small"
                class="bg-surface-0! dark:bg-surface-900!"
                :aria-label="trans('common.language')"
                @click="toggleLocale"
            >
                {{
                    locale === 'ar'
                        ? trans('common.english')
                        : trans('common.arabic')
                }}
            </AppButton>
        </div>

        <div class="text-center">
            <img
                src="/armedforces.png"
                :alt="trans('login.logoAlt')"
                class="mx-auto mt-2 w-28 sm:w-36"
            />
        </div>

        <div
            :class="
                cn(
                    'mx-auto mt-8 rounded-2xl border border-surface-200 bg-surface-0 p-8 shadow-sm sm:p-10',
                    props.maxWidth === '2xl'
                        ? 'max-w-2xl'
                        : 'max-w-md sm:max-w-lg',
                )
            "
        >
            <slot />
        </div>
    </div>
</template>
