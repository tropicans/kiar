CREATE TABLE IF NOT EXISTS registrants (
    id VARCHAR(50) PRIMARY KEY,
    nama VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    ktp_url TEXT,
    verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP,
    verified_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed some test data
INSERT INTO registrants (id, nama, phone, ktp_url, verified) VALUES 
('REG-001', 'Ahmad Rizky', '081234567890', 'https://placehold.co/600x400/1a1a2e/a29bfe?text=KTP+Preview+%0AAhmad+Rizky', FALSE),
('REG-002', 'Siti Nurhaliza', '087654321098', 'https://placehold.co/600x400/1a1a2e/00d2a0?text=KTP+Preview+%0ASiti+Nurhaliza', TRUE),
('REG-003', 'Budi Santoso', '089912345678', 'https://placehold.co/600x400/1a1a2e/feca57?text=KTP+Preview+%0ABudi+Santoso', FALSE)
ON CONFLICT (id) DO NOTHING;
