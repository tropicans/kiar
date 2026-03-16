#!/usr/bin/env node
/**
 * Reset Trial Data — Bersihkan data coba-coba sebelum go-live
 *
 * Membersihkan:
 *  1. passenger_verifications (riwayat verifikasi)
 *  2. admin_change_logs       (riwayat CRUD admin)
 *  3. app_sessions            (sesi login)
 *  4. Passengers: reset verified/verified_at/verified_by ke null
 *
 * TIDAK menghapus:
 *  - registrations (data pendaftaran)
 *  - passengers    (data penumpang — hanya reset status verifikasi)
 *  - sync_runs     (riwayat sync)
 *
 * Usage:
 *   node scripts/reset_trial_data.js          # dry-run (preview)
 *   node scripts/reset_trial_data.js --confirm  # eksekusi
 *
 * Docker:
 *   docker exec mudik-web node scripts/reset_trial_data.js --confirm
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  host: process.env.DB_HOST || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'kiar_secret',
  database: process.env.DB_NAME || 'kiar',
  port: parseInt(process.env.DB_PORT || '5432', 10),
});

const DRY_RUN = !process.argv.includes('--confirm');

async function main() {
  const client = await pool.connect();

  try {
    // Preview counts
    const counts = {};
    const tables = [
      { name: 'passenger_verifications', label: 'Riwayat verifikasi' },
      { name: 'admin_change_logs', label: 'Riwayat CRUD admin' },
      { name: 'app_sessions', label: 'Sesi login' },
    ];

    for (const t of tables) {
      const r = await client.query(`SELECT COUNT(*) AS cnt FROM ${t.name}`);
      counts[t.name] = parseInt(r.rows[0].cnt, 10);
    }

    const verifiedR = await client.query(
      `SELECT COUNT(*) AS cnt FROM passengers WHERE verified = true`
    );
    const verifiedCount = parseInt(verifiedR.rows[0].cnt, 10);

    console.log('\n╔══════════════════════════════════════════════╗');
    console.log('║       RESET DATA COBA-COBA (Trial Reset)     ║');
    console.log('╚══════════════════════════════════════════════╝\n');

    console.log('Data yang akan dihapus/direset:\n');
    for (const t of tables) {
      console.log(`  🗑  ${t.label.padEnd(25)} ${String(counts[t.name]).padStart(6)} rows`);
    }
    console.log(`  🔄 Status verifikasi       ${String(verifiedCount).padStart(6)} penumpang → unverified\n`);

    const totalPassengers = await client.query(`SELECT COUNT(*) AS cnt FROM passengers`);
    const totalRegs = await client.query(`SELECT COUNT(*) AS cnt FROM registrations`);
    console.log('Data yang TIDAK disentuh:');
    console.log(`  ✅ registrations            ${totalRegs.rows[0].cnt} rows (aman)`);
    console.log(`  ✅ passengers               ${totalPassengers.rows[0].cnt} rows (aman, hanya reset verified)\n`);

    if (DRY_RUN) {
      console.log('⚠️  Mode DRY-RUN — tidak ada data yang diubah.');
      console.log('    Jalankan dengan --confirm untuk eksekusi:\n');
      console.log('    node scripts/reset_trial_data.js --confirm\n');
      console.log('    Atau via Docker:');
      console.log('    docker exec mudik-web node scripts/reset_trial_data.js --confirm\n');
      return;
    }

    // Execute cleanup in a transaction
    console.log('🚀 Memulai pembersihan...\n');
    await client.query('BEGIN');

    for (const t of tables) {
      const res = await client.query(`DELETE FROM ${t.name}`);
      console.log(`  ✓ ${t.label.padEnd(25)} ${String(res.rowCount).padStart(6)} rows dihapus`);
    }

    const resetRes = await client.query(
      `UPDATE passengers SET verified = false, verified_at = NULL, verified_by = NULL WHERE verified = true`
    );
    console.log(`  ✓ Status verifikasi       ${String(resetRes.rowCount).padStart(6)} penumpang direset`);

    await client.query('COMMIT');

    console.log('\n✅ Pembersihan selesai! Aplikasi siap digunakan dari awal.\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error, rollback dilakukan:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
