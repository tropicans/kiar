import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import axios from 'axios';
import pg from 'pg';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new pg.Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'kiar',
    password: process.env.DB_PASSWORD || 'kiar_secret',
    port: parseInt(process.env.DB_PORT || '5435', 10),
});

const UPLOADS_DIR = path.join(__dirname, '../uploads');

const DEFAULT_CSV_FILE_PATH = path.join(__dirname, '../Data Pemudik Final.csv');

const REQUIRED_HEADERS = [
    'Nama Pegawai',
    'Nomor WA',
    'QR Code',
    'Nama Lengkap Penumpang 1',
    'NIK',
    'Kartu Keluarga',
    'Kartu Tanda Pengenal Pegawai',
];

const UPPERCASE_NAME_TOKENS = new Set(['TNI', 'POLRI', 'PT', 'CV', 'H', 'HJ']);

function parseCsvFilePaths(value) {
    if (!value) return [];
    return value
        .split(/[\n,]/)
        .map((v) => v.trim())
        .filter(Boolean);
}

const CSV_SOURCES = (() => {
    const listFromFilePaths = parseCsvFilePaths(process.env.CSV_FILE_PATHS);
    if (listFromFilePaths.length > 0) {
        return listFromFilePaths;
    }

    const singleFromFilePath = (process.env.CSV_FILE_PATH || '').trim();
    if (singleFromFilePath) {
        return [singleFromFilePath];
    }

    return [DEFAULT_CSV_FILE_PATH];
})();

const CSV_SKIP_LINES = Number.parseInt(process.env.CSV_SKIP_LINES || '0', 10);

if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function isRomanNumeral(text) {
    return /^(?=[ivxlcdm]+$)m{0,4}(cm|cd|d?c{0,3})(xc|xl|l?x{0,3})(ix|iv|v?i{0,3})$/i.test(text);
}

function capitalizeSimple(text) {
    const lower = text.toLowerCase();
    if (!lower) return lower;
    return lower[0].toUpperCase() + lower.slice(1);
}

function normalizeNameToken(token) {
    const cleaned = token.trim();
    if (!cleaned) return '';

    const alphaNumOnly = cleaned.replace(/[^a-zA-Z0-9]/g, '');
    const upper = alphaNumOnly.toUpperCase();
    if (UPPERCASE_NAME_TOKENS.has(upper) || isRomanNumeral(alphaNumOnly)) {
        return upper;
    }

    return cleaned
        .split('-')
        .map((hyphenPart) => hyphenPart
            .split("'")
            .map((apostrophePart) => capitalizeSimple(apostrophePart))
            .join("'"))
        .join('-');
}

function normalizeName(rawName) {
    if (!rawName) return '';
    const collapsed = String(rawName).trim().replace(/\s+/g, ' ');
    if (!collapsed) return '';

    return collapsed
        .split(' ')
        .map((token) => normalizeNameToken(token))
        .filter(Boolean)
        .join(' ');
}

function normalizeHeaderName(header) {
    if (!header) return header;
    return String(header).replace(/^\uFEFF/, '').trim();
}

function scientificToPlain(value) {
    const raw = String(value).trim();
    const match = raw.match(/^([+-]?\d+(?:\.\d+)?)[eE]([+-]?\d+)$/);
    if (!match) return raw;

    const mantissa = match[1];
    const exponent = Number.parseInt(match[2], 10);
    if (!Number.isFinite(exponent)) return raw;

    const negative = mantissa.startsWith('-');
    const unsignedMantissa = mantissa.replace(/^[+-]/, '');
    const [whole, fraction = ''] = unsignedMantissa.split('.');
    const digits = `${whole}${fraction}`.replace(/^0+(?=\d)/, '') || '0';
    const decimalPos = whole.length;
    const newDecimalPos = decimalPos + exponent;

    let plain;
    if (newDecimalPos <= 0) {
        plain = `0.${'0'.repeat(Math.abs(newDecimalPos))}${digits}`;
    } else if (newDecimalPos >= digits.length) {
        plain = `${digits}${'0'.repeat(newDecimalPos - digits.length)}`;
    } else {
        plain = `${digits.slice(0, newDecimalPos)}.${digits.slice(newDecimalPos)}`;
    }

    return negative ? `-${plain}` : plain;
}

function extractDigits(rawValue) {
    if (rawValue == null) return '';
    const text = String(rawValue).trim();
    if (!text) return '';
    const normalized = /[eE][+-]?\d+/.test(text) ? scientificToPlain(text) : text;
    return normalized.replace(/\D/g, '');
}

