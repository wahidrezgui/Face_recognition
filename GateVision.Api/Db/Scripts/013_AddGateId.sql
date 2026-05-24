ALTER TABLE gate_events ADD COLUMN IF NOT EXISTS "GateId" VARCHAR(50) NOT NULL DEFAULT 'default';
ALTER TABLE training_events ADD COLUMN IF NOT EXISTS "GateId" VARCHAR(50) NOT NULL DEFAULT 'default';

CREATE INDEX IF NOT EXISTS idx_gate_events_gate_id ON gate_events ("GateId");
CREATE INDEX IF NOT EXISTS idx_training_events_gate_id ON training_events ("GateId");
