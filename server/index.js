import express from 'express';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

// Database connection
const pool = new pg.Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'mudik',
    password: process.env.DB_PASSWORD || 'postgres',
    port: parseInt(process.env.DB_PORT || '5432'),
});

app.use(express.json());

// Serve static files from the Vite build output (dist)
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Serve uploaded/static assets (KTP images)
const uploadsPath = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsPath));

// API: Lookup Registrant
app.get('/api/lookup/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM registrations WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Data tidak ditemukan' });
        }

        const data = result.rows[0];

        // Fetch passengers
        const passengersResult = await pool.query('SELECT * FROM passengers WHERE registration_id = $1 ORDER BY id ASC', [id]);

        res.json({
            id: data.id,
            phone: data.phone,
            ktpUrl: data.ktp_url,
            passengers: passengersResult.rows.map(p => ({
                id: p.id,
                nama: p.nama,
                isRegistrant: p.is_registrant,
                nik: p.nik,
                ktpUrl: p.ktp_url,
                verified: p.verified,
                verifiedAt: p.verified_at,
                verifiedBy: p.verified_by
            }))
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// API: Lookup Registrant by last 4 NIK digits
app.get('/api/lookup-nik/:last4', async (req, res) => {
    try {
        const { last4 } = req.params;
        const normalized = (last4 || '').replace(/\D/g, '').slice(-4);

        if (normalized.length !== 4) {
            return res.status(400).json({ error: 'Input harus 4 digit terakhir NIK' });
        }

        const regMatchResult = await pool.query(
            `SELECT DISTINCT p.registration_id
             FROM passengers p
             WHERE RIGHT(regexp_replace(COALESCE(p.nik, ''), '\\D', '', 'g'), 4) = $1
             ORDER BY p.registration_id ASC`,
            [normalized]
        );

        if (regMatchResult.rows.length === 0) {
            return res.status(404).json({ error: 'Data tidak ditemukan' });
        }

        if (regMatchResult.rows.length > 1) {
            return res.status(409).json({
                error: 'Lebih dari satu grup cocok untuk 4 digit ini. Periksa KTP lalu lanjutkan manual.',
                matches: regMatchResult.rows.map(r => r.registration_id),
            });
        }

        const registrationId = regMatchResult.rows[0].registration_id;

        const regResult = await pool.query('SELECT * FROM registrations WHERE id = $1', [registrationId]);
        if (regResult.rows.length === 0) {
            return res.status(404).json({ error: 'Data tidak ditemukan' });
        }

        const passengersResult = await pool.query(
            'SELECT * FROM passengers WHERE registration_id = $1 ORDER BY id ASC',
            [registrationId]
        );

        const matchedPassengerIds = passengersResult.rows
            .filter((p) => {
                const nikDigits = String(p.nik || '').replace(/\D/g, '');
                return nikDigits.length >= 4 && nikDigits.slice(-4) === normalized;
            })
            .map((p) => p.id);

        const data = regResult.rows[0];

        res.json({
            id: data.id,
            phone: data.phone,
            ktpUrl: data.ktp_url,
            matchedPassengerIds,
            passengers: passengersResult.rows.map((p) => ({
                id: p.id,
                nama: p.nama,
                isRegistrant: p.is_registrant,
                nik: p.nik,
                ktpUrl: p.ktp_url,
                verified: p.verified,
                verifiedAt: p.verified_at,
                verifiedBy: p.verified_by,
            })),
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// API: Get All Registrations (for Admin Dashboard)
app.get('/api/registrations', async (req, res) => {
    try {
        // Fetch all registrations
        const regResult = await pool.query('SELECT * FROM registrations ORDER BY id ASC');
        if (regResult.rows.length === 0) {
            return res.json([]);
        }

        const registrations = regResult.rows;

        // Fetch all passengers
        const passResult = await pool.query('SELECT * FROM passengers ORDER BY registration_id ASC, id ASC');
        const passengers = passResult.rows;

        // Group passengers by registration_id
        const groupedData = registrations.map(reg => {
            return {
                id: reg.id,
                phone: reg.phone,
                ktpUrl: reg.ktp_url,
                idCardUrl: reg.id_card_url,
                passengers: passengers
                    .filter(p => p.registration_id === reg.id)
                    .map(p => ({
                        id: p.id,
                        nama: p.nama,
                        isRegistrant: p.is_registrant,
                        nik: p.nik,
                        ktpUrl: p.ktp_url,
                        verified: p.verified,
                        verifiedAt: p.verified_at,
                        verifiedBy: p.verified_by
                    }))
            };
        });

        res.json(groupedData);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// API: Verify Registrant
app.post('/api/verify', async (req, res) => {
    try {
        const { id, passengerIds, verifiedBy } = req.body;

        if (!passengerIds || passengerIds.length === 0) {
            return res.status(400).json({ error: 'Tidak ada penumpang yang dipilih' });
        }

        // Transaction to prevent race conditions
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            for (const pId of passengerIds) {
                // Check current status
                const checkRes = await client.query('SELECT verified, registration_id FROM passengers WHERE id = $1 FOR UPDATE', [pId]);

                if (checkRes.rows.length === 0) {
                    await client.query('ROLLBACK');
                    return res.status(404).json({ error: `Penumpang dengan ID ${pId} tidak ditemukan` });
                }

                if (checkRes.rows[0].registration_id !== id) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({ error: `Penumpang dengan ID ${pId} tidak valid untuk grup ini` });
                }

                if (checkRes.rows[0].verified) {
                    await client.query('ROLLBACK');
                    return res.status(409).json({ error: 'Ada peserta yang sudah diverifikasi sebelumnya' });
                }

                // Update status
                const now = new Date();
                await client.query(
                    'UPDATE passengers SET verified = TRUE, verified_at = $1, verified_by = $2 WHERE id = $3',
                    [now, verifiedBy, pId]
                );
            }

            await client.query('COMMIT');
            res.json({ success: true, verifiedAt: new Date() });
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// SPA Fallback: Serve index.html for any unknown routes
// SPA Fallback: Serve index.html for any unknown routes
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