function normalizePhoneTo62(rawPhone) {
    if (!rawPhone) return null;
    const digits = extractDigits(rawPhone);
    if (!digits) return null;

    if (digits.startsWith('62')) return digits;
    if (digits.startsWith('0')) return `62${digits.slice(1)}`;
    if (digits.startsWith('8')) return `62${digits}`;
    return digits;
}

function normalizeNik(rawNik) {
    if (!rawNik) return null;
    const nik = extractDigits(rawNik);
    return nik || null;
}

function validateHeaders(headers, sourceLabel) {
    const normalizedHeaders = headers.map((header) => normalizeHeaderName(header));
    const missing = REQUIRED_HEADERS.filter((header) => !normalizedHeaders.includes(header));
    if (missing.length > 0) {
        throw new Error(`Header CSV tidak valid untuk ${sourceLabel}. Kolom wajib hilang: ${missing.join(', ')}`);
    }
}

async function readCsvRowsFromPath(filePath, sourceLabel, sheetIndex) {
    const parsedRows = [];
    await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csv({
                skipLines: Number.isNaN(CSV_SKIP_LINES) ? 0 : CSV_SKIP_LINES,
                mapHeaders: ({ header }) => normalizeHeaderName(header),
            }))
            .on('headers', (headers) => {
                try {
                    validateHeaders(headers, sourceLabel);
                } catch (error) {
                    reject(error);
                }
            })
            .on('data', (data) => {
                if (data['Nama Pegawai'] || data['Nomor WA'] || data['QR Code']) {
                    data._sheetIndex = sheetIndex;
                    parsedRows.push(data);
                }
            })
            .on('end', resolve)
            .on('error', reject);
    });

    return parsedRows;
}

