ALTER TABLE persons
  ADD COLUMN IF NOT EXISTS "ExternalSourceId" VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS "QrCode"           VARCHAR(50)  NULL,
  ADD COLUMN IF NOT EXISTS "MilitaryNumber"   INT          NULL,
  ADD COLUMN IF NOT EXISTS "PhoneNumber"      VARCHAR(20)  NULL,
  ADD COLUMN IF NOT EXISTS "FullNameEn"       VARCHAR(200) NULL,
  ADD COLUMN IF NOT EXISTS "FullNameAr"       VARCHAR(200) NULL,
  ADD COLUMN IF NOT EXISTS "DepartmentId"     INT          NULL,
  ADD COLUMN IF NOT EXISTS "RankId"           INT          NULL,
  ADD COLUMN IF NOT EXISTS "NationalityId"    INT          NULL,
  ADD COLUMN IF NOT EXISTS "IsEmployee"       BOOLEAN      NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS "Qid"              VARCHAR(50)  NULL,
  ADD COLUMN IF NOT EXISTS "DefaultBase"      INT          NULL,
  ADD COLUMN IF NOT EXISTS "Remarks"          TEXT         NULL,
  ADD COLUMN IF NOT EXISTS "BloodType"        VARCHAR(10)  NULL,
  ADD COLUMN IF NOT EXISTS "JobArabic"        VARCHAR(200) NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ix_persons_external_source_id
  ON persons ("ExternalSourceId") WHERE "ExternalSourceId" IS NOT NULL;
