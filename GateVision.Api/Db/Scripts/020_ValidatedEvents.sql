-- 020: validated_events — permanent, high-confidence access log.
--
-- A row enters this table via two paths:
--   auto   : backend promotes any gate_event whose Confidence > 0.85 at flush time
--   manual : operator presses "Validate" on an event from the Events page
--
-- gate_events remains the full raw log; validated_events is the curated truth table.

CREATE TABLE IF NOT EXISTS validated_events (
    "Id"              UUID          PRIMARY KEY,
    "GateEventId"     UUID,                            -- source gate_event (nullable: event may be deleted later)
    "GateId"          VARCHAR(50)   NOT NULL DEFAULT 'default',
    "PersonId"        UUID          REFERENCES persons("Id") ON DELETE SET NULL,
    "Confidence"      REAL          NOT NULL DEFAULT 0.0,
    "Direction"       VARCHAR(10)   NOT NULL DEFAULT 'entry',
    "CapturedAt"      TIMESTAMPTZ   NOT NULL,
    "FaceImageBase64" TEXT,
    "Emotion"         VARCHAR(50),
    "Age"             INTEGER,
    "Gender"          VARCHAR(20),
    "ValidatedBy"     VARCHAR(20)   NOT NULL DEFAULT 'auto',   -- 'auto' | 'manual'
    "ValidatedAt"     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_validated_events_captured_at  ON validated_events("CapturedAt" DESC);
CREATE INDEX IF NOT EXISTS idx_validated_events_person_id    ON validated_events("PersonId");
CREATE INDEX IF NOT EXISTS idx_validated_events_gate_id      ON validated_events("GateId");
CREATE INDEX IF NOT EXISTS idx_validated_events_gate_event   ON validated_events("GateEventId");
