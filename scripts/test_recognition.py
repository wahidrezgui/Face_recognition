import sys, os, cv2, numpy as np, requests, logging

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "gate_vision_ai"))
from insightface.app import FaceAnalysis

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("test_recognition")

app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
app.prepare(ctx_id=0, det_size=(320, 320))

video_path = os.path.join(os.path.dirname(__file__), "..", "gate_vision_ai", "sample1.mp4")
cap = cv2.VideoCapture(video_path)
results = []
frame_idx = 0

while True:
    ret, frame = cap.read()
    if not ret or frame_idx > 300:
        break
    frame_idx += 1
    if frame_idx % 15 != 0:
        continue
    faces = app.get(frame)
    for face in faces:
        if float(face.det_score) < 0.5:
            continue
        emb = face.embedding.astype(np.float32).tolist()
        r = requests.post(
            "http://localhost:5000/api/identify",
            json={"embedding": emb, "frame_quality": 0.9, "captured_at": "2026-01-01T00:00:00"},
            headers={"X-API-Key": "dev-api-key-change-me"},
        )
        data = r.json()
        name = data.get("match", {}).get("personName", "UNKNOWN")
        conf = data.get("match", {}).get("confidence", 0)
        print(f"Frame {frame_idx}: {name} (confidence: {conf:.3f})")
        results.append((name, conf))
        break

cap.release()

print(f"\n--- Recognition Results ---")
print(f"Total identifications: {len(results)}")
unique = set(r[0] for r in results)
for name in sorted(unique):
    count = sum(1 for r in results if r[0] == name)
    avg_conf = sum(r[1] for r in results if r[0] == name) / count
    print(f"  {name}: {count} times, avg confidence: {avg_conf:.3f}")
