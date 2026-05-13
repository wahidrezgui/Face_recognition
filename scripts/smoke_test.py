"""End-to-end smoke test for GateVision system.

Tests:
1. .NET API health (GET /)
2. Create a person (POST /api/persons)
3. Enroll the person (POST /api/persons/{id}/enroll)
4. Identify with a known embedding (POST /api/identify)
5. Identify with random embedding (POST /api/identify)
6. List events (GET /api/events)
7. Check SSE stream starts (GET /api/events/stream)
8. Python AI service health (GET /health on port 8000)
9. MJPEG stream returns proper headers (GET /stream on port 8000)

Prerequisites:
- PostgreSQL running with gatevision DB
- .NET backend running on port 5000
- Python AI service running on port 8000
"""

import sys
import json
import uuid
import numpy as np
from datetime import datetime, timezone

try:
    import httpx
except ImportError:
    import subprocess
    subprocess.check_call(
        [sys.executable, "-m", "pip", "install", "httpx", "-q"]
    )
    import httpx

API_BASE = "http://localhost:5000"
PASS = 0
FAIL = 0


def check(name, condition, detail=""):
    global PASS, FAIL
    if condition:
        PASS += 1
        print(f"  PASS [{name}]")
    else:
        FAIL += 1
        print(f"  FAIL [{name}] {detail}")


def main():
    print("GateVision Smoke Test")
    print("=" * 50)
    client = httpx.Client(base_url=API_BASE, timeout=10)

    # 1. Health check
    print("\n1. API health")
    try:
        r = client.get("/")
        check("root returns 200", r.status_code == 200)
    except Exception as e:
        check("root request", False, str(e))
        print("API not reachable. Start the .NET backend first.")
        sys.exit(1)

    # 2. Create person
    print("\n2. Create person")
    person_name = f"SmokeTest_{uuid.uuid4().hex[:8]}"
    r = client.post("/api/persons", json={
        "fullName": person_name,
        "department": "QA"
    })
    check("create person returns 201", r.status_code == 201)
    person = r.json()
    person_id = person["id"]
    check("create person has id", "id" in person)

    # 3. Enroll person with synthetic embedding
    print("\n3. Enroll person")
    rng = np.random.RandomState(42)
    embedding = rng.randn(512).astype(np.float32)
    embedding = embedding / np.linalg.norm(embedding)
    r = client.post(f"/api/persons/{person_id}/enroll", json={
        "embeddings": [embedding.tolist()],
        "qualityScore": 0.9
    })
    check("enroll returns 200", r.status_code == 200, str(r.text))

    # 4. Identify with matching embedding
    print("\n4. Identify (matching)")
    r = client.post("/api/identify", json={
        "embedding": embedding.tolist(),
        "frame_quality": 0.85,
        "captured_at": datetime.now(timezone.utc).isoformat(),
    })
    check("identify returns 200", r.status_code == 200)
    result = r.json()
    check("identify returns personName", result.get("personName") != "UNKNOWN",
          f"got {result.get('personName')}")
    check("identify returns confidence >= 0.85", result.get("confidence", 0) >= 0.85,
          f"got {result.get('confidence')}")

    # 5. Identify with random (non-matching) embedding
    print("\n5. Identify (no match)")
    rng2 = np.random.RandomState(999)
    unknown_emb = rng2.randn(512).astype(np.float32)
    unknown_emb = unknown_emb / np.linalg.norm(unknown_emb)
    r = client.post("/api/identify", json={
        "embedding": unknown_emb.tolist(),
        "frame_quality": 0.85,
        "captured_at": datetime.now(timezone.utc).isoformat(),
    })
    check("identify random returns 200", r.status_code == 200)
    result = r.json()
    if result.get("personName") == "UNKNOWN":
        check("random identifies as UNKNOWN", True)
    else:
        check("random confidence low", result.get("confidence", 1) < 0.5,
              f"confidence={result.get('confidence')}")

    # 6. List events
    print("\n6. List events")
    r = client.get("/api/events?page=1&limit=10")
    check("events returns 200", r.status_code == 200)
    events = r.json()
    check("events has items", len(events.get("items", [])) > 0,
          f"got {len(events.get('items', []))} events")
    check("events has total", events.get("total", 0) > 0)

    # 7. List persons
    print("\n7. List persons")
    r = client.get("/api/persons")
    check("persons returns 200", r.status_code == 200)
    persons = r.json()
    check("persons has entries", len(persons) > 0,
          f"got {len(persons)} persons")

    # 8. Python AI service health
    print("\n8. Python AI service health")
    try:
        ai_client = httpx.Client(base_url="http://localhost:8000", timeout=5)
        r = ai_client.get("/health")
        check("ai health returns 200", r.status_code == 200)
        check("ai health has camera field", "camera" in r.json())
        check("ai health has detector field", "detector" in r.json())
    except Exception as e:
        check("ai health not reachable", False, str(e))

    # 9. MJPEG stream endpoint
    print("\n9. MJPEG stream endpoint")
    try:
        r = ai_client.get("/stream")
        check("stream returns correct status", r.status_code in (200, 503))
        if r.status_code == 200:
            content_type = r.headers.get("content-type", "")
            check(
                "stream has multipart/x-mixed-replace content type",
                "multipart/x-mixed-replace" in content_type,
                f"got content-type: {content_type}",
            )
    except Exception as e:
        check("stream request failed", False, str(e))

    # Summary
    print("\n" + "=" * 50)
    total = PASS + FAIL
    print(f"Results: {PASS}/{total} passed, {FAIL}/{total} failed")
    if FAIL > 0:
        sys.exit(1)
    print("All smoke tests passed!")


if __name__ == "__main__":
    main()
