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

function normalizeNameQuery(rawValue) {
    return String(rawValue || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s'-.]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function mapPassengerRow(passenger) {
    return {
        id: passenger.id,
        registrationId: passenger.registration_id,
        nama: passenger.nama,
        nik: passenger.nik,
        ktpUrl: passenger.ktp_url,
        verified: passenger.verified,
        verifiedAt: passenger.verified_at,
        verifiedBy: passenger.verified_by,
    };
}

async function ensureAuditSchema() {
    await pool.query("ALTER TABLE passenger_verifications ADD COLUMN IF NOT EXISTS action VARCHAR(20) NOT NULL DEFAULT 'verify'");
    await pool.query('ALTER TABLE passenger_verifications ADD COLUMN IF NOT EXISTS notes TEXT');
}

async function appendPassengerVerificationEvents(client, passengerIds, verifiedBy, source, action, notes = null) {
    if (!Array.isArray(passengerIds) || passengerIds.length === 0) {
        return;
    }

    await client.query(
        `INSERT INTO passenger_verifications (passenger_id, verified_at, verified_by, source, action, notes)
         SELECT id, CURRENT_TIMESTAMP, $2, $3, $4, $5
         FROM unnest($1::int[]) AS id`,
        [passengerIds, verifiedBy || 'Unknown', source, action, notes]
    );
}

// API: Lookup Registrant
app.get('/api/lookup/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM registrations WHERE id = $1 AND COALESCE(active, TRUE) = TRUE', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Data tidak ditemukan' });
        }

        const data = result.rows[0];

        // Fetch passengers
        const passengersResult = await pool.query('SELECT * FROM passengers WHERE registration_id = $1 AND COALESCE(active, TRUE) = TRUE ORDER BY id ASC', [id]);

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

// API: Lookup Registrant by last 6 NIK digits
app.get('/api/lookup-nik/:last6', async (req, res) => {
    try {
        const { last6 } = req.params;
        const normalized = (last6 || '').replace(/\D/g, '').slice(-6);

        if (normalized.length !== 6) {
            return res.status(400).json({ error: 'Input harus 6 digit terakhir NIK' });
        }

        const regMatchResult = await pool.query(
            `SELECT DISTINCT p.registration_id
             FROM passengers p
             WHERE COALESCE(p.active, TRUE) = TRUE
               AND RIGHT(regexp_replace(COALESCE(p.nik, ''), '\\D', '', 'g'), 6) = $1
             ORDER BY p.registration_id ASC`,
            [normalized]
        );

        if (regMatchResult.rows.length === 0) {
            return res.status(404).json({ error: 'Data tidak ditemukan' });
        }

        if (regMatchResult.rows.length > 1) {
            return res.status(409).json({
                error: 'Lebih dari satu grup cocok untuk 6 digit ini. Periksa KTP lalu lanjutkan manual.',
                matches: regMatchResult.rows.map(r => r.registration_id),
            });
        }

        const registrationId = regMatchResult.rows[0].registration_id;

        const regResult = await pool.query('SELECT * FROM registrations WHERE id = $1 AND COALESCE(active, TRUE) = TRUE', [registrationId]);
        if (regResult.rows.length === 0) {
            return res.status(404).json({ error: 'Data tidak ditemukan' });
        }

        const passengersResult = await pool.query(
            'SELECT * FROM passengers WHERE registration_id = $1 AND COALESCE(active, TRUE) = TRUE ORDER BY id ASC',
            [registrationId]
        );

        const matchedPassengerIds = passengersResult.rows
            .filter((p) => {
                const nikDigits = String(p.nik || '').replace(/\D/g, '');
                return nikDigits.length >= 6 && nikDigits.slice(-6) === normalized;
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

// API: Search passengers by last 6 NIK digits
app.get('/api/search-nik/:last6', async (req, res) => {
    try {
        const { last6 } = req.params;
        const normalized = (last6 || '').replace(/\D/g, '').slice(-6);

        if (normalized.length !== 6) {
            return res.status(400).json({ error: 'Input harus 6 digit terakhir NIK' });
        }

        const result = await pool.query(
            `SELECT
                p.id,
                p.registration_id,
                p.nama,
                p.nik,
                p.ktp_url,
                p.verified,
                p.verified_at,
                p.verified_by
            FROM passengers p
            WHERE COALESCE(p.active, TRUE) = TRUE
              AND RIGHT(regexp_replace(COALESCE(p.nik, ''), '\\D', '', 'g'), 6) = $1
            ORDER BY p.nama ASC, p.id ASC`,
            [normalized]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Data tidak ditemukan' });
        }

        res.json({
            last6: normalized,
            passengers: result.rows.map(mapPassengerRow),
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// API: Search passengers by name
app.get('/api/search-name', async (req, res) => {
    try {
        const rawQuery = String(req.query.q || '');
        const normalized = normalizeNameQuery(rawQuery);

        if (normalized.length < 3) {
            return res.status(400).json({ error: 'Masukkan minimal 3 karakter nama pemudik' });
        }

        const containsPattern = `%${normalized}%`;
        const startsPattern = `${normalized}%`;

        const result = await pool.query(
            `SELECT
                p.id,
                p.registration_id,
                p.nama,
                p.nik,
                p.ktp_url,
                p.verified,
                p.verified_at,
                p.verified_by,
                lower(regexp_replace(COALESCE(p.nama_normalized, p.nama, ''), '\\s+', ' ', 'g')) AS search_name
            FROM passengers p
            WHERE COALESCE(p.active, TRUE) = TRUE
              AND lower(regexp_replace(COALESCE(p.nama_normalized, p.nama, ''), '\\s+', ' ', 'g')) LIKE $2
            ORDER BY
                CASE
                    WHEN lower(regexp_replace(COALESCE(p.nama_normalized, p.nama, ''), '\\s+', ' ', 'g')) = $1 THEN 0
                    WHEN lower(regexp_replace(COALESCE(p.nama_normalized, p.nama, ''), '\\s+', ' ', 'g')) LIKE $3 THEN 1
                    ELSE 2
                END,
                length(lower(regexp_replace(COALESCE(p.nama_normalized, p.nama, ''), '\\s+', ' ', 'g'))) ASC,
                p.nama ASC,
                p.id ASC
            LIMIT 20`,
            [normalized, containsPattern, startsPattern]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Data tidak ditemukan' });
        }

        res.json({
            query: rawQuery.trim(),
            normalizedQuery: normalized,
            passengers: result.rows.map(mapPassengerRow),
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
        const regResult = await pool.query('SELECT * FROM registrations WHERE COALESCE(active, TRUE) = TRUE ORDER BY id ASC');
        if (regResult.rows.length === 0) {
            return res.json([]);
        }

        const registrations = regResult.rows;

        // Fetch all passengers
        const passResult = await pool.query('SELECT * FROM passengers WHERE COALESCE(active, TRUE) = TRUE ORDER BY registration_id ASC, id ASC');
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
        await ensureAuditSchema();
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

            await appendPassengerVerificationEvents(client, passengerIds, verifiedBy || 'Unknown', 'scanner', 'verify');

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

// API: Verify selected passengers (cross-registration)
app.post('/api/verify-passengers', async (req, res) => {
    try {
        await ensureAuditSchema();
        const { passengerIds, verifiedBy } = req.body;

        if (!Array.isArray(passengerIds) || passengerIds.length === 0) {
            return res.status(400).json({ error: 'Tidak ada peserta yang dipilih' });
        }

        const uniqueIds = [...new Set(passengerIds.map((id) => parseInt(id, 10)).filter((id) => Number.isInteger(id)))];
        if (uniqueIds.length === 0) {
            return res.status(400).json({ error: 'ID peserta tidak valid' });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const now = new Date();
            const updateRes = await client.query(
                `UPDATE passengers
                 SET verified = TRUE,
                     verified_at = COALESCE(verified_at, $1),
                     verified_by = COALESCE(verified_by, $2)
                 WHERE id = ANY($3::int[])
                 RETURNING id`,
                [now, verifiedBy || 'Unknown', uniqueIds]
            );

            const updatedIds = updateRes.rows.map((row) => row.id);
            await appendPassengerVerificationEvents(client, updatedIds, verifiedBy || 'Unknown', 'scanner', 'verify');

            await client.query('COMMIT');
            res.json({ success: true, updatedCount: updateRes.rowCount || 0, verifiedAt: now });
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

app.post('/api/unverify-passengers', async (req, res) => {
    try {
        await ensureAuditSchema();
        const { passengerIds, verifiedBy, reason } = req.body;

        if (!Array.isArray(passengerIds) || passengerIds.length === 0) {
            return res.status(400).json({ error: 'Tidak ada peserta yang dipilih' });
        }

        const uniqueIds = [...new Set(passengerIds.map((id) => parseInt(id, 10)).filter((id) => Number.isInteger(id)))];
        if (uniqueIds.length === 0) {
            return res.status(400).json({ error: 'ID peserta tidak valid' });
        }

        const notes = typeof reason === 'string' ? reason.trim() : '';

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const updateRes = await client.query(
                `UPDATE passengers
                 SET verified = FALSE,
                     verified_at = NULL,
                     verified_by = NULL
                 WHERE id = ANY($1::int[])
                   AND verified = TRUE
                 RETURNING id`,
                [uniqueIds]
            );

            const updatedIds = updateRes.rows.map((row) => row.id);
            if (updatedIds.length === 0) {
                await client.query('ROLLBACK');
                return res.status(409).json({ error: 'Peserta yang dipilih belum berstatus terverifikasi' });
            }

            await appendPassengerVerificationEvents(client, updatedIds, verifiedBy || 'Unknown', 'admin', 'unverify', notes || null);

            await client.query('COMMIT');
            res.json({ success: true, updatedCount: updatedIds.length });
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

app.get('/api/admin-summary', async (req, res) => {
    try {
        await ensureAuditSchema();

        const [countResult, registrationBreakdownResult, topVerifiersResult, recentActivityResult, hourlyTrendResult] = await Promise.all([
            pool.query(
                `SELECT
                    (SELECT COUNT(*) FROM registrations WHERE COALESCE(active, TRUE) = TRUE) AS registrations_count,
                    (SELECT COUNT(*) FROM passengers WHERE COALESCE(active, TRUE) = TRUE) AS passengers_count,
                    (SELECT COUNT(*) FROM passengers WHERE COALESCE(active, TRUE) = TRUE AND verified = TRUE) AS verified_count`
            ),
            pool.query(
                `SELECT
                    COUNT(*) FILTER (WHERE stats.verified_count = stats.passenger_count AND stats.passenger_count > 0) AS fully_verified_count,
                    COUNT(*) FILTER (WHERE stats.verified_count > 0 AND stats.verified_count < stats.passenger_count) AS partial_verified_count,
                    COUNT(*) FILTER (WHERE stats.verified_count = 0) AS pending_count
                 FROM (
                    SELECT
                        r.id,
                        COUNT(p.id) AS passenger_count,
                        COUNT(*) FILTER (WHERE p.verified = TRUE) AS verified_count
                    FROM registrations r
                    LEFT JOIN passengers p ON p.registration_id = r.id AND COALESCE(p.active, TRUE) = TRUE
                    WHERE COALESCE(r.active, TRUE) = TRUE
                    GROUP BY r.id
                 ) stats`
            ),
            pool.query(
                `SELECT
                    trim(verified_by) AS verifier_name,
                    COUNT(*)::int AS total_actions,
                    MAX(verified_at) AS last_action_at
                 FROM passengers
                  WHERE COALESCE(active, TRUE) = TRUE
                    AND verified = TRUE
                    AND NULLIF(trim(verified_by), '') IS NOT NULL
                    AND lower(trim(verified_by)) <> 'unknown'
                 GROUP BY trim(verified_by)
                 ORDER BY total_actions DESC, last_action_at DESC
                 LIMIT 5`
            ),
            pool.query(
                `SELECT * FROM (
                    SELECT
                        pv.id,
                        pv.action,
                        pv.verified_at,
                        pv.verified_by,
                        pv.source,
                        pv.notes,
                        p.nama AS passenger_name,
                        p.registration_id
                    FROM passenger_verifications pv
                    JOIN passengers p ON p.id = pv.passenger_id
                    WHERE COALESCE(p.active, TRUE) = TRUE

                    UNION ALL

                    SELECT
                        (-p.id) AS id,
                        'verify' AS action,
                        p.verified_at,
                        COALESCE(NULLIF(p.verified_by, ''), 'Unknown') AS verified_by,
                        'legacy-state' AS source,
                        NULL AS notes,
                        p.nama AS passenger_name,
                        p.registration_id
                    FROM passengers p
                    WHERE COALESCE(p.active, TRUE) = TRUE
                      AND p.verified = TRUE
                      AND p.verified_at IS NOT NULL
                      AND NOT EXISTS (
                          SELECT 1
                          FROM passenger_verifications pv
                          WHERE pv.passenger_id = p.id
                            AND pv.action = 'verify'
                      )
                 ) activity
                 ORDER BY verified_at DESC, id DESC
                 LIMIT 12`
            ),
            pool.query(
                `WITH hours AS (
                    SELECT generate_series(date_trunc('hour', CURRENT_TIMESTAMP) - interval '11 hour', date_trunc('hour', CURRENT_TIMESTAMP), interval '1 hour') AS hour_bucket
                 )
                 SELECT
                    to_char(hours.hour_bucket, 'HH24:00') AS hour_label,
                    COALESCE(COUNT(pv.id), 0)::int AS total_actions,
                    COALESCE(COUNT(*) FILTER (WHERE pv.action = 'verify'), 0)::int AS verify_actions,
                    COALESCE(COUNT(*) FILTER (WHERE pv.action = 'unverify'), 0)::int AS unverify_actions
                 FROM hours
                 LEFT JOIN passenger_verifications pv
                    ON date_trunc('hour', pv.verified_at) = hours.hour_bucket
                 LEFT JOIN passengers p
                    ON p.id = pv.passenger_id
                    AND COALESCE(p.active, TRUE) = TRUE
                 WHERE p.id IS NOT NULL OR pv.id IS NULL
                 GROUP BY hours.hour_bucket
                 ORDER BY hours.hour_bucket ASC`
            ),
        ]);

        const countRow = countResult.rows[0] || {};
        const breakdownRow = registrationBreakdownResult.rows[0] || {};
        const registrationsCount = Number(countRow.registrations_count || 0);
        const passengersCount = Number(countRow.passengers_count || 0);
        const verifiedCount = Number(countRow.verified_count || 0);
        const pendingCount = Math.max(0, passengersCount - verifiedCount);
        const verificationRate = passengersCount > 0 ? Number(((verifiedCount / passengersCount) * 100).toFixed(1)) : 0;

        res.json({
            summary: {
                registrationsCount,
                passengersCount,
                verifiedCount,
                pendingCount,
                verificationRate,
                fullyVerifiedRegistrations: Number(breakdownRow.fully_verified_count || 0),
                partialVerifiedRegistrations: Number(breakdownRow.partial_verified_count || 0),
                pendingRegistrations: Number(breakdownRow.pending_count || 0),
            },
            topVerifiers: topVerifiersResult.rows.map((row) => ({
                name: row.verifier_name,
                totalActions: Number(row.total_actions || 0),
                lastActionAt: row.last_action_at,
            })),
            recentActivity: recentActivityResult.rows.map((row) => ({
                id: row.id,
                action: row.action,
                verifiedAt: row.verified_at,
                verifiedBy: row.verified_by,
                source: row.source,
                notes: row.notes,
                passengerName: row.passenger_name,
                registrationId: row.registration_id,
            })),
            hourlyTrend: hourlyTrendResult.rows.map((row) => ({
                hourLabel: row.hour_label,
                totalActions: Number(row.total_actions || 0),
                verifyActions: Number(row.verify_actions || 0),
                unverifyActions: Number(row.unverify_actions || 0),
            })),
        });
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
