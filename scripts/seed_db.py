"""Seed a test person via .NET API (replaced direct pgvector insert).

Usage:
    python scripts/seed_db.py
"""

import sys
import requests
import numpy as np

NET = "http://localhost:5000"
HEADERS = {"X-API-Key": "dev-api-key-change-me", "Content-Type": "application/json"}


def main():
    # Create person via .NET API
    r = requests.post(f"{NET}/api/persons", json={"fullName": "Jane Doe", "department": "Security"}, headers=HEADERS)
    r.raise_for_status()
    pid = r.json()["id"]
    print(f"Created Jane Doe (id={pid})")

    # Generate a random unit embedding
    rng = np.random.RandomState(42)
    embedding = rng.randn(512).astype(np.float32)
    embedding = embedding / np.linalg.norm(embedding)

    # Enroll via .NET API (stores in Qdrant)
    r2 = requests.post(f"{NET}/api/persons/{pid}/enroll",
        json={"embeddings": [embedding.tolist()], "qualityScore": 0.85},
        headers=HEADERS)
    r2.raise_for_status()
    print(f"Enrolled embedding for Jane Doe")
    print("Done.")


if __name__ == "__main__":
    main()
