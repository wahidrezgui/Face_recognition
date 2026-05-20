-- Migration: Drop face_embeddings table after Qdrant migration.
-- All embedding data migrated to Qdrant. pgvector extension is removed by 010.

DROP INDEX IF EXISTS idx_face_embeddings_vector;
DROP INDEX IF EXISTS idx_fe_person_id;
DROP TABLE IF EXISTS face_embeddings;
