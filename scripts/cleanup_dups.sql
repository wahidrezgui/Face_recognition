-- Note: face_embeddings table was dropped in migration 009.
-- Delete Qdrant points via .NET API or Qdrant REST API before removing persons.
DELETE FROM gate_events WHERE "PersonId" IN ('a22f8bd0-36cd-4518-85b7-16c60b77488d','17f4af3d-404b-499d-8bda-e4ed5aecd159');
DELETE FROM persons WHERE "Id" IN ('a22f8bd0-36cd-4518-85b7-16c60b77488d','17f4af3d-404b-499d-8bda-e4ed5aecd159');
