-- Seed a test person and a synthetic 512-dim embedding for dev verification
-- Idempotent: ON CONFLICT / WHERE NOT EXISTS prevent duplicate inserts

INSERT INTO persons ("Id", "FullName", "Department", "EnrollmentStatus", "CreatedAt")
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Test User',
    'Engineering',
    'Active',
    NOW()
) ON CONFLICT ("Id") DO NOTHING;
