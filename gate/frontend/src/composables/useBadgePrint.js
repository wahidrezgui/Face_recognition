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
                        accountId: this.accountId,
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
                        accountId: this.accountId,
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
                        accountId: this.accountId,
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
                        accountId: this.accountId,
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
