-- Remove gate_events referencing test persons
DELETE FROM gate_events WHERE "PersonId" IN (
  SELECT "Id" FROM persons WHERE "FullName" IN ('Alice Johnson', 'Bob Smith', 'TestPerson', '45454545')
);
-- Remove face embeddings for test persons
DELETE FROM face_embeddings WHERE "PersonId" IN (
  SELECT "Id" FROM persons WHERE "FullName" IN ('Alice Johnson', 'Bob Smith', 'TestPerson', '45454545')
);
-- Remove test persons
DELETE FROM persons WHERE "FullName" IN ('Alice Johnson', 'Bob Smith', 'TestPerson', '45454545');
