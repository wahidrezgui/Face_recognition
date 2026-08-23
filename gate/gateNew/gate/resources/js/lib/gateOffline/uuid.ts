/**
 * `crypto.randomUUID()` is only available in secure contexts (HTTPS or
 * localhost) — this app is reachable over plain HTTP, where it's simply
 * `undefined`, silently breaking every movement submission. Falls back to a
 * manual RFC4122 v4 UUID built on `crypto.getRandomValues()`, which has no
 * secure-context restriction.
 */
export function generateClientRequestId(): string {
    if (typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    const bytes =
        typeof crypto.getRandomValues === 'function'
            ? crypto.getRandomValues(new Uint8Array(16))
            : Uint8Array.from({ length: 16 }, () =>
                  Math.floor(Math.random() * 256),
              );

    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (byte) =>
        byte.toString(16).padStart(2, '0'),
    ).join('');

    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
