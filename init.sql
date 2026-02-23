DROP TABLE IF EXISTS passengers;
DROP TABLE IF EXISTS registrations;

CREATE TABLE registrations (
    id VARCHAR(50) PRIMARY KEY,
    phone VARCHAR(50),
    ktp_url TEXT,
    id_card_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE passengers (
    id SERIAL PRIMARY KEY,
    registration_id VARCHAR(50) REFERENCES registrations(id) ON DELETE CASCADE,
    nama VARCHAR(255) NOT NULL,
    is_registrant BOOLEAN DEFAULT FALSE,
    nik VARCHAR(50),
    ktp_url TEXT,
    verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP,
    verified_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed test data
INSERT INTO registrations (id, phone, ktp_url) VALUES 
('REG-001', '081234567890', 'https://placehold.co/600x400/1a1a2e/a29bfe?text=KTP'),
('REG-002', '087654321098', 'https://placehold.co/600x400/1a1a2e/00d2a0?text=KTP');

INSERT INTO passengers (registration_id, nama, is_registrant, nik, ktp_url, verified) VALUES 
('REG-001', 'Ahmad Rizky (Utama)', TRUE, '3201112233445566', NULL, FALSE),
('REG-001', 'Istri Ahmad', FALSE, '3201112233445566', NULL, FALSE),
('REG-001', 'Adik Ahmad', FALSE, '3201998877665544', NULL, FALSE),
('REG-002', 'Siti Nurhaliza (Utama)', TRUE, '3174556677889900', NULL, TRUE),
('REG-002', 'Suami Siti', FALSE, '3174556677889900', NULL, FALSE);

