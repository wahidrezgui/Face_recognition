# Manual prod schema catch-up

Real production lags behind the current schema (the one now baked into gateNew's
`database/schema/mysql-schema.sql`). These scripts are a **reference menu**, not a
blind "run all of this" package — cross-check each statement against your own
structural diff of real prod before running anything.

## Process

1. **Diff structure, not migration bookkeeping.** The `migrations` table alone is not
   trustworthy here — the live schema has already drifted from its own migration
   history in several places (see `../../PORTING_NOTES.md`). Take a structural-only
   dump of both databases and diff them:
   ```powershell
   $env:Path = "C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin;" + $env:Path
   $flags = @("--no-tablespaces","--skip-add-locks","--skip-comments","--skip-set-charset","--skip-dump-date","--routines","--no-data","--column-statistics=0","--set-gtid-purged=OFF")
   mysqldump -h <PROD_HOST> -P <PROD_PORT> -u <PROD_USER> -p @flags <PROD_DB> > prod-schema.sql
   mysqldump -h 127.0.0.1 -P 3308 -u root -prootpass @flags gateprod > dev-schema.sql
   (Get-Content prod-schema.sql) -replace '\s+AUTO_INCREMENT=[0-9]+','' | Set-Content prod-schema.sql
   (Get-Content dev-schema.sql)  -replace '\s+AUTO_INCREMENT=[0-9]+','' | Set-Content dev-schema.sql
   git diff --no-index -- prod-schema.sql dev-schema.sql
   ```
   That diff is the authoritative list of what prod is actually missing.

2. **Run only what the diff shows is missing**, in tier order:
   - `01_tier1_safe_additive.sql` — new tables/views/columns/indexes, nullable
     relaxations. Safe to run anytime, non-breaking.
   - `02_tier2_dedupe_movements.sql` — **irreversible data deletion**. Read the
     instructions inside the file before running any of it.
   - `03_tier3_breaking_renames.sql` — **do not run until you've confirmed** the
     application code currently live on prod already expects the new column names
     (`username` instead of `email`, `created_by_id` instead of the `created_by` name string
     on `logs`/`employee_notes`). Running this while old code is still deployed
     breaks login and logging immediately.

3. **Record what you ran** — `04_migrations_bookkeeping.sql` has one `INSERT`
   template per migration; only insert rows for whichever ones you actually applied.

4. **Re-run the Step 1 diff** after applying the script(s) — expect no diff.

## Notes on accuracy

Every statement below was built from the **live shared dev database's actual DDL**
(`database/schema/mysql-schema.sql`), not from re-reading the original Laravel
migration files' `Blueprint` code. This matters: the live `badges2` table, for
example, is `MyISAM`/`utf8mb3` with no foreign key and no index on `dep_id`, and its
height column is spelled `height` — all different from what the migration file
(`gate/backend/database/migrations/2024_06_11_142413_create_badges2_table.php`)
actually specifies. That migration was evidently never the thing that created the
live table. `01_tier1_safe_additive.sql` intentionally replicates the live reality
(so a post-catch-up diff comes back clean), not the migration file's original intent.
If you want to *also* clean up `badges2` to InnoDB/utf8mb4 with a real FK, that's a
separate, deliberate change to make identically on both dev and prod — not part of
this catch-up.

Also noticed on the live dev DB, out of scope for this catch-up: a `logs_checkinout_backup`
table that isn't produced by any migration (looks like a manual one-off backup table).
Not included here — flag if you want it ported too.

## Open risk: view `DEFINER`

If you ever load `database/schema/mysql-schema.sql` itself (not these hand-written
scripts) on an account other than `root@localhost`, the baked-in
`DEFINER=`root`@`localhost`` clauses on the 3 views will fail unless that account has
`SUPER`/`SET_USER_ID`. The view SQL in this folder is written without a `DEFINER`
clause specifically to avoid that problem on prod.
