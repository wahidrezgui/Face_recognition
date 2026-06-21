-- Step 3: slim persons table
-- Keep: Id, FullName, EnrollmentStatus, WelcomeMessage, ExternalSourceId, MilitaryNumber
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