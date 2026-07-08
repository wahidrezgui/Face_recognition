import {
    printBackBadges,
    printCombinedBadges,
    printFrontBadges,
    printSingleCombinedBadge,
} from '../lib/badges/badgePrintCore';

function getSelectedGuestIds(getGridApi) {
    const selectedRows = getGridApi()?.getSelectedRows?.() ?? [];
    return selectedRows.map((row) => row.id);
}

function clearPrintLoading(vm) {
    vm.isLoading = false;
}

export function createBadgePrintMixin({
    getGridApi,
    onAfterBulkPrint,
    onAfterSinglePrint,
    onSinglePrintError,
    combinedPrintOptions = {},
} = {}) {
    return {
        methods: {
            async bulkprintCombined() {
                this.isLoading = true;
                const guestIds = getSelectedGuestIds(getGridApi);

                try {
                    await printCombinedBadges(guestIds, {
                        userName: this.userName,
                        ...combinedPrintOptions,
                        onRefresh: (guestIds) => onAfterBulkPrint?.(this, guestIds),
                    });
                } catch (error) {
                    console.error('Badge print error:', error);
                    this.$toast?.add({
                        severity: 'error',
                        summary: 'خطأ في الطباعة',
                        detail: error?.message || 'تعذر طباعة البطاقة',
                        life: 5000,
                    });
                } finally {
                    clearPrintLoading(this);
                }
            },

            async bulkprint() {
                this.isLoading = true;
                const guestIds = getSelectedGuestIds(getGridApi);

                try {
                    await printFrontBadges(guestIds, {
                        userName: this.userName,
                        plateSeparator: ' (2) ',
                        onRefresh: (guestIds) => onAfterBulkPrint?.(this, guestIds),
                    });
                } catch (error) {
                    console.error('Badge print error:', error);
                    this.$toast?.add({
                        severity: 'error',
                        summary: 'خطأ في الطباعة',
                        detail: error?.message || 'تعذر طباعة البطاقة',
                        life: 5000,
                    });
                } finally {
                    clearPrintLoading(this);
                }
            },

            async bulkprint2() {
                this.isLoading = true;
                const guestIds = getSelectedGuestIds(getGridApi);

                try {
                    await printBackBadges(guestIds, {
                        userName: this.userName,
                        onRefresh: (guestIds) => onAfterBulkPrint?.(this, guestIds),
                    });
                } catch (error) {
                    console.error('Badge print error:', error);
                    this.$toast?.add({
                        severity: 'error',
                        summary: 'خطأ في الطباعة',
                        detail: error?.message || 'تعذر طباعة البطاقة',
                        life: 5000,
                    });
                } finally {
                    clearPrintLoading(this);
                }
            },

            async printSingleBadge(employeeId) {
                this.isLoading = true;

                try {
                    await printSingleCombinedBadge(employeeId, {
                        userName: this.userName,
                    });
                    onAfterSinglePrint?.(this, employeeId);
                } catch (error) {
                    console.error('Print error:', error);
                    this.$toast?.add({
                        severity: 'error',
                        summary: 'خطأ في الطباعة',
                        detail: error?.message || 'تعذر طباعة البطاقة',
                        life: 5000,
                    });
                    onSinglePrintError?.(this, error);
                } finally {
                    clearPrintLoading(this);
                }
            },
        },
    };
}

export function useBadgePrint(options) {
    return createBadgePrintMixin(options);
}
