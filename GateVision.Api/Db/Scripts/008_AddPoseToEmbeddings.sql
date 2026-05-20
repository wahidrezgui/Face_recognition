-- Track the face angle/pose for each enrolled embedding.
-- Values: 'frontal', 'left', 'right', 'up', 'down', or NULL for legacy rows.
ALTER TABLE face_embeddings ADD COLUMN IF NOT EXISTS "Pose" VARCHAR(20);
