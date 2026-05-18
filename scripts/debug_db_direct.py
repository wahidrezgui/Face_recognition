import sys, os, cv2, numpy as np, requests, json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "gate_vision_ai"))
from insightface.app import FaceAnalysis

app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
app.prepare(ctx_id=0, det_size=(320, 320))

# Get stored embeddings from the .NET backend persons/faces endpoint
# Pick the first Alice Johnson person
alice_id = "34720afd-c343-463c-8e6a-e40457f53d55"
bob_id = "1ff56bd2-1252-41d8-af0f-985f90399fa4"

HEADERS = {"X-API-Key": "dev-api-key-change-me"}

# Get Alice's face images (which might not have face images stored)
r = requests.get(f"http://localhost:5000/api/persons/{alice_id}/faces", headers=HEADERS)
print("Alice faces response:", r.status_code, json.dumps(r.json()[:1] if r.ok else r.text, indent=2)[:200])

# Grab test embeddings from the video
cap = cv2.VideoCapture(os.path.join(os.path.dirname(__file__), "..", "gate_vision_ai", "sample1.mp4"))
test_embs = []
frame_idx = 0
while len(test_embs) < 3 and frame_idx < 200:
    ret, frame = cap.read()
    if not ret: break
    frame_idx += 1
    if frame_idx % 10 != 0: continue
    faces = app.get(frame)
    for f in faces:
        if float(f.det_score) < 0.5: continue
        emb = f.embedding.astype(np.float32)
        test_embs.append({"emb": emb, "frame": frame_idx})
        break
cap.release()
print(f"Got {len(test_embs)} test embeddings")

# Compare test embeddings with themselves (should be high for same person across different frames)
print("\nTest embeddings mutual similarities:")
for i in range(min(6, len(test_embs))):
    for j in range(i+1, min(6, len(test_embs))):
        a = test_embs[i]["emb"]
        b = test_embs[j]["emb"]
        sim = float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))
        print(f"  Frame {test_embs[i]['frame']} vs Frame {test_embs[j]['frame']}: {sim:.4f}")

# Send one of the test embeddings to identify
emb = test_embs[0]["emb"].tolist()
r = requests.post("http://localhost:5000/api/identify",
    json={"embedding": emb, "frame_quality": 0.9, "captured_at": "2026-01-01T00:00:00"},
    headers=HEADERS)
print(f"\nIdentify result for frame {test_embs[0]['frame']}:")
print(json.dumps(r.json(), indent=2))
