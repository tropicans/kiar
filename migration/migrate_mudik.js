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

// Database Configuration
const pool = new pg.Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'kiar',
    password: process.env.DB_PASSWORD || 'kiar_secret',
    port: parseInt(process.env.DB_PORT || '5435'), // Notice we use 5435 as mapped in docker-compose for external access
});

const UPLOADS_DIR = path.join(__dirname, '../uploads');

// List of CSV URLs (from different tabs of the spreadsheet)
const CSV_URLS = [
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vTnEOmjbL_ytLThY-gGE3iV59KGlyqxmZmsCQw9ch9Kae7WCE2Vlr5uiA6omvU5GliEhyw_Fy57Irsj/pub?gid=1602524796&single=true&output=csv', // Surabaya via Pantura
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vTnEOmjbL_ytLThY-gGE3iV59KGlyqxmZmsCQw9ch9Kae7WCE2Vlr5uiA6omvU5GliEhyw_Fy57Irsj/pub?gid=1141680108&single=true&output=csv', // Solo via Wonosobo
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vTnEOmjbL_ytLThY-gGE3iV59KGlyqxmZmsCQw9ch9Kae7WCE2Vlr5uiA6omvU5GliEhyw_Fy57Irsj/pub?gid=39049124&single=true&output=csv', // Pacitan via Wonogiri
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vTnEOmjbL_ytLThY-gGE3iV59KGlyqxmZmsCQw9ch9Kae7WCE2Vlr5uiA6omvU5GliEhyw_Fy57Irsj/pub?gid=1406001982&single=true&output=csv', // Pacitan via Selatan
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vTnEOmjbL_ytLThY-gGE3iV59KGlyqxmZmsCQw9ch9Kae7WCE2Vlr5uiA6omvU5GliEhyw_Fy57Irsj/pub?gid=1252590251&single=true&output=csv', // Malang via Yogyakarta
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vTnEOmjbL_ytLThY-gGE3iV59KGlyqxmZmsCQw9ch9Kae7WCE2Vlr5uiA6omvU5GliEhyw_Fy57Irsj/pub?gid=561266202&single=true&output=csv', // Yogyakarta via Cilacap
];

// Ensure uploads folder exists
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Function to download CSV from URL
async function downloadCSV(url, index) {
    try {
        const response = await axios({
            url: url,
            method: 'GET',
            responseType: 'stream'
        });

        const filePath = path.join(__dirname, `temp_data_${index}.csv`);
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => resolve(filePath));
            writer.on('error', reject);
        });
    } catch (error) {
        console.error(`❌ Gagal mendownload CSV dari URL ${url}:`, error.message);
        return null;
    }
}

// Function to handle Google Drive downloads
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
        console.error(`  ❌ Failed to download map/KTP for ${filename} (might be private/removed): ${error.message}`);
        // Return original URL as fallback if download fails
        return url;
    }
}

