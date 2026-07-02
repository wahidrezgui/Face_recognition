import { reactive } from 'vue';

const DEFAULTS = {
    visible: false,
    type: 'info',
    title: '',
    message: '',
    confirmLabel: 'موافق',
    cancelLabel: 'إلغاء',
    showCancel: true,
    showClose: true,
    showActions: true,
    confirmVariant: 'primary',
    closeOnBackdrop: false,
    loading: false,
};

export const dialogState = reactive({ ...DEFAULTS });

let pending = null;

function inferType(options) {
    if (options.type) {
        return options.type;
    }

    if (options.acceptClass?.includes('danger')) {
        return 'warning';
    }

    if (options.icon?.includes('exclamation')) {
        return 'warning';
    }

    if (options.icon?.includes('times')) {
        return 'error';
    }

    return 'info';
}

function inferConfirmVariant(options) {
    if (options.confirmVariant) {
        return options.confirmVariant;
    }

    if (options.acceptClass?.includes('danger')) {
        return 'danger';
    }

    return 'primary';
}

function open(options = {}) {
    return new Promise((resolve) => {
        pending = {
            resolve,
            onConfirm: options.onConfirm || options.accept || null,
            onCancel: options.onCancel || options.reject || null,
        };

        Object.assign(dialogState, {
            ...DEFAULTS,
            visible: true,
            type: inferType(options),
            title: options.title || options.header || '',
            message: options.message || '',
            confirmLabel: options.confirmLabel || options.acceptLabel || 'موافق',
            cancelLabel: options.cancelLabel || options.rejectLabel || 'إلغاء',
            showCancel: options.showCancel !== false,
            showClose: options.showClose !== false,
            showActions: options.showActions !== false,
            confirmVariant: inferConfirmVariant(options),
            closeOnBackdrop: options.closeOnBackdrop === true,
            loading: false,
        });
    });
}

function alert(options = {}) {
    return open({
        ...options,
        showCancel: false,
        confirmLabel: options.confirmLabel || options.acceptLabel || 'حسناً',
    });
}

function confirm(options = {}) {
    return open(options);
}

async function handleConfirm() {
    if (!pending) {
        return;
    }

    if (pending.onConfirm) {
        dialogState.loading = true;
        try {
            await pending.onConfirm();
        } catch (error) {
            dialogState.loading = false;
            return;
        } finally {
            dialogState.loading = false;
        }
    }

    close(true);
}

function handleCancel() {
    if (pending?.onCancel) {
        pending.onCancel();
    }

    close(false);
}

function close(result = false) {
    dialogState.visible = false;
    dialogState.loading = false;

    if (pending) {
        pending.resolve(result);
        pending = null;
    }
}

export const dialogService = {
    state: dialogState,
    open,
    alert,
    confirm,
    handleConfirm,
    handleCancel,
    close,
};
