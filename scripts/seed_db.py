"""Seed additional test data after DbUp migrations have run.

Assumes DbUp migrations (001-005) have already created tables and seeded
the default test user. This script adds a second person with a random
embedding for variety.

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


def main():
    conn = psycopg2.connect(CONNECTION_STRING)
    conn.autocommit = True
    cur = conn.cursor()

    person_id = uuid.uuid4()
    emb_id = uuid.uuid4()

    cur.execute("""
        INSERT INTO persons ("Id", "FullName", "Department", "EnrollmentStatus")
        VALUES (%s, %s, %s, %s)
        ON CONFLICT ("Id") DO NOTHING
    """, (str(person_id), "Jane Doe", "Security", "Active"))

    rng = np.random.RandomState(42)
    embedding = rng.randn(512).astype(np.float32)
    embedding = embedding / np.linalg.norm(embedding)
    vector_str = "[" + ",".join(f"{v:.8f}" for v in embedding) + "]"

    cur.execute("""
        INSERT INTO face_embeddings ("Id", "PersonId", "Vector", "QualityScore")
        VALUES (%s, %s, %s::vector, %s)
        ON CONFLICT ("Id") DO NOTHING
    """, (str(emb_id), str(person_id), vector_str, 0.85))

    print(f"Seeded Jane Doe (id={person_id})")
    print(f"Seeded embedding (id={emb_id})")
    print("Done.")

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()
