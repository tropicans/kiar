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
    database: process.env.DB_NAME || 'kyara',
    password: process.env.DB_PASSWORD || 'postgres',
    port: parseInt(process.env.DB_PORT || '5432'),
});

app.use(express.json());

// Serve static files from the Vite build output (dist)
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// API: Lookup Registrant
app.get('/api/lookup/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM registrants WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Data tidak ditemukan' });
        }

        const data = result.rows[0];
        res.json({
            id: data.id,
            nama: data.nama,
            phone: data.phone,
            ktpUrl: data.ktp_url,
            verified: data.verified,
            verifiedAt: data.verified_at,
            verifiedBy: data.verified_by
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// API: Verify Registrant
app.post('/api/verify', async (req, res) => {
    try {
        const { id, verifiedBy } = req.body;

        // Transaction to prevent race conditions
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Check current status
            const checkRes = await client.query('SELECT verified FROM registrants WHERE id = $1 FOR UPDATE', [id]);

            if (checkRes.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Data tidak ditemukan' });
            }

            if (checkRes.rows[0].verified) {
                await client.query('ROLLBACK');
                return res.status(409).json({ error: 'Peserta sudah diverifikasi sebelumnya' });
            }

            // Update status
            const now = new Date();
            await client.query(
                'UPDATE registrants SET verified = TRUE, verified_at = $1, verified_by = $2 WHERE id = $3',
                [now, verifiedBy, id]
            );

            await client.query('COMMIT');
            res.json({ success: true, verifiedAt: now });
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
