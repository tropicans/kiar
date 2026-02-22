import QRCode from 'qrcode';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// --- Types ---
interface Passenger {
    id: number;
    nama: string;
    isRegistrant?: boolean;
    nik?: string;
    ktpUrl?: string;
    verified: boolean;
    verifiedAt: string | null;
    verifiedBy: string | null;
}

interface Registration {
    id: string;
    phone: string;
    ktpUrl: string;
    passengers: Passenger[];
}

// --- DOM Elements ---
const dashboardContent = document.getElementById('dashboardContent') as HTMLDivElement;
const btnBackToHome = document.getElementById('btnBackToHome') as HTMLButtonElement;

const tableBody = document.getElementById('tableBody') as HTMLTableSectionElement;
const totalDataCount = document.getElementById('totalDataCount') as HTMLSpanElement;
const btnDownloadAll = document.getElementById('btnDownloadAll') as HTMLButtonElement;
const themeToggle = document.getElementById('themeToggle') as HTMLButtonElement;

// --- State ---
let registrationsData: Registration[] = [];

btnBackToHome.addEventListener('click', () => {
    window.location.href = '/';
});

// --- Theme ---
const THEME_KEY = 'qrscan_theme';

function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next);
}

themeToggle.addEventListener('click', toggleTheme);

// Check secure session access set by main app
document.addEventListener('DOMContentLoaded', () => {
    initTheme();

    if (sessionStorage.getItem('qr_admin_access') === 'true') {
        dashboardContent.style.display = 'block';
        loadData();
    } else {
        // Redirect back to main page if accessed directly without auth
        window.location.href = '/';
    }
});

async function loadData() {
    try {
        const response = await fetch('/api/registrations');
        if (!response.ok) throw new Error('Failed to fetch data');

        const rawData: Registration[] = await response.json();

        // Filter: Hanya pendaftar yang memiliki nomor WA/HP yang valid
        registrationsData = rawData.filter(reg => reg.phone && reg.phone.trim().length > 5);

        renderTable();

        totalDataCount.textContent = registrationsData.length.toString();
        if (registrationsData.length > 0) {
            btnDownloadAll.disabled = false;
        }

    } catch (err: any) {
        console.error(err);
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--error-msg); padding: 32px;">Gagal memuat data: ${err.message}</td></tr>`;
    }
}

async function renderTable() {
    tableBody.innerHTML = '';

    for (const [index, reg] of registrationsData.entries()) {
        const tr = document.createElement('tr');

        // Passengers HTML
        let passHtml = '<ul class="passenger-list">';
        reg.passengers.forEach(p => {
            const badge = p.verified ? '<span class="verified-badge">Checked-in</span>' : '';
            const isRegBadge = p.isRegistrant ? '<span style="font-size: 10px; background: rgba(0, 195, 255, 0.1); color: var(--accent-light); padding: 2px 6px; border-radius: 4px; margin-left: 6px; font-weight: bold;">PENDAFTAR</span>' : '';

            const nikLabel = p.nik ? `NIK: ${p.nik}` : '';
            const ktpLink = p.ktpUrl ? `<a href="${p.ktpUrl}" target="_blank" style="color: var(--accent-blue); text-decoration: none; display: inline-block; margin-left: 8px;">📄 Lihat KTP</a>` : '';

            const metaInfo = (nikLabel || ktpLink) ? `<br><span style="font-size: 11px; color: var(--text-muted); display:flex; align-items:center; margin-top:4px;">${nikLabel} ${ktpLink}</span>` : '';

            passHtml += `<li class="passenger-item" style="margin-bottom: 8px;">
                            <strong>${p.nama}</strong> ${isRegBadge} ${badge}
                            ${metaInfo}
                         </li>`;
        });
        passHtml += '</ul>';

        // Check KTP
        const ktpLink = reg.ktpUrl ? `<a href="${reg.ktpUrl}" target="_blank" style="color: var(--accent-blue); text-decoration: none; font-size: 12px; margin-top: 4px; display: inline-block;">Lihat Identitas</a>` : '<span style="color: #666; font-size: 12px;">Tidak ada identitas</span>';

        tr.innerHTML = `
            <td>${index + 1}</td>
            <td class="qr-cell">
                <canvas id="qr-canvas-${reg.id}" class="qr-canvas"></canvas>
            </td>
            <td>
                <strong>${reg.id}</strong><br/>
                ${ktpLink}
            </td>
            <td>${reg.phone || '-'}</td>
            <td>${passHtml}</td>
            <td>
                <button class="btn-secondary" onclick="downloadSingleQR('${reg.id}')" style="padding: 8px 12px; font-size: 12px;">Download</button>
            </td>
        `;

        tableBody.appendChild(tr);

        // Render QR Code to the canvas in the table
        const canvas = document.getElementById(`qr-canvas-${reg.id}`) as HTMLCanvasElement;
        if (canvas) {
            await QRCode.toCanvas(canvas, reg.id, {
                width: 80,
                margin: 1,
                color: {
                    dark: '#000000',
                    light: '#ffffff'
                }
            });
        }
    }
}

// --- Download Logic ---

// Expose single dwnload to window for inline onclick handler
(window as any).downloadSingleQR = async (id: string) => {
    try {
        const qrDataUrl = await QRCode.toDataURL(id, {
            width: 800, // High res for printing
            margin: 2,
            errorCorrectionLevel: 'H'
        });

        const link = document.createElement('a');
        link.download = `QR_${id}.png`;
        link.href = qrDataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (err) {
        console.error('Failed to generate QR:', err);
        alert('Gagal mendownload QR Code.');
    }
};

btnDownloadAll.addEventListener('click', async () => {
    if (registrationsData.length === 0) return;

    btnDownloadAll.disabled = true;
    const originalText = btnDownloadAll.innerHTML;
    btnDownloadAll.innerHTML = '<span class="spinner" style="width: 20px; height: 20px; margin: 0; border-width: 2px;"></span> Memproses...';

    try {
        const zip = new JSZip();
        const folder = zip.folder("QR_Mudik_Surabaya");

        if (!folder) throw new Error("Could not create ZIP folder");

        // Generate QR codes
        for (const reg of registrationsData) {
            const qrDataUrl = await QRCode.toDataURL(reg.id, {
                width: 800, // High res for printing
                margin: 2,
                errorCorrectionLevel: 'H'
            });

            // Convert Base64 dataURL to Blob/Buffer for JSZip
            const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, "");
            folder.file(`QR_${reg.id}.png`, base64Data, { base64: true });
        }

        // Generate and download ZIP
        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, "QR_Codes_Mudik_All.zip");

    } catch (err) {
        console.error(err);
        alert('Terjadi kesalahan saat membuat file ZIP.');
    } finally {
        btnDownloadAll.disabled = false;
        btnDownloadAll.innerHTML = originalText;
    }
});
