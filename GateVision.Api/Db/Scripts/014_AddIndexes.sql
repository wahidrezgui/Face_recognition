CREATE INDEX IF NOT EXISTS idx_gate_events_captured_at ON gate_events ("CapturedAt");
CREATE INDEX IF NOT EXISTS idx_gate_events_status ON gate_events ("Status");
CREATE INDEX IF NOT EXISTS idx_persons_full_name ON persons ("FullName");
