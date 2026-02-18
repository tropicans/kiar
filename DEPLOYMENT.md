# Panduan Deployment ke Proxmox (LXC/VM)

Panduan ini akan membantu Anda menginstall KYARA di server Proxmox menggunakan **LXC Container** (rekomendasi: ringan) atau **Virtual Machine**.

## 1. Persiapan LXC Container
1.  Login ke Proxmox Web GUI.
2.  Klik **Create CT** (kanan atas).
3.  **General**: Isi Hostname (misal: `kyara-app`) dan Password.
4.  **Template**: Pilih template **Debian 12** atau **Ubuntu 22.04**.
5.  **Disks**: 8GB - 10GB cukup.
6.  **CPU/Memory**: 1-2 Core, 1024MB - 2048MB RAM.
7.  **Network**: Pilih Bridge (biasanya `vmbr0`), set IP Static (misal: `192.168.1.100/24`) dan Gateway.
8.  **Confirm**: Centang "Start after created" lalu Finish.

## 2. Install Docker & Docker Compose
Buka Console (Shell) dari LXC container yang baru dibuat, lalu jalankan perintah berikut:

```bash
# Update repository
apt update && apt upgrade -y

# Install dependencies dasar
apt install -y curl git make

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Verifikasi Docker berjalan
docker --version
docker compose version
```

## 3. Clone Repository & Setup
```bash
# Clone repo
git clone https://github.com/tropicans/kiar.git
cd kiar

# Setup environment variable
cp .env.example .env 2>/dev/null || touch .env
# Edit .env sesuaikan dengan password/port yang diinginkan (opsional)
# nano .env 
```

## 4. Jalankan Aplikasi
```bash
docker compose up -d --build
```

Tunggu hingga proses build selesai. Aplikasi akan berjalan di port `8080`.

## 5. Akses Aplikasi
Buka browser dan akses IP LXC Container Anda:
`http://ALAMAT_IP_LXC:8080` (misal: `http://192.168.1.100:8080`).

## 6. (Optional) Reverse Proxy & HTTPS
Jika ingin menggunakan domain (misal `kyara.example.com`) dan HTTPS:
1.  Install **Nginx Proxy Manager** di container terpisah atau gunakan Nginx di container yang sama.
2.  Arahkan domain ke IP Proxmox/Container.
3.  Proxy Pass port 80/443 ke `http://IP-CONTAINER:8080`.

## 7. Migrasi Data (Jika ada)
Jika Anda punya file `data.csv` dari Google Sheets:
1.  Upload file `data.csv` ke folder `migration/` di server (bisa pakai FTP/SCP/WinSCP).
2.  Karena kita pakai Docker, cara termudah menjalankan script migrasi adalah dengan membuat temporary container nodejs:

```bash
# Masuk ke folder project
cd kiar

# Install dependencies di lokal folder (akan membuat node_modules)
docker run --rm -v "$PWD":/app -w /app node:20-alpine npm install

# Jalankan script migrasi (menghubungi database via network docker default)
# Note: Host 'postgres' dari dalam docker network 'kiar_default' mungkin tidak bisa diakses
# Paling mudah: Jalankan script dari workstation Anda (laptop) yang terhubung ke DB server,
# atau install nodejs di LXC host untuk menjalankannya.

# Opsi Install NodeJS di LXC Host (Recommended for migration):
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
npm install

# Pastikan DB port terekspos (edit docker-compose.yml tambah "5432:5432" di service postgres jika perlu)
# lalu jalankan:
node migration/migrate.js
```

## Troubleshooting
*   **Docker tidak jalan di LXC**: Pastikan di Proxmox, pada tab **Options** container LXC, fitur **Keyctl** dan **Nesting** dicentang (Enabled). Ini wajib untuk Docker di LXC.
