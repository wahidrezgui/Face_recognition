"""Enroll faces directly by inserting embeddings into PostgreSQL.
This bypasses the .NET API to ensure data persists correctly.

Usage:
    python scripts/direct_enroll.py <video_path> [name1] [name2]
"""

import sys
import os
import uuid
import logging

import cv2
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "gate_vision_ai"))
from insightface.app import FaceAnalysis

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")
logger = logging.getLogger("direct_enroll")

VIDEO_PATH = os.path.join(os.path.dirname(__file__), "..", "gate_vision_ai", "sample1.mp4")
DB_DSN = "postgresql://gatevision:localdev@localhost:6667/gatevision"

FRAME_SKIP = 10
MAX_FRAMES = 60
SIMILARITY_THRESHOLD = 0.5


def cosine_similarity(a, b):
    a_norm = a / (np.linalg.norm(a) + 1e-12)
    b_norm = b / (np.linalg.norm(b) + 1e-12)
    return float(np.dot(a_norm, b_norm))


def main():
    import psycopg2
    conn = psycopg2.connect(DB_DSN)
    cur = conn.cursor()

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

    # Clean existing entries for these persons
    for name in person_names:
        cur.execute('DELETE FROM face_embeddings WHERE "PersonId" IN (SELECT "Id" FROM persons WHERE "FullName" = %s)', (name,))
        cur.execute('DELETE FROM gate_events WHERE "PersonId" IN (SELECT "Id" FROM persons WHERE "FullName" = %s)', (name,))
        cur.execute('DELETE FROM persons WHERE "FullName" = %s', (name,))
        logger.info("Cleaned existing entries for %s", name)
    conn.commit()

    for idx, cluster in enumerate(top_clusters):
        name = person_names[idx]
        dept = departments[idx]
        embs = [all_embeddings[i] for i in cluster]

        # Average the embeddings
        avg_emb = np.mean(embs, axis=0).astype(np.float32)

        # Create person
        person_id = str(uuid.uuid4())
        cur.execute(
            'INSERT INTO persons ("Id", "FullName", "Department", "EnrollmentStatus", "CreatedAt") VALUES (%s, %s, %s, %s, NOW())',
            (person_id, name, dept, "Active")
        )

        # Insert averaged embedding as vector
        emb_str = "[" + ",".join(f"{v:.8f}" for v in avg_emb) + "]"
        emb_id = str(uuid.uuid4())
        cur.execute(
            'INSERT INTO face_embeddings ("Id", "PersonId", "Vector", "QualityScore", "CreatedAt") VALUES (%s, %s, %s::vector, %s, NOW())',
            (emb_id, person_id, emb_str, 0.9)
        )
        logger.info("Enrolled %s (person_id=%s, emb_id=%s, samples=%d)", name, person_id, emb_id, len(embs))

    conn.commit()
    cur.close()
    conn.close()
    logger.info("Done! Enrolled %d persons via direct DB insert.", len(top_clusters))


if __name__ == "__main__":
    main()
