# Panduan Migrasi Data (Google Sheets -> PostgreSQL)

Berikut adalah langkah-langkah untuk memindahkan data peserta dan foto KTP dari Google Sheets ke sistem baru.

## 1. Persiapan Data (Google Sheets)
1.  Buka Google Sheet data peserta Anda.
2.  Pastikan header kolom (baris pertama) bernama:
    *   `id`
    *   `nama`
    *   `phone`
    *   `ktpUrl`
    *   `verified`
    *   `verifiedAt`
    *   `verifiedBy`
3.  Klik **File** > **Download** > **Comma Separated Values (.csv)**.
4.  Simpan file tersebut sebagai `data.csv` dan letakkan di dalam folder `migration/` di project ini.

## 2. Persiapan Koneksi Database
Script migrasi akan mencoba menghubungi database.
*   Jika database berjalan di Docker, pastikan port database terekspos ke host (laptop Anda).
*   Edit `.env` atau sesuaikan config di `migration/migrate.js` (default port: 5432).
    *   *Note: Di docker-compose.yml kita belum mengekspos port 5432 ke host secara eksplisit untuk `kyara-db`. Anda mungkin perlu menambah `ports: - "5433:5432"` di `docker-compose.yml` untuk menjalankan script ini dari luar container.*

## 3. Menjalankan Migrasi
Buka terminal di folder project dan jalankan:

```bash
# Install dependencies migrasi (jika belum)
npm install axios csv-parser pg

# Jalankan script
node migration/migrate.js
```

## Apa yang dilakukan script ini?
1.  Membaca `migration/data.csv`.
2.  Untuk setiap baris:
    *   Mendownload foto dari `ktpUrl` (jika ada).
    *   Menyimpan foto ke folder `uploads/` dengan nama file `ID_PESERTA.jpg`.
    *   Menyimpan data peserta ke database PostgreSQL.
    *   Mengupdate kolom `ktp_url` di database mearah ke file lokal (`/uploads/...`).

## Troubleshooting
*   **Error Connection Refused**: Cek apakah Postgres berjalan dan port-nya benar.
*   **Gambar Gagal Download**: Pastikan link Google Drive bersifat "Anyone with the link can view". Script mencoba mengonversi link view menjadi link download otomatis.
