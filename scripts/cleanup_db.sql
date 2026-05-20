-- Remove gate_events referencing test persons
DELETE FROM gate_events WHERE "PersonId" IN (
  SELECT "Id" FROM persons WHERE "FullName" IN ('Alice Johnson', 'Bob Smith', 'TestPerson', '45454545')
);
-- Note: face_embeddings table was dropped in migration 009.
-- Remove Qdrant points via .NET API (DELETE /api/persons/{id}) or Qdrant REST API.
-- Remove test persons
DELETE FROM persons WHERE "FullName" IN ('Alice Johnson', 'Bob Smith', 'TestPerson', '45454545');
