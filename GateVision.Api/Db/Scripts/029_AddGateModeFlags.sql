-- 029: Per-gate log-unknown and training-mode flags (Python pulls via GET /api/v1/gates/{id}/config).
ALTER TABLE gates
ADD COLUMN IF NOT EXISTS "LogUnknown" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "TrainingMode" BOOLEAN NOT NULL DEFAULT FALSE;