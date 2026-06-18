-- Rollback 023: restore Direction column to all event tables and gates
ALTER TABLE gate_events      ADD COLUMN IF NOT EXISTS "Direction" VARCHAR(10) NOT NULL DEFAULT 'Entry';
ALTER TABLE training_events  ADD COLUMN IF NOT EXISTS "Direction" VARCHAR(10) NOT NULL DEFAULT 'Entry';
ALTER TABLE validated_events ADD COLUMN IF NOT EXISTS "Direction" VARCHAR(10) NOT NULL DEFAULT 'Entry';
ALTER TABLE gates             ADD COLUMN IF NOT EXISTS "Direction" VARCHAR(10) NOT NULL DEFAULT 'entry';

-- Rollback 023: restore dropped persons columns
ALTER TABLE persons
  ADD COLUMN IF NOT EXISTS "Department"    VARCHAR(100) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "CreatedAt"     TIMESTAMP    NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS "QrCode"        VARCHAR(50)  NULL,
  ADD COLUMN IF NOT EXISTS "PhoneNumber"   VARCHAR(20)  NULL,
  ADD COLUMN IF NOT EXISTS "FullNameEn"    VARCHAR(200) NULL,
  ADD COLUMN IF NOT EXISTS "FullNameAr"    VARCHAR(200) NULL,
  ADD COLUMN IF NOT EXISTS "DepartmentId"  INT          NULL,
  ADD COLUMN IF NOT EXISTS "RankId"        INT          NULL,
  ADD COLUMN IF NOT EXISTS "NationalityId" INT          NULL,
  ADD COLUMN IF NOT EXISTS "IsEmployee"    BOOLEAN      NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS "Qid"           VARCHAR(50)  NULL,
  ADD COLUMN IF NOT EXISTS "DefaultBase"   INT          NULL,
  ADD COLUMN IF NOT EXISTS "Remarks"       TEXT         NULL,
  ADD COLUMN IF NOT EXISTS "BloodType"     VARCHAR(50)  NULL,
  ADD COLUMN IF NOT EXISTS "JobArabic"     VARCHAR(200) NULL;

-- Rollback 024: remove gate mode flags (Gate entity does not map these)
ALTER TABLE gates DROP COLUMN IF EXISTS "LogUnknown";
ALTER TABLE gates DROP COLUMN IF EXISTS "TrainingMode";
