# Gate Data Model

## Database ownership

| Database | Owner | Access |
|----------|-------|--------|
| `gateprod` | gate app | Write: employees, movements, departments. Read: gymapp, haderweb |

## Core tables

- `employees` — gate pass holders (QR code, military number, department)
- `movements` — check-in/out events (`emp_id`, `gate_id`, `base_id`, `mvtype`)
- `departments` — org tree (`parent_id`, `is_company`)
- `bases`, `gates`, `zones` — physical access hierarchy
- `users` — app login (Spatie roles)
- `logs` — audit trail

## Reporting views

- `employee_movements` — aggregated movement data for reports
- `employee_specific_movements_notes` — movement notes join
- `ranks_trees_view` — rank hierarchy for tree selects

## Indexes (2026-06-29)

- `movements(emp_id, created_at)`
- `employees(qrcode)`, `employees(military_number)`, `employees(dep_id)`
- `logs(emp_id, created_at)`
