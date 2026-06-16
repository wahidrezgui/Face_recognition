-- 021: Add processing config fields to gates table.
-- Python processing instances pull these at startup via GET /api/gates/{id}/config.
ALTER TABLE gates
  ADD COLUMN IF NOT EXISTS "CameraSource"             VARCHAR(1000) NOT NULL DEFAULT '0',
  ADD COLUMN IF NOT EXISTS "Direction"                VARCHAR(10)   NOT NULL DEFAULT 'entry',
  ADD COLUMN IF NOT EXISTS "ProcessingFps"            INTEGER       NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS "ModelProfile"             VARCHAR(20)   NOT NULL DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS "DetectorInputWidth"       INTEGER           NULL,
  ADD COLUMN IF NOT EXISTS "DetectorInputHeight"      INTEGER           NULL,
  ADD COLUMN IF NOT EXISTS "MotionThreshold"          DOUBLE PRECISION  NOT NULL DEFAULT 0.02,
  ADD COLUMN IF NOT EXISTS "MotionPixelThreshold"     INTEGER       NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS "DetectMaxWidth"           INTEGER       NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "HikvisionUrl"             VARCHAR(500)  NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "HikvisionUser"            VARCHAR(100)  NOT NULL DEFAULT 'admin',
  ADD COLUMN IF NOT EXISTS "HikvisionPassword"        VARCHAR(200)      NULL,
  ADD COLUMN IF NOT EXISTS "HikvisionEventTtlMs"      INTEGER       NOT NULL DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS "HikvisionEventTypes"      VARCHAR(500)  NOT NULL DEFAULT 'VMD,fielddetection,linedetection',
  ADD COLUMN IF NOT EXISTS "HikvisionDetectionTarget" VARCHAR(100)  NOT NULL DEFAULT '';
