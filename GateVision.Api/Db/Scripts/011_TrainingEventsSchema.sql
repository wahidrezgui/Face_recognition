-- 011: Slim gate_events to essential audit columns; add training_events for data-collection mode.
--
-- gate_events  → permanent access-log (Identified only, >= 80% confidence)
-- training_events → ephemeral capture log (NeedsReview, < 80%) written only when training mode ON
--
-- PersonName / WelcomeMessage / Department are denormalised display columns that belong to the
-- persons table.  They are removed here; API responses will JOIN persons at read time.
-- FaceImagePath is deprecated since G16 (v5) — base64 in FaceImageBase64 is the sole store.

ALTER TABLE gate_events DROP COLUMN IF EXISTS "PersonName";
ALTER TABLE gate_events DROP COLUMN IF EXISTS "FaceImagePath";
ALTER TABLE gate_events DROP COLUMN IF EXISTS "WelcomeMessage";
ALTER TABLE gate_events DROP COLUMN IF EXISTS "Department";

CREATE TABLE IF NOT EXISTS training_events (
    "Id"              UUID          PRIMARY KEY,
    "PersonId"        UUID          REFERENCES persons("Id") ON DELETE SET NULL,
    "Confidence"      REAL          NOT NULL DEFAULT 0.0,
    "Status"          VARCHAR(20)   NOT NULL DEFAULT 'NeedsReview',
    "Direction"       VARCHAR(10)   NOT NULL DEFAULT 'entry',
    "CapturedAt"      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    "FaceImageBase64" TEXT
);

CREATE INDEX IF NOT EXISTS idx_training_events_captured_at ON training_events("CapturedAt" DESC);
CREATE INDEX IF NOT EXISTS idx_training_events_status      ON training_events("Status");
