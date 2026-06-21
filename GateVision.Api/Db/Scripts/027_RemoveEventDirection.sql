-- Step 2: remove Direction from event tables (gate tracking only)
ALTER TABLE gate_events DROP COLUMN IF EXISTS "Direction";
ALTER TABLE validated_events DROP COLUMN IF EXISTS "Direction";
ALTER TABLE training_events DROP COLUMN IF EXISTS "Direction";