/**
 * URL prefix the app is deployed under, e.g. "/newgate" when served from a WAMP
 * Apache Alias alongside legacy rather than its own vhost/port. Empty in local dev
 * and in any root-mounted deployment, so none of this changes existing behavior
 * unless a prefix is actually configured.
 *
 * Single source of truth: Laravel's own ASSET_URL env var (which laravel-vite-plugin
 * already uses to prefix built JS/CSS asset paths) — re-exposed to client code here
 * as VITE_BASE_PATH via a `define` in vite.config.ts, since Vite only auto-exposes
 * `VITE_`-prefixed vars to `import.meta.env` and ASSET_URL intentionally isn't one
 * (it's read directly from process.env by the Laravel plugin, not through Vite's
 * client-env mechanism).
 */
export const BASE_PATH = (import.meta.env.VITE_BASE_PATH ?? '').replace(
    /\/$/,
    '',
);

/**
 * Prefixes a root-relative app URL with BASE_PATH. Leaves absolute URLs (http://,
 * https://, //host/...) and already-prefixed paths untouched.
 *
 * Needed anywhere a URL reaches the network or the DOM outside the two chokepoints
 * patched globally in app.ts (window.fetch and Inertia's router.visit) — public/
 * folder image references (Vite doesn't process these; see transformAssetUrls in
 * vite.config.ts) and direct window.location/window.open navigation.
 */
export function withBase(path: string): string {
    if (
        !BASE_PATH ||
        !path.startsWith('/') ||
        path.startsWith('//') ||
        path === BASE_PATH ||
        path.startsWith(`${BASE_PATH}/`)
    ) {
        return path;
    }

    return `${BASE_PATH}${path}`;
}
