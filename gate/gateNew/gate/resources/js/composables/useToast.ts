import { useToast as usePrimeToast } from 'primevue/usetoast';

export type ToastSeverity = 'success' | 'error' | 'info' | 'warn';

export function useToast() {
    const toast = usePrimeToast();

    function add(
        severity: ToastSeverity,
        detail: string,
        summary?: string,
        life = 3000,
    ) {
        toast.add({ severity, summary, detail, life });
    }

    function success(detail: string, summary?: string, life?: number) {
        add('success', detail, summary, life);
    }

    function error(detail: string, summary?: string, life?: number) {
        add('error', detail, summary, life);
    }

    return { success, error };
}
