import { computed, onMounted, ref } from 'vue';

export type ColorMode = 'light' | 'dark';

/** Bumped so previous dark-mode experiments do not stick and break contrast. */
const STORAGE_KEY = 'gate-color-mode-v3';
const DARK_CLASS = 'dark';

const mode = ref<ColorMode>('light');
let initialized = false;

function readStoredMode(): ColorMode | null {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);

        if (stored === 'light' || stored === 'dark') {
            return stored;
        }
    } catch {
        // Private mode / blocked storage — fall through to light default.
    }

    return null;
}

function applyDocumentClass(next: ColorMode): void {
    document.documentElement.classList.toggle(DARK_CLASS, next === 'dark');
    document.documentElement.style.colorScheme = next;
}

function persist(next: ColorMode): void {
    try {
        localStorage.setItem(STORAGE_KEY, next);
        // Drop legacy keys from earlier theme passes.
        localStorage.removeItem('gate-color-mode');
        localStorage.removeItem('gate-color-mode-v2');
    } catch {
        // Ignore persistence failures — class on <html> still applies for this session.
    }
}

/**
 * Product default is light (pearl + burgundy). Dark is opt-in only.
 */
export function useColorMode() {
    if (!initialized && typeof document !== 'undefined') {
        const stored = readStoredMode();
        mode.value = stored ?? 'light';
        applyDocumentClass(mode.value);
        initialized = true;
    }

    onMounted(() => {
        if (!initialized) {
            const stored = readStoredMode();
            mode.value = stored ?? 'light';
            applyDocumentClass(mode.value);
            initialized = true;
        }
    });

    const isDark = computed(() => mode.value === 'dark');

    function setMode(next: ColorMode): void {
        mode.value = next;
        applyDocumentClass(next);
        persist(next);
    }

    function toggleMode(): void {
        setMode(mode.value === 'dark' ? 'light' : 'dark');
    }

    return { mode, isDark, setMode, toggleMode };
}

/** Apply preference before Vue mounts so the first paint is pearl, not flash-dark. */
export function initColorModeEarly(): void {
    if (typeof document === 'undefined') {
        return;
    }

    const stored = readStoredMode();
    mode.value = stored ?? 'light';
    applyDocumentClass(mode.value);
    initialized = true;
}
