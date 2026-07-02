# Gate App — Monorepo Structure

Physical split: `frontend/` (Vue + Vite) and `backend/` (Laravel API).

## `frontend/`

```
frontend/
├── package.json, vite.config.js, tailwind.config.js, postcss.config.js
├── scripts/copy-vite-manifest.cjs
└── src/
    ├── app.js, bootstrap.js
    ├── styles/app.css (+ fonts/)
    ├── api/              # HTTP client + domain modules
    ├── composables/
    ├── layouts/
    ├── lib/
    ├── pages/
    ├── router/
    └── components/
        ├── gate/
        └── shared/
```

Build output → `backend/public/build/`

## `backend/`

```
backend/
├── app/Services/         # Domain services (modular monolith)
├── app/Http/Controllers/Api/
├── routes/api/           # REST routes
├── database/
├── resources/views/welcome.blade.php   # SPA shell only
├── public/               # WAMP document root
└── artisan, composer.json
```

## Boundary

- Frontend talks to backend **only** via `/api/*` (Sanctum SPA cookies).
- No PHP in `frontend/`, no Vue in `backend/app/`.

## WAMP

DocumentRoot must be `gate/backend/public` (not `gate/public`).

## Restore local database

1. Import SQL dump into MySQL `gateprod` (keep dumps outside repo)
2. `cd backend && php artisan migrate` (pending indexes/views if needed)
3. `php artisan db:seed --class=RolesSeeder`
4. `php artisan db:seed --class=AdminSeeder`
