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

const DEFAULT_CSV_FILE = path.join(__dirname, 'Data Pemudik Final Banget.csv');
const CSV_FILE_PATH = process.env.CSV_FILE_PATH
    ? (path.isAbsolute(process.env.CSV_FILE_PATH)
        ? process.env.CSV_FILE_PATH
        : path.resolve(process.cwd(), process.env.CSV_FILE_PATH))
    : DEFAULT_CSV_FILE;

const UPPERCASE_NAME_TOKENS = new Set(['TNI', 'POLRI', 'PT', 'CV', 'H', 'HJ']);

function normalizeHeaderName(header) {
    if (!header) return header;
    return String(header).replace(/^\uFEFF/, '').trim();
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
        .join(' ')
        .toLowerCase();
}

async function checkData() {
    try {
        console.log('Connecting to database...');
        const client = await pool.connect();

        const regRes = await client.query('SELECT count(*) FROM registrations');
        const passRes = await client.query('SELECT count(*) FROM passengers');
        const activeRegRes = await client.query('SELECT count(*) FROM registrations WHERE active = TRUE');
        const activePassRes = await client.query('SELECT count(*) FROM passengers WHERE active = TRUE');

        console.log(`DB Registrations count: ${regRes.rows[0].count}`);
        console.log(`DB Passengers count: ${passRes.rows[0].count}`);
        console.log(`DB Active Registrations count: ${activeRegRes.rows[0].count}`);
        console.log(`DB Active Passengers count: ${activePassRes.rows[0].count}`);

        const dbPassengersRes = await client.query('SELECT nama FROM passengers WHERE active = TRUE');
        const dbPassengerNames = new Set(dbPassengersRes.rows.map((r) => normalizeName(r.nama)));

        if (!fs.existsSync(CSV_FILE_PATH)) {
            throw new Error(`File CSV tidak ditemukan: ${CSV_FILE_PATH}`);
        }

        console.log(`\nMembaca CSV lokal: ${CSV_FILE_PATH}`);

        let csvRowCount = 0;
        let csvPassengerCount = 0;
        const mappedPassengers = [];
        const mappedRegistrations = new Set();

        await new Promise((resolve, reject) => {
            fs.createReadStream(CSV_FILE_PATH)
                .pipe(csv({
                    mapHeaders: ({ header }) => normalizeHeaderName(header),
                }))
                .on('data', (row) => {
                    csvRowCount++;
                    const p1 = row['Nama Lengkap Penumpang 1'];
                    const p2 = row['Nama Lengkap Penumpang 2'];
                    const p3 = row['Nama Lengkap Penumpang 3'];
                    const p4 = row['Nama Lengkap Penumpang 4'];
                    const pegawai = row['Nama Pegawai'];
                    const qrCode = row['QR Code'];

                    if (pegawai || row['Nomor WA'] || row['QR Code']) {
                        if (qrCode && qrCode.trim()) {
                            mappedRegistrations.add(qrCode.trim());
                        }
                        if (p1 && p1.trim()) { csvPassengerCount++; mappedPassengers.push(normalizeName(p1)); }
                        if (p2 && p2.trim()) { csvPassengerCount++; mappedPassengers.push(normalizeName(p2)); }
                        if (p3 && p3.trim()) { csvPassengerCount++; mappedPassengers.push(normalizeName(p3)); }
                        if (p4 && p4.trim()) { csvPassengerCount++; mappedPassengers.push(normalizeName(p4)); }
                    }
                })
                .on('end', resolve)
                .on('error', reject);
        });

        console.log(`CSV Rows (excluding header): ${csvRowCount}`);
        console.log(`CSV Total Passengers: ${csvPassengerCount}`);
        console.log(`CSV Registrations with QR: ${mappedRegistrations.size}`);

        const csvPassengerNames = new Set(mappedPassengers);
        const nameMissingInDb = mappedPassengers.filter((name) => !dbPassengerNames.has(name));
        const nameMissingInCsv = [...dbPassengerNames].filter((name) => !csvPassengerNames.has(name));

        console.log(`\nPassengers in CSV but NOT in DB: ${nameMissingInDb.length}`);
        if (nameMissingInDb.length > 0) {
            console.log(`Sample missing in DB:`, nameMissingInDb);
        }

        console.log(`Passengers in DB but NOT in CSV: ${nameMissingInCsv.length}`);
        if (nameMissingInCsv.length > 0) {
            console.log(`Sample missing in CSV:`, nameMissingInCsv);
        }

        if (
            nameMissingInDb.length === 0
            && nameMissingInCsv.length === 0
            && parseInt(activePassRes.rows[0].count, 10) === csvPassengerCount
            && parseInt(activeRegRes.rows[0].count, 10) === mappedRegistrations.size
        ) {
            console.log('\nRESULT: Data matches perfectly!');
        } else {
            console.log('\nRESULT: Data DOES NOT match.');
        }

        client.release();
        pool.end();
    } catch (err) {
        console.error('Error:', err);
        pool.end();
    }
}

checkData();
