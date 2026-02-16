# 📱 KYARA — QR Scanner Verifikasi Registrasi

Aplikasi web scanner QR code untuk verifikasi kehadiran/registrasi peserta. Terintegrasi dengan Google Sheets sebagai database, mendukung multi-user (10-15 staf), dan berjalan offline sebagai PWA.

## ✨ Fitur

| Fitur | Deskripsi |
|---|---|
| 📷 **QR Scanner** | Scan QR code langsung dari kamera perangkat |
| ⌨️ **Input Manual** | Ketik ID manual jika QR rusak/blur |
| ✅ **Verifikasi** | Lookup data registran + preview KTP + tombol verifikasi |
| 🛡️ **Duplicate Guard** | Cegah double verifikasi — tampilkan siapa & kapan sudah diverifikasi |
| 🔒 **PIN Lock** | Akses dibatasi PIN, setiap staf login dengan identitas masing-masing |
| 👤 **Audit Trail** | Setiap verifikasi tercatat: siapa staf-nya, jam berapa |
| ⚙️ **Settings UI** | Konfigurasi URL Google Sheet, PIN, daftar staf — langsung dari browser |
| 📊 **Statistik** | Counter real-time: Total Scan, Terverifikasi, Pending |
| 🌐 **Status Jaringan** | Indikator online/offline |
| 🔄 **Mode Antrian** | Auto-scan berkelanjutan untuk proses registrasi cepat |
| 🔊 **Beep Sound** | Suara feedback saat scan berhasil |
| 🌙 **Dark/Light Mode** | Toggle tema gelap dan terang |
| 📱 **PWA** | Install ke home screen, bekerja offline |

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/tropicans/kiar.git
cd kiar
npm install
npm run dev
```

Buka `http://localhost:5173` di browser.

### 2. Build Production

```bash
npm run build
```

Output di folder `dist/` — siap deploy ke hosting statis (Netlify, Vercel, GitHub Pages, dll).

## 📋 Setup Google Sheets

### Step 1: Buat Spreadsheet

Buat Google Sheet baru dengan header kolom berikut di **baris pertama**:

| ID | Nama | Phone | KTP URL | Verified | Verified At | Verified By |
|---|---|---|---|---|---|---|
| REG-001 | Ahmad Rizky | 081234567890 | *(link GDrive)* | FALSE | | |
| REG-002 | Siti Nurhaliza | 087654321098 | *(link GDrive)* | FALSE | | |

> **Kolom KTP URL**: Upload foto KTP ke Google Drive → Klik kanan → "Get Link" → Set "Anyone with the link" → Paste link.

### Step 2: Pasang Apps Script

1. Buka Google Sheet → **Extensions** → **Apps Script**
2. Hapus semua kode default
3. Copy-paste isi file [`docs/apps-script.js`](docs/apps-script.js)
4. Sesuaikan `SHEET_NAME` jika perlu (default: `Sheet1`)
5. Sesuaikan nama kolom di objek `COL` jika header Sheet Anda berbeda
6. Klik 💾 **Save**

### Step 3: Deploy Web App

1. Klik **Deploy** → **New deployment**
2. Type: **Web app**
3. **Execute as**: Me
4. **Who has access**: Anyone
5. Klik **Deploy** → **Authorize** jika diminta
6. **Copy URL** yang muncul

### Step 4: Hubungkan ke Aplikasi

1. Buka aplikasi QR Scan
2. Klik ⚙️ ikon gear di header → **Settings**
3. Paste URL Web App ke field **"Google Apps Script URL"**
4. Klik **Test** untuk verifikasi koneksi
5. Atur **PIN** (opsional) dan **Daftar Staf**
6. Klik **Simpan Pengaturan**

✅ Selesai! Scan QR akan langsung terhubung ke Google Sheet Anda.

## 🔧 Konfigurasi Staf & PIN

Semua konfigurasi dilakukan dari menu **Settings** (⚙️) di dalam app:

| Setting | Fungsi |
|---|---|
| **Google Apps Script URL** | URL endpoint ke Google Sheet |
| **PIN Akses** | PIN yang harus dimasukkan staf sebelum menggunakan app (kosongkan untuk nonaktifkan) |
| **Daftar Staf** | Nama-nama staf (satu per baris) yang muncul di dropdown saat login |

> Konfigurasi disimpan di `localStorage` browser masing-masing perangkat. Anda perlu set ulang di setiap perangkat baru.

## 📐 Struktur Kolom Google Sheet

Pastikan nama kolom header di Google Sheet sesuai dengan konfigurasi berikut (bisa disesuaikan di `apps-script.js`):

```javascript
const COL = {
    ID: 'ID',               // ID unik registran (isi QR code)
    NAMA: 'Nama',           // Nama lengkap
    PHONE: 'Phone',         // Nomor telepon
    KTP_URL: 'KTP URL',     // URL gambar KTP (Google Drive)
    VERIFIED: 'Verified',   // Status verifikasi (TRUE/FALSE)
    VERIFIED_AT: 'Verified At', // Timestamp verifikasi
    VERIFIED_BY: 'Verified By', // Nama staf yang memverifikasi
};
```

## 🏗️ Tech Stack

- **Frontend**: Vanilla TypeScript + Vite
- **Scanner**: [html5-qrcode](https://github.com/mebjas/html5-qrcode)
- **Backend**: Google Apps Script (serverless)
- **Database**: Google Sheets
- **Storage**: Google Drive (untuk KTP)
- **Audio**: Web Audio API
- **Offline**: Service Worker + Cache API

## 📂 Struktur File

```
kyara/
├── index.html          # Halaman utama
├── src/
│   ├── main.ts         # Logic utama (scanner, UI, lock screen, settings)
│   ├── sheets.ts       # Service layer Google Sheets
│   └── style.css       # Desain (dark glassmorphism, responsive)
├── public/
│   ├── manifest.json   # PWA manifest
│   ├── sw.js           # Service worker
│   ├── qr-icon.svg     # Favicon
│   ├── icon-192.svg    # PWA icon 192x192
│   └── icon-512.svg    # PWA icon 512x512
├── docs/
│   └── apps-script.js  # Kode untuk Google Apps Script
├── package.json
└── tsconfig.json
```

## 📝 Lisensi

MIT
