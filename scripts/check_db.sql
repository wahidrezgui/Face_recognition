-- Note: face_embeddings table was dropped in migration 009.
-- Embeddings are now stored in Qdrant. Use the .NET API to inspect enrollment.
SELECT "Id", "FullName", "Department", "EnrollmentStatus", "CreatedAt"
FROM persons
WHERE "FullName" IN ('Alice Johnson', 'Bob Smith')
ORDER BY "FullName", "CreatedAt";
