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

// Search and Pagination Elements
const searchInput = document.getElementById('searchInput') as HTMLInputElement;
const paginationControls = document.getElementById('paginationControls') as HTMLDivElement;
const pagStart = document.getElementById('pagStart') as HTMLSpanElement;
const pagEnd = document.getElementById('pagEnd') as HTMLSpanElement;
const pagTotal = document.getElementById('pagTotal') as HTMLSpanElement;
const btnPrevPage = document.getElementById('btnPrevPage') as HTMLButtonElement;
const btnNextPage = document.getElementById('btnNextPage') as HTMLButtonElement;
const pageNumbersContainer = document.getElementById('pageNumbersContainer') as HTMLDivElement;

// Modal Elements
const ktpModal = document.getElementById('ktpModal') as HTMLDivElement;
const ktpModalImage = document.getElementById('ktpModalImage') as HTMLImageElement;
const modalCloseBtn = document.getElementById('modalCloseBtn') as HTMLButtonElement;

// --- State ---
let registrationsData: Registration[] = [];
let filteredData: Registration[] = [];
let currentPage = 1;
const ITEMS_PER_PAGE = 20;

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

        // Clean up No WhatsApp field (take only the first number if " DAN " is present)
        registrationsData = registrationsData.map(reg => {
            if (reg.phone) {
                reg.phone = reg.phone.split(/\s*DAN\s*|\s*dan\s*|\s*\/\s*|\s*,\s*/)[0].trim();
            }
            return reg;
        });

        filteredData = [...registrationsData];

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

// --- Search and Pagination Logic ---

searchInput.addEventListener('input', (e) => {
    const query = (e.target as HTMLInputElement).value.toLowerCase().trim();
    currentPage = 1; // Reset to page 1 on search

    if (!query) {
        filteredData = [...registrationsData];
    } else {
        filteredData = registrationsData.filter(reg => {
            const matchId = reg.id.toLowerCase().includes(query);
            const matchPhone = reg.phone && reg.phone.includes(query);
            const matchPassenger = reg.passengers.some(p => p.nama.toLowerCase().includes(query) || (p.nik && p.nik.includes(query)));
            return matchId || matchPhone || matchPassenger;
        });
    }

    renderTable();
});

btnPrevPage.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        renderTable();
    }
});

btnNextPage.addEventListener('click', () => {
    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
    if (currentPage < totalPages) {
        currentPage++;
        renderTable();
    }
});

function createPageButton(pageNum: number, isCurrent: boolean) {
    const btn = document.createElement('button');
    btn.className = `btn-secondary-admin page-btn ${isCurrent ? 'active' : ''}`;
    btn.textContent = pageNum.toString();
    btn.style.padding = '8px 12px';
    btn.style.minWidth = '36px';

    if (isCurrent) {
        btn.style.background = 'var(--accent-gradient)';
        btn.style.color = 'white';
        btn.style.border = 'none';
    }

    btn.addEventListener('click', () => {
        currentPage = pageNum;
        renderTable();
    });
    return btn;
}

function renderPagination() {
    const totalItems = filteredData.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    if (totalItems <= ITEMS_PER_PAGE) {
        paginationControls.style.display = 'none';
        return;
    }

    paginationControls.style.display = 'flex';

    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIdx = Math.min(startIdx + ITEMS_PER_PAGE, totalItems);

    pagStart.textContent = (startIdx + 1).toString();
    pagEnd.textContent = endIdx.toString();
    pagTotal.textContent = totalItems.toString();

    btnPrevPage.disabled = currentPage === 1;
    btnPrevPage.style.opacity = currentPage === 1 ? '0.5' : '1';
    btnPrevPage.style.cursor = currentPage === 1 ? 'not-allowed' : 'pointer';

    btnNextPage.disabled = currentPage === totalPages;
    btnNextPage.style.opacity = currentPage === totalPages ? '0.5' : '1';
    btnNextPage.style.cursor = currentPage === totalPages ? 'not-allowed' : 'pointer';

    pageNumbersContainer.innerHTML = '';

    // Simple pagination rendering (max 5 buttons)
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);

    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }

    if (startPage > 1) {
        const span = document.createElement('span');
        span.textContent = '...';
        span.style.color = 'var(--text-muted)';
        span.style.padding = '0 4px';
        pageNumbersContainer.appendChild(span);
    }

    for (let i = startPage; i <= endPage; i++) {
        pageNumbersContainer.appendChild(createPageButton(i, i === currentPage));
    }

    if (endPage < totalPages) {
        const span = document.createElement('span');
        span.textContent = '...';
        span.style.color = 'var(--text-muted)';
        span.style.padding = '0 4px';
        pageNumbersContainer.appendChild(span);
    }
}

