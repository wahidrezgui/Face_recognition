<template>
    <AppDialog
        :model-value="dialogState.visible"
        :type="dialogState.type"
        :title="dialogState.title"
        :message="dialogState.message"
        :confirm-label="dialogState.confirmLabel"
        :cancel-label="dialogState.cancelLabel"
        :show-cancel="dialogState.showCancel"
        :show-close="dialogState.showClose"
        :show-actions="dialogState.showActions"
        :confirm-variant="dialogState.confirmVariant"
        :close-on-backdrop="dialogState.closeOnBackdrop"
        :loading="dialogState.loading"
        @confirm="dialogService.handleConfirm"
        @cancel="dialogService.handleCancel"
    />
</template>

<script>
import AppDialog from './AppDialog.vue';
import { dialogService, dialogState } from '../../services/dialogService';

export default {
    name: 'AppDialogHost',
    components: {
        AppDialog,
    },
    setup() {
        return {
            dialogService,
            dialogState,
        };
    },
};
</script>
