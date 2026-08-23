import { trans } from 'laravel-vue-i18n';

export type TagSeverity = 'warn' | 'success' | 'info' | 'secondary' | 'danger';

export type SsoStatus = 'linked' | 'pending' | 'unlinked';

export function ssoStatus(user: {
    is_sso_linked: boolean;
    is_sso_pending: boolean;
}): SsoStatus {
    if (user.is_sso_linked) {
        return 'linked';
    }

    if (user.is_sso_pending) {
        return 'pending';
    }

    return 'unlinked';
}

export const SSO_STATUS_SEVERITY: Record<SsoStatus, TagSeverity> = {
    linked: 'success',
    pending: 'warn',
    unlinked: 'secondary',
};

export function ssoStatusLabel(status: SsoStatus): string {
    return trans(`users.sso.${status}`);
}

export function ssoStatusFilterOptions(): {
    value: string;
    labelKey: string;
}[] {
    return [
        { value: '', labelKey: 'users.filters.allSsoStatuses' },
        { value: 'linked', labelKey: 'users.sso.linked' },
        { value: 'pending', labelKey: 'users.sso.pending' },
        { value: 'unlinked', labelKey: 'users.sso.unlinked' },
    ];
}
