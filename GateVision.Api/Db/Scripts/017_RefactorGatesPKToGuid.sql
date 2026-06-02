-- Migration: change gates table primary key from VARCHAR to UUID
-- Existing string-ID gates (gate-a, gate-b) are dropped; re-provision via admin UI.

DROP TABLE IF EXISTS gates;

CREATE TABLE gates (
    "Id"           UUID         PRIMARY KEY,
    "Name"         VARCHAR(200) NOT NULL,
    "PythonUrl"    VARCHAR(500) NOT NULL DEFAULT '',
    "ApiKey"       VARCHAR(200),
    "StartCommand" VARCHAR(500),
    "CreatedAt"    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
