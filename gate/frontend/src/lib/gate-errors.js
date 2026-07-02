const PLATE_NUMBER_MAX_LENGTH = 20;

const GENERIC_ERROR = 'حدث خطأ أثناء التسجيل، يرجى المحاولة مرة أخرى';

export { PLATE_NUMBER_MAX_LENGTH };

export function formatGateError(error, fallback = GENERIC_ERROR) {
    const data = error?.response?.data;
    if (!data) {
        return fallback;
    }

    if (data.errors && typeof data.errors === 'object') {
        const first = Object.values(data.errors).flat().find(Boolean);
        if (first) {
            return String(first);
        }
    }

    const message = data.message;
    if (!message || typeof message !== 'string') {
        return fallback;
    }

    if (isPlateTooLongMessage(message)) {
        return plateTooLongMessage();
    }

    if (isTechnicalMessage(message)) {
        return fallback;
    }

    return message;
}

export function isPlateTooLongMessage(message) {
    return /platenumber/i.test(message)
        && /too long|truncat|22001|1406/i.test(message);
}

export function plateTooLongMessage() {
    return `رقم السيارة طويل جداً — الحد الأقصى ${PLATE_NUMBER_MAX_LENGTH} حرفاً`;
}

function isTechnicalMessage(message) {
    return /SQLSTATE|Connection:\s*mysql|insert into|Integrity constraint/i.test(message);
}
