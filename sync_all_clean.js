import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import axios from 'axios';
import pg from 'pg';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

// Database Configuration
const pool = new pg.Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'kiar',
    password: process.env.DB_PASSWORD || 'kiar_secret',
    port: parseInt(process.env.DB_PORT || '5435'),
});

const UPLOADS_DIR = path.join(__dirname, 'uploads');

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTnEOmjbL_ytLThY-gGE3iV59KGlyqxmZmsCQw9ch9Kae7WCE2Vlr5uiA6omvU5GliEhyw_Fy57Irsj/pub?gid=64182246&single=true&output=csv';

if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

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

async function downloadImage(url, filename) {
    return url;
}

async function syncAllClean() {
    console.log('🚀 Memulai sinkronisasi dari sheet ALL-CLEAN...');

    try {
        const testRes = await pool.query('SELECT NOW()');
        console.log('Database connected:', testRes.rows[0].now);
    } catch (err) {
        console.error('Database connection failed:', err.message);
        process.exit(1);
    }

    const allResults = [];
    console.log(`\n📥 Mendownload data dari Sheet ALL-CLEAN...`);
    const csvPath = await downloadCSV(CSV_URL, 'all_clean');

    if (csvPath) {
        await new Promise((resolve, reject) => {
            fs.createReadStream(csvPath)
                .pipe(csv()) // ALL-CLEAN doesn't have 2 header rows
                .on('data', (data) => {
                    if (data['Nama Pegawai'] || data['Nomor WA'] || data['QR Code']) {
                        allResults.push(data);
                    }
                })
                .on('end', () => {
                    try { fs.unlinkSync(csvPath); } catch (e) { }
                    resolve();
                })
                .on('error', reject);
        });
    }

    console.log(`\n📊 Ditemukan total ${allResults.length} baris data valid.`);

    const client = await pool.connect();

    try {
        console.log('\n💾 Membackup status kehadiran peserta...');
        const backupRes = await client.query(`
            SELECT p.nama, r.phone, p.verified_at, p.verified_by 
            FROM passengers p
            JOIN registrations r ON p.registration_id = r.id
            WHERE p.verified = TRUE
        `);
        const verifiedBackup = backupRes.rows;
        console.log(`✅ ${verifiedBackup.length} data kehadiran tersimpan di memori.`);

        console.log('🧹 Membersihkan database lama...');
        await client.query('TRUNCATE TABLE passengers, registrations CASCADE');

        console.log('🚀 Memulai sinkronisasi data baru...');
        for (const row of allResults) {
            let qrCode = row['QR Code'] ? row['QR Code'].trim() : null;
            if (!qrCode) {
                const phoneForId = row['Nomor WA'] ? row['Nomor WA'].trim().replace(/\D/g, '') : '';
                const nameForId = row['Nama Pegawai'] ? row['Nama Pegawai'].trim().replace(/\s+/g, '').substring(0, 5).toUpperCase() : '';
                if (!phoneForId && !nameForId) continue;
                qrCode = `YKSN_MANUAL_${nameForId}_${phoneForId}`.substring(0, 50);
            }

            let phone = row['Nomor WA'] ? row['Nomor WA'].trim() : null;
            if (phone) {
                if (phone.startsWith('8')) phone = '0' + phone;
                else if (phone.startsWith('62')) phone = '0' + phone.substring(2);
                else if (phone.startsWith('+62')) phone = '0' + phone.substring(3);
            }

            const kkUrl = row['Kartu Keluarga'];
            const idCardUrl = row['Kartu Tanda Pengenal Pegawai'];
            const pegawaiName = row['Nama Pegawai'] ? row['Nama Pegawai'].trim().toLowerCase() : '';

            let localKtpPath = null;
            if (kkUrl && kkUrl.startsWith('http')) {
                localKtpPath = await downloadImage(kkUrl, `${qrCode}_kk.jpg`);
            }

            let localIdCardPath = null;
            if (idCardUrl && idCardUrl.startsWith('http')) {
                localIdCardPath = await downloadImage(idCardUrl, `${qrCode}_idcard.jpg`);
            }

            await client.query(`
                INSERT INTO registrations (id, phone, ktp_url, id_card_url)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (id) DO UPDATE SET
                    phone = EXCLUDED.phone,
                    ktp_url = COALESCE(EXCLUDED.ktp_url, registrations.ktp_url),
                    id_card_url = COALESCE(EXCLUDED.id_card_url, registrations.id_card_url);
            `, [qrCode, phone, localKtpPath || kkUrl, localIdCardPath || idCardUrl]);

            const potentialPassengers = [
                { nama: row['Nama Lengkap Penumpang 1'], nik: row['NIK'], ktpUrl: row['KTP Penumpang 1'] },
                { nama: row['Nama Lengkap Penumpang 2'], nik: row['NIK 2'], ktpUrl: row['KTP Penumpang 2'] },
                { nama: row['Nama Lengkap Penumpang 3'], nik: row['NIK 3'], ktpUrl: row['KTP Penumpang 3'] },
                { nama: row['Nama Lengkap Penumpang 4'], nik: row['NIK 4'], ktpUrl: row['KTP Penumpang 4'] }
            ];

            const existingRes = await client.query('SELECT id, nama FROM passengers WHERE registration_id = $1', [qrCode]);
            const existingNames = existingRes.rows.map(r => r.nama.trim().toLowerCase());

            for (const [index, pData] of potentialPassengers.entries()) {
                if (pData.nama && pData.nama.trim()) {
                    const trimmedName = pData.nama.trim();
                    const isRegistrant = trimmedName.toLowerCase() === pegawaiName;
                    const nik = pData.nik ? pData.nik.trim() : null;

                    let localPassKtpPath = null;
                    if (pData.ktpUrl && pData.ktpUrl.startsWith('http')) {
                        localPassKtpPath = await downloadImage(pData.ktpUrl, `${qrCode}_pass_${index + 1}.jpg`);
                    }

                    if (!existingNames.includes(trimmedName.toLowerCase())) {
                        await client.query(`
                            INSERT INTO passengers (registration_id, nama, is_registrant, nik, ktp_url, verified)
                            VALUES ($1, $2, $3, $4, $5, FALSE);
                        `, [qrCode, trimmedName, isRegistrant, nik, localPassKtpPath || pData.ktpUrl]);
                    }
                }
            }
            process.stdout.write('.');
        }

        if (verifiedBackup.length > 0) {
            console.log('\n\n♻️ Memulihkan status kehadiran peserta...');
            let restoredCount = 0;
            for (const backup of verifiedBackup) {
                const restoreRes = await client.query(`
                    UPDATE passengers p
                    SET verified = TRUE, verified_at = $1, verified_by = $2
                    FROM registrations r
                    WHERE p.registration_id = r.id 
                    AND LOWER(TRIM(p.nama)) = LOWER(TRIM($3))
                    AND r.phone = $4
                    RETURNING p.id
                `, [backup.verified_at, backup.verified_by, backup.nama, backup.phone]);
                restoredCount += restoreRes.rowCount;
            }
            console.log(`✅ ${restoredCount} status kehadiran berhasil dipulihkan.`);
        }

        console.log('\n✨ Migrasi Selesai!');
    } catch (err) {
        console.error('\n❌ Error migrasi:', err);
    } finally {
        client.release();
        pool.end();
    }
}

syncAllClean();
