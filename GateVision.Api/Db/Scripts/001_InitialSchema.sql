CREATE TABLE IF NOT EXISTS persons (
    "Id" UUID PRIMARY KEY,
    "FullName" VARCHAR(200) NOT NULL,
    "Department" VARCHAR(100) NOT NULL,
    "EnrollmentStatus" VARCHAR(20) NOT NULL DEFAULT 'Pending',
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gate_events (
    "Id" UUID PRIMARY KEY,
    "PersonId" UUID REFERENCES persons("Id"),
    "PersonName" VARCHAR(200) NOT NULL DEFAULT 'UNKNOWN',
    "Confidence" REAL NOT NULL DEFAULT 0.0,
    "Status" VARCHAR(20) NOT NULL DEFAULT 'Unrecognized',
    "Direction" VARCHAR(10) NOT NULL DEFAULT 'entry',
    "CapturedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "FaceImageBase64" TEXT
);

CREATE INDEX IF NOT EXISTS idx_gate_events_captured_at ON gate_events("CapturedAt" DESC);
CREATE INDEX IF NOT EXISTS idx_gate_events_status ON gate_events("Status");
