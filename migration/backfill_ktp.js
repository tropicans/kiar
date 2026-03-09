import fs from 'fs';
import path from 'path';
import axios from 'axios';
import pg from 'pg';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new pg.Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'kiar',
    password: process.env.DB_PASSWORD || 'kiar_secret',
    port: parseInt(process.env.DB_PORT || '5435', 10),
});

const UPLOADS_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const BATCH_SIZE = Number.parseInt(process.env.BACKFILL_BATCH_SIZE || '25', 10);

function sanitizeFilenameSegment(segment) {
    return segment
        .replace(/[^A-Za-z0-9_-]/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 80) || 'img';
}

function mapGoogleDriveUrl(url) {
    if (url.includes('drive.google.com/open?id=')) {
        const id = url.split('id=')[1]?.split('&')[0];
        if (id) return `https://drive.google.com/uc?export=download&id=${id}`;
    }
    if (url.includes('drive.google.com/file/d/')) {
        const match = url.match(/\/d\/(.+?)\//);
        if (match?.[1]) return `https://drive.google.com/uc?export=download&id=${match[1]}`;
    }
    return url;
}

function pickExtension(contentType, fallback = 'jpg') {
    if (!contentType) return fallback;
    if (contentType.includes('png')) return 'png';
    if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
    if (contentType.includes('webp')) return 'webp';
    if (contentType.includes('gif')) return 'gif';
    return fallback;
}

async function downloadToUploads(rawUrl, filenameBase) {
    if (!rawUrl || !rawUrl.startsWith('http')) return null;
    const downloadUrl = mapGoogleDriveUrl(rawUrl);

    try {
        const response = await axios({
            url: downloadUrl,
            method: 'GET',
            responseType: 'stream',
        });

        const ext = pickExtension(response.headers['content-type']);
        const filename = `${filenameBase}.${ext}`;
        const destPath = path.join(UPLOADS_DIR, filename);

        await new Promise((resolve, reject) => {
            const writer = fs.createWriteStream(destPath);
            response.data.pipe(writer);
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        return `/uploads/${filename}`;
    } catch (error) {
        console.error(`  ❌ Gagal mengunduh ${rawUrl}: ${error.message}`);
        return null;
    }
}

async function backfillPassengers() {
    console.log('\n👥 Memindahkan KTP penumpang ke uploads lokal...');
    const { rows } = await pool.query(
        `SELECT id, registration_id, source_slot, nama, ktp_url
         FROM passengers
         WHERE ktp_url LIKE 'http%'
         ORDER BY id ASC`
    );

    if (rows.length === 0) {
        console.log('  ✓ Tidak ada penumpang yang perlu diproses');
        return;
    }

    let processed = 0;
    for (const row of rows) {
        const filenameBase = sanitizeFilenameSegment(
            `${row.registration_id || 'REG'}_${row.source_slot ? `pass_${row.source_slot}` : `p${row.id}`}`,
        );
        const storedPath = await downloadToUploads(row.ktp_url, filenameBase);
        if (!storedPath) continue;

        await pool.query('UPDATE passengers SET ktp_url = $1 WHERE id = $2', [storedPath, row.id]);
        processed += 1;

        if (processed % BATCH_SIZE === 0) {
            console.log(`  • ${processed}/${rows.length} penumpang selesai`);
        }
    }

    console.log(`  ✓ Selesai memproses ${processed}/${rows.length} penumpang`);
}

async function backfillRegistrations() {
    console.log('\n🪪 Memindahkan KTP registrant ke uploads lokal...');
    const { rows } = await pool.query(
        `SELECT id, ktp_url, id_card_url
         FROM registrations
         WHERE ktp_url LIKE 'http%' OR id_card_url LIKE 'http%'
         ORDER BY id ASC`
    );

    if (rows.length === 0) {
        console.log('  ✓ Tidak ada registrant yang perlu diproses');
        return;
    }

    let processed = 0;
    for (const row of rows) {
        let updated = false;
        if (row.ktp_url && row.ktp_url.startsWith('http')) {
            const filenameBase = sanitizeFilenameSegment(`${row.id}_kk`);
            const stored = await downloadToUploads(row.ktp_url, filenameBase);
            if (stored) {
                await pool.query('UPDATE registrations SET ktp_url = $1 WHERE id = $2', [stored, row.id]);
                updated = true;
            }
        }

        if (row.id_card_url && row.id_card_url.startsWith('http')) {
            const filenameBase = sanitizeFilenameSegment(`${row.id}_idcard`);
            const stored = await downloadToUploads(row.id_card_url, filenameBase);
            if (stored) {
                await pool.query('UPDATE registrations SET id_card_url = $1 WHERE id = $2', [stored, row.id]);
                updated = true;
            }
        }

        if (updated) processed += 1;
        if (processed % BATCH_SIZE === 0) {
            console.log(`  • ${processed}/${rows.length} registrant memiliki file lokal`);
        }
    }

    console.log(`  ✓ Selesai memproses ${processed}/${rows.length} registrant`);
}

async function run() {
    try {
        const test = await pool.query('SELECT NOW() AS now');
        console.log('Database connected at', test.rows[0].now);

        await backfillPassengers();
        await backfillRegistrations();
    } catch (error) {
        console.error('Backfill gagal:', error);
    } finally {
        await pool.end();
    }
}

run();
