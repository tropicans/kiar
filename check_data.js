import fs from 'fs';
import csv from 'csv-parser';
import axios from 'axios';
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

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTnEOmjbL_ytLThY-gGE3iV59KGlyqxmZmsCQw9ch9Kae7WCE2Vlr5uiA6omvU5GliEhyw_Fy57Irsj/pub?gid=64182246&single=true&output=csv';

async function checkData() {
    try {
        console.log('Connecting to database...');
        const client = await pool.connect();

        const regRes = await client.query('SELECT count(*) FROM registrations');
        const passRes = await client.query('SELECT count(*) FROM passengers');

        console.log(`DB Registrations count: ${regRes.rows[0].count}`);
        console.log(`DB Passengers count: ${passRes.rows[0].count}`);

        const dbPassengersRes = await client.query('SELECT nama FROM passengers');
        const dbPassengerNames = new Set(dbPassengersRes.rows.map(r => r.nama.trim().toLowerCase()));

        console.log('\nDownloading ALL-CLEAN CSV...');
        const response = await axios({ url: CSV_URL, method: 'GET', responseType: 'stream' });

        let csvRowCount = 0;
        let csvPassengerCount = 0;
        let missingInDb = [];
        let mappedPassengers = [];

        await new Promise((resolve, reject) => {
            response.data
                .pipe(csv()) // the headers might need skipLines: 2 similar to migrate_mudik? No, the user said "ALL-CLEAN", maybe it has 1 header line. Let's see.
                .on('data', (row) => {
                    csvRowCount++;
                    const p1 = row['Nama Lengkap Penumpang 1'];
                    const p2 = row['Nama Lengkap Penumpang 2'];
                    const p3 = row['Nama Lengkap Penumpang 3'];
                    const p4 = row['Nama Lengkap Penumpang 4'];
                    const pegawai = row['Nama Pegawai'];

                    if (pegawai || row['Nomor WA'] || row['QR Code']) {
                        if (p1 && p1.trim()) { csvPassengerCount++; mappedPassengers.push(p1.trim().toLowerCase()); }
                        if (p2 && p2.trim()) { csvPassengerCount++; mappedPassengers.push(p2.trim().toLowerCase()); }
                        if (p3 && p3.trim()) { csvPassengerCount++; mappedPassengers.push(p3.trim().toLowerCase()); }
                        if (p4 && p4.trim()) { csvPassengerCount++; mappedPassengers.push(p4.trim().toLowerCase()); }
                    }
                })
                .on('end', resolve)
                .on('error', reject);
        });

        console.log(`CSV Rows (excluding header): ${csvRowCount}`);
        console.log(`CSV Total Passengers: ${csvPassengerCount}`);

        const csvPassengerNames = new Set(mappedPassengers);
        const nameMissingInDb = mappedPassengers.filter(name => !dbPassengerNames.has(name));
        const nameMissingInCsv = [...dbPassengerNames].filter(name => !csvPassengerNames.has(name));

        console.log(`\nPassengers in CSV but NOT in DB: ${nameMissingInDb.length}`);
        if (nameMissingInDb.length > 0) {
            console.log(`Sample missing in DB:`, nameMissingInDb);
        }

        console.log(`Passengers in DB but NOT in CSV: ${nameMissingInCsv.length}`);
        if (nameMissingInCsv.length > 0) {
            console.log(`Sample missing in CSV:`, nameMissingInCsv);
        }

        if (nameMissingInDb.length === 0 && nameMissingInCsv.length === 0 && parseInt(passRes.rows[0].count) === csvPassengerCount) {
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