async function renderTable() {
    tableBody.innerHTML = '';

    if (filteredData.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 48px; color: var(--text-muted);">Tidak ada data yang cocok dengan pencarian</td></tr>`;
        paginationControls.style.display = 'none';
        return;
    }

    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedItems = filteredData.slice(startIdx, startIdx + ITEMS_PER_PAGE);

    renderPagination();

    for (const [idx, reg] of paginatedItems.entries()) {
        const actualIndex = startIdx + idx + 1;
        const tr = document.createElement('tr');

        // Passengers HTML (Pill UI)
        let passHtml = '<div class="passenger-pills">';
        reg.passengers.forEach(p => {
            const isRegClass = p.isRegistrant ? 'passenger-pill-utama' : '';
            const isVerifiedClass = p.verified ? 'passenger-pill-verified' : '';
            const statusIcon = p.verified
                ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>'
                : '';

            const isRegBadge = p.isRegistrant ? '<span style="font-size: 10px; background: rgba(0, 195, 255, 0.1); color: var(--accent-light); padding: 2px 6px; border-radius: 4px; margin-left: 6px; font-weight: bold;">PENDAFTAR</span>' : '';

            const nikLabel = p.nik ? `<span class="pill-meta">${p.nik}</span>` : '';
            const ktpLink = p.ktpUrl ? `<a href="javascript:void(0)" onclick="openKtpModal('${p.ktpUrl}')" class="pill-ktp-link">📄 KTP</a>` : '';

            passHtml += `
                <div class="passenger-pill ${isRegClass} ${isVerifiedClass}">
                    <div class="pill-header">
                        <strong class="pill-name">${p.nama} ${isRegBadge}</strong>
                        ${statusIcon}
                    </div>
                    ${(nikLabel || ktpLink) ? `<div class="pill-footer">${nikLabel} ${ktpLink}</div>` : ''}
                </div>
            `;
        });
        passHtml += '</div>';

        // Check KTP
        const ktpLink = reg.ktpUrl ? `<a href="javascript:void(0)" onclick="openKtpModal('${reg.ktpUrl}')" style="color: var(--accent-blue); text-decoration: none; font-size: 13px; margin-top: 6px; display: inline-flex; align-items: center; gap: 4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> Lihat Identitas</a>` : '<span style="color: var(--text-muted); font-size: 13px; display: block; margin-top: 6px;">Tidak ada identitas</span>';

        tr.innerHTML = `
            <td>${actualIndex}</td>
            <td class="qr-cell">
                <canvas id="qr-canvas-${reg.id}" class="qr-canvas"></canvas>
            </td>
            <td>
                <strong style="font-size: 15px;">${reg.id}</strong><br/>
                ${ktpLink}
            </td>
            <td>${reg.phone || '-'}</td>
            <td>${passHtml}</td>
            <td style="text-align: center;">
                <button class="btn-secondary-admin" onclick="downloadSingleQR('${reg.id}')" style="padding: 8px 12px; font-size: 12px; margin: 0 auto;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> 
                    Simpan
                </button>
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

// --- Modal Logic ---
(window as any).openKtpModal = (url: string) => {
    ktpModalImage.src = url;
    ktpModal.style.display = 'flex';
};

modalCloseBtn.addEventListener('click', () => {
    ktpModal.style.display = 'none';
    setTimeout(() => { ktpModalImage.src = ''; }, 300); // Clear after animation
});

// Close modal on click outside
ktpModal.addEventListener('click', (e) => {
    if (e.target === ktpModal) {
        ktpModal.style.display = 'none';
        setTimeout(() => { ktpModalImage.src = ''; }, 300);
    }
});

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
