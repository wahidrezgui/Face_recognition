"""Verify enrollment from a FRESH Python session (new InsightFace instance)."""
import sys, os, cv2, numpy as np, requests, time
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "gate_vision_ai"))
from insightface.app import FaceAnalysis

VIDEO_PATH = os.path.join(os.path.dirname(__file__), "..", "gate_vision_ai", "sample1.mp4")
NET = "http://localhost:5000"
HEADERS = {"X-API-Key": "dev-api-key-change-me", "Content-Type": "application/json"}

app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
app.prepare(ctx_id=0, det_size=(320, 320))

cap = cv2.VideoCapture(VIDEO_PATH)
correct = 0
total = 0
frame_idx = 0

while total < 30:
    ret, frame = cap.read()
    if not ret: break
    frame_idx += 1
    if frame_idx % 15 != 0: continue
    faces = app.get(frame)
    for f in faces:
        if float(f.det_score) < 0.5: continue
        total += 1
        emb = f.embedding.astype(np.float32).tolist()
        try:
            r = requests.post(f"{NET}/api/identify",
                json={"embedding": emb, "frame_quality": 0.9, "captured_at": "2026-01-01T00:00:00"},
                headers=HEADERS, timeout=5)
            d = r.json()
        except Exception:
            time.sleep(0.5)
            continue
        name = d.get("personName", "?")
        conf = d.get("confidence", 0)
        if name in ("Alice Johnson", "Bob Smith"):
            correct += 1
        print(f"  frame {frame_idx}: {name} ({conf:.3f})")
        time.sleep(0.1)
        break

cap.release()
print(f"\nResult: {correct}/{total} recognized ({correct*100//max(total,1)}%)")
