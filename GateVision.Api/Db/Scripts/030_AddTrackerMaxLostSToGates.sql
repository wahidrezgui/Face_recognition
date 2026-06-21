-- 030: Add SORT tracker max-lost-seconds to gates table.
-- Controls how long a face track survives without a matching detection.
-- Python env: GV_TRACKER_MAX_LOST_S  (default 3.0s)
ALTER TABLE gates
  ADD COLUMN IF NOT EXISTS "TrackerMaxLostS" DOUBLE PRECISION NOT NULL DEFAULT 3.0;
