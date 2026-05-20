"""Enroll faces via the .NET API (replaced direct pgvector insert).
Face embeddings are now stored in Qdrant by the .NET backend.

Usage:
    python scripts/direct_enroll.py <video_path> [name1] [name2]
"""

import sys
import os
import logging

import cv2
import numpy as np
import requests

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "gate_vision_ai"))
from insightface.app import FaceAnalysis

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")
logger = logging.getLogger("direct_enroll")

VIDEO_PATH = os.path.join(os.path.dirname(__file__), "..", "gate_vision_ai", "sample1.mp4")
NET = "http://localhost:5000"
HEADERS = {"X-API-Key": "dev-api-key-change-me", "Content-Type": "application/json"}

FRAME_SKIP = 10
MAX_FRAMES = 60
SIMILARITY_THRESHOLD = 0.5


def cosine_similarity(a, b):
    a_norm = a / (np.linalg.norm(a) + 1e-12)
    b_norm = b / (np.linalg.norm(b) + 1e-12)
    return float(np.dot(a_norm, b_norm))


def main():
    logger.info("Loading InsightFace...")
    app = FaceAnalysis(name="buffalo_l", providers=["CUDAExecutionProvider", "CPUExecutionProvider"])
    app.prepare(ctx_id=0, det_size=(640, 640))

    cap = cv2.VideoCapture(VIDEO_PATH)

    all_embeddings = []
    frame_count = 0
    processed = 0

    while processed < MAX_FRAMES:
        ret, frame = cap.read()
        if not ret:
            break
        frame_count += 1
        if frame_count % FRAME_SKIP != 0:
            continue
        processed += 1

        faces = app.get(frame)
        for face in faces:
            if float(face.det_score) >= 0.5:
                all_embeddings.append(face.embedding.astype(np.float32))

    cap.release()
    logger.info("Processed %d frames, %d face detections", processed, len(all_embeddings))

    if len(all_embeddings) < 6:
        logger.error("Too few detections: %d", len(all_embeddings))
        return

    clusters = []
    assigned = [False] * len(all_embeddings)
    for i in range(len(all_embeddings)):
        if assigned[i]:
            continue
        cluster = [i]
        assigned[i] = True
        for j in range(i + 1, len(all_embeddings)):
            if assigned[j]:
                continue
            sim = cosine_similarity(all_embeddings[i], all_embeddings[j])
            if sim >= SIMILARITY_THRESHOLD:
                cluster.append(j)
                assigned[j] = True
        clusters.append(cluster)

    clusters.sort(key=lambda c: len(c), reverse=True)
    logger.info("Clusters: %s", [len(c) for c in clusters])

    top_clusters = [c for c in clusters if len(c) >= 3][:2]
    if len(top_clusters) < 2:
        logger.error("Need 2 clusters with >=3 detections")
        return

    person_names = ["Alice Johnson", "Bob Smith"]
    departments = ["Engineering", "Marketing"]

    # Clean existing entries via the .NET API
    for name in person_names:
        resp = requests.get(f"{NET}/api/persons", headers=HEADERS)
        for p in resp.json():
            if p.get("fullName") == name:
                requests.delete(f"{NET}/api/persons/{p['id']}", headers=HEADERS)
                logger.info("Deleted existing %s (ID: %s)", name, p['id'])

    for idx, cluster in enumerate(top_clusters):
        name = person_names[idx]
        dept = departments[idx]
        embs = [all_embeddings[i] for i in cluster]

        # Average the embeddings
        avg_emb = np.mean(embs, axis=0).astype(np.float32)

        # Create person via .NET API
        r = requests.post(f"{NET}/api/persons", json={"fullName": name, "department": dept}, headers=HEADERS)
        r.raise_for_status()
        pid = r.json()["id"]

        # Enroll via .NET API (stores in Qdrant)
        r2 = requests.post(f"{NET}/api/persons/{pid}/enroll",
            json={"embeddings": [avg_emb.tolist()], "qualityScore": 0.9},
            headers=HEADERS)
        r2.raise_for_status()
        logger.info("Enrolled %s (person_id=%s, samples=%d)", name, pid, len(embs))

    logger.info("Done! Enrolled %d persons via .NET API.", len(top_clusters))


if __name__ == "__main__":
    main()
