"""Seed GateVision PostgreSQL with test data.

Usage:
    python scripts/seed_db.py [connection_string]

Default connection: postgresql://gatevision:localdev@localhost:6667/gatevision
"""

import sys
import uuid
import numpy as np

CONNECTION_STRING = (
    sys.argv[1]
    if len(sys.argv) > 1
    else "postgresql://gatevision:localdev@localhost:6667/gatevision"
)

try:
    import psycopg2
except ImportError:
    print("Installing psycopg2-binary...")
    import subprocess
    subprocess.check_call(
        [sys.executable, "-m", "pip", "install", "psycopg2-binary", "-q"]
    )
    import psycopg2


PERSON_ID = uuid.UUID("a0000000-0000-0000-0000-000000000001")
EMBEDDING_ID = uuid.UUID("b0000000-0000-0000-0000-000000000002")


def main():
    conn = psycopg2.connect(CONNECTION_STRING)
    conn.autocommit = True
    cur = conn.cursor()

    cur.execute("CREATE EXTENSION IF NOT EXISTS vector")

    cur.execute("""
        CREATE TABLE IF NOT EXISTS persons (
            "Id" UUID PRIMARY KEY,
            "FullName" VARCHAR(200) NOT NULL,
            "Department" VARCHAR(100) NOT NULL,
            "EnrollmentStatus" VARCHAR(20) NOT NULL DEFAULT 'Pending',
            "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS face_embeddings (
            "Id" UUID PRIMARY KEY,
            "PersonId" UUID NOT NULL REFERENCES persons("Id"),
            "Vector" vector(512) NOT NULL,
            "QualityScore" REAL NOT NULL DEFAULT 0.0,
            "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS gate_events (
            "Id" UUID PRIMARY KEY,
            "PersonId" UUID REFERENCES persons("Id"),
            "PersonName" VARCHAR(200) NOT NULL DEFAULT 'UNKNOWN',
            "Confidence" REAL NOT NULL DEFAULT 0.0,
            "Status" VARCHAR(20) NOT NULL DEFAULT 'Unrecognized',
            "Direction" VARCHAR(10) NOT NULL DEFAULT 'entry',
            "CapturedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)

    cur.execute("""
        INSERT INTO persons ("Id", "FullName", "Department", "EnrollmentStatus")
        VALUES (%s, %s, %s, %s)
        ON CONFLICT ("Id") DO UPDATE SET "EnrollmentStatus" = 'Active'
    """, (str(PERSON_ID), "Test User", "Engineering", "Active"))

    rng = np.random.RandomState(42)
    embedding = rng.randn(512).astype(np.float32)
    embedding = embedding / np.linalg.norm(embedding)
    vector_str = "[" + ",".join(f"{v:.8f}" for v in embedding) + "]"

    cur.execute("""
        INSERT INTO face_embeddings ("Id", "PersonId", "Vector", "QualityScore")
        VALUES (%s, %s, %s::vector, %s)
        ON CONFLICT ("Id") DO NOTHING
    """, (str(EMBEDDING_ID), str(PERSON_ID), vector_str, 0.9))

    print(f"Seeded person Test User (id={PERSON_ID})")
    print(f"Seeded embedding (id={EMBEDDING_ID})")
    print("Done.")

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()