async function downloadImage(url, filename) {
    if (!url || !url.startsWith('http')) return null;

    try {
        let downloadUrl = url;
        if (url.includes('drive.google.com/open?id=')) {
            const id = url.split('id=')[1].split('&')[0];
            downloadUrl = `https://drive.google.com/uc?export=download&id=${id}`;
        } else if (url.includes('drive.google.com/file/d/')) {
            const id = url.match(/\/d\/(.+?)\//)[1];
            downloadUrl = `https://drive.google.com/uc?export=download&id=${id}`;
        }

        const response = await axios({
            url: downloadUrl,
            method: 'GET',
            responseType: 'stream',
        });

        const filePath = path.join(UPLOADS_DIR, filename);
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        return await new Promise((resolve, reject) => {
            writer.on('finish', () => resolve(`/uploads/${filename}`));
            writer.on('error', reject);
        });
    } catch (error) {
        console.error(`  ❌ Failed to download map/KTP for ${filename} (might be private/removed): ${error.message}`);
        return url;
    }
}

async function ensureSchema() {
    await pool.query('ALTER TABLE registrations ADD COLUMN IF NOT EXISTS id_card_url TEXT');
    await pool.query('ALTER TABLE registrations ADD COLUMN IF NOT EXISTS phone_raw VARCHAR(100)');
    await pool.query('ALTER TABLE registrations ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE');
    await pool.query('ALTER TABLE registrations ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP');

    await pool.query('ALTER TABLE passengers ADD COLUMN IF NOT EXISTS source_slot SMALLINT');
    await pool.query('ALTER TABLE passengers ADD COLUMN IF NOT EXISTS nama_raw VARCHAR(255)');
    await pool.query('ALTER TABLE passengers ADD COLUMN IF NOT EXISTS nama_normalized VARCHAR(255)');
    await pool.query('ALTER TABLE passengers ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE');
    await pool.query('ALTER TABLE passengers ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP');

    await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS passengers_registration_slot_uidx
        ON passengers (registration_id, source_slot)
        WHERE source_slot IS NOT NULL
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS passenger_verifications (
            id BIGSERIAL PRIMARY KEY,
            passenger_id INTEGER NOT NULL REFERENCES passengers(id) ON DELETE CASCADE,
            verified_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            verified_by VARCHAR(100) NOT NULL DEFAULT 'Unknown',
            source VARCHAR(20) NOT NULL DEFAULT 'scanner',
            action VARCHAR(20) NOT NULL DEFAULT 'verify',
            notes TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await pool.query("ALTER TABLE passenger_verifications ADD COLUMN IF NOT EXISTS action VARCHAR(20) NOT NULL DEFAULT 'verify'");
    await pool.query('ALTER TABLE passenger_verifications ADD COLUMN IF NOT EXISTS notes TEXT');

    await pool.query(`
        CREATE INDEX IF NOT EXISTS passenger_verifications_passenger_idx
        ON passenger_verifications (passenger_id, verified_at DESC, id DESC)
    `);

    await pool.query(`
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
        )
    `);

    await pool.query(`
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
          )
    `);
}

async function finalizeSyncRun(syncRunId, status, rowsRead, rowsUpserted, rowsSkipped, errorMessage = null) {
    if (!syncRunId) return;

    await pool.query(
        `UPDATE sync_runs
         SET status = $1,
             finished_at = CURRENT_TIMESTAMP,
             rows_read = $2,
             rows_upserted = $3,
             rows_skipped = $4,
             error = $5
         WHERE id = $6`,
        [status, rowsRead, rowsUpserted, rowsSkipped, errorMessage, syncRunId],
    );
}

async function migrate() {
    console.log('🚀 Memulai sinkronisasi Mudik final (one-shot)...');

    let syncRunId = null;
    let rowsRead = 0;
    let rowsUpserted = 0;
    let rowsSkipped = 0;
    let rowsWithWarnings = 0;

    try {
        const testRes = await pool.query('SELECT NOW()');
        console.log('Database connected:', testRes.rows[0].now);

        await ensureSchema();

        const runRes = await pool.query(
            'INSERT INTO sync_runs (status, rows_read, rows_upserted, rows_skipped) VALUES ($1, $2, $3, $4) RETURNING id',
            ['running', 0, 0, 0],
        );
        syncRunId = runRes.rows[0].id;
    } catch (err) {
        console.error('Database connection/setup failed. Check your .env or port mapping:', err.message);
        process.exit(1);
    }

    const allResults = [];

    for (let i = 0; i < CSV_SOURCES.length; i++) {
        const sourcePath = CSV_SOURCES[i];
        const sourceLabel = `File #${i + 1}`;
        const absolutePath = path.isAbsolute(sourcePath)
            ? sourcePath
            : path.resolve(process.cwd(), sourcePath);

        if (!fs.existsSync(absolutePath)) {
            console.error(`❌ File CSV tidak ditemukan: ${absolutePath}`);
            continue;
        }

        console.log(`\n📄 Membaca data dari file: ${absolutePath}`);
        const rows = await readCsvRowsFromPath(absolutePath, sourceLabel, i + 1);
        allResults.push(...rows);
    }

    rowsRead = allResults.length;
    console.log(`\n📊 Ditemukan total ${rowsRead} baris data valid dari semua sumber.`);

    const client = await pool.connect();
    const processedRegistrationIds = new Set();

    try {
        await client.query('BEGIN');

        for (const row of allResults) {
            let rowHasWarning = false;

            let qrCode = row['QR Code'] ? row['QR Code'].trim() : null;

            const phoneRaw = row['Nomor WA'] ? row['Nomor WA'].trim() : null;
            const normalizedPhone = normalizePhoneTo62(phoneRaw);
            if (phoneRaw && !normalizedPhone) {
                console.warn(`⚠️ Nomor WA tidak valid pada ${qrCode || 'baris tanpa QR'}: ${phoneRaw}`);
                rowHasWarning = true;
            }

            if (!qrCode) {
                const phoneForId = normalizedPhone || '';
                const nameForId = row['Nama Pegawai']
                    ? normalizeName(row['Nama Pegawai']).replace(/\s+/g, '').substring(0, 5).toUpperCase()
                    : '';

                if (!phoneForId && !nameForId) {
                    rowsSkipped += 1;
                    continue;
                }

                qrCode = `MUDIK_MANUAL_${nameForId}_${phoneForId}`.substring(0, 50);
                console.log(`⚠️  Membuat ID Manual untuk baris tanpa QR: ${qrCode}`);
            }

            const kkUrl = row['Kartu Keluarga'];
            const idCardUrl = row['Kartu Tanda Pengenal Pegawai'];
            const pegawaiNameNormalized = normalizeName(row['Nama Pegawai']);

            process.stdout.write(`Sedang memproses ${qrCode}... `);

            let localKtpPath = null;
            if (kkUrl && kkUrl.startsWith('http')) {
                const filename = `${qrCode}_kk.jpg`;
                localKtpPath = await downloadImage(kkUrl, filename);
            }

            let localIdCardPath = null;
            if (idCardUrl && idCardUrl.startsWith('http')) {
                const filename = `${qrCode}_idcard.jpg`;
                localIdCardPath = await downloadImage(idCardUrl, filename);
            }

            await client.query(
                `INSERT INTO registrations (id, phone, phone_raw, ktp_url, id_card_url, active, last_seen_at)
                 VALUES ($1, $2, $3, $4, $5, TRUE, CURRENT_TIMESTAMP)
                 ON CONFLICT (id) DO UPDATE SET
                     phone = EXCLUDED.phone,
                     phone_raw = EXCLUDED.phone_raw,
                     ktp_url = COALESCE(EXCLUDED.ktp_url, registrations.ktp_url),
                     id_card_url = COALESCE(EXCLUDED.id_card_url, registrations.id_card_url),
                     active = TRUE,
                     last_seen_at = CURRENT_TIMESTAMP`,
                [qrCode, normalizedPhone, phoneRaw, localKtpPath || kkUrl, localIdCardPath || idCardUrl],
            );
            processedRegistrationIds.add(qrCode);

            await client.query(
                'UPDATE passengers SET active = FALSE WHERE registration_id = $1',
                [qrCode],
            );

            const potentialPassengers = [
                { slot: 1, nama: row['Nama Lengkap Penumpang 1'], nik: row['NIK'], ktpUrl: row['KTP Penumpang 1'] },
                { slot: 2, nama: row['Nama Lengkap Penumpang 2'], nik: row['NIK 2'], ktpUrl: row['KTP Penumpang 2'] },
                { slot: 3, nama: row['Nama Lengkap Penumpang 3'], nik: row['NIK 3'], ktpUrl: row['KTP Penumpang 3'] },
                { slot: 4, nama: row['Nama Lengkap Penumpang 4'], nik: row['NIK 4'], ktpUrl: row['KTP Penumpang 4'] },
            ];

            let activePassengerCount = 0;

            for (const pData of potentialPassengers) {
                if (!pData.nama || !pData.nama.trim()) continue;

                const namaRaw = pData.nama.trim();
                const namaNormalized = normalizeName(namaRaw);
                if (!namaNormalized) continue;

                const isRegistrant = namaNormalized.toLowerCase() === pegawaiNameNormalized.toLowerCase();
                const nik = normalizeNik(pData.nik);
                if (pData.nik && nik && nik.length !== 16) {
                    console.warn(`⚠️ NIK tidak 16 digit pada ${qrCode} slot ${pData.slot}: ${pData.nik}`);
                    rowHasWarning = true;
                }

                let localPassKtpPath = null;
                if (pData.ktpUrl && pData.ktpUrl.startsWith('http')) {
                    const pFilename = `${qrCode}_pass_${pData.slot}.jpg`;
                    localPassKtpPath = await downloadImage(pData.ktpUrl, pFilename);
                }

                await client.query(
                    `INSERT INTO passengers (
                        registration_id,
                        source_slot,
                        nama,
                        nama_raw,
                        nama_normalized,
                        is_registrant,
                        nik,
                        ktp_url,
                        active,
                        last_seen_at
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, CURRENT_TIMESTAMP)
                    ON CONFLICT (registration_id, source_slot) WHERE source_slot IS NOT NULL DO UPDATE SET
                        nama = EXCLUDED.nama,
                        nama_raw = EXCLUDED.nama_raw,
                        nama_normalized = EXCLUDED.nama_normalized,
                        is_registrant = EXCLUDED.is_registrant,
                        nik = EXCLUDED.nik,
                        ktp_url = COALESCE(EXCLUDED.ktp_url, passengers.ktp_url),
                        active = TRUE,
                        last_seen_at = CURRENT_TIMESTAMP`,
                    [
                        qrCode,
                        pData.slot,
                        namaNormalized,
                        namaRaw,
                        namaNormalized,
                        isRegistrant,
                        nik,
                        localPassKtpPath || pData.ktpUrl,
                    ],
                );
                activePassengerCount += 1;
                rowsUpserted += 1;
            }

            console.log(`✅ OK (${activePassengerCount} penumpang aktif)`);

            if (rowHasWarning) {
                rowsWithWarnings += 1;
            }
        }

        const processedIds = [...processedRegistrationIds];
        if (processedIds.length > 0) {
            await client.query(
                `UPDATE registrations
                 SET active = FALSE
                 WHERE NOT (id = ANY($1::text[]))`,
                [processedIds],
            );

            await client.query(
                `UPDATE passengers p
                 SET active = FALSE
                 FROM registrations r
                 WHERE p.registration_id = r.id
                   AND r.active = FALSE`,
            );
        }

        await client.query('COMMIT');

        await finalizeSyncRun(syncRunId, 'success', rowsRead, rowsUpserted, rowsSkipped);
        console.log(`\n✨ Sinkronisasi selesai! Baris dengan warning: ${rowsWithWarnings}`);
    } catch (err) {
        await client.query('ROLLBACK');
        const errorMessage = err instanceof Error ? err.message : String(err);
        await finalizeSyncRun(syncRunId, 'failed', rowsRead, rowsUpserted, rowsSkipped, errorMessage);
        console.error('\n❌ Error sinkronisasi:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
