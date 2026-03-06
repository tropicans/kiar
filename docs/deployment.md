# 🚀 Deployment Guide — MUDIK QR Scanner

Panduan deploy aplikasi MUDIK ke production server (Proxmox) dengan domain via Cloudflare.

## Prerequisites

- **Server**: Proxmox VE dengan LXC/VM yang sudah ada Docker
- **Domain**: `mudik.kelazz.my.id` (dikelola di Cloudflare)
- **Tools**: Docker + Docker Compose terinstall di server

## 🐳 Deploy dengan Docker

### 1. Clone Repository

```bash
git clone https://github.com/tropicans/kiar.git
cd kiar
```

### 2. Build & Run

```bash
docker compose up -d --build
```

Aplikasi akan berjalan di `http://<server-ip>:8080`.

### 3. Verifikasi

```bash
# Cek container berjalan
docker compose ps

# Cek logs
docker compose logs -f mudik

# Test akses
curl http://localhost:8080
```

### 4. Update Aplikasi

```bash
git pull
docker compose up -d --build
```

## ☁️ Setup Cloudflare

### DNS

1. Login ke [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Pilih domain `kelazz.my.id`
3. Tambah **A Record**:
   - **Name**: `mudik`
   - **Content**: IP publik server Proxmox
   - **Proxy status**: Proxied (orange cloud ☁️)

### SSL/TLS

1. Buka **SSL/TLS** → **Overview**
2. Set encryption mode ke **Flexible** (Cloudflare → HTTP ke container)
   - Atau gunakan **Full** jika pasang origin certificate

### Cloudflare Tunnel (Alternatif)

Jika tidak ingin expose IP publik:

```bash
# Install cloudflared di server
cloudflared tunnel create mudik
cloudflared tunnel route dns mudik mudik.kelazz.my.id

# Jalankan tunnel
cloudflared tunnel --url http://localhost:8080 run mudik
```

## 🔧 Deploy Manual (Tanpa Docker)

### 1. Build Lokal

```bash
npm install
npm run build
```

### 2. Copy ke Server

```bash
scp -r dist/* user@server:/var/www/mudik/
```

### 3. Setup Nginx

```bash
# Copy config
sudo cp deploy/nginx.conf /etc/nginx/sites-available/mudik
sudo ln -s /etc/nginx/sites-available/mudik /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## 📁 Struktur Production

```
dist/
├── index.html          # App utama (minified)
├── manifest.json       # PWA manifest
├── sw.js               # Service worker
├── qr-icon.svg         # Favicon
├── icon-192.svg        # PWA icon
├── icon-512.svg        # PWA icon
└── assets/
    ├── index-[hash].css   # Styles (minified)
    ├── index-[hash].js    # App logic (minified)
    └── qr-scanner-[hash].js  # QR library (chunk)
```

## 📊 Build Output

| File | Ukuran | Gzipped |
|---|---|---|
| `index.html` | 23.5 KB | 4.8 KB |
| `index.css` | 24.1 KB | 5.3 KB |
| `index.js` | 17.5 KB | 5.7 KB |
| `qr-scanner.js` | 333.4 KB | 98.3 KB |
| **Total** | **~398 KB** | **~114 KB** |

## ⚙️ Konfigurasi

| File | Fungsi |
|---|---|
| `vite.config.ts` | Build config (base path, minifikasi, chunk splitting) |
| `deploy/nginx.conf` | Nginx config (SPA fallback, gzip, caching, security headers) |
| `Dockerfile` | Multi-stage build (Node → Nginx) |
| `docker-compose.yml` | Docker service definition |

## 🔒 Security

Sudah termasuk dalam konfigurasi:

- **Nginx headers**: `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`, `Content-Security-Policy`
- **HTML meta**: Security headers + Open Graph tags
- **Asset caching**: Hashed filenames → 1 year cache. Service worker → no-cache
- **Cloudflare**: DDoS protection, SSL, WAF (jika diaktifkan)
