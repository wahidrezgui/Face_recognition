import { trans } from 'laravel-vue-i18n';

export type TagSeverity = 'warn' | 'success' | 'info' | 'secondary' | 'danger';

export const EMPLOYEE_STATUS_SEVERITY: Record<number, TagSeverity> = {
    0: 'warn',
    1: 'success',
    2: 'info',
    3: 'secondary',
    4: 'danger',
};

export function employeeStatusLabel(status: number): string {
    const key = `employees.status.${status}`;
    const label = trans(key);

    return label === key ? String(status) : label;
}

export function employeeStatusFilterOptions(): {
    value: string;
    labelKey: string;
}[] {
    return [
        { value: '', labelKey: 'employees.status.all' },
        { value: '0', labelKey: 'employees.status.0' },
        { value: '1', labelKey: 'employees.status.1' },
        { value: '2', labelKey: 'employees.status.2' },
        { value: '3', labelKey: 'employees.status.3' },
    ];
}

export function housingFilterOptions(): { value: string; labelKey: string }[] {
    return [
        { value: '', labelKey: 'employees.filters.allHousing' },
        { value: '1', labelKey: 'employees.filters.housingYes' },
        { value: '0', labelKey: 'employees.filters.housingNo' },
    ];
}

export const BLOOD_TYPE_OPTIONS = [
    'A+',
    'A-',
    'B+',
    'B-',
    'AB+',
    'AB-',
    'O+',
    'O-',
];

export const EMPLOYEE_PHOTO_PLACEHOLDER = '/uploads/nopic.png';

export function employeePhotoUrl(photo: string | null | undefined): string {
    if (!photo) {
        return EMPLOYEE_PHOTO_PLACEHOLDER;
    }

    return photo.startsWith('http') || photo.startsWith('/')
        ? photo
        : `/${photo}`;
}

/**
 * Several live rows (mostly zones) only have name_en populated — fall back to it so a
 * bilingual-name option doesn't render blank. Shared by any Select/TreeSelect bound to a
 * bases/zones/nationalities-shaped list.
 */
export function localizedLabel(
    item: { name_ar?: string | null; name_en?: string | null },
    locale: string,
): string {
    return (
        (locale === 'en' ? item.name_en : item.name_ar || item.name_en) ?? ''
    );
}

interface BulkActionsInput {
    filterStatus: string;
    selectedStatuses: number[];
    /** Which half of the table is currently being viewed — an employee can't be both, so
     * Deactivate only makes sense against the active view and Activate only against the
     * deactivated view. */
    isDeactivatedView: boolean;
}

export interface BulkActions {
    canApprove: boolean;
    canUnapprove: boolean;
    canCollect: boolean;
    canPrint: boolean;
    canDeactivate: boolean;
    canActivate: boolean;
}

export function resolveEmployeeBulkActions({
    filterStatus,
    selectedStatuses,
    isDeactivatedView,
}: BulkActionsInput): BulkActions {
    const statuses =
        selectedStatuses.length > 0
            ? selectedStatuses
            : filterStatus !== ''
              ? [Number(filterStatus)]
              : [];

    return {
        canApprove: statuses.some((s) => s === 0),
        canUnapprove: statuses.some((s) => s === 1),
        canCollect: statuses.some((s) => s === 2),
        // Approved, Printed, or Collected can all be (re)printed — mirrors the single-card
        // flow's only rule (`markPrinted` just rejects Pending).
        canPrint: statuses.some((s) => s === 1 || s === 2 || s === 3),
        canDeactivate: !isDeactivatedView,
        canActivate: isDeactivatedView,
    };
}

export type BulkAction =
    'delete' | 'approve' | 'unapprove' | 'collect' | 'deactivate' | 'activate';

export function buildEmployeeBulkConfirm(
    action: BulkAction,
    count: number,
): { message: string; header: string } {
    const key = `employees.bulk.confirm.${action}`;

    return {
        message: trans(key, { count: String(count) }),
        header: trans('employees.bulk.confirmHeader'),
    };
}
