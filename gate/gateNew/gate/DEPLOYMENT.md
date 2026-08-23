# Deploying gateNew to the Production WAMP Server

Step-by-step runbook for standing up `gate/gateNew/gate` on the production Windows/WAMP/Apache
server, alongside the untouched legacy app, for the 2-gate pilot. Companion to the DB-side
work in `database/prod-catchup/` — that script must be applied (Part F below) before gateNew
can serve real traffic against the shared database.

**Hosting model: URL path prefix on the existing site, not a new vhost/port.** Legacy is
already reachable as `http://<serverIP>/gate`; gateNew is deployed the same way, as
`http://<serverIP>/newgate`, via an Apache `Alias` on the same site legacy already lives on.
This was a deliberate choice over giving gateNew its own vhost/port: it matches the existing
`/gate` convention and needs no new hostname/DNS entry for the kiosks to resolve, at the cost
of extra work — Inertia + Vite apps aren't naturally safe to serve from a URL subdirectory
(built asset URLs and every client-side route link are normally root-relative). That work is
already done in the codebase (see "Code changes already made for /newgate" below) and verified
against an actual build — Part C/D below just need the corresponding server-side config.

Nothing in this document has been run against the real server — it was written and the DB
script was validated against a local clone (`gateprod_pilot_test`), but the app-deployment
steps below need to be carried out by whoever has access to the actual machine. Treat every
path, hostname, and version number below as **confirm-before-use**, not fact.

## Before you start — confirm these on the real server

These could not be determined from the repository and materially change the steps below:

- [ ] **PHP version and extensions** — `composer.json` requires `php: ^8.3`. Confirm the
      server's WAMP PHP version is 8.3+ and that `pdo_mysql`, `mbstring`, `openssl`,
      `tokenizer`, `xml`, `ctype`, `json`, `bcmath`, `fileinfo` are enabled (WAMP's tray menu
      → PHP → PHP extensions). Add `gd` or `imagick` if employee photos get processed
      server-side.
- [ ] **Node/npm on the server** — if not installed, build frontend assets locally (Part E,
      option B) and ship `public/build/` instead of building on the server.
- [ ] **Actual production database name** — this repo's local `.env` uses `gateprod`; your
      import is `gateprod_prod`; the real server's database is very likely named something
      else again. Get the exact name before filling in `.env`.
- [ ] **Keycloak / SSO in production** — the local `.env` points `KEYCLOAK_BASE_URL` at
      `http://localhost:7080` (a dev-only instance) with realm `qeafauth`, client `gate-bff`.
      Confirm whether a real Keycloak server exists for production, and get its base URL,
      realm, client ID/secret, and redirect URI — or set `KEYCLOAK_ENABLED=false` if SSO
      isn't part of the pilot yet and password login is enough.
- [ ] **How the 2 pilot gate kiosks currently reach `/gate`** — same server/IP legacy is
      already on, so no new hostname is needed, but confirm how each kiosk is actually pointed
      there today (bookmark, kiosk-mode browser shortcut, hosts-file entry) so you can point it
      at `/newgate` the same way for Part I.
- [ ] **Mail driver for production** — local `.env` uses `MAIL_MAILER=log` (writes to a log
      file, sends nothing). Decide if gateNew needs to actually send mail in production.
- [ ] **How `/gate` itself is currently wired in Apache** — check `httpd-vhosts.conf`/
      `httpd.conf` for an existing `Alias /gate "..."` directive, or whether
      `C:\wamp64\www\gate` is a directory junction into `gate/backend/public`. Part C assumes
      an `Alias`, the clean and standard way to do this — mirror whatever legacy actually uses
      if it turns out to be different, for consistency.

## Part A — Server prerequisites

1. Confirm PHP 8.3+ is the active WAMP PHP version and the extensions listed above are on.
2. Confirm Composer is installed and on PATH (`composer --version`).
3. Confirm whether Node/npm is installed (`node --version`, `npm --version`). If not, plan to
   build assets locally (Part E, option B).
4. Confirm you can reach the production MySQL instance from wherever you'll run
   `composer`/`artisan`/`npm` commands (usually the server itself).

## Part B — Get the code onto the server

Pick whichever matches how this server is normally updated:

