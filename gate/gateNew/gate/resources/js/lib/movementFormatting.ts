interface MovementDateTimeInput {
    mvdate?: string | null;
    mvtime?: string | null;
}

/**
 * mvdate/mvtime arrive as separate raw fields (mvdate often an ISO datetime with a
 * meaningless time-of-day component). Combines them into one locale-formatted string,
 * shared by every place that lists employee movements (employee panel, report detail).
 */
export function formatMovementDateTime(
    movement: MovementDateTimeInput,
    locale: string,
): string {
    const datePart = movement.mvdate?.split('T')[0];

    if (!datePart) {
        return movement.mvtime ?? '';
    }

    const date = new Date(`${datePart}T${movement.mvtime ?? '00:00:00'}`);

    if (Number.isNaN(date.getTime())) {
        return `${datePart} ${movement.mvtime ?? ''}`.trim();
    }

    const localeTag = locale === 'ar' ? 'ar-QA' : 'en-GB';
    const formattedDate = date.toLocaleDateString(localeTag);
    const formattedTime = date.toLocaleTimeString(localeTag, {
        hour: '2-digit',
        minute: '2-digit',
    });

    return `${formattedDate} ${formattedTime}`;
}
