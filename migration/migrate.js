import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import axios from 'axios';
import pg from 'pg';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Konfigurasi Database
const pool = new pg.Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'kiar',
    password: process.env.DB_PASSWORD || 'kiar_secret',
    port: parseInt(process.env.DB_PORT || '5432'), // Gunakan port luar container (e.g. 5433 jika diposting)
});

const CSV_FILE = path.join(__dirname, 'data.csv');
const UPLOADS_DIR = path.join(__dirname, '../uploads');

// Pastikan folder uploads ada
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

async function downloadImage(url, filename) {
    if (!url || !url.startsWith('http')) return null;

    try {
        // Handle Google Drive links specifically if needed, or generic URLs
        // Convert Google Drive view URL to download URL if necessary
        let downloadUrl = url;
        if (url.includes('drive.google.com/file/d/')) {
            const id = url.match(/\/d\/(.+?)\//)[1];
            downloadUrl = `https://drive.google.com/uc?export=download&id=${id}`;
        }

        const response = await axios({
            url: downloadUrl,
            method: 'GET',
            responseType: 'stream'
        });

        const filePath = path.join(UPLOADS_DIR, filename);
        const writer = fs.createWriteStream(filePath);

        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => resolve(`/uploads/${filename}`));
            writer.on('error', reject);
        });
    } catch (error) {
        console.error(`  ❌ Gagal download image untuk ${filename}: ${error.message}`);
        return null;
    }
}

async function migrate() {
    console.log('🚀 Memulai migrasi...');
    const results = [];

    fs.createReadStream(CSV_FILE)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            console.log(`📊 Ditemukan ${results.length} baris data.`);

            const client = await pool.connect();

            try {
                for (const row of results) {
                    process.stdout.write(`proses ID: ${row.id}... `);

                    // 1. Download KTP Image
                    let localKtpPath = null;
                    if (row.ktpUrl) {
                        // Extract extension or default to .jpg
                        const ext = path.extname(row.ktpUrl.split('?')[0]) || '.jpg';
                        // Clean filename
                        const filename = `${row.id.replace(/[^a-zA-Z0-9]/g, '_')}${ext}`;
                        localKtpPath = await downloadImage(row.ktpUrl, filename);
                    }

                    // 2. Insert ke Database
                    // Sesuaikan nama kolom di CSV dengan di database
                    const query = `
                        INSERT INTO registrants (id, nama, phone, ktp_url, verified, verified_at, verified_by)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                        ON CONFLICT (id) DO UPDATE SET
                            nama = EXCLUDED.nama,
                            phone = EXCLUDED.phone,
                            ktp_url = COALESCE(EXCLUDED.ktp_url, registrants.ktp_url),
                            verified = EXCLUDED.verified;
                    `;

                    const isVerified = row.verified ? (row.verified.toLowerCase() === 'true' || row.verified === '1') : false;

                    await client.query(query, [
                        row.id,
                        row.nama,
                        row.phone,
                        localKtpPath || row.ktpUrl, // Fallback ke URL lama jika download gagal
                        isVerified,
                        row.verifiedAt || null,
                        row.verifiedBy || null
                    ]);

                    console.log('✅ OK');
                }
                console.log('✨ Migrasi Selesai!');
            } catch (err) {
                console.error('❌ Error migrasi:', err);
            } finally {
                client.release();
                pool.end();
            }
        });
}

migrate();