- **Git** (preferred if the server has git and network access to your remote): clone the repo
  (or just the `gate/gateNew/gate` subtree) into a new directory, e.g.
  `C:\wamp64\www\gate-new\`. Check out the same commit/branch that was validated locally.
- **Zip transfer**: from a clean local checkout, zip `gate/gateNew/gate/` (exclude
  `node_modules/`, `vendor/`, `.env` — those get installed/created fresh on the server) and
  extract it into the target directory on the server.

Either way, the app should end up in its **own directory, separate from legacy's**. Legacy's
vhost already owns `gate/backend/public` as DocumentRoot (per `gate/docs/STRUCTURE_AUDIT.md`)
— don't deploy gateNew underneath or alongside legacy's existing folder.

## Code changes already made for `/newgate`

Inertia + Vite apps assume they own the whole domain root by default — every built asset URL
and every client-side route link (generated by Wayfinder) is root-relative
(`/employees/5`, not `/newgate/employees/5`). Left alone, that breaks the instant the app is
reached via a path prefix instead of its own vhost. This is already fixed in the codebase, not
something left for deploy day:

- **`resources/js/lib/basePath.ts`** — `BASE_PATH`/`withBase()`, reads the prefix from
  `import.meta.env.VITE_BASE_PATH` (empty in local dev).
- **`resources/js/app.ts`** — patches `window.fetch` and Inertia's `router.visit` globally, so
  every raw `fetch()` call and every `<Link>`/`router.get/post/etc.` navigation gets the prefix
  automatically. A no-op when no prefix is configured.
- **`vite.config.ts`** — reads Laravel's own `ASSET_URL` env var (the same one
  `laravel-vite-plugin` already uses to prefix built JS/CSS paths) and re-exposes it to client
  code as `VITE_BASE_PATH`; also fixes the PWA offline-cache rule, which was hardcoded to match
  `/gate` and would otherwise silently stop caching the kiosk shell under `/newgate/gate`.
- A handful of call sites that reach the network or the DOM outside those two chokepoints —
  `employeePhotoUrl()`, the two `armedforces.png` references, the CSV export's
  `window.location.assign` — wrapped individually with `withBase()`.

**Known, accepted limitation**: this fixes actual navigation (clicking, form submits,
programmatic visits) but not the raw `href` attribute Inertia's `<Link>` renders in the DOM —
right-click "copy link address," hovering to preview the URL, or middle-click "open in new
tab" will still show the un-prefixed path. Normal clicks work correctly regardless (Inertia
intercepts them before the browser follows the raw href). Given this is a kiosk + internal
staff dashboard, not a public site where opening links in new tabs is a common pattern, this
was judged an acceptable trade-off rather than something worth deeper Inertia internals
surgery to close entirely.

Single env var drives all of it: **`ASSET_URL=/newgate`** must be set in `.env` *before*
running `npm run build` (Part E) — it's read at build time, not runtime, so changing it later
means rebuilding.

## Part C — Apache: alias `/newgate` alongside legacy's `/gate`

WAMP's tray icon → Apache → `httpd-vhosts.conf` (or `httpd.conf`, if `/gate` isn't defined via
a vhost — see "Before you start") opens the config file directly. Add an `Alias` for gateNew
in the **same site** `/gate` already lives on, pointing at gateNew's `public/` folder:

```apache
Alias /newgate "C:/wamp64/www/gate-new/public"
<Directory "C:/wamp64/www/gate-new/public">
    AllowOverride All
    Require all granted
</Directory>
```

Place this near whatever block currently defines `/gate`, so both are served by the same site
on the same port — that's what makes `serverIP/newgate` reachable alongside `serverIP/gate`
with no new hostname or DNS entry needed.

Restart Apache (WAMP tray → Apache → Service → Restart Service), then confirm routing works:
`curl -I http://<serverIP>/newgate/` should get a response (likely a 500 until Part E/F are
done — that's expected at this point, it just proves Apache is routing to gateNew's `public/`).

## Part D — Production `.env`

Copy `.env.example` to `.env` in the deployed directory, then set:

