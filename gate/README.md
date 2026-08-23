# Gate — Monorepo Layout

```
gate/
├── frontend/          # Vue 3 SPA (Vite, Tailwind, PrimeVue)
├── backend/           # Laravel 10 API + SPA shell
├── docs/              # Architecture & runbooks
└── scripts/           # DB import utilities (SQL split)
```

## WAMP setup

Point your virtual host **DocumentRoot** to:

```
.../FACE_RECOGNITION/gate/backend/public
```

Example: `http://gate.local` → `gate/backend/public`

## Quick start

```bash
# Backend
cd backend
composer install
cp .env.example .env   # if needed
php artisan key:generate
php artisan migrate

# Frontend (from gate root or frontend/)
npm install --prefix frontend
npm run build            # or: npm run dev
```

**Dev mode:** `npm run dev` starts Vite on port 8080 and proxies `/api` to the Laravel backend.

**Prod / WAMP:** run `npm run build` after frontend changes; assets land in `backend/public/build/`.

## Keycloak SSO (مرسال) — optional

Password login remains the default. Keycloak is a second sign-in path via the Laravel BFF (same Sanctum session after login).

### 1. Configure `.env`

Copy variables from `backend/.env.example` or the detailed `backend/.env.keycloak.example`:

```bash
KEYCLOAK_ENABLED=true
KEYCLOAK_BASE_URL=http://localhost:7080
KEYCLOAK_REALM=your-realm
KEYCLOAK_CLIENT_ID=gate-bff
KEYCLOAK_CLIENT_SECRET=your-client-secret
KEYCLOAK_REDIRECT_URI=http://gate.local/api/auth/keycloak/callback
KEYCLOAK_FEDERATED_LOGOUT=true
KEYCLOAK_PROMPT=login
KEYCLOAK_VERIFY_ID_TOKEN=true
```

Set `KEYCLOAK_VERIFY_ID_TOKEN=false` only for local debugging without JWKS access.

### 2. Keycloak client

- Client type: **confidential** (uses `client_secret`)
- Valid redirect URI: `{APP_URL}/api/auth/keycloak/callback`
- Valid post-logout redirect: `{APP_URL}/` (or `KEYCLOAK_POST_LOGOUT_REDIRECT_URI`)
- Scopes: `openid`, `profile`, `email`

### 3. Database migrations

```bash
cd backend
php artisan migrate --path=database/migrations/2026_07_01_000001_add_keycloak_sub_to_users_table.php
php artisan migrate --path=database/migrations/2026_07_01_000002_make_users_password_and_dep_id_nullable.php
php artisan migrate --path=database/migrations/2026_07_01_000003_add_keycloak_pending_sub_to_users_table.php
```

### 4. Admin activation workflow

1. User signs in via مرسال → local user stub is created (`keycloak_pending_sub` stored server-side).
2. User lands on `/auth/pending` and contacts an admin.
3. Admin opens **إدارة المستخدمين**, filters **بانتظار التفعيل**, edits the user, ticks **تفعيل حساب مرسال**, assigns **role + department**, saves.
4. User signs in via مرسال again → normal app access.

Users are matched by `users.keycloak_sub` = Keycloak `sub` UUID (set automatically on activation; never pasted manually in the UI).

### 5. Verify

```bash
cd backend
php artisan test --filter=KeycloakAuthTest
```

## Commands (from `gate/` root)

| Command | Action |
|---------|--------|
| `npm run dev` | Vite dev server |
| `npm run build` | Production frontend build |
| `npm test` | PHPUnit feature tests |

## Backend only

```bash
cd backend
php artisan serve
php artisan test
php scripts/db-check.php
```
