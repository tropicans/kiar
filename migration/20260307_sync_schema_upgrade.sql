BEGIN;

ALTER TABLE registrations ADD COLUMN IF NOT EXISTS phone_raw VARCHAR(100);
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP;

ALTER TABLE passengers ADD COLUMN IF NOT EXISTS source_slot SMALLINT;
ALTER TABLE passengers ADD COLUMN IF NOT EXISTS nama_raw VARCHAR(255);
ALTER TABLE passengers ADD COLUMN IF NOT EXISTS nama_normalized VARCHAR(255);
ALTER TABLE passengers ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;
ALTER TABLE passengers ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS passengers_registration_slot_uidx
ON passengers (registration_id, source_slot)
WHERE source_slot IS NOT NULL;

CREATE TABLE IF NOT EXISTS passenger_verifications (
    id BIGSERIAL PRIMARY KEY,
    passenger_id INTEGER NOT NULL REFERENCES passengers(id) ON DELETE CASCADE,
    verified_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    verified_by VARCHAR(100) NOT NULL DEFAULT 'Unknown',
    source VARCHAR(20) NOT NULL DEFAULT 'scanner',
    action VARCHAR(20) NOT NULL DEFAULT 'verify',
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_change_logs (
    id BIGSERIAL PRIMARY KEY,
    entity_type VARCHAR(30) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    field_name VARCHAR(50) NOT NULL,
    action VARCHAR(30) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    actor VARCHAR(100) NOT NULL DEFAULT 'Admin Dashboard',
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE passenger_verifications ADD COLUMN IF NOT EXISTS action VARCHAR(20) NOT NULL DEFAULT 'verify';
ALTER TABLE passenger_verifications ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS passenger_verifications_passenger_idx
ON passenger_verifications (passenger_id, verified_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS sync_runs (
    id BIGSERIAL PRIMARY KEY,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP,
    status VARCHAR(20) NOT NULL,
    rows_read INTEGER NOT NULL DEFAULT 0,
    rows_upserted INTEGER NOT NULL DEFAULT 0,
    rows_skipped INTEGER NOT NULL DEFAULT 0,
    error TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Backfill: normalize phone into canonical 62xxxxxxxxxx format.
UPDATE registrations
SET phone = CASE
    WHEN phone IS NULL OR btrim(phone) = '' THEN NULL
    ELSE (
        CASE
            WHEN regexp_replace(phone, '\\D', '', 'g') LIKE '62%' THEN regexp_replace(phone, '\\D', '', 'g')
            WHEN regexp_replace(phone, '\\D', '', 'g') LIKE '0%' THEN '62' || substr(regexp_replace(phone, '\\D', '', 'g'), 2)
            WHEN regexp_replace(phone, '\\D', '', 'g') LIKE '8%' THEN '62' || regexp_replace(phone, '\\D', '', 'g')
            ELSE regexp_replace(phone, '\\D', '', 'g')
        END
    )
END,
phone_raw = COALESCE(phone_raw, phone)
WHERE phone IS NOT NULL;

-- Backfill normalized names.
UPDATE passengers
SET nama_raw = COALESCE(nama_raw, nama),
    nama_normalized = COALESCE(
        nama_normalized,
        initcap(lower(regexp_replace(btrim(nama), '\\s+', ' ', 'g')))
    ),
    active = COALESCE(active, TRUE)
WHERE nama IS NOT NULL;

-- Backfill verification events from legacy columns (idempotent by natural key).
INSERT INTO passenger_verifications (passenger_id, verified_at, verified_by, source, action)
SELECT p.id,
       COALESCE(p.verified_at, p.created_at, CURRENT_TIMESTAMP),
       COALESCE(NULLIF(p.verified_by, ''), 'Unknown'),
       'import',
       'verify'
FROM passengers p
WHERE p.verified = TRUE
  AND NOT EXISTS (
      SELECT 1
      FROM passenger_verifications pv
      WHERE pv.passenger_id = p.id
  );

COMMIT;
