import { ref, computed } from 'vue';

const STORAGE_KEY = 'gate-sidebar-collapsed';

const isOpen = ref(false);
const isCollapsed = ref(false);

function loadCollapsedState() {
    try {
        isCollapsed.value = localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
        isCollapsed.value = false;
    }
}

function persistCollapsedState() {
    try {
        localStorage.setItem(STORAGE_KEY, String(isCollapsed.value));
    } catch {
        // ignore
    }
}

loadCollapsedState();

export function useSidebar() {
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
        persistCollapsedState();
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
