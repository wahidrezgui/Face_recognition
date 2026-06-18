-- Direction removal
ALTER TABLE gate_events DROP COLUMN IF EXISTS "Direction";
ALTER TABLE validated_events DROP COLUMN IF EXISTS "Direction";
ALTER TABLE training_events DROP COLUMN IF EXISTS "Direction";
ALTER TABLE gates DROP COLUMN IF EXISTS "Direction";
-- Person slim-down (keep: Id, FullName, EnrollmentStatus, WelcomeMessage, ExternalSourceId, MilitaryNumber)
ALTER TABLE persons DROP COLUMN IF EXISTS "Department",
  DROP COLUMN IF EXISTS "CreatedAt",
  DROP COLUMN IF EXISTS "QrCode",
  DROP COLUMN IF EXISTS "PhoneNumber",
  DROP COLUMN IF EXISTS "FullNameEn",
  DROP COLUMN IF EXISTS "FullNameAr",
  DROP COLUMN IF EXISTS "DepartmentId",
  DROP COLUMN IF EXISTS "RankId",
  DROP COLUMN IF EXISTS "NationalityId",
  DROP COLUMN IF EXISTS "IsEmployee",
  DROP COLUMN IF EXISTS "Qid",
  DROP COLUMN IF EXISTS "DefaultBase",
  DROP COLUMN IF EXISTS "Remarks",
  DROP COLUMN IF EXISTS "BloodType",
  DROP COLUMN IF EXISTS "JobArabic";