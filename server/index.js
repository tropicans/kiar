import express from 'express';
import compression from 'compression';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import csv from 'csv-parser';
import { fileURLToPath } from 'url';
import { OAuth2Client } from 'google-auth-library';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(compression());
const port = process.env.PORT || 8080;
const API_JSON_LIMIT = process.env.API_JSON_LIMIT || '256kb';
const MAX_BULK_IDS = Math.min(Math.max(parseInt(process.env.API_MAX_BULK_IDS || '200', 10) || 200, 1), 1000);
const MAX_VERIFIER_LENGTH = Math.min(Math.max(parseInt(process.env.API_MAX_VERIFIER_LENGTH || '120', 10) || 120, 10), 255);
const MAX_REASON_LENGTH = Math.min(Math.max(parseInt(process.env.API_MAX_REASON_LENGTH || '500', 10) || 500, 50), 2000);
const ROUTE_CSV_PATH = process.env.ROUTE_CSV_PATH || path.join(__dirname, '../Data Pemudik Final Banget.csv');
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || '';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '300', 10) || 300;

// ---- Google OAuth Client ----
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

app.disable('x-powered-by');
app.use(express.json({ limit: API_JSON_LIMIT }));
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://accounts.google.com https://apis.google.com https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://accounts.google.com https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; frame-src https://accounts.google.com; img-src 'self' data: blob: https://lh3.googleusercontent.com; connect-src 'self' https://accounts.google.com https://cloudflareinsights.com");
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
});

// ---- Admin API Key Middleware ----
function requireAdminApiKey(req, res, next) {
    if (!ADMIN_API_KEY) return next(); // No key configured — skip auth
    const provided = req.headers['x-admin-key'] || req.query.adminKey || '';
    if (provided === ADMIN_API_KEY) return next();
    return res.status(403).json({ error: 'Akses ditolak: Admin API key tidak valid' });
}

// ---- DB-backed Session Store ----
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

