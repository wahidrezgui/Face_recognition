-- Legacy direction removal (superseded by 026 + 027 on fresh installs; kept for DbUp history)
ALTER TABLE gate_events DROP COLUMN IF EXISTS "Direction";
ALTER TABLE validated_events DROP COLUMN IF EXISTS "Direction";
ALTER TABLE training_events DROP COLUMN IF EXISTS "Direction";
ALTER TABLE gates DROP COLUMN IF EXISTS "Direction";