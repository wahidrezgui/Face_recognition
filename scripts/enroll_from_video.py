import sys, os, logging, cv2, numpy as np, requests
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "gate_vision_ai"))
from insightface.app import FaceAnalysis

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")
logger = logging.getLogger("enroll_from_video")

VIDEO_PATH = os.path.join(os.path.dirname(__file__), "..", "gate_vision_ai", "sample1.mp4")
NET = "http://localhost:5000"
HEADERS = {"X-API-Key": "dev-api-key-change-me", "Content-Type": "application/json"}
SIM_TH = 0.55
FRAME_SKIP = 10
MAX_FRAMES = 80

def cos_sim(a, b):
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-12))

logger.info("Loading InsightFace...")
app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
app.prepare(ctx_id=0, det_size=(320, 320))

cap = cv2.VideoCapture(VIDEO_PATH)
all_embs = []
all_frames = []
n = 0
while n < MAX_FRAMES:
    ret, frame = cap.read()
    if not ret: break
    n += 1
    for _ in range(FRAME_SKIP - 1):
        if not cap.read(): break
    faces = app.get(frame)
    for f in faces:
        if float(f.det_score) >= 0.5:
            all_embs.append((f.embedding.astype(np.float32), n))
            all_frames.append(frame)
cap.release()
logger.info("Got %d face detections", len(all_embs))

if len(all_embs) < 10:
    logger.error("Too few detections: %d", len(all_embs)); sys.exit(1)

# Cluster
assigned = [False] * len(all_embs)
clusters = []
for i in range(len(all_embs)):
    if assigned[i]: continue
    c = [i]; assigned[i] = True
    for j in range(i + 1, len(all_embs)):
        if assigned[j]: continue
        if cos_sim(all_embs[i][0], all_embs[j][0]) >= SIM_TH:
            c.append(j); assigned[j] = True
    clusters.append(c)
clusters.sort(key=len, reverse=True)
logger.info("Cluster sizes: %s", [len(c) for c in clusters[:8]])

top = [c for c in clusters if len(c) >= 3][:2]
if len(top) < 2:
    logger.error("Need 2 clusters with >=3 samples, found %d", len(top)); sys.exit(1)

# Intra-cluster similarity check
for idx, c in enumerate(top):
    sims = []
    for i in range(len(c)):
        for j in range(i+1, len(c)):
            sims.append(cos_sim(all_embs[c[i]][0], all_embs[c[j]][0]))
    logger.info(f"Cluster {idx}: {len(c)} samples, intra-sim: mean={np.mean(sims):.3f}, min={min(sims):.3f}")

# Inter-cluster similarity check
sims_between = []
for i in top[0]:
    for j in top[1]:
        sims_between.append(cos_sim(all_embs[i][0], all_embs[j][0]))
logger.info(f"Between clusters: mean sim={np.mean(sims_between):.3f}, max={max(sims_between):.3f}")

for idx, (name, dept) in enumerate([("Alice Johnson", "Engineering"), ("Bob Smith", "Marketing")]):
    embs = [all_embs[i][0] for i in top[idx]]
    logger.info("Enrolling %s with %d samples", name, len(embs))
    r = requests.post(f"{NET}/api/persons", json={"fullName": name, "department": dept}, headers=HEADERS)
    pid = r.json()["id"]
    requests.post(f"{NET}/api/persons/{pid}/enroll", json={"embeddings": [e.tolist() for e in embs], "qualityScore": 0.9}, headers=HEADERS).raise_for_status()
    logger.info("Enrolled %s (ID: %s)", name, pid)

# Verify using the SAME Python session (same model instance)
logger.info("=== Verification ===")
correct = 0
total = 0
# Test with first embedding of each cluster - exact expected match
for idx, name in enumerate(["Alice Johnson", "Bob Smith"]):
    emb = all_embs[top[idx][0]][0]
    # Direct sim with enrolled cluster center
    cluster_embs = [all_embs[i][0] for i in top[idx]]
    center = np.mean(cluster_embs, axis=0)
    sim_to_center = cos_sim(emb, center)
    logger.info(f"{name} self-sim (to cluster center): {sim_to_center:.4f}")
    
    r = requests.post(f"{NET}/api/identify", json={"embedding": emb.tolist(), "frame_quality": 0.9, "captured_at": "2026-01-01T00:00:00"}, headers=HEADERS)
    d = r.json()
    logger.info(f"{name} identify: {d.get('personName')} (conf: {d.get('confidence'):.4f})")

# Test with cross-frame embeddings
for idx in range(min(20, len(all_embs))):
    emb, frame_n = all_embs[idx]
    r = requests.post(f"{NET}/api/identify", json={"embedding": emb.tolist(), "frame_quality": 0.9, "captured_at": "2026-01-01T00:00:00"}, headers=HEADERS)
    d = r.json()
    pname = d.get("personName", "?")
    conf = d.get("confidence", 0)
    total += 1
    if pname in ("Alice Johnson", "Bob Smith"):
        correct += 1
    print(f"  frame~{frame_n}: {pname} ({conf:.3f})")

logger.info("Verified: %d/%d recognized", correct, total)