async function createSession(email, name, picture, role) {
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join('');
    const isAdmin = role === 'admin' || role === 'superadmin';
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    
    try {
        await pool.query(
            `INSERT INTO app_sessions (token, email, name, picture, role, is_admin, expires_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [token, email, name, picture, role, isAdmin, expiresAt]
        );
        return { token, email, name, picture, role, isAdmin, expiresAt };
    } catch (dbErr) {
        console.warn('DB session save failed (table might missing), check init.sql', dbErr.message);
        throw dbErr;
    }
}

async function getSession(token) {
    if (!token) return null;
    try {
        const { rows } = await pool.query('SELECT * FROM app_sessions WHERE token = $1 AND expires_at > CURRENT_TIMESTAMP', [token]);
        if (rows.length === 0) return null;
        const s = rows[0];
        return { token: s.token, email: s.email, name: s.name, picture: s.picture, role: s.role, isAdmin: s.is_admin, expiresAt: s.expires_at };
    } catch (e) {
        console.error('getSession error:', e);
        return null;
    }
}

// Cleanup expired sessions every hour
setInterval(() => {
    pool.query('DELETE FROM app_sessions WHERE expires_at < CURRENT_TIMESTAMP')
        .catch(e => console.error('Session cleanup error:', e.message));
}, 60 * 60 * 1000);

// ---- Session Auth Middleware ----
async function requireSession(req, res, next) {
    try {
        if (ALLOWED_EMAILS.length === 0) return next(); // No whitelist — skip auth
        const authHeader = req.headers['authorization'] || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
        if (!token) return res.status(401).json({ error: 'Login diperlukan' });
        const session = await getSession(token);
        if (!session) return res.status(401).json({ error: 'Sesi tidak valid atau sudah kedaluwarsa' });
        req.userSession = session;
        return next();
    } catch (err) {
        console.error('Session middleware error:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

// ---- Admin Auth: accept session with admin email OR admin API key ----
async function requireAdmin(req, res, next) {
    try {
        // Try admin API key first
        const apiKey = req.headers['x-admin-key'] || req.query.adminKey || '';
        if (ADMIN_API_KEY && apiKey === ADMIN_API_KEY) return next();
        // Try session token
        const authHeader = req.headers['authorization'] || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
        if (token) {
            const session = await getSession(token);
            if (session && session.isAdmin) { req.userSession = session; return next(); }
        }
        return res.status(403).json({ error: 'Akses admin ditolak' });
    } catch (err) {
        console.error('Admin middleware error:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

// ---- In-memory Rate Limiter ----
const rateLimitStore = new Map();
function rateLimit(req, res, next) {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const now = Date.now();
    let entry = rateLimitStore.get(ip);
    if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
        entry = { windowStart: now, count: 0 };
        rateLimitStore.set(ip, entry);
    }
    entry.count++;
    if (entry.count > RATE_LIMIT_MAX) {
        return res.status(429).json({ error: 'Terlalu banyak permintaan. Coba lagi nanti.' });
    }
    next();
}
// Cleanup every 5 minutes
setInterval(() => {
    const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS * 2;
    for (const [ip, entry] of rateLimitStore) {
        if (entry.windowStart < cutoff) rateLimitStore.delete(ip);
    }
}, 300_000);

// Database connection
const pool = new pg.Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'kiar',
    password: process.env.DB_PASSWORD || 'postgres',
    port: parseInt(process.env.DB_PORT || '5432'),
    max: parseInt(process.env.DB_POOL_MAX || '20', 10) || 20,
});

// Performance: force WIB timezone on every new connection
// so CURRENT_TIMESTAMP, to_char, etc. always return Asia/Jakarta time
pool.on('connect', (client) => {
    client.query("SET timezone = 'Asia/Jakarta'");
});

const routeMetadataReady = loadRouteMetadataFromCsv();

// Serve static files from the Vite build output (dist)
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Serve uploaded/static assets (KTP images) — behind auth + path traversal protection
const uploadsPath = path.join(__dirname, '../uploads');
const uploadsAbsolute = path.resolve(uploadsPath);
app.get('/uploads/{*filepath}', (req, res) => {
    const rawPath = req.params.filepath;
    const requestedPath = Array.isArray(rawPath) ? rawPath.join('/') : (rawPath || '');
    const filePath = path.join(uploadsAbsolute, requestedPath);
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(uploadsAbsolute)) {
        return res.status(403).json({ error: 'Akses ditolak' });
    }
    res.sendFile(resolved, { maxAge: 3600000 });
});

function normalizeNameQuery(rawValue) {
    return String(rawValue || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s'-.]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function normalizeAdminText(rawValue) {
    return String(rawValue || '').trim().replace(/\s+/g, ' ');
}

const routeMetadata = new Map();

function parseCsvInteger(rawValue) {
    if (rawValue == null) return null;
    const digits = String(rawValue).replace(/[^0-9-]/g, '').trim();
    if (!digits) return null;
    const parsed = Number.parseInt(digits, 10);
    return Number.isNaN(parsed) ? null : parsed;
}

async function loadRouteMetadataFromCsv() {
    return new Promise((resolve) => {
        if (!ROUTE_CSV_PATH) {
            resolve();
            return;
        }

        if (!fs.existsSync(ROUTE_CSV_PATH)) {
            console.warn(`Route metadata CSV not found at ${ROUTE_CSV_PATH}`);
            resolve();
            return;
        }

        const localMap = new Map();
        fs.createReadStream(ROUTE_CSV_PATH)
            .pipe(csv())
            .on('data', (row) => {
                const qr = String(row['QR Code'] || '').trim();
                if (!qr) return;
                localMap.set(qr, {
                    route: (row['Jurusan'] || '').trim() || null,
                    destination: (row['Kota Tujuan'] || '').trim() || null,
                    busGroup: (row['Kelompok Bis'] || '').trim() || null,
                    busCode: (row['Bis'] || '').trim() || null,
                    groupSize: parseCsvInteger(row['Jumlah Orang']),
                    busCapacity: parseCsvInteger(row['Jumlah Orang dalam 1 (satu) Bis']),
                });
            })
            .on('end', () => {
                routeMetadata.clear();
                localMap.forEach((value, key) => {
                    routeMetadata.set(key, value);
                });
                console.log(`Loaded route metadata for ${routeMetadata.size} registrations from CSV.`);
                resolve();
            })
            .on('error', (err) => {
                console.error('Failed to load route metadata CSV:', err);
                resolve();
            });
    });
}

function getRouteMetadata(registrationId) {
    if (!registrationId) return null;
    return routeMetadata.get(registrationId) || null;
}

function normalizeAdminNik(rawValue) {
    const digits = String(rawValue || '').replace(/\D/g, '');
    return digits || null;
}

function parsePositiveInt(value) {
    const parsed = Number.parseInt(String(value ?? '').trim(), 10);
    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
        return null;
    }
    return parsed;
}

function sanitizeRegistrationId(value) {
    const sanitized = String(value || '').trim().slice(0, 100);
    if (!sanitized || /[<>"';\\]/.test(sanitized)) return null;
    return sanitized;
}

function parseUniqueIntArray(input, maxLength = MAX_BULK_IDS) {
    if (!Array.isArray(input)) {
        return [];
    }

    const sanitized = [];
    const seen = new Set();
    for (const rawValue of input) {
        const parsed = parsePositiveInt(rawValue);
        if (!parsed || seen.has(parsed)) {
            continue;
        }
        sanitized.push(parsed);
        seen.add(parsed);
        if (sanitized.length >= maxLength) {
            break;
        }
    }

    return sanitized;
}

function sanitizeActor(rawValue) {
    const normalized = normalizeAdminText(rawValue).slice(0, MAX_VERIFIER_LENGTH);
    return normalized || 'Unknown';
}

function sanitizeOptionalText(rawValue, maxLength = MAX_REASON_LENGTH) {
    const normalized = normalizeAdminText(rawValue).slice(0, maxLength);
    return normalized || null;
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
        route: passenger.registration_route || null,
        destination: passenger.registration_destination || null,
        busGroup: passenger.registration_bus_group || null,
        busCode: passenger.registration_bus_code || null,
        busCapacity: passenger.registration_bus_capacity ?? null,
        groupSize: passenger.registration_group_size ?? null,
    };
}

function mapRegistrationRow(registration) {
    return {
        id: registration.id,
        phone: registration.phone,
        phoneRaw: registration.phone_raw,
        ktpUrl: registration.ktp_url,
        idCardUrl: registration.id_card_url,
        route: registration.jurusan || null,
        destination: registration.kota_tujuan || null,
        busGroup: registration.kelompok_bis || null,
        busCode: registration.bis || null,
        groupSize: registration.jumlah_orang ?? null,
        busCapacity: registration.kapasitas_bis ?? null,
        active: registration.active,
    };
}
async function ensureExtendedRegistrationColumns() {
    // Auto-create tables that may not exist on older production databases
    await pool.query(`CREATE TABLE IF NOT EXISTS app_sessions (
        token VARCHAR(100) PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        picture TEXT,
        role VARCHAR(20) NOT NULL,
        is_admin BOOLEAN NOT NULL DEFAULT false,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS admin_summary_cache (
        id INTEGER PRIMARY KEY DEFAULT 1,
        total_registrations INTEGER DEFAULT 0,
        total_passengers INTEGER DEFAULT 0,
        verified_count INTEGER DEFAULT 0,
        unverified_count INTEGER DEFAULT 0,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`);
    await pool.query('ALTER TABLE registrations ADD COLUMN IF NOT EXISTS jurusan TEXT');
    await pool.query('ALTER TABLE registrations ADD COLUMN IF NOT EXISTS kota_tujuan TEXT');
    await pool.query('ALTER TABLE registrations ADD COLUMN IF NOT EXISTS kelompok_bis TEXT');
    await pool.query('ALTER TABLE registrations ADD COLUMN IF NOT EXISTS bis TEXT');
    await pool.query('ALTER TABLE registrations ADD COLUMN IF NOT EXISTS jumlah_orang INTEGER');
    await pool.query('ALTER TABLE registrations ADD COLUMN IF NOT EXISTS kapasitas_bis INTEGER');
    // Performance: add nik_suffix column for indexed NIK search
    await pool.query('ALTER TABLE passengers ADD COLUMN IF NOT EXISTS nik_suffix VARCHAR(6)');
    await pool.query(`UPDATE passengers SET nik_suffix = RIGHT(regexp_replace(COALESCE(nik, ''), '\\D', '', 'g'), 6) WHERE nik IS NOT NULL AND nik_suffix IS NULL`);
    await pool.query('CREATE INDEX IF NOT EXISTS idx_passengers_nik_suffix ON passengers(nik_suffix) WHERE nik_suffix IS NOT NULL AND COALESCE(active, TRUE) = TRUE');
    // Performance: ensure nama_normalized is populated, lowercased, and indexed
    await pool.query(`UPDATE passengers SET nama_normalized = lower(regexp_replace(COALESCE(nama, ''), '\\s+', ' ', 'g')) WHERE nama IS NOT NULL AND (nama_normalized IS NULL OR nama_normalized <> lower(regexp_replace(COALESCE(nama, ''), '\\s+', ' ', 'g')))`);

    // ---- Timezone fix: migrate TIMESTAMP → TIMESTAMPTZ ----
    // Old data was stored in UTC by Node.js pg driver, so interpret as UTC during conversion.
    // After this, all timestamps are proper TIMESTAMPTZ and display correctly in WIB.
    const { rows: colCheck } = await pool.query(
        `SELECT data_type FROM information_schema.columns
         WHERE table_name = 'passengers' AND column_name = 'verified_at'`);
    if (colCheck.length > 0 && colCheck[0].data_type === 'timestamp without time zone') {
        console.log('Migrating timestamp columns to TIMESTAMPTZ (interpreting old data as UTC)...');
        await pool.query(`ALTER TABLE passengers ALTER COLUMN verified_at TYPE TIMESTAMPTZ USING verified_at AT TIME ZONE 'UTC'`);
        await pool.query(`ALTER TABLE passengers ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC'`);
        await pool.query(`ALTER TABLE passenger_verifications ALTER COLUMN verified_at TYPE TIMESTAMPTZ USING verified_at AT TIME ZONE 'UTC'`);
        await pool.query(`ALTER TABLE passenger_verifications ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC'`);
        await pool.query(`ALTER TABLE registrations ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC'`);
        console.log('Timestamp migration complete.');
    }
}

const extendedRegistrationColumnsReady = ensureExtendedRegistrationColumns().catch((err) => {
    console.error('Failed to ensure extended registration columns:', err);
    throw err;
});

const registrationDataReady = Promise.all([extendedRegistrationColumnsReady, routeMetadataReady]);

function ensureRegistrationDataReady() {
    return registrationDataReady;
}

async function fetchBusStatsRows(busFilter) {
    await ensureRegistrationDataReady();
    // Performance: use regular LEFT JOIN instead of LATERAL JOIN
    const busFilterValue = (busFilter || '').toLowerCase();
    const result = await pool.query(
        `SELECT
            COALESCE(NULLIF(TRIM(r.bis), ''), 'Tanpa Kode') AS bus_code,
            MAX(r.jurusan) AS jurusan,
            MAX(r.kota_tujuan) AS kota_tujuan,
            MAX(r.kelompok_bis) AS kelompok_bis,
            MAX(r.kapasitas_bis) AS kapasitas_bis,
            SUM(COALESCE(r.jumlah_orang, 0))::int AS manifest_count,
            COUNT(p.id)::int AS passenger_count,
            COUNT(*) FILTER (WHERE p.verified = TRUE)::int AS verified_count,
            COUNT(DISTINCT r.id)::int AS registrations_count
         FROM registrations r
         LEFT JOIN passengers p ON p.registration_id = r.id AND COALESCE(p.active, TRUE) = TRUE
         WHERE COALESCE(r.active, TRUE) = TRUE
         GROUP BY COALESCE(NULLIF(TRIM(r.bis), ''), 'Tanpa Kode')
         ORDER BY bus_code ASC`,
    );

    let rows = result.rows.map((row) => {
        const passengerCount = Number(row.passenger_count || 0);
        const verifiedCount = Number(row.verified_count || 0);
        const manifestCount = Math.max(Number(row.manifest_count || 0), passengerCount);
        return {
            busCode: row.bus_code,
            route: row.jurusan || null,
            destination: row.kota_tujuan || null,
            busGroup: row.kelompok_bis || null,
            busCapacity: row.kapasitas_bis ? Number(row.kapasitas_bis) : null,
            manifestCount,
            expectedCount: manifestCount,
            passengerCount,
            verifiedCount,
            pendingCount: Math.max(0, passengerCount - verifiedCount),
            registrationsCount: Number(row.registrations_count || 0),
        };
    });

    if (busFilterValue) {
        rows = rows.filter((row) => row.busCode.toLowerCase().includes(busFilterValue));
    }

    return rows;
}

function filterBusStatsByStatus(rows, status) {
    if (status === 'complete') {
        return rows.filter((row) => row.passengerCount > 0 && row.pendingCount === 0);
    }
    if (status === 'pending') {
        return rows.filter((row) => row.pendingCount > 0);
    }
    return rows;
}

function summarizeBusStats(rows) {
    return rows.reduce((acc, row) => {
        acc.passengerCount += row.passengerCount;
        acc.verifiedCount += row.verifiedCount;
        acc.pendingCount += row.pendingCount;
        acc.manifestCount += row.manifestCount;
        acc.expectedCount += row.expectedCount;
        acc.registrationsCount += row.registrationsCount;
        if (row.busCapacity) acc.busCapacity += row.busCapacity;
        return acc;
    }, {
        passengerCount: 0,
        verifiedCount: 0,
        pendingCount: 0,
        manifestCount: 0,
        expectedCount: 0,
        registrationsCount: 0,
        busCapacity: 0,
    });
}

function escapeCsvValue(value) {
    if (value == null) return '';
    const text = String(value);
    if (/[",\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
}

function buildBusStatsCsv(rows) {
    const headers = ['Bis', 'Jurusan', 'Kota Tujuan', 'Kelompok Bis', 'Kapasitas Kursi', 'Total Manifest', 'Penumpang Aktif', 'Sudah Diverifikasi', 'Menunggu', 'Jumlah Rombongan'];
    const lines = [headers.join(',')];
    rows.forEach((row) => {
        lines.push([
            row.busCode,
            row.route || '',
            row.destination || '',
            row.busGroup || '',
            row.busCapacity ?? '',
            row.manifestCount,
            row.passengerCount,
            row.verifiedCount,
            row.pendingCount,
            row.registrationsCount,
        ].map(escapeCsvValue).join(','));
    });
    return lines.join('\n');
}

function getProviderFilterClause(providerCode) {
    if (providerCode === 'MDR') {
        return {
            sql: `(
                UPPER(COALESCE(r.bis, '')) LIKE 'MDR%'
                OR LOWER(COALESCE(r.kelompok_bis, '')) = 'mandiri'
            )`,
            label: 'MDR',
        };
    }

    if (providerCode === 'BNI') {
        return {
            sql: `(
                UPPER(COALESCE(r.bis, '')) LIKE 'BNI%'
                OR LOWER(COALESCE(r.kelompok_bis, '')) = 'bni'
            )`,
            label: 'BNI',
        };
    }

    if (providerCode === 'TPN') {
        return {
            sql: `(
                UPPER(COALESCE(r.bis, '')) LIKE 'TPN%'
                OR LOWER(COALESCE(r.kelompok_bis, '')) = 'taspen'
            )`,
            label: 'TPN',
        };
    }

    return null;
}

function normalizeReportDateInput(value) {
    const normalized = String(value || '').trim();
    if (!normalized) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
    return normalized;
}

async function fetchDetailedPassengerReportRows(options = {}) {
    await ensureRegistrationDataReady();

    const {
        verificationStatus = 'all',
        providerCode = null,
        startDate = null,
        endDate = null,
    } = options;
    const whereClauses = [
        'COALESCE(r.active, TRUE) = TRUE',
        'COALESCE(p.active, TRUE) = TRUE',
    ];
    const queryParams = [];

    if (verificationStatus === 'verified') {
        whereClauses.push('p.verified = TRUE');
    } else if (verificationStatus === 'pending') {
        whereClauses.push('COALESCE(p.verified, FALSE) = FALSE');
    }

    const providerFilter = getProviderFilterClause(providerCode);
    if (providerFilter) {
        whereClauses.push(providerFilter.sql);
    }

    const dateField = verificationStatus === 'verified'
        ? 'p.verified_at'
        : 'COALESCE(p.verified_at, r.created_at)';

    if (startDate) {
        queryParams.push(startDate);
        whereClauses.push(`${dateField} >= $${queryParams.length}::date`);
    }

    if (endDate) {
        queryParams.push(endDate);
        whereClauses.push(`${dateField} < ($${queryParams.length}::date + INTERVAL '1 day')`);
    }

    const result = await pool.query(
        `SELECT
            r.id AS registration_id,
            r.phone,
            r.jurusan,
            r.kota_tujuan,
            r.kelompok_bis,
            r.bis,
            r.jumlah_orang,
            r.kapasitas_bis,
            p.id AS passenger_id,
            p.nama,
            p.nik,
            p.is_registrant,
            p.verified,
            p.verified_at,
            p.verified_by,
            r.created_at AS registration_created_at,
            CASE
                WHEN UPPER(COALESCE(r.bis, '')) LIKE 'MDR%' OR LOWER(COALESCE(r.kelompok_bis, '')) = 'mandiri' THEN 'MDR'
                WHEN UPPER(COALESCE(r.bis, '')) LIKE 'BNI%' OR LOWER(COALESCE(r.kelompok_bis, '')) = 'bni' THEN 'BNI'
                WHEN UPPER(COALESCE(r.bis, '')) LIKE 'TPN%' OR LOWER(COALESCE(r.kelompok_bis, '')) = 'taspen' THEN 'TPN'
                ELSE 'LAINNYA'
            END AS provider_code
         FROM passengers p
         JOIN registrations r ON r.id = p.registration_id
         WHERE ${whereClauses.join(' AND ')}
         ORDER BY
            COALESCE(NULLIF(TRIM(r.bis), ''), 'Tanpa Kode') ASC,
            r.id ASC,
            p.nama ASC`,
        queryParams,
    );

    return result.rows.map((row) => ({
        registrationId: row.registration_id,
        phone: row.phone || '',
        route: row.jurusan || '',
        destination: row.kota_tujuan || '',
        busGroup: row.kelompok_bis || '',
        busCode: row.bis || 'Tanpa Kode',
        groupSize: row.jumlah_orang ?? '',
        busCapacity: row.kapasitas_bis ?? '',
        passengerId: Number(row.passenger_id),
        passengerName: row.nama || '',
        nik: row.nik || '',
        isRegistrant: Boolean(row.is_registrant),
        verified: Boolean(row.verified),
        verifiedAt: row.verified_at,
        verifiedBy: row.verified_by || '',
        providerCode: row.provider_code || 'LAINNYA',
        reportDate: row.verified_at || row.registration_created_at || null,
    }));
}

function buildDetailedPassengerCsv(rows) {
    const headers = [
        'ID Rombongan',
        'ID Penumpang',
        'Nama Penumpang',
        'NIK',
        'Status Peserta',
        'Telepon',
        'Jurusan',
        'Kota Tujuan',
        'Kelompok Bis',
        'Kode Bis',
        'Jumlah Rombongan',
        'Kapasitas Bis',
        'Kategori Provider',
        'Status Verifikasi',
        'Diverifikasi Oleh',
        'Waktu Verifikasi',
        'Tanggal Acuan Filter',
    ];
    const lines = [headers.join(',')];

    rows.forEach((row) => {
        lines.push([
            row.registrationId,
            row.passengerId,
            row.passengerName,
            row.nik,
            row.isRegistrant ? 'Pendaftar' : 'Anggota',
            row.phone,
            row.route,
            row.destination,
            row.busGroup,
            row.busCode,
            row.groupSize,
            row.busCapacity,
            row.providerCode,
            row.verified ? 'Sudah Diverifikasi' : 'Belum Diverifikasi',
            row.verifiedBy,
            row.verifiedAt ? new Date(row.verifiedAt).toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).replace(' ', ' ') : '',
            row.reportDate ? new Date(row.reportDate).toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).replace(' ', ' ') : '',
        ].map(escapeCsvValue).join(','));
    });

    return lines.join('\n');
}

function buildReportFilename(type, providerCode = '') {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    if (type === 'provider' && providerCode) {
        return `report-${providerCode.toLowerCase()}-${stamp}.csv`;
    }
    return `report-${type}-${stamp}.csv`;
}

function resolveReportOptions(req) {
    const type = String(req.query.type || '').trim().toLowerCase();
    const providerCode = String(req.query.provider || '').trim().toUpperCase();
    const startDate = normalizeReportDateInput(req.query.startDate);
    const endDate = normalizeReportDateInput(req.query.endDate);

    if ((req.query.startDate && !startDate) || (req.query.endDate && !endDate)) {
        return { error: 'Format tanggal tidak valid. Gunakan YYYY-MM-DD.' };
    }

    if (startDate && endDate && startDate > endDate) {
        return { error: 'Tanggal mulai tidak boleh lebih besar dari tanggal akhir.' };
    }

    return { type, providerCode, startDate, endDate };
}

let _auditSchemaReady = null;
async function ensureAuditSchema() {
    if (!_auditSchemaReady) {
        _auditSchemaReady = (async () => {
            await pool.query("ALTER TABLE passenger_verifications ADD COLUMN IF NOT EXISTS action VARCHAR(20) NOT NULL DEFAULT 'verify'");
            await pool.query('ALTER TABLE passenger_verifications ADD COLUMN IF NOT EXISTS notes TEXT');
            // Performance: index for ORDER BY verified_at DESC queries
            await pool.query('CREATE INDEX IF NOT EXISTS idx_pv_verified_at_desc ON passenger_verifications(verified_at DESC)');
        })();
    }
    return _auditSchemaReady;
}

let _adminChangeSchemaReady = null;
async function ensureAdminChangeSchema() {
    if (!_adminChangeSchemaReady) {
        _adminChangeSchemaReady = (async () => {
            await pool.query(`
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
                )
            `);
            // Performance: index for ORDER BY created_at DESC queries
            await pool.query('CREATE INDEX IF NOT EXISTS idx_acl_created_at_desc ON admin_change_logs(created_at DESC)');
        })();
    }
    return _adminChangeSchemaReady;
}

async function appendAdminChangeLogs(client, changes, actor = 'Admin Dashboard', notes = null) {
    if (!Array.isArray(changes) || changes.length === 0) {
        return;
    }

    const values = [];
    const placeholders = changes.map((change, index) => {
        const base = index * 8;
        values.push(
            change.entityType,
            change.entityId,
            change.fieldName,
            change.action,
            change.oldValue,
            change.newValue,
            actor,
            notes,
        );

        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8})`;
    });

    await client.query(
        `INSERT INTO admin_change_logs (entity_type, entity_id, field_name, action, old_value, new_value, actor, notes)
         VALUES ${placeholders.join(', ')}`,
        values,
    );
}

function createChangeLogEntries(entityType, entityId, previousRow, nextRow, fieldConfigs) {
    return fieldConfigs.flatMap((fieldConfig) => {
        const previousValue = previousRow?.[fieldConfig.column] ?? null;
        const nextValue = nextRow?.[fieldConfig.column] ?? null;
        const previousNormalized = previousValue == null ? null : String(previousValue);
        const nextNormalized = nextValue == null ? null : String(nextValue);

        if (previousNormalized === nextNormalized) {
            return [];
        }

        return [{
            entityType,
            entityId: String(entityId),
            fieldName: fieldConfig.fieldName,
            action: fieldConfig.action,
            oldValue: previousNormalized,
            newValue: nextNormalized,
        }];
    });
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

// ============================================
// Users Table & Google Auth
// ============================================

let _usersTableReady = null;
async function ensureUsersTable() {
    if (_usersTableReady) return _usersTableReady;
    _usersTableReady = (async () => {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS app_users (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                role TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('operator', 'admin', 'superadmin')),
                active BOOLEAN NOT NULL DEFAULT true,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `);
        // Seed from env vars if table is empty
        const { rows } = await pool.query('SELECT COUNT(*) AS cnt FROM app_users');
        if (parseInt(rows[0].cnt) === 0) {
            const seedUsers = [];
            for (const email of ALLOWED_EMAILS) {
                const role = ADMIN_EMAILS.includes(email) ? 'admin' : 'operator';
                seedUsers.push({ email, role });
            }
            // Ensure superadmin exists
            const superadminEmail = (process.env.SUPERADMIN_EMAIL || 'tropicans@gmail.com').toLowerCase();
            if (!seedUsers.find(u => u.email === superadminEmail)) {
                seedUsers.push({ email: superadminEmail, role: 'superadmin' });
            } else {
                const existing = seedUsers.find(u => u.email === superadminEmail);
                if (existing) existing.role = 'superadmin';
            }
            for (const user of seedUsers) {
                await pool.query(
                    'INSERT INTO app_users (email, role) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING',
                    [user.email, user.role]
                );
            }
            console.log(`Seeded ${seedUsers.length} users into app_users table`);
        }
    })();
    return _usersTableReady;
}

