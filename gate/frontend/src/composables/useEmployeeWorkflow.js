import { bulkApproveEmployees, bulkDeleteEmployees } from '../api/employees';

export function employeeStatusCellRenderer(params) {
    const cellValue = params.value;
    if (cellValue === 0) {
        return '<span class="bg-orange-200 text-orange-600 py-1 px-3 rounded text-xs">Pending</span>';
    }
    if (cellValue === 1) {
        return '<span class="bg-green-200 text-green-600 py-1 px-3 rounded text-xs">Approved</span>';
    }
    if (cellValue === 2) {
        return '<span class="bg-blue-200 text-blue-600 py-1 px-3 rounded text-xs">Printed</span>';
    }
    if (cellValue === 3) {
        return '<span class="bg-green-500 text-green-200 py-1 px-3 rounded text-xs">Collected</span>';
    }
    return '';
}

export function employeePhotoCellRenderer(params) {
    const cellValue = params.value;
    if (cellValue != null) {
        return `<img src="${cellValue}" class="object-cover w-8 h-8 rounded-full mt-2" />`;
    }
    return '<img src="/uploads/nopic.png" class="object-cover w-8 h-8 rounded-full mt-2" />';
}

function getSelectedGuestIds(getGridApi) {
    const selectedRows = getGridApi()?.getSelectedRows?.() ?? [];
    return selectedRows.map((row) => row.id);
}

export function createEmployeeWorkflowMixin({
    getGridApi,
    onRefresh,
} = {}) {
    return {
        methods: {
            deleteSelected() {
                this.$confirm.require({
                    message: 'Do you want to delete this record?',
                    header: 'Delete Confirmation',
                    icon: 'pi pi-info-circle',
                    acceptClass: 'p-button-danger',
                    accept: () => {
                        const guestIds = getSelectedGuestIds(getGridApi);
                        bulkDeleteEmployees({ guests: guestIds })
                            .then(() => onRefresh?.(this));

                        this.$toast.add({
                            severity: 'info',
                            summary: 'Confirmed',
                            detail: 'Deleted Successfully',
                            life: 3000,
                        });
                    },
                    reject: () => { },
                });
            },

            approveSelected(status) {
                this.$confirm.require({
                    message: 'Are you sure you want to proceed?',
                    header: 'Approved Confirmation',
                    icon: 'pi pi-exclamation-triangle',
                    acceptClass: 'p-button-success',
                    accept: () => {
                        const guestIds = getSelectedGuestIds(getGridApi);
                        bulkApproveEmployees({
                            guests: guestIds,
                            by: this.userName,
                            status,
                        }).then(() => onRefresh?.(this));

                        this.$toast.add({
                            severity: 'info',
                            summary: 'Confirmed',
                            detail: 'Approved Successfully',
                            life: 3000,
                        });
                    },
                    reject: () => { },
                });
            },
        },
    };
}

export function useEmployeeWorkflow(options) {
    return createEmployeeWorkflowMixin(options);
}
