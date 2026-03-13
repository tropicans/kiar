# Panduan Sinkronisasi Data Final (CSV Lokal -> PostgreSQL)

Dokumen ini menjelaskan proses import final satu kali dari file CSV lokal ke database.

## 1. Persiapan File
1. Simpan file final sebagai `Data Pemudik Final Banget.csv` di root project.
2. Pastikan header kolom mengikuti format data mudik saat ini (contoh: `Nama Pegawai`, `Nomor WA`, `QR Code`, `Nama Lengkap Penumpang 1`, `NIK`).

## 2. Persiapan Koneksi Database
1. Pastikan Postgres berjalan.
2. Pastikan `.env` berisi kredensial DB yang benar (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`).

## 3. Jalankan Import Final (One-Shot)

```bash
npm ci
npm run sync:final
```

Secara default script membaca file `Data Pemudik Final Banget.csv` di root project.

Jika perlu path custom:

```bash
CSV_FILE_PATH="C:/path/ke/file.csv" node migration/migrate_mudik.js
```

## 4. Apa yang dilakukan script ini?
1. Membaca CSV lokal dan validasi header penting.
2. Menormalisasi data (nama, WA, NIK).
3. Upsert data ke tabel `registrations` dan `passengers`.
4. Menandai data aktif/nonaktif berdasarkan snapshot CSV terakhir.
5. Menyimpan hasil run ke tabel `sync_runs`.

## Troubleshooting
- **File CSV tidak ditemukan**: pastikan nama/path file benar.
- **Error connection refused**: cek status Postgres dan nilai `DB_*` di `.env`.
- **Gambar gagal download**: pastikan URL gambar publik; jika tidak, URL asli tetap disimpan sebagai fallback.
