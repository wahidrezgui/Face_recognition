"""Simulate a gate event by sending a random embedding to the .NET backend.

Usage:
    python scripts/simulate_event.py [api_url]

Default: http://localhost:5000/api/identify
"""

import sys
import json
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

API_URL = (
    sys.argv[1]
    if len(sys.argv) > 1
    else "http://localhost:5000/api/identify"
)


def main():
    rng = np.random.RandomState(np.random.randint(0, 2**31))
    embedding = rng.randn(512).astype(np.float32)
    embedding = embedding / np.linalg.norm(embedding)

    body = {
        "embedding": embedding.tolist(),
        "frame_quality": 0.85,
        "captured_at": datetime.now(timezone.utc).isoformat(),
    }

    print(f"POST {API_URL}")
    print(f"  embedding[:5]={embedding[:5].tolist()}...")
    print(f"  frame_quality={body['frame_quality']}")

    resp = httpx.post(API_URL, json=body, timeout=10)
    print(f"  status={resp.status_code}")
    print(f"  response={json.dumps(resp.json(), indent=2)}")


if __name__ == "__main__":
    main()
