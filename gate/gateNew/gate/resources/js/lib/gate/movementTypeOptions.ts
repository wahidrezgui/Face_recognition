import { trans } from 'laravel-vue-i18n';
import type { MovementType } from '@/types/gate';

export interface MovementTypeOption {
    label: string;
    value: MovementType | '';
}

export function movementTypeOptions(includeAll = false): MovementTypeOption[] {
    const options: MovementTypeOption[] = [
        { label: trans('gate.movementType.checkIn'), value: 'Check-In' },
        { label: trans('gate.movementType.checkOut'), value: 'Check-Out' },
    ];

    if (includeAll) {
        options.unshift({ label: trans('gate.plateSearch.filters.all'), value: '' });
    }

    return options;
}
