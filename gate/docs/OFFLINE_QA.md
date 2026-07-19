# Gate Offline QA Checklist

## Dev vs production (important)

| Mode | Command | Offline refresh on `/gate` |
|------|---------|------------------------------|
| **Dev** | `npm run dev` (Vite :8080) | **Blank page expected** — PWA/service worker is disabled; JS bundles are not cached |
| **Prod** | `npm run build` + serve `gate/backend/public` on `gate.local` | Works after one online visit — install PWA optional |

Always test offline cold-start with a **production build** on `gate.local`, not the Vite dev server.

## Install PWA (Chrome)

Chrome only shows the **Install** icon when all of these are true:

1. **Production build** — run `cd gate/frontend && npm run build` (not `npm run dev`)
2. **Secure context** — `https://gate.local` **or** `http://localhost`. Plain `http://gate.local` is **not** secure, so Chrome hides Install by default.
3. **Visit `/gate` once online** — warms the service worker and manifest
4. **Service worker active** — DevTools → Application → Service Workers → scope `/`

### If you stay on `http://gate.local` (WAMP, no SSL)

Use Chrome’s dev flag (local machines only):

1. Open `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
2. Add `http://gate.local`
3. Relaunch Chrome
4. Rebuild, open `http://gate.local/gate`, wait ~30s — Install icon should appear in the address bar

Or install manually: Chrome menu (⋮) → **Save and share** → **Install Gate…** (only if manifest is valid).

### After install

- Gate opens in its own window (no tabs)
- `start_url` is `/gate`
- Better offline refresh on kiosks

Use this checklist on a kiosk browser (Chrome recommended) after `npm run build`.

## Shift start (online)

- [ ] Log in and open `/gate`
- [ ] Employee directory finishes loading (sky banner clears)
- [ ] Connectivity bar shows **متصل** (green)
- [ ] Install PWA if prompted (optional: Chrome → Install app)
- [ ] Verify base and gate dropdown are populated

## Barcode offline

- [ ] DevTools → Network → Offline (or disconnect Wi‑Fi)
- [ ] Connectivity bar shows **غير متصل**
- [ ] Scan a barcode for an employee synced in directory
- [ ] Employee card appears with offline data
- [ ] Submit succeeds with toast about local save
- [ ] Pending count increases on connectivity bar

## Military manual offline

- [ ] Search military number (local directory)
- [ ] Select employee — preview loads from cache
- [ ] Manual check-in/out saves locally when offline

## Sync on reconnect

- [ ] Restore network
- [ ] Bar shows **جاري المزامنة** then success
- [ ] Toast confirms synced count
- [ ] Pending count returns to 0
- [ ] Movements appear in backend reports

## Cold start offline

- [ ] While online, visit `/gate` once (cache warm)
- [ ] Close browser completely
- [ ] Go offline before reopening
- [ ] Open PWA or navigate to `/gate`
- [ ] Gate page loads without login redirect
- [ ] Cached session banner may appear
- [ ] Barcode flow still queues movements

## Failure cases

- [ ] Unknown barcode offline → error toast (not in local cache)
- [ ] Session expired offline for days → sync may 401; re-login online; queue retained
