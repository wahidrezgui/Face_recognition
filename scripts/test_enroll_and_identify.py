"""Minimal test: enroll a single embedding, then immediately identify with it."""
import sys, os, cv2, numpy as np, requests, json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "gate_vision_ai"))
from insightface.app import FaceAnalysis

HEADERS = {"X-API-Key": "dev-api-key-change-me"}

app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
app.prepare(ctx_id=0, det_size=(640, 640))

cap = cv2.VideoCapture(os.path.join(os.path.dirname(__file__), "..", "gate_vision_ai", "sample1.mp4"))
emb = None
for i in range(30):
    ret, frame = cap.read()
    if not ret: break
cap.release()
if frame is not None:
    faces = app.get(frame)
    if faces:
        f = faces[0]
        emb = f.embedding.astype(np.float32)
        print(f"Got embedding, norm={np.linalg.norm(emb):.4f}, first 10 values: {emb[:10].tolist()}")

if emb is None:
    print("No face found")
    sys.exit(1)

# Create person
r = requests.post("http://localhost:5000/api/persons", json={"fullName": "TestPerson", "department": "Test"}, headers=HEADERS)
r.raise_for_status()
pid = r.json()["id"]
print(f"Created person: {pid}")

# Enroll
r2 = requests.post(f"http://localhost:5000/api/persons/{pid}/enroll",
    json={"embeddings": [emb.tolist()], "qualityScore": 0.9},
    headers=HEADERS)
print(f"Enroll response: {r2.status_code} {r2.json()}")

# Now try to identify with IDENTICAL embedding
r3 = requests.post("http://localhost:5000/api/identify",
    json={"embedding": emb.tolist(), "frame_quality": 0.9, "captured_at": "2026-01-01T00:00:00"},
    headers=HEADERS)
d3 = r3.json()
print(f"Identify with SAME embedding: {d3.get('personName')} (confidence: {d3.get('confidence'):.4f})")

# Try with a different frame of the same person
cap2 = cv2.VideoCapture(os.path.join(os.path.dirname(__file__), "..", "gate_vision_ai", "sample1.mp4"))
emb2 = None
for i in range(60):
    ret, frame = cap2.read()
    if not ret: break
cap2.release()
if frame is not None:
    faces2 = app.get(frame)
    if faces2:
        f2 = faces2[0]
        emb2 = f2.embedding.astype(np.float32)
        sim = float(np.dot(emb, emb2) / (np.linalg.norm(emb) * np.linalg.norm(emb2)))
        print(f"Second embedding similarity to first: {sim:.4f}")
        r4 = requests.post("http://localhost:5000/api/identify",
            json={"embedding": emb2.tolist(), "frame_quality": 0.9, "captured_at": "2026-01-01T00:00:00"},
            headers=HEADERS)
        d4 = r4.json()
        print(f"Identify with DIFFERENT frame: {d4.get('personName')} (confidence: {d4.get('confidence'):.4f})")
