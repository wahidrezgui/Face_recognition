CREATE TABLE IF NOT EXISTS gates (
    "Id"        VARCHAR(50)  PRIMARY KEY,
    "Name"      VARCHAR(200) NOT NULL,
    "PythonUrl" VARCHAR(500) NOT NULL DEFAULT '',
    "ApiKey"    VARCHAR(200),
    "CreatedAt" TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Seed default development gates (no-op if already present)
INSERT INTO gates ("Id", "Name", "PythonUrl", "ApiKey")
VALUES
    ('gate-a', 'Gate A', 'http://10.39.66.24:8000', 'key-for-gate-a'),
    ('gate-b', 'Gate B', 'http://10.39.66.24:8001', 'key-for-gate-b')
ON CONFLICT ("Id") DO NOTHING;
