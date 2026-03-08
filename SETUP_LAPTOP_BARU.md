# Setup di Laptop Baru

Dokumen ini menjelaskan cara memindahkan project ini ke laptop lain beserta datanya.

Poin penting:
- `git pull` hanya menarik kode dan file yang ada di repository.
- Database PostgreSQL tidak ikut terbawa otomatis.
- File `Data Pemudik Final.csv` ikut terbawa jika memang sudah ada di repo dan berhasil ter-pull.

## 1. Clone repository

```bash
git clone https://github.com/tropicans/kiar.git
cd kiar
```

## 2. Siapkan environment

Minimal pastikan tersedia:
- Node.js 20+
- npm
- PostgreSQL lokal, atau Docker Desktop jika mau jalankan via container

Install dependency:

```bash
npm ci
```

## 3. Siapkan database

Ada dua opsi.

### Opsi A - PostgreSQL lokal

1. Buat database baru, misalnya `kiar`.
2. Isi `.env` dengan koneksi database lokal.

Contoh:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=kiar
```

3. Inisialisasi schema:

```bash
psql -U postgres -d kiar -f init.sql
```

### Opsi B - Docker

```bash
docker compose up -d --build postgres app
```

Kalau hanya butuh database dulu, cukup jalankan service Postgres sesuai kebutuhan lokalmu.

## 4. Sinkronkan data final

Pastikan file `Data Pemudik Final.csv` ada di root project.

Lalu jalankan:

```bash
npm run sync:final
```

Perintah ini akan:
- membaca `Data Pemudik Final.csv`
- melakukan upsert ke `registrations` dan `passengers`
- menandai data aktif/nonaktif sesuai snapshot CSV terakhir

## 5. Validasi data

Setelah import selesai, cek hasilnya:

```bash
node check_data.js
```

Kalau sinkron sukses, hitungan data aktif di database akan cocok dengan isi CSV final.

## 6. Jalankan aplikasi

Mode development:

```bash
npm run dev
```

Mode build + server:

```bash
npm run build
node server/index.js
```

## 7. Kalau ingin database benar-benar identik dari laptop lama

Kalau yang kamu mau bukan re-import dari CSV, tapi benar-benar menyalin isi database laptop lama, pakai dump PostgreSQL.

### Export dari laptop lama

```bash
pg_dump -U postgres -d kiar > kiar_backup.sql
```

### Import di laptop baru

```bash
psql -U postgres -d kiar -f kiar_backup.sql
```

Metode dump ini akan membawa juga:
- status verified yang sudah terjadi
- audit verifikasi / unverify
- perubahan admin CRUD

Sedangkan `npm run sync:final` hanya membangun ulang data dari CSV final, bukan menyalin histori operasional penuh.

## 8. Rekomendasi pemakaian

- Kalau hanya butuh data peserta terbaru: pakai `npm run sync:final`
- Kalau butuh histori operasional lengkap: pakai `pg_dump` + `psql`

## Ringkasnya

`git pull` saja tidak cukup untuk membawa database.

Supaya laptop baru siap dipakai, pilih salah satu:
1. clone repo + setup DB + `npm run sync:final`
2. clone repo + restore dump PostgreSQL