async function getUserByEmail(email) {
    await ensureUsersTable();
    const { rows } = await pool.query('SELECT * FROM app_users WHERE email = $1 AND active = true', [email.toLowerCase()]);
    return rows[0] || null;
}

// POST /api/auth/google — verify Google ID token and create session
app.post('/api/auth/google', rateLimit, async (req, res) => {
    try {
        const { credential } = req.body;
        if (!credential) return res.status(400).json({ error: 'Credential tidak ditemukan' });
        if (!googleClient) return res.status(500).json({ error: 'Google OAuth belum dikonfigurasi' });

        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const email = payload.email.toLowerCase();
        const name = payload.name || email;
        const picture = payload.picture || '';

        // Check user in database
        const user = await getUserByEmail(email);
        if (!user) {
            return res.status(403).json({ error: `Email ${email} tidak terdaftar. Hubungi admin.` });
        }

        const session = await createSession(email, name, picture, user.role);
        res.json({
            token: session.token,
            email: session.email,
            name: session.name,
            picture: session.picture,
            role: session.role,
            isAdmin: session.isAdmin,
        });
    } catch (err) {
        console.error('Google auth error:', err.message);
        res.status(401).json({ error: 'Token Google tidak valid' });
    }
});

// GET /api/auth/me — check current session
app.get('/api/auth/me', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'] || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
        if (!token) return res.status(401).json({ error: 'Tidak ada sesi' });
        const session = await getSession(token);
        if (!session) return res.status(401).json({ error: 'Sesi kedaluwarsa' });
        res.json({ email: session.email, name: session.name, picture: session.picture, role: session.role, isAdmin: session.isAdmin });
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ---- User Management (superadmin only) ----
async function requireSuperAdmin(req, res, next) {
    try {
        const authHeader = req.headers['authorization'] || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
        const session = await getSession(token);
        if (!session || session.role !== 'superadmin') {
            return res.status(403).json({ error: 'Hanya super admin yang dapat mengelola pengguna' });
        }
        req.userSession = session;
        return next();
    } catch (err) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

app.get('/api/admin/users', requireSuperAdmin, async (req, res) => {
    try {
        await ensureUsersTable();
        const { rows } = await pool.query('SELECT id, email, role, active, created_at FROM app_users ORDER BY role, email');
        res.json({ users: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/admin/users', requireSuperAdmin, async (req, res) => {
    try {
        await ensureUsersTable();
        const { email, role } = req.body;
        if (!email || !role) return res.status(400).json({ error: 'Email dan role wajib diisi' });
        if (!['operator', 'admin'].includes(role)) return res.status(400).json({ error: 'Role harus operator atau admin' });
        const normalizedEmail = email.trim().toLowerCase();
        await pool.query(
            'INSERT INTO app_users (email, role) VALUES ($1, $2) ON CONFLICT (email) DO UPDATE SET role = $2, active = true',
            [normalizedEmail, role]
        );
        res.json({ success: true, message: `User ${normalizedEmail} ditambahkan sebagai ${role}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.patch('/api/admin/users/:id', requireSuperAdmin, async (req, res) => {
    try {
        await ensureUsersTable();
        const userId = parseInt(req.params.id);
        const { role, active } = req.body;
        // Don't allow changing superadmin
        const { rows: [target] } = await pool.query('SELECT * FROM app_users WHERE id = $1', [userId]);
        if (!target) return res.status(404).json({ error: 'User tidak ditemukan' });
        if (target.role === 'superadmin') return res.status(403).json({ error: 'Tidak dapat mengubah super admin' });

        const updates = [];
        const values = [];
        let idx = 1;
        if (role !== undefined && ['operator', 'admin'].includes(role)) { updates.push(`role = $${idx++}`); values.push(role); }
        if (active !== undefined) { updates.push(`active = $${idx++}`); values.push(active); }
        if (updates.length === 0) return res.status(400).json({ error: 'Tidak ada perubahan' });
        values.push(userId);
        await pool.query(`UPDATE app_users SET ${updates.join(', ')} WHERE id = $${idx}`, values);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.delete('/api/admin/users/:id', requireSuperAdmin, async (req, res) => {
    try {
        await ensureUsersTable();
        const userId = parseInt(req.params.id);
        const { rows: [target] } = await pool.query('SELECT * FROM app_users WHERE id = $1', [userId]);
        if (!target) return res.status(404).json({ error: 'User tidak ditemukan' });
        if (target.role === 'superadmin') return res.status(403).json({ error: 'Tidak dapat menghapus super admin' });
        await pool.query('DELETE FROM app_users WHERE id = $1', [userId]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// API: Lookup Registrant
app.get('/api/lookup/:id', requireSession, rateLimit, async (req, res) => {
    try {
        await ensureRegistrationDataReady();
        const registrationId = String(req.params.id || '').trim().slice(0, 200);
        if (!registrationId) {
            return res.status(400).json({ error: 'ID registrasi tidak valid' });
        }

        const result = await pool.query(
            `SELECT id, phone, phone_raw, ktp_url, id_card_url,
                    jurusan, kota_tujuan, kelompok_bis, bis,
                    jumlah_orang, kapasitas_bis, active
             FROM registrations WHERE id = $1`,
            [registrationId],
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Data tidak ditemukan' });
        }

        const registration = mapRegistrationRow(result.rows[0]);

        // Fetch all active passengers for group verification
        const passengersResult = await pool.query(
            `SELECT id, registration_id, nama, is_registrant, nik, ktp_url,
                    verified, verified_at, verified_by
             FROM passengers WHERE registration_id = $1 AND COALESCE(active, TRUE) = TRUE ORDER BY id ASC`,
            [registrationId],
        );

        res.json({
            ...registration,
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
app.get('/api/lookup-nik/:last6', requireSession, rateLimit, async (req, res) => {
    try {
        await ensureRegistrationDataReady();
        const { last6 } = req.params;
        const normalized = (last6 || '').replace(/\D/g, '').slice(-6);

        if (normalized.length !== 6) {
            return res.status(400).json({ error: 'Input harus 6 digit terakhir NIK' });
        }

        // Performance: use indexed nik_suffix column instead of full table scan
        const regMatchResult = await pool.query(
            `SELECT DISTINCT p.registration_id
             FROM passengers p
             WHERE COALESCE(p.active, TRUE) = TRUE
               AND p.nik_suffix = $1
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

        const regResult = await pool.query(
            `SELECT id, phone, phone_raw, ktp_url, id_card_url,
                    jurusan, kota_tujuan, kelompok_bis, bis,
                    jumlah_orang, kapasitas_bis, active
             FROM registrations WHERE id = $1 AND COALESCE(active, TRUE) = TRUE`,
            [registrationId],
        );
        if (regResult.rows.length === 0) {
            return res.status(404).json({ error: 'Data tidak ditemukan' });
        }

        const passengersResult = await pool.query(
            `SELECT id, registration_id, nama, is_registrant, nik, ktp_url,
                    verified, verified_at, verified_by
             FROM passengers WHERE registration_id = $1 AND COALESCE(active, TRUE) = TRUE ORDER BY id ASC`,
            [registrationId],
        );

        const matchedPassengerIds = passengersResult.rows
            .filter((p) => {
                const nikDigits = String(p.nik || '').replace(/\D/g, '');
                return nikDigits.length >= 6 && nikDigits.slice(-6) === normalized;
            })
            .map((p) => p.id);

        const registration = mapRegistrationRow(regResult.rows[0]);

        res.json({
            ...registration,
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
app.get('/api/search-nik/:last6', requireSession, rateLimit, async (req, res) => {
    try {
        await ensureRegistrationDataReady();
        const { last6 } = req.params;
        const normalized = (last6 || '').replace(/\D/g, '').slice(-6);

        if (normalized.length !== 6) {
            return res.status(400).json({ error: 'Input harus 6 digit terakhir NIK' });
        }

        // Performance: use indexed nik_suffix column
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
                r.jurusan AS registration_route,
                r.kota_tujuan AS registration_destination,
                r.kelompok_bis AS registration_bus_group,
                r.bis AS registration_bus_code,
                r.kapasitas_bis AS registration_bus_capacity,
                r.jumlah_orang AS registration_group_size
            FROM passengers p
            JOIN registrations r ON r.id = p.registration_id
            WHERE COALESCE(p.active, TRUE) = TRUE
              AND COALESCE(r.active, TRUE) = TRUE
              AND p.nik_suffix = $1
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
app.get('/api/search-name', requireSession, rateLimit, async (req, res) => {
    try {
        await ensureRegistrationDataReady();
        const rawQuery = String(req.query.q || '');
        const normalized = normalizeNameQuery(rawQuery);

        if (normalized.length < 3) {
            return res.status(400).json({ error: 'Masukkan minimal 3 karakter nama pemudik' });
        }

        const containsPattern = `%${normalized}%`;
        const startsPattern = `${normalized}%`;

        // Performance: use pre-computed nama_normalized column directly (indexed)
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
                p.nama_normalized AS search_name,
                r.jurusan AS registration_route,
                r.kota_tujuan AS registration_destination,
                r.kelompok_bis AS registration_bus_group,
                r.bis AS registration_bus_code,
                r.kapasitas_bis AS registration_bus_capacity,
                r.jumlah_orang AS registration_group_size
            FROM passengers p
            JOIN registrations r ON r.id = p.registration_id
            WHERE COALESCE(p.active, TRUE) = TRUE
              AND COALESCE(r.active, TRUE) = TRUE
              AND p.nama_normalized LIKE $2
            ORDER BY
                CASE
                    WHEN p.nama_normalized = $1 THEN 0
                    WHEN p.nama_normalized LIKE $3 THEN 1
                    ELSE 2
                END,
                length(p.nama_normalized) ASC,
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

// API: Create Registration + Passengers (Manual Input from Admin Dashboard)
app.post('/api/admin/registrations', requireAdmin, rateLimit, async (req, res) => {
    try {
        await ensureAdminChangeSchema();
        await ensureRegistrationDataReady();
        const { phone, ktpUrl, idCardUrl, jurusan, kotaTujuan, kelompokBis, bis, passengers } = req.body || {};

        // Validate passengers
        if (!Array.isArray(passengers) || passengers.length === 0) {
            return res.status(400).json({ error: 'Minimal 1 penumpang harus diisi' });
        }
        if (passengers.length > 10) {
            return res.status(400).json({ error: 'Maksimal 10 penumpang per rombongan' });
        }

        const validPassengers = passengers.filter((p) => p && typeof p.nama === 'string' && p.nama.trim());
        if (validPassengers.length === 0) {
            return res.status(400).json({ error: 'Minimal 1 penumpang harus memiliki nama' });
        }

        // Generate unique registration ID
        const now = new Date();
        const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
        const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
        const registrationId = `MANUAL-${datePart}-${randomPart}`;

        // Check for collision (unlikely but safe)
        const existsCheck = await pool.query('SELECT 1 FROM registrations WHERE id = $1', [registrationId]);
        if (existsCheck.rows.length > 0) {
            return res.status(409).json({ error: 'ID bentrok, silakan coba lagi' });
        }

        const normalizedPhone = normalizeAdminText(phone) || null;
        const normalizedKtpUrl = normalizeAdminText(ktpUrl) || null;
        const normalizedIdCardUrl = normalizeAdminText(idCardUrl) || null;
        const normalizedJurusan = normalizeAdminText(jurusan) || null;
        const normalizedKotaTujuan = normalizeAdminText(kotaTujuan) || null;
        const normalizedKelompokBis = normalizeAdminText(kelompokBis) || null;
        const normalizedBis = normalizeAdminText(bis) || null;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Insert registration
            await client.query(
                `INSERT INTO registrations (id, phone, phone_raw, ktp_url, id_card_url, jurusan, kota_tujuan, kelompok_bis, bis, jumlah_orang, active, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE, CURRENT_TIMESTAMP)`,
                [registrationId, normalizedPhone, normalizedPhone, normalizedKtpUrl, normalizedIdCardUrl, normalizedJurusan, normalizedKotaTujuan, normalizedKelompokBis, normalizedBis, validPassengers.length],
            );

            // Insert passengers
            const insertedPassengers = [];
            for (let i = 0; i < validPassengers.length; i++) {
                const p = validPassengers[i];
                const namaNormalized = normalizeNameQuery(normalizeAdminText(p.nama));
                const nikVal = normalizeAdminNik(p.nik);
                const nikSuffix = nikVal ? nikVal.slice(-6) : null;
                const passengerKtpUrl = normalizeAdminText(p.ktpUrl) || null;

                const insertRes = await client.query(
                    `INSERT INTO passengers (registration_id, source_slot, nama, nama_raw, nama_normalized, is_registrant, nik, nik_suffix, ktp_url, active, created_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, CURRENT_TIMESTAMP)
                     RETURNING id`,
                    [registrationId, i + 1, normalizeAdminText(p.nama), normalizeAdminText(p.nama), namaNormalized, i === 0, nikVal, nikSuffix, passengerKtpUrl],
                );
                insertedPassengers.push({ id: insertRes.rows[0].id, nama: normalizeAdminText(p.nama) });
            }

            // Log creation in admin_change_logs
            await appendAdminChangeLogs(client, [{
                entityType: 'registration',
                entityId: registrationId,
                fieldName: 'created',
                action: 'create',
                oldValue: null,
                newValue: `${validPassengers.length} penumpang`,
            }]);

            await client.query('COMMIT');

            // Invalidate summary cache
            _adminSummaryCache = { data: null, expiresAt: 0 };

            res.json({
                success: true,
                registrationId,
                passengersCreated: insertedPassengers.length,
            });
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
// API: Get Registrations with server-side pagination, filtering, and search
app.get('/api/registrations', requireAdmin, rateLimit, async (req, res) => {
    try {
        await ensureRegistrationDataReady();

        const page = Math.max(1, parseInt(req.query.page || '1', 10) || 1);
        const perPage = Math.min(100, Math.max(1, parseInt(req.query.perPage || '20', 10) || 20));
        const search = normalizeNameQuery(req.query.search || '');
        const statusFilter = String(req.query.status || 'all').toLowerCase();
        const activeFilter = String(req.query.active || 'all').toLowerCase();

        // Build WHERE conditions
        const conditions = [];
        const values = [];
        let paramIdx = 1;

        // Active filter
        if (activeFilter === 'active') {
            conditions.push('COALESCE(r.active, TRUE) = TRUE');
        } else if (activeFilter === 'only-inactive') {
            conditions.push('COALESCE(r.active, TRUE) = FALSE');
        }
        // 'all' — no active condition

        // Search filter: match registration ID, phone, or passenger name/nik
        if (search.length >= 2) {
            conditions.push(`(
                lower(r.id) LIKE $${paramIdx}
                OR lower(COALESCE(r.phone, '')) LIKE $${paramIdx}
                OR EXISTS (
                    SELECT 1 FROM passengers ps
                    WHERE ps.registration_id = r.id
                    AND (ps.nama_normalized LIKE $${paramIdx} OR COALESCE(ps.nik, '') LIKE $${paramIdx})
                )
            )`);
            values.push(`%${search}%`);
            paramIdx++;
        }

        const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

        // Status filter uses a HAVING clause after grouping passengers
        // We need to join passengers to filter by verification status
        let statusHaving = '';
        if (statusFilter === 'verified') {
            statusHaving = 'HAVING COUNT(*) FILTER (WHERE p.verified = TRUE AND COALESCE(p.active, TRUE) = TRUE) > 0';
        } else if (statusFilter === 'pending') {
            statusHaving = 'HAVING COUNT(*) FILTER (WHERE p.verified = TRUE AND COALESCE(p.active, TRUE) = TRUE) = 0 OR COUNT(*) FILTER (WHERE p.verified = FALSE AND COALESCE(p.active, TRUE) = TRUE) > 0';
        }

        // Count total matching registrations
        const countQuery = statusHaving
            ? `SELECT COUNT(*) AS total FROM (
                SELECT r.id
                FROM registrations r
                LEFT JOIN passengers p ON p.registration_id = r.id
                ${whereClause}
                GROUP BY r.id
                ${statusHaving}
               ) sub`
            : `SELECT COUNT(*) AS total FROM registrations r ${whereClause}`;

        const countResult = await pool.query(countQuery, values);
        const total = parseInt(countResult.rows[0]?.total || '0', 10);

        if (total === 0) {
            return res.json({ items: [], total: 0, page, perPage });
        }

        // Fetch paginated registration IDs
        const offset = (page - 1) * perPage;
        let regIdsQuery;
        if (statusHaving) {
            regIdsQuery = `SELECT r.id
                FROM registrations r
                LEFT JOIN passengers p ON p.registration_id = r.id
                ${whereClause}
                GROUP BY r.id
                ${statusHaving}
                ORDER BY r.id ASC
                LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
        } else {
            regIdsQuery = `SELECT r.id FROM registrations r ${whereClause} ORDER BY r.id ASC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
        }
        const regIdsResult = await pool.query(regIdsQuery, [...values, perPage, offset]);
        const regIds = regIdsResult.rows.map(r => r.id);

        if (regIds.length === 0) {
            return res.json({ items: [], total, page, perPage });
        }

        // Fetch full registration data for the page
        const regResult = await pool.query(
            `SELECT id, phone, phone_raw, ktp_url, id_card_url,
                    jurusan, kota_tujuan, kelompok_bis, bis,
                    jumlah_orang, kapasitas_bis, active
             FROM registrations WHERE id = ANY($1) ORDER BY id ASC`,
            [regIds],
        );

        // Fetch passengers for these registrations only
        const passResult = await pool.query(
            `SELECT id, registration_id, nama, is_registrant, nik, ktp_url,
                    verified, verified_at, verified_by, active
             FROM passengers WHERE registration_id = ANY($1) ORDER BY registration_id ASC, id ASC`,
            [regIds],
        );

        // Group passengers using Map
        const passengersByRegId = new Map();
        for (const p of passResult.rows) {
            const regId = p.registration_id;
            if (!passengersByRegId.has(regId)) {
                passengersByRegId.set(regId, []);
            }
            passengersByRegId.get(regId).push({
                id: p.id,
                nama: p.nama,
                isRegistrant: p.is_registrant,
                nik: p.nik,
                ktpUrl: p.ktp_url,
                verified: p.verified,
                verifiedAt: p.verified_at,
                verifiedBy: p.verified_by,
                active: p.active,
            });
        }

        const items = regResult.rows.map(reg => {
            const base = mapRegistrationRow(reg);
            return {
                ...base,
                passengers: passengersByRegId.get(reg.id) || [],
            };
        });

        res.json({ items, total, page, perPage });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// API: Verify Registrant
app.post('/api/verify', rateLimit, async (req, res) => {
    try {
        await ensureAuditSchema();
        const { id, passengerIds, verifiedBy } = req.body;

        const registrationId = sanitizeRegistrationId(id);
        if (!registrationId) {
            return res.status(400).json({ error: 'ID registrasi tidak valid' });
        }

        if (Array.isArray(passengerIds) && passengerIds.length > MAX_BULK_IDS) {
            return res.status(400).json({ error: `Maksimal ${MAX_BULK_IDS} peserta per permintaan` });
        }

        const sanitizedPassengerIds = parseUniqueIntArray(passengerIds);
        if (sanitizedPassengerIds.length === 0) {
            return res.status(400).json({ error: 'Tidak ada penumpang yang dipilih' });
        }

        const verifierName = sanitizeActor(verifiedBy);

        // Performance: batch verify instead of sequential loop
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Batch check: lock and validate all passengers at once
            const checkRes = await client.query(
                'SELECT id, verified, registration_id FROM passengers WHERE id = ANY($1::int[]) FOR UPDATE',
                [sanitizedPassengerIds]
            );

            if (checkRes.rows.length !== sanitizedPassengerIds.length) {
                const foundIds = new Set(checkRes.rows.map(r => r.id));
                const missing = sanitizedPassengerIds.find(id => !foundIds.has(id));
                await client.query('ROLLBACK');
                return res.status(404).json({ error: `Penumpang dengan ID ${missing} tidak ditemukan` });
            }

            for (const row of checkRes.rows) {
                if (String(row.registration_id) !== registrationId) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({ error: `Penumpang dengan ID ${row.id} tidak valid untuk grup ini` });
                }
                if (row.verified) {
                    await client.query('ROLLBACK');
                    return res.status(409).json({ error: 'Ada peserta yang sudah diverifikasi sebelumnya' });
                }
            }

            // Batch update all at once
            await client.query(
                'UPDATE passengers SET verified = TRUE, verified_at = CURRENT_TIMESTAMP, verified_by = $1 WHERE id = ANY($2::int[])',
                [verifierName, sanitizedPassengerIds]
            );

            await appendPassengerVerificationEvents(client, sanitizedPassengerIds, verifierName, 'scanner', 'verify');

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
app.post('/api/verify-passengers', rateLimit, async (req, res) => {
    try {
        await ensureAuditSchema();
        const { passengerIds, verifiedBy } = req.body;

        if (!Array.isArray(passengerIds) || passengerIds.length === 0) {
            return res.status(400).json({ error: 'Tidak ada peserta yang dipilih' });
        }

        if (passengerIds.length > MAX_BULK_IDS) {
            return res.status(400).json({ error: `Maksimal ${MAX_BULK_IDS} peserta per permintaan` });
        }

        const uniqueIds = parseUniqueIntArray(passengerIds);
        if (uniqueIds.length === 0) {
            return res.status(400).json({ error: 'ID peserta tidak valid' });
        }

        const verifierName = sanitizeActor(verifiedBy);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const updateRes = await client.query(
                `UPDATE passengers
                 SET verified = TRUE,
                     verified_at = COALESCE(verified_at, CURRENT_TIMESTAMP),
                     verified_by = COALESCE(verified_by, $1)
                 WHERE id = ANY($2::int[])
                 RETURNING id`,
                [verifierName, uniqueIds]
            );

            const updatedIds = updateRes.rows.map((row) => row.id);
            await appendPassengerVerificationEvents(client, updatedIds, verifierName, 'scanner', 'verify');

            await client.query('COMMIT');
            res.json({ success: true, updatedCount: updateRes.rowCount || 0, verifiedAt: new Date() });
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

app.patch('/api/admin/registrations/:id', requireAdmin, rateLimit, async (req, res) => {
    try {
        await ensureAdminChangeSchema();
        const registrationId = parsePositiveInt(req.params.id);
        if (!registrationId) {
            return res.status(400).json({ error: 'ID registrasi tidak valid' });
        }
        const { phone, ktpUrl, idCardUrl, active } = req.body || {};
        const updates = [];
        const values = [];

        if (phone !== undefined) {
            const normalizedPhone = normalizeAdminText(phone);
            updates.push(`phone = $${values.length + 1}`);
            values.push(normalizedPhone || null);
            updates.push(`phone_raw = $${values.length + 1}`);
            values.push(normalizedPhone || null);
        }

        if (ktpUrl !== undefined) {
            updates.push(`ktp_url = $${values.length + 1}`);
            values.push(normalizeAdminText(ktpUrl) || null);
        }

        if (idCardUrl !== undefined) {
            updates.push(`id_card_url = $${values.length + 1}`);
            values.push(normalizeAdminText(idCardUrl) || null);
        }

        if (active !== undefined) {
            if (typeof active !== 'boolean') {
                return res.status(400).json({ error: 'Nilai active harus boolean' });
            }
            updates.push(`active = $${values.length + 1}`);
            values.push(active);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'Tidak ada perubahan yang dikirim' });
        }

        values.push(registrationId);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const previousRegistrationRes = await client.query('SELECT * FROM registrations WHERE id = $1 FOR UPDATE', [registrationId]);
            if (previousRegistrationRes.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Rombongan tidak ditemukan' });
            }

            const registrationRes = await client.query(
                `UPDATE registrations
                 SET ${updates.join(', ')}
                 WHERE id = $${values.length}
                 RETURNING *`,
                values,
            );

            const previousRegistration = previousRegistrationRes.rows[0];
            const nextRegistration = registrationRes.rows[0];

            const changeEntries = createChangeLogEntries('registration', registrationId, previousRegistration, nextRegistration, [
                { column: 'phone', fieldName: 'phone', action: 'update' },
                { column: 'ktp_url', fieldName: 'ktp_url', action: 'update' },
                { column: 'id_card_url', fieldName: 'id_card_url', action: 'update' },
                { column: 'active', fieldName: 'active', action: 'toggle_active' },
            ]);

            if (typeof active === 'boolean') {
                await client.query(
                    'UPDATE passengers SET active = $1 WHERE registration_id = $2',
                    [active, registrationId],
                );
            }

            await appendAdminChangeLogs(client, changeEntries);

            await client.query('COMMIT');
            return res.json({ success: true, registration: registrationRes.rows[0] });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.patch('/api/admin/passengers/:id', requireAdmin, rateLimit, async (req, res) => {
    try {
        await ensureAdminChangeSchema();
        const passengerId = parsePositiveInt(req.params.id);
        if (!passengerId) {
            return res.status(400).json({ error: 'ID penumpang tidak valid' });
        }

        const { nama, nik, ktpUrl, active } = req.body || {};
        const updates = [];
        const values = [];

        if (nama !== undefined) {
            const normalizedName = normalizeAdminText(nama);
            if (!normalizedName) {
                return res.status(400).json({ error: 'Nama penumpang wajib diisi' });
            }
            updates.push(`nama = $${values.length + 1}`);
            values.push(normalizedName);
            updates.push(`nama_raw = $${values.length + 1}`);
            values.push(normalizedName);
            updates.push(`nama_normalized = $${values.length + 1}`);
            values.push(normalizeNameQuery(normalizedName));
            // Performance: update nik_suffix when name changes (in case of ID correction)
        }

        if (nik !== undefined) {
            const nikVal = normalizeAdminNik(nik);
            updates.push(`nik = $${values.length + 1}`);
            values.push(nikVal);
            // Performance: keep nik_suffix in sync
            const nikSuffix = nikVal ? nikVal.slice(-6) : null;
            updates.push(`nik_suffix = $${values.length + 1}`);
            values.push(nikSuffix);
        }



        if (ktpUrl !== undefined) {
            updates.push(`ktp_url = $${values.length + 1}`);
            values.push(normalizeAdminText(ktpUrl) || null);
        }

        if (active !== undefined) {
            if (typeof active !== 'boolean') {
                return res.status(400).json({ error: 'Nilai active harus boolean' });
            }
            updates.push(`active = $${values.length + 1}`);
            values.push(active);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'Tidak ada perubahan yang dikirim' });
        }

        values.push(passengerId);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const previousPassengerRes = await client.query('SELECT * FROM passengers WHERE id = $1 FOR UPDATE', [passengerId]);
            if (previousPassengerRes.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Penumpang tidak ditemukan' });
            }

            const result = await client.query(
                `UPDATE passengers
                 SET ${updates.join(', ')}
                 WHERE id = $${values.length}
                 RETURNING *`,
                values,
            );

            const previousPassenger = previousPassengerRes.rows[0];
            const nextPassenger = result.rows[0];
            const changeEntries = createChangeLogEntries('passenger', String(passengerId), previousPassenger, nextPassenger, [
                { column: 'nama', fieldName: 'nama', action: 'update' },
                { column: 'nik', fieldName: 'nik', action: 'update' },
                { column: 'ktp_url', fieldName: 'ktp_url', action: 'update' },
                { column: 'active', fieldName: 'active', action: 'toggle_active' },
            ]);
            await appendAdminChangeLogs(client, changeEntries);

            await client.query('COMMIT');
            res.json({ success: true, passenger: result.rows[0] });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/unverify-passengers', requireAdmin, rateLimit, async (req, res) => {
    try {
        await ensureAuditSchema();
        const { passengerIds, verifiedBy, reason } = req.body;

        if (!Array.isArray(passengerIds) || passengerIds.length === 0) {
            return res.status(400).json({ error: 'Tidak ada peserta yang dipilih' });
        }

        if (passengerIds.length > MAX_BULK_IDS) {
            return res.status(400).json({ error: `Maksimal ${MAX_BULK_IDS} peserta per permintaan` });
        }

        const uniqueIds = parseUniqueIntArray(passengerIds);
        if (uniqueIds.length === 0) {
            return res.status(400).json({ error: 'ID peserta tidak valid' });
        }

        const notes = sanitizeOptionalText(reason);
        const verifierName = sanitizeActor(verifiedBy);

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

            await appendPassengerVerificationEvents(client, updatedIds, verifierName, 'admin', 'unverify', notes);

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

// ---- Admin Summary Background Cache Worker ----
const ADMIN_SUMMARY_INTERVAL_MS = 30_000;
let _adminSummaryMemoryCache = { data: null, expiresAt: 0 };

async function updateAdminSummaryWorker() {
    try {
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
                `SELECT
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
                ORDER BY pv.verified_at DESC, pv.id DESC
                LIMIT 10`
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

        try {
            await pool.query(
                `UPDATE admin_summary_cache
                 SET registrations_count = $1, passengers_count = $2, verified_count = $3,
                     fully_verified_count = $4, partial_verified_count = $5, pending_registrations_count = $6,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = 1`,
                [
                    registrationsCount, passengersCount, verifiedCount,
                    Number(breakdownRow.fully_verified_count || 0),
                    Number(breakdownRow.partial_verified_count || 0),
                    Number(breakdownRow.pending_count || 0)
                ]
            );
        } catch (dbErr) {
            console.warn('Could not update admin_summary_cache table (might not exist yet):', dbErr.message);
        }

        const responseData = {
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
        };

        _adminSummaryMemoryCache = { data: responseData, expiresAt: Date.now() + ADMIN_SUMMARY_INTERVAL_MS };
    } catch (err) {
        console.error('Admin summary worker failed:', err);
    }
}

// Start worker
setInterval(updateAdminSummaryWorker, ADMIN_SUMMARY_INTERVAL_MS);
setTimeout(updateAdminSummaryWorker, 2000); // Initial run

app.get('/api/admin-summary', requireAdmin, async (req, res) => {
    try {
        if (_adminSummaryMemoryCache.data) {
            return res.json(_adminSummaryMemoryCache.data);
        }
        await updateAdminSummaryWorker();
        if (_adminSummaryMemoryCache.data) {
            return res.json(_adminSummaryMemoryCache.data);
        }
        res.status(503).json({ error: 'Data not ready yet' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/admin/bus-stats', requireAdmin, async (req, res) => {
    try {
        const busFilter = String(req.query.bus || '').trim();
        const statusFilter = String(req.query.status || 'all').toLowerCase();
        const rows = await fetchBusStatsRows(busFilter);
        const filteredRows = filterBusStatsByStatus(rows, statusFilter);
        const totals = summarizeBusStats(filteredRows);
        res.json({ items: filteredRows, totals });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/admin/bus-stats/export', requireAdmin, async (req, res) => {
    try {
        const busFilter = String(req.query.bus || '').trim();
        const statusFilter = String(req.query.status || 'all').toLowerCase();
        const rows = await fetchBusStatsRows(busFilter);
        const filteredRows = filterBusStatsByStatus(rows, statusFilter);
        const csv = buildBusStatsCsv(filteredRows);
        const filename = `bus-stats-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csv);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/admin/reports/export', requireAdmin, async (req, res) => {
    try {
        const resolvedOptions = resolveReportOptions(req);
        if (resolvedOptions.error) {
            return res.status(400).json({ error: resolvedOptions.error });
        }

        const { type, providerCode, startDate, endDate } = resolvedOptions;

        let rows = [];
        let filename = '';

        if (type === 'verified') {
            rows = await fetchDetailedPassengerReportRows({ verificationStatus: 'verified', startDate, endDate });
            filename = buildReportFilename('verified');
        } else if (type === 'absent') {
            rows = await fetchDetailedPassengerReportRows({ verificationStatus: 'pending', startDate, endDate });
            filename = buildReportFilename('absent');
        } else if (type === 'bus-detail') {
            rows = await fetchDetailedPassengerReportRows({ verificationStatus: 'all', startDate, endDate });
            filename = buildReportFilename('bus-detail');
        } else if (type === 'provider') {
            const providerFilter = getProviderFilterClause(providerCode);
            if (!providerFilter) {
                return res.status(400).json({ error: 'Provider report tidak valid. Gunakan MDR, BNI, atau TPN.' });
            }
            rows = await fetchDetailedPassengerReportRows({ verificationStatus: 'all', providerCode, startDate, endDate });
            filename = buildReportFilename('provider', providerCode);
        } else {
            return res.status(400).json({
                error: 'Tipe report tidak valid. Gunakan verified, absent, bus-detail, atau provider.',
            });
        }

        const csvContent = buildDetailedPassengerCsv(rows);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csvContent);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/admin/reports/preview', requireAdmin, async (req, res) => {
    try {
        const resolvedOptions = resolveReportOptions(req);
        if (resolvedOptions.error) {
            return res.status(400).json({ error: resolvedOptions.error });
        }

        const { type, providerCode, startDate, endDate } = resolvedOptions;

        let rows = [];
        if (type === 'verified') {
            rows = await fetchDetailedPassengerReportRows({ verificationStatus: 'verified', startDate, endDate });
        } else if (type === 'absent') {
            rows = await fetchDetailedPassengerReportRows({ verificationStatus: 'pending', startDate, endDate });
        } else if (type === 'bus-detail') {
            rows = await fetchDetailedPassengerReportRows({ verificationStatus: 'all', startDate, endDate });
        } else if (type === 'provider') {
            const providerFilter = getProviderFilterClause(providerCode);
            if (!providerFilter) {
                return res.status(400).json({ error: 'Provider report tidak valid. Gunakan MDR, BNI, atau TPN.' });
            }
            rows = await fetchDetailedPassengerReportRows({ verificationStatus: 'all', providerCode, startDate, endDate });
        } else {
            return res.status(400).json({
                error: 'Tipe report tidak valid. Gunakan verified, absent, bus-detail, atau provider.',
            });
        }

        const maxPreviewRows = 150;
        res.json({
            rows: rows.slice(0, maxPreviewRows),
            totalRows: rows.length,
            truncated: rows.length > maxPreviewRows,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/admin/bus-passengers/:busCode', requireAdmin, async (req, res) => {
    try {
        await ensureRegistrationDataReady();
        const busCode = req.params.busCode.trim();
        const result = await pool.query(
            `SELECT 
                p.id, 
                p.nama, 
                p.nik, 
                p.verified, 
                p.verified_at AS "verifiedAt", 
                p.verified_by AS "verifiedBy", 
                p.registration_id AS "registrationId"
             FROM passengers p
             JOIN registrations r ON r.id = p.registration_id
             WHERE COALESCE(p.active, TRUE) = TRUE
               AND COALESCE(r.active, TRUE) = TRUE
               AND COALESCE(NULLIF(TRIM(r.bis), ''), 'Tanpa Kode') = $1
             ORDER BY p.nama ASC`,
            [busCode]
        );
        res.json({ passengers: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/admin-audit', requireAdmin, async (req, res) => {
    try {
        await ensureAuditSchema();
        await ensureAdminChangeSchema();

        const result = await pool.query(
            `SELECT * FROM (
                SELECT
                    CONCAT('change-', acl.id) AS id,
                    'crud' AS entry_type,
                    acl.action,
                    acl.entity_type,
                    acl.entity_id,
                    acl.field_name,
                    acl.old_value,
                    acl.new_value,
                    acl.actor,
                    acl.notes,
                    acl.created_at,
                    NULL::text AS passenger_name,
                    NULL::text AS registration_id
                FROM admin_change_logs acl

                UNION ALL

                SELECT
                    CONCAT('verification-', pv.id) AS id,
                    'verification' AS entry_type,
                    pv.action,
                    'passenger' AS entity_type,
                    CAST(pv.passenger_id AS text) AS entity_id,
                    'verification' AS field_name,
                    NULL::text AS old_value,
                    NULL::text AS new_value,
                    pv.verified_by AS actor,
                    pv.notes,
                    pv.verified_at AS created_at,
                    p.nama AS passenger_name,
                    p.registration_id
                FROM passenger_verifications pv
                JOIN passengers p ON p.id = pv.passenger_id
            ) entries
            ORDER BY created_at DESC, id DESC
            LIMIT 500`
        );

        res.json({ entries: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// SPA Fallback: Serve index.html for any unknown routes
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);

    // Performance: pre-warm admin summary cache after startup
    registrationDataReady.then(async () => {
        try {
            await ensureAuditSchema();
            // Warm the admin summary cache by making a lightweight internal query
            const countResult = await pool.query(
                `SELECT
                    (SELECT COUNT(*) FROM registrations WHERE COALESCE(active, TRUE) = TRUE) AS registrations_count,
                    (SELECT COUNT(*) FROM passengers WHERE COALESCE(active, TRUE) = TRUE) AS passengers_count,
                    (SELECT COUNT(*) FROM passengers WHERE COALESCE(active, TRUE) = TRUE AND verified = TRUE) AS verified_count`
            );
            console.log(`Pre-warmed DB: ${countResult.rows[0]?.registrations_count || 0} registrations, ${countResult.rows[0]?.passengers_count || 0} passengers`);
        } catch (err) {
            console.error('Pre-warm failed (non-fatal):', err.message);
        }
    });
});
