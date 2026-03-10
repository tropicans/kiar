import fs from 'fs';
import csv from 'csv-parser';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new pg.Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'kiar',
    password: process.env.DB_PASSWORD || 'kiar_secret',
    port: parseInt(process.env.DB_PORT || '5435'),
});

const CSV_FILE = path.join(__dirname, 'Data Pemudik Final.csv');

function normalizeHeaderName(header) {
    if (!header) return header;
    return String(header).replace(/^\uFEFF/, '').trim();
}

function extractDigits(rawValue) {
    if (rawValue == null) return '';
    const text = String(rawValue).trim();
    if (!text) return '';
    const normalized = /[eE][+-]?\d+/.test(text)
        ? text.replace(/[eE][+-]?\d+/, (m) => { const n = Number(text); return Number.isFinite(n) ? String(Math.round(n)) : text; }).replace(/\D/g, '')
        : text;
    return normalized.replace(/\D/g, '');
}

function parseIntegerFromValue(rawValue) {
    if (rawValue == null) return null;
    const digits = extractDigits(rawValue);
    if (!digits) return null;
    const parsed = parseInt(digits, 10);
    return Number.isFinite(parsed) ? parsed : null;
}

async function updateBusData() {
    console.log('🚌 Memulai update data bis dari CSV...');
    console.log(`📄 Membaca: ${CSV_FILE}`);

    if (!fs.existsSync(CSV_FILE)) {
        console.error(`❌ File tidak ditemukan: ${CSV_FILE}`);
        process.exit(1);
    }

    const client = await pool.connect();
    console.log('✅ Terhubung ke database');

    const rows = [];
    await new Promise((resolve, reject) => {
        fs.createReadStream(CSV_FILE)
            .pipe(csv({
                mapHeaders: ({ header }) => normalizeHeaderName(header),
            }))
            .on('data', (row) => {
                const qrCode = row['QR Code'] ? row['QR Code'].trim() : null;
                if (qrCode) {
                    rows.push({
                        id: qrCode,
                        jurusan: row['Jurusan'] ? row['Jurusan'].trim() : null,
                        kota_tujuan: row['Kota Tujuan'] ? row['Kota Tujuan'].trim() : null,
                        kelompok_bis: row['Kelompok Bis'] ? row['Kelompok Bis'].trim() : null,
                        bis: row['Bis'] ? row['Bis'].trim() : null,
                        jumlah_orang: parseIntegerFromValue(row['Jumlah Orang']),
                        kapasitas_bis: parseIntegerFromValue(row['Jumlah Orang dalam 1 (satu) Bis']),
                    });
                }
            })
            .on('end', resolve)
            .on('error', reject);
    });

    console.log(`📊 Ditemukan ${rows.length} baris dengan QR Code di CSV`);

    let updated = 0;
    let notFound = 0;
    let skipped = 0;

    try {
        await client.query('BEGIN');

        for (const row of rows) {
            if (!row.jurusan && !row.kota_tujuan && !row.bis && !row.jumlah_orang && !row.kapasitas_bis) {
                skipped++;
                continue;
            }

            const result = await client.query(
                `UPDATE registrations
                 SET jurusan = COALESCE($2, jurusan),
                     kota_tujuan = COALESCE($3, kota_tujuan),
                     kelompok_bis = COALESCE($4, kelompok_bis),
                     bis = COALESCE($5, bis),
                     jumlah_orang = COALESCE($6, jumlah_orang),
                     kapasitas_bis = COALESCE($7, kapasitas_bis)
                 WHERE id = $1`,
                [row.id, row.jurusan, row.kota_tujuan, row.kelompok_bis, row.bis, row.jumlah_orang, row.kapasitas_bis]
            );

            if (result.rowCount > 0) {
                updated++;
            } else {
                notFound++;
                console.warn(`  ⚠️ ID tidak ditemukan di DB: ${row.id}`);
            }
        }

        await client.query('COMMIT');

        console.log('\n✨ Update selesai!');
        console.log(`   ✅ Diupdate: ${updated}`);
        console.log(`   ⚠️ Tidak ditemukan di DB: ${notFound}`);
        console.log(`   ⏭️ Dilewati (tidak ada data): ${skipped}`);

        // Verification
        const verifyRes = await client.query(
            `SELECT COUNT(*) AS total,
                    COUNT(jurusan) AS has_jurusan,
                    COUNT(kota_tujuan) AS has_kota_tujuan,
                    COUNT(bis) AS has_bis,
                    COUNT(jumlah_orang) AS has_jumlah_orang,
                    COUNT(kapasitas_bis) AS has_kapasitas_bis
             FROM registrations`
        );
        const v = verifyRes.rows[0];
        console.log('\n📋 Verifikasi setelah update:');
        console.log(`   Total registrasi: ${v.total}`);
        console.log(`   Punya jurusan: ${v.has_jurusan}`);
        console.log(`   Punya kota_tujuan: ${v.has_kota_tujuan}`);
        console.log(`   Punya bis: ${v.has_bis}`);
        console.log(`   Punya jumlah_orang: ${v.has_jumlah_orang}`);
        console.log(`   Punya kapasitas_bis: ${v.has_kapasitas_bis}`);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Error:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

updateBusData();
