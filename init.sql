-- KIAR Mudik YKSN 2026 — Database Schema
-- Run automatically on first Docker volume creation

-- Drop in correct dependency order
DROP TABLE IF EXISTS admin_change_logs;
DROP TABLE IF EXISTS passenger_verifications;
DROP TABLE IF EXISTS sync_runs;
DROP TABLE IF EXISTS passengers;
DROP TABLE IF EXISTS registrations;

CREATE TABLE registrations (
    id VARCHAR(50) PRIMARY KEY,
    phone VARCHAR(50),
    phone_raw VARCHAR(100),
    ktp_url TEXT,
    id_card_url TEXT,
    jurusan TEXT,
    kota_tujuan TEXT,
    kelompok_bis TEXT,
    bis TEXT,
    jumlah_orang INTEGER,
    kapasitas_bis INTEGER,
    active BOOLEAN DEFAULT TRUE,
    last_seen_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE passengers (
    id SERIAL PRIMARY KEY,
    registration_id VARCHAR(50) REFERENCES registrations(id) ON DELETE CASCADE,
    source_slot SMALLINT,
    nama VARCHAR(255) NOT NULL,
    nama_raw VARCHAR(255),
    nama_normalized VARCHAR(255),
    is_registrant BOOLEAN DEFAULT FALSE,
    nik VARCHAR(50),
    ktp_url TEXT,
    verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP,
    verified_by VARCHAR(100),
    active BOOLEAN DEFAULT TRUE,
    last_seen_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX passengers_registration_slot_uidx ON passengers (registration_id, source_slot) WHERE source_slot IS NOT NULL;

CREATE TABLE passenger_verifications (
    id BIGSERIAL PRIMARY KEY,
    passenger_id INTEGER NOT NULL REFERENCES passengers(id) ON DELETE CASCADE,
    verified_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    verified_by VARCHAR(100) NOT NULL DEFAULT 'Unknown',
    source VARCHAR(20) NOT NULL DEFAULT 'scanner',
    action VARCHAR(20) NOT NULL DEFAULT 'verify',
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE admin_change_logs (
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

CREATE INDEX passenger_verifications_passenger_idx ON passenger_verifications (passenger_id, verified_at DESC, id DESC);

CREATE TABLE sync_runs (
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
