import sys, os, cv2, numpy as np, requests, json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "gate_vision_ai"))
from insightface.app import FaceAnalysis

app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
app.prepare(ctx_id=0, det_size=(320, 320))

# Grab the first two distinct faces from the video
cap = cv2.VideoCapture(os.path.join(os.path.dirname(__file__), "..", "gate_vision_ai", "sample1.mp4"))
test_embs = []
frame_idx = 0
while len(test_embs) < 6 and frame_idx < 300:
    ret, frame = cap.read()
    if not ret:
        break
    frame_idx += 1
    if frame_idx % 10 != 0:
        continue
    faces = app.get(frame)
    for face in faces:
        if float(face.det_score) < 0.5:
            continue
        emb = face.embedding.astype(np.float32)
        # deduplicate
        dup = False
        for existing in test_embs:
            sim = np.dot(emb, existing) / (np.linalg.norm(emb) * np.linalg.norm(existing) + 1e-12)
            if sim > 0.7:
                dup = True
                break
        if not dup:
            test_embs.append(emb)
            print(f"Frame {frame_idx}: added face #{len(test_embs)}, norm={np.linalg.norm(emb):.4f}")
            if len(test_embs) >= 6:
                break
            break
    pass
cap.release()

print(f"\nCollected {len(test_embs)} distinct test embeddings")

# Get enrolled embeddings from DB via API - actually let's query DB directly
# For now, let me compute similarities between test embeddings
print("\nPairwise similarities between test embeddings:")
for i in range(len(test_embs)):
    for j in range(i+1, len(test_embs)):
        sim = np.dot(test_embs[i], test_embs[j]) / (np.linalg.norm(test_embs[i]) * np.linalg.norm(test_embs[j]) + 1e-12)
        print(f"  Face {i+1} vs Face {j+1}: {sim:.4f}")

# Send each to identify endpoint
for i, emb in enumerate(test_embs):
    r = requests.post("http://localhost:5000/api/identify",
        json={"embedding": emb.tolist(), "frame_quality": 0.9, "captured_at": "2026-01-01T00:00:00"},
        headers={"X-API-Key": "dev-api-key-change-me"})
    d = r.json()
    print(f"Face {i+1}: {d.get('personName', 'ERROR')} (confidence: {d.get('confidence', 0):.4f}, personId: {d.get('personId', 'N/A')})")
