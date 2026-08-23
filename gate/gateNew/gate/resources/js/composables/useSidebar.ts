import { computed, onMounted, ref } from 'vue';

const STORAGE_KEY = 'gate-sidebar-collapsed';

const isOpen = ref(false);
const isCollapsed = ref(false);
let collapsedStateLoaded = false;

export function useSidebar() {
    // Reading localStorage must happen client-side only (onMounted never runs
    // during Inertia SSR), otherwise this composable crashes the server render.
    onMounted(() => {
        if (collapsedStateLoaded) {
            return;
        }

        collapsedStateLoaded = true;

        try {
            isCollapsed.value = localStorage.getItem(STORAGE_KEY) === 'true';
        } catch {
            isCollapsed.value = false;
        }
    });

    const mainShellClass = computed(() => ({
        'is-sidebar-collapsed': isCollapsed.value,
    }));

    function open() {
        isOpen.value = true;
    }

    function close() {
        isOpen.value = false;
    }

    function toggleMobile() {
        isOpen.value = !isOpen.value;
    }

    function toggleCollapsed() {
        isCollapsed.value = !isCollapsed.value;

        try {
            localStorage.setItem(STORAGE_KEY, String(isCollapsed.value));
        } catch {
            // ignore
        }
    }

    return {
        isOpen,
        isCollapsed,
        mainShellClass,
        open,
        close,
        toggleMobile,
        toggleCollapsed,
    };
}