async function migrate() {
    console.log('🚀 Memulai migrasi Mudik Option A...');

    // Check DB connection first
    try {
        const testRes = await pool.query('SELECT NOW()');
        console.log('Database connected:', testRes.rows[0].now);
    } catch (err) {
        console.error('Database connection failed. Check your .env or port mapping:', err.message);
        process.exit(1);
    }

    const allResults = [];

    // Download and parse all CSVs
    for (let i = 0; i < CSV_URLS.length; i++) {
        const url = CSV_URLS[i];
        console.log(`\n📥 Mendownload data dari Sheet ${i + 1}...`);
        const csvPath = await downloadCSV(url, i);

        if (csvPath) {
            await new Promise((resolve, reject) => {
                fs.createReadStream(csvPath)
                    .pipe(csv({ skipLines: 2 }))
                    .on('data', (data) => {
                        if (data['Nama Pegawai'] || data['Nomor WA'] || data['QR Code']) {
                            // Add source info purely for logging if needed
                            data._sheetIndex = i + 1;
                            allResults.push(data);
                        }
                    })
                    .on('end', () => {
                        // Clean up temp file
                        try { fs.unlinkSync(csvPath); } catch (e) { }
                        resolve();
                    })
                    .on('error', reject);
            });
        }
    }

    console.log(`\n📊 Ditemukan total ${allResults.length} baris data valid dari semua sumber.`);

    const client = await pool.connect();

    try {
        for (const row of allResults) {
            let qrCode = row['QR Code'] ? row['QR Code'].trim() : null;
            if (!qrCode) {
                // Generate a custom ID for rows without a QR Code based on phone/name to prevent duplicates
                const phoneForId = row['Nomor WA'] ? row['Nomor WA'].trim().replace(/\D/g, '') : '';
                const nameForId = row['Nama Pegawai'] ? row['Nama Pegawai'].trim().replace(/\s+/g, '').substring(0, 5).toUpperCase() : '';

                if (!phoneForId && !nameForId) continue; // Skip completely empty rows
                qrCode = `YKSN_MANUAL_${nameForId}_${phoneForId}`.substring(0, 50); // Keep ID length reasonable
                console.log(`⚠️  Membuat ID Manual untuk baris tanpa QR: ${qrCode}`);
            }

            let phone = row['Nomor WA'] ? row['Nomor WA'].trim() : null;
            if (phone) {
                // Fix leading zeros
                if (phone.startsWith('8')) {
                    phone = '0' + phone;
                } else if (phone.startsWith('62')) {
                    phone = '0' + phone.substring(2);
                } else if (phone.startsWith('+62')) {
                    phone = '0' + phone.substring(3);
                }
            }

            const cCardUrl = row['Kartu Keluarga'] || row['Kartu Tanda Pengenal Pegawai'];
            const pegawaiName = row['Nama Pegawai'] ? row['Nama Pegawai'].trim().toLowerCase() : '';

            process.stdout.write(`Sedang memproses ${qrCode}... `);

            // 1. Download Identity Image (KK or Pegawai Card)
            let localKtpPath = null;
            if (cCardUrl && cCardUrl.startsWith('http')) {
                const filename = `${qrCode}_identity.jpg`;
                localKtpPath = await downloadImage(cCardUrl, filename);
            }

            // 2. Insert Parent Registration
            await client.query(`
                        INSERT INTO registrations (id, phone, ktp_url)
                        VALUES ($1, $2, $3)
                        ON CONFLICT (id) DO UPDATE SET
                            phone = EXCLUDED.phone,
                            ktp_url = COALESCE(EXCLUDED.ktp_url, registrations.ktp_url);
                    `, [qrCode, phone, localKtpPath || cCardUrl]);

            // 3. Collect Passengers (up to 4)
            const potentialPassengers = [
                { nama: row['Nama Lengkap Penumpang 1'], nik: row['NIK'], ktpUrl: row['KTP Penumpang 1'] },
                { nama: row['Nama Lengkap Penumpang 2'], nik: row['NIK 2'], ktpUrl: row['KTP Penumpang 2'] },
                { nama: row['Nama Lengkap Penumpang 3'], nik: row['NIK 3'], ktpUrl: row['KTP Penumpang 3'] },
                { nama: row['Nama Lengkap Penumpang 4'], nik: row['NIK 4'], ktpUrl: row['KTP Penumpang 4'] }
            ];

            let pCount = 0;

            // Fetch existing passengers to avoid resetting check-in status
            const existingRes = await client.query('SELECT id, nama FROM passengers WHERE registration_id = $1', [qrCode]);
            const existingNames = existingRes.rows.map(r => r.nama.trim().toLowerCase());

            for (const [index, pData] of potentialPassengers.entries()) {
                if (pData.nama && pData.nama.trim()) {
                    const trimmedName = pData.nama.trim();
                    const isRegistrant = trimmedName.toLowerCase() === pegawaiName;
                    const nik = pData.nik ? pData.nik.trim() : null;

                    let localPassKtpPath = null;
                    if (pData.ktpUrl && pData.ktpUrl.startsWith('http')) {
                        const pFilename = `${qrCode}_pass_${index + 1}.jpg`;
                        localPassKtpPath = await downloadImage(pData.ktpUrl, pFilename);
                    }

                    if (!existingNames.includes(trimmedName.toLowerCase())) {
                        await client.query(`
                                    INSERT INTO passengers (registration_id, nama, is_registrant, nik, ktp_url, verified)
                                    VALUES ($1, $2, $3, $4, $5, FALSE);
                                `, [qrCode, trimmedName, isRegistrant, nik, localPassKtpPath || pData.ktpUrl]);
                        pCount++;
                    }
                }
            }

            console.log(`✅ OK (${pCount > 0 ? pCount + ' penumpang baru' : 'tidak ada perubahan'})`);
        }
        console.log('\n✨ Migrasi Selesai!');
    } catch (err) {
        console.error('\n❌ Error migrasi:', err);
    } finally {
        client.release();
        pool.end();
    }
}

migrate();