```env
APP_NAME=Gate
APP_ENV=production
APP_DEBUG=false
APP_URL=http://<serverIP>/newgate
ASSET_URL=/newgate
APP_TIMEZONE=Asia/Qatar

DB_CONNECTION=mysql
DB_HOST=<production DB host, likely 127.0.0.1 if MySQL is local to this server>
DB_PORT=<production DB port>
DB_DATABASE=<the real production database name — confirm, don't assume>
DB_USERNAME=<production DB user — do not reuse the local root/rootpass dev credentials>
DB_PASSWORD=<production DB password>
DB_CHARSET=utf8mb4
DB_COLLATION=utf8mb4_unicode_ci

SESSION_DRIVER=database
QUEUE_CONNECTION=database
CACHE_STORE=database

MAIL_MAILER=<log, or a real driver if production needs to send mail>

KEYCLOAK_ENABLED=<true if SSO is ready for production, false otherwise>
KEYCLOAK_BASE_URL=<real Keycloak server, NOT localhost:7080>
KEYCLOAK_REALM=<production realm>
KEYCLOAK_CLIENT_ID=<production client id>
KEYCLOAK_CLIENT_SECRET=<production client secret>
KEYCLOAK_REDIRECT_URI=http://<serverIP>/newgate/auth/keycloak/callback
KEYCLOAK_POST_LOGOUT_REDIRECT_URI=http://<serverIP>/newgate/
```

`ASSET_URL=/newgate` is the single var that drives every subdirectory fix described above —
see "Code changes already made for /newgate." Get it into `.env` before Part E's build, not
after.

`SESSION_DRIVER`/`QUEUE_CONNECTION`/`CACHE_STORE=database` matches local dev, and the
`sessions`/`cache`/`cache_locks`/`jobs`/`job_batches` tables these need are already added by
`database/prod-catchup/05_pilot_readiness.sql` (Part F).

Then generate a **fresh** app key — do not copy the one from local `.env`:

```
php artisan key:generate
```

## Part E — Build & install

**Option A — build on the server** (if Node/npm is available there):

```
composer install --no-dev --optimize-autoloader
npm ci
npm run build
```

**Option B — build locally, ship the artifacts** (if Node isn't on the server):

```
# on your local machine, from a clean checkout matching the deployed commit
npm ci
npm run build
```

Then copy `public/build/` from your local machine into the server's deployed directory
(same relative path), and on the server run only:

```
composer install --no-dev --optimize-autoloader
```

**Either way, then on the server:**

```
php artisan storage:link
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Grant the Apache service account write access to `storage/` and `bootstrap/cache/` (Windows
NTFS permissions, not chmod):

```
icacls "C:\wamp64\www\gate-new\storage" /grant "IUSR:(OI)(CI)F" /T
icacls "C:\wamp64\www\gate-new\bootstrap\cache" /grant "IUSR:(OI)(CI)F" /T
```

(Adjust the account name to whichever identity WAMP's Apache service actually runs as —
check WAMP's service configuration if unsure; `IUSR` is the common default but not universal.)

## Part F — Apply the database catch-up script

This is the DB-prep work already authored and validated at
`database/prod-catchup/05_pilot_readiness.sql` — see that file's header comments for the full
explanation of what it does and why. Do not skip the dry run even though it was already run
once locally; re-validate against the real production database's actual current state:

1. **Full backup** of the production database before touching anything.
2. **Dry run against a throwaway clone on the production server itself** (not just trusting
   the local validation, since the real prod schema may have drifted since the local import):
   ```
   mysql -u <user> -p -e "CREATE DATABASE gateprod_pilot_test"
   mysqldump -u <user> -p <real_prod_db_name> --routines --triggers | mysql -u <user> -p gateprod_pilot_test
   mysql -u <user> -p gateprod_pilot_test < database/prod-catchup/05_pilot_readiness.sql
   ```
   Check for errors. If clean, spot-check: the 3 views return rows, `SHOW TRIGGERS` lists the
   two `users_username_email_mirror_*` triggers, `SELECT COUNT(*) FROM movements` matches the
   real database's count.
3. **Run it against the real production database**, during a low-traffic window:
   ```
   mysql -u <user> -p <real_prod_db_name> < database/prod-catchup/05_pilot_readiness.sql
   ```
4. Re-verify: row counts unchanged, views compile, `php artisan migrate:status` (pointed at
   the real DB via `.env`) shows all 13 of gateNew's own migrations as `Ran`.

## Part G — Queue worker (not needed yet)

`QUEUE_CONNECTION=database` is set, but nothing in the app currently dispatches queued jobs
(`grep -r "::dispatch" app/` returns nothing as of this writing) — the `jobs`/`job_batches`
tables exist from Part F but sit empty and unused. No worker process is required for the pilot
to function. If/when a queued job is introduced later, run `php artisan queue:work` as a
Windows Service (e.g. via NSSM — Non-Sucking Service Manager, since Windows has no
`supervisord`) or a scheduled task with auto-restart. Revisit this section then.

## Part H — Smoke test before routing any gate traffic

Do this against the real production `.env`/database, from a normal browser, before Part I:

- [ ] Load `http://<serverIP>/newgate/` — no 500 errors.
- [ ] **Open DevTools → Network while loading the page** — every JS/CSS asset request should
      go to `/newgate/build/...` and return 200, not 404. This is the one check that would
      catch a missed/misconfigured `ASSET_URL` immediately; don't skip it.
- [ ] Log in with an existing staff account's `username` (mirrored from their real `email` by
      the Part F script) and correct password.
