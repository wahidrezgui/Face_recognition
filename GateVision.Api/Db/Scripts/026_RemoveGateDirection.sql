-- Step 1: remove Direction from gates (gate config only; event direction columns unchanged)
ALTER TABLE gates DROP COLUMN IF EXISTS "Direction";