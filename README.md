# KYARA (QR Code Scanner & Verifier)

A fast, secure, and offline-capable QR Code scanner for event verification. Now powered by **PostgreSQL** and **Docker**.

## 🚀 Features

-   **Fast Scanning**: Built with `html5-qrcode`.
-   **Secure Verification**: Prevents double check-ins using PostgreSQL transactions.
-   **Offline-First**: PWA support (Service Worker) for loading the UI without internet.
-   **Dark Mode**: Automatic theme detection.
-   **Roles**: Staff PIN and Admin PIN protection.

## 🛠 Tech Stack

-   **Frontend**: Vite + TypeScript (Vanilla)
-   **Backend**: Node.js + Express
-   **Database**: PostgreSQL
-   **Containerization**: Docker + Docker Compose

## 🏁 Quick Start (Docker)

1.  **Clone the repository**
2.  **Start the services**:
    ```bash
    docker-compose up -d --build
    ```
    This will start:
    -   `kyara-web`: The app (Frontend + API) at `http://localhost:8080`
    -   `kyara-db`: PostgreSQL database

3.  **Access the App**: Open `http://localhost:8080` on your device.

## 🗄️ Database Management

The database is initialized automatically with `init.sql`.
To inspect data:
```bash
docker exec -it kyara-db psql -U postgres -d kiar
# SELECT * FROM registrants;
```

## 📸 KTP / ID Card Images

To display KTP images, you have two options:
1.  **External URLs**: Store images in a cloud bucket (S3, Google Drive, etc.) and save the URL in the `ktp_url` column.
2.  **Local Serving**: Map a local folder to the container.

### Local Serving Setup (Optional)
1.  Create a folder `uploads` in the project root.
2.  Uncomment the volume mapping in `docker-compose.yml`:
    ```yaml
    volumes:
      - ./uploads:/app/uploads
    ```
3.  Save images in `uploads/` (e.g., `user123.jpg`).
4.  In the database, set `ktp_url` to `/uploads/user123.jpg`.

## ⚙️ Configuration

-   **Admin PIN**: Default `1234` (Change in localStorage or code).
-   **Staff PINs**: Managed in the app settings or source code.

## 🔄 Migration from Google Sheets

If you have existing data in Google Sheets, you can migrate it easily.
See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for detailed instructions.
