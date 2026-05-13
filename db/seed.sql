-- Seed a test person and a synthetic 512-dim embedding for verification
-- Run after init.sql and before testing POST /api/identify

INSERT INTO persons ("Id", "FullName", "Department", "EnrollmentStatus", "CreatedAt")
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Test User',
    'Engineering',
    'Active',
    NOW()
) ON CONFLICT ("Id") DO NOTHING;

-- Generate a 512-dim zero vector from a subquery (clean alternative to broken string_join/array_fill)
INSERT INTO face_embeddings ("Id", "PersonId", "Vector", "QualityScore", "CreatedAt")
SELECT
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    (SELECT ARRAY_TO_STRING(ARRAY_AGG(0::real), ',') FROM GENERATE_SERIES(1, 512))::vector,
    0.9,
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM face_embeddings WHERE "Id" = 'b0000000-0000-0000-0000-000000000001'
);