- [ ] If Keycloak is enabled: SSO login round-trip works end to end.
- [ ] Click through several pages of normal in-app navigation (not just the first page) —
      confirm the URL bar always shows `/newgate/...`, never a bare path missing the prefix.
- [ ] Search for an existing employee (by name, QR code, or military number) — confirms both
      navigation and the employee photo (`employeePhotoUrl()`) load correctly.
- [ ] Record one real check-in and one check-out movement for a test employee; confirm both
      appear correctly, then verify legacy's own reports still show correctly for that
      employee too (proves the shared `movements` table is genuinely fine from both sides).
- [ ] Open a report/notes view that uses `employee_specific_movements_notes_view`; confirm
      `created_by` shows the right name for both an old (legacy-authored) note and, if you
      create one via gateNew, a new one.
- [ ] Export a CSV report and print a badge (if badge printing is in scope for the pilot
      gates) — both use direct `window.location`/`window.open` navigation, a separate code
      path from normal in-app links.
- [ ] Open the gate kiosk page, then go offline (DevTools → Network → Offline) and reload —
      the PWA cache rule is prefix-aware now, but worth confirming it actually still works
      under `/newgate` rather than just trusting the code.
- [ ] **Separately**, confirm legacy is unaffected: log into legacy with the same account's
      `email`, confirm it still works exactly as before, and that legacy's own report/log
      screens haven't changed.

## Part I — Cut over the 2 pilot gates

Point each pilot kiosk's browser at `http://<serverIP>/newgate` using whatever mechanism was
confirmed in "Before you start" (same as however it's pointed at `/gate` today — bookmark,
kiosk-mode shortcut target, hosts entry). The other 8 gates are untouched and keep pointing at
`/gate` exactly as before.

## Part J — Rollback

Legacy's vhost, codebase, and database columns are completely untouched by any of this (Part F
is purely additive). Reverting a pilot gate is just pointing its kiosk browser back at
legacy's URL — no database rollback needed, since nothing legacy depends on was changed or
removed.

## Part K — After go-live

- Watch Apache's error log for the first few days. Since `/newgate` is an `Alias` inside
  legacy's existing site rather than its own vhost, it shares that site's `ErrorLog`/
  `CustomLog` by default — check whichever log file the `/gate` block already points at
  (add a dedicated `ErrorLog`/`CustomLog` inside a `<Location "/newgate">` block in Part C if
  you'd rather keep gateNew's errors separate). Also watch Laravel's own log
  (`storage/logs/laravel.log`).
- Periodically confirm the `username`/`email` triggers are still keeping the two columns in
  sync (`SELECT COUNT(*) FROM users WHERE username <> email OR (username IS NULL) <> (email IS NULL)`
  should stay `0`).
- Once the pilot period is over and the decision is made to expand to more gates, repeat Parts
  C/D/I for each new gate cohort — Parts F/G don't need to run again, they're one-time.
- The final full cutover (all 10 gates, legacy retired) is a separate, later piece of work:
  dropping `employees/logs/employee_notes.created_by`, the `username`/`email` triggers, and
  `users.email` itself — see the "Explicitly deferred" section of the pilot-readiness plan.
  Do not run `database/prod-catchup/03_tier3_breaking_renames.sql` as originally written; it
  predates the additive-mirror approach used here and needs to be updated to drop `email`
  rather than rename it, since `username` already exists as its own column by then.
