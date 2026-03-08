import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

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
    idCardUrl?: string;
    passengers: Passenger[];
}

interface AdminSummary {
    registrationsCount: number;
    passengersCount: number;
    verifiedCount: number;
    pendingCount: number;
    verificationRate: number;
    fullyVerifiedRegistrations: number;
    partialVerifiedRegistrations: number;
    pendingRegistrations: number;
}

interface TopVerifier {
    name: string;
    totalActions: number;
    lastActionAt: string | null;
}

interface RecentActivityItem {
    id: number;
    action: 'verify' | 'unverify';
    verifiedAt: string;
    verifiedBy: string;
    source: string;
    notes?: string | null;
    passengerName: string;
    registrationId: string;
}

interface HourlyTrendPoint {
    hourLabel: string;
    totalActions: number;
    verifyActions: number;
    unverifyActions: number;
}

interface AdminSummaryResponse {
    summary: AdminSummary;
    topVerifiers: TopVerifier[];
    recentActivity: RecentActivityItem[];
    hourlyTrend: HourlyTrendPoint[];
}

// --- DOM Elements ---
const dashboardContent = document.getElementById('dashboardContent') as HTMLDivElement;
const btnBackToHome = document.getElementById('btnBackToHome') as HTMLButtonElement;

const tableBody = document.getElementById('tableBody') as HTMLTableSectionElement;
const totalDataCount = document.getElementById('totalDataCount') as HTMLSpanElement;
const themeToggle = document.getElementById('themeToggle') as HTMLButtonElement;
const summaryRegistrations = document.getElementById('summaryRegistrations') as HTMLDivElement;
const summaryRegistrationMeta = document.getElementById('summaryRegistrationMeta') as HTMLDivElement;
const summaryPassengers = document.getElementById('summaryPassengers') as HTMLDivElement;
const summaryPassengerMeta = document.getElementById('summaryPassengerMeta') as HTMLDivElement;
const summaryVerified = document.getElementById('summaryVerified') as HTMLDivElement;
const summaryVerifiedMeta = document.getElementById('summaryVerifiedMeta') as HTMLDivElement;
const summaryPending = document.getElementById('summaryPending') as HTMLDivElement;
const summaryPendingMeta = document.getElementById('summaryPendingMeta') as HTMLDivElement;
const topVerifiersList = document.getElementById('topVerifiersList') as HTMLDivElement;
const recentActivityList = document.getElementById('recentActivityList') as HTMLDivElement;
const verificationTrendCanvas = document.getElementById('verificationTrendChart') as HTMLCanvasElement;
const adminToast = document.getElementById('adminToast') as HTMLDivElement;
const adminToastMessage = document.getElementById('adminToastMessage') as HTMLSpanElement;

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
const ADMIN_PIN_KEY = 'qrscan_admin_pin';
let adminSummaryData: AdminSummaryResponse | null = null;
let verificationTrendChart: Chart | null = null;
let adminToastTimeout: ReturnType<typeof setTimeout> | null = null;

function getStoredAdminPinHash(): string {
    return localStorage.getItem(ADMIN_PIN_KEY) || '';
}

async function hashPin(pin: string): Promise<string> {
    const data = new TextEncoder().encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function verifyAdminPin(enteredPin: string): Promise<boolean> {
    const storedHash = getStoredAdminPinHash();
    if (!storedHash) return false;
    const enteredHash = await hashPin(enteredPin);
    return enteredHash === storedHash;
}

async function unverifyPassenger(passengerId: number, passengerName: string) {
    const approved = await requestAdminPinApproval(`membatalkan verifikasi ${passengerName}`);
    if (!approved) return;

    const reason = window.prompt(`Alasan membatalkan verifikasi untuk ${passengerName}:`, 'Salah pilih operator');
    if (reason === null) return;

    const response = await fetch('/api/unverify-passengers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            passengerIds: [passengerId],
            verifiedBy: 'Admin Dashboard',
            reason,
        }),
    });

    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`);
    }

    const target = registrationsData.flatMap((registration) => registration.passengers).find((passenger) => passenger.id === passengerId);
    if (target) {
        target.verified = false;
        target.verifiedAt = null;
        target.verifiedBy = null;
    }

    await loadData();
}

async function requestAdminPinApproval(targetLabel: string): Promise<boolean> {
    const storedAdminPinHash = getStoredAdminPinHash();
    if (!storedAdminPinHash) {
        throw new Error('Admin PIN belum diatur. Silakan set dulu dari halaman scanner.');
    }

    const enteredPin = window.prompt(`Masukkan Admin PIN untuk ${targetLabel}:`, '');
    if (enteredPin === null) return false;

    const isValidPin = await verifyAdminPin(enteredPin.trim());
    if (!isValidPin) {
        throw new Error('Admin PIN salah');
    }

    return true;
}

async function unverifyRegistration(registrationId: string) {
    const registration = registrationsData.find((item) => item.id === registrationId);
    if (!registration) {
        throw new Error('Rombongan tidak ditemukan');
    }

    const verifiedPassengers = registration.passengers.filter((passenger) => passenger.verified);
    if (verifiedPassengers.length === 0) {
        throw new Error('Belum ada penumpang terverifikasi di rombongan ini');
    }

    const approved = await requestAdminPinApproval(`membatalkan verifikasi rombongan ${registrationId}`);
    if (!approved) return;

    const reason = window.prompt(
        `Alasan membatalkan ${verifiedPassengers.length} verifikasi pada rombongan ${registrationId}:`,
        'Koreksi verifikasi rombongan',
    );
    if (reason === null) return;

    const response = await fetch('/api/unverify-passengers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            passengerIds: verifiedPassengers.map((passenger) => passenger.id),
            verifiedBy: 'Admin Dashboard',
            reason,
        }),
    });

    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`);
    }

    await loadData();
}

(window as any).unverifyPassenger = async (passengerId: number, passengerName: string) => {
    try {
        await unverifyPassenger(passengerId, passengerName);
        showAdminToast(`Verifikasi ${passengerName} berhasil dibatalkan.`);
    } catch (error: any) {
        console.error(error);
        showAdminToast(`Gagal membatalkan verifikasi: ${error.message}`);
    }
};

(window as any).unverifyRegistration = async (registrationId: string) => {
    try {
        await unverifyRegistration(registrationId);
        showAdminToast(`Semua verifikasi aktif di rombongan ${registrationId} berhasil dibatalkan.`);
    } catch (error: any) {
        console.error(error);
        showAdminToast(`Gagal membatalkan verifikasi rombongan: ${error.message}`);
    }
};

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

function showAdminToast(message: string) {
    adminToastMessage.textContent = message;
    adminToast.classList.add('show');
    if (adminToastTimeout) {
        clearTimeout(adminToastTimeout);
    }
    adminToastTimeout = setTimeout(() => {
        adminToast.classList.remove('show');
    }, 2800);
}

function formatDateTime(value: string | null | undefined): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);
}

function applySearchFilter() {
    const query = searchInput.value.toLowerCase().trim();

    if (!query) {
        filteredData = [...registrationsData];
        return;
    }

    filteredData = registrationsData.filter((reg) => {
        const matchId = reg.id.toLowerCase().includes(query);
        const matchPhone = reg.phone && reg.phone.includes(query);
        const matchPassenger = reg.passengers.some((p) => p.nama.toLowerCase().includes(query) || (p.nik && p.nik.includes(query)) || (p.verifiedBy && p.verifiedBy.toLowerCase().includes(query)));
        return matchId || matchPhone || matchPassenger;
    });
}

function renderTrendChart(points: HourlyTrendPoint[]) {
    if (verificationTrendChart) {
        verificationTrendChart.destroy();
    }

    verificationTrendChart = new Chart(verificationTrendCanvas, {
        type: 'bar',
        data: {
            labels: points.map((point) => point.hourLabel),
            datasets: [
                {
                    type: 'line',
                    label: 'Verify',
                    data: points.map((point) => point.verifyActions),
                    borderColor: '#4ade80',
                    backgroundColor: 'rgba(74, 222, 128, 0.18)',
                    tension: 0.32,
                    fill: true,
                    borderWidth: 3,
                },
                {
                    type: 'bar',
                    label: 'Batalkan',
                    data: points.map((point) => point.unverifyActions),
                    backgroundColor: 'rgba(248, 113, 113, 0.72)',
                    borderRadius: 8,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    labels: {
                        color: '#cbd5e1',
                    },
                },
            },
            scales: {
                x: {
                    ticks: { color: '#94a3b8' },
                    grid: { color: 'rgba(148, 163, 184, 0.08)' },
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: '#94a3b8', precision: 0 },
                    grid: { color: 'rgba(148, 163, 184, 0.08)' },
                },
            },
        },
    });
}

function renderSummary() {
    if (!adminSummaryData) {
        return;
    }

    const { summary, topVerifiers, recentActivity, hourlyTrend } = adminSummaryData;
    summaryRegistrations.textContent = summary.registrationsCount.toString();
    summaryRegistrationMeta.textContent = `${summary.fullyVerifiedRegistrations} rombongan sudah lengkap, ${summary.pendingRegistrations} masih belum ada verifikasi`;
    summaryPassengers.textContent = summary.passengersCount.toString();
    summaryPassengerMeta.textContent = `${summary.partialVerifiedRegistrations} rombongan masih parsial`;
    summaryVerified.textContent = summary.verifiedCount.toString();
    summaryVerifiedMeta.textContent = `${summary.verificationRate}% dari total penumpang aktif`;
    summaryPending.textContent = summary.pendingCount.toString();
    summaryPendingMeta.textContent = summary.pendingCount === 0 ? 'Semua penumpang aktif sudah terverifikasi' : 'Masih perlu tindak lanjut operator';

    if (topVerifiers.length === 0) {
        topVerifiersList.innerHTML = '<div class="empty-mini-state">Belum ada nama petugas yang tercatat. Data lama masih memakai label Unknown.</div>';
    } else {
        topVerifiersList.innerHTML = topVerifiers.map((item) => `
            <div class="leaderboard-item">
                <div class="leaderboard-top">
                    <div class="leaderboard-name">${item.name}</div>
                    <div class="leaderboard-count">${item.totalActions}</div>
                </div>
                <div class="leaderboard-meta">Aksi verifikasi terakhir: ${formatDateTime(item.lastActionAt)}</div>
            </div>
        `).join('');
    }

    if (recentActivity.length === 0) {
        recentActivityList.innerHTML = '<div class="empty-mini-state">Belum ada aktivitas untuk ditampilkan.</div>';
    } else {
        recentActivityList.innerHTML = recentActivity.map((item) => `
            <div class="activity-item">
                <div class="leaderboard-top">
                    <span class="activity-badge ${item.action}">${item.action === 'verify' ? 'Verify' : 'Batalkan'}</span>
                    <span class="activity-meta">${formatDateTime(item.verifiedAt)}</span>
                </div>
                <div class="activity-title">${item.passengerName} - ${item.registrationId}</div>
                <div class="activity-meta">Oleh ${item.verifiedBy} via ${item.source}</div>
                ${item.notes ? `<div class="activity-notes">Catatan: ${item.notes}</div>` : ''}
            </div>
        `).join('');
    }

    renderTrendChart(hourlyTrend);
}

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
        const [registrationsResponse, summaryResponse] = await Promise.all([
            fetch('/api/registrations'),
            fetch('/api/admin-summary'),
        ]);

        if (!registrationsResponse.ok) throw new Error('Failed to fetch registrations');
        if (!summaryResponse.ok) throw new Error('Failed to fetch admin summary');

        const rawData: Registration[] = await registrationsResponse.json();
        adminSummaryData = await summaryResponse.json() as AdminSummaryResponse;

        // Filter: Hanya pendaftar yang memiliki nomor WA/HP yang valid
        registrationsData = rawData.filter(reg => reg.phone && reg.phone.trim().length > 5);

        // Clean up No WhatsApp field (take only the first number if " DAN " is present)
        registrationsData = registrationsData.map(reg => {
            if (reg.phone) {
                reg.phone = reg.phone.split(/\s*DAN\s*|\s*dan\s*|\s*\/\s*|\s*,\s*/)[0].trim();
            }
            return reg;
        });

        applySearchFilter();

        renderTable();
        renderSummary();

        totalDataCount.textContent = registrationsData.length.toString();

    } catch (err: any) {
        console.error(err);
        showAdminToast(`Gagal memuat dashboard: ${err.message}`);
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--error-msg); padding: 32px;">Gagal memuat data: ${err.message}</td></tr>`;
    }
}

// --- Search and Pagination Logic ---

searchInput.addEventListener('input', (e) => {
    void e;
    currentPage = 1; // Reset to page 1 on search
    applySearchFilter();
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
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 48px; color: var(--text-muted);">Tidak ada data yang cocok dengan pencarian</td></tr>`;
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
            const ktpLink = p.ktpUrl ? `<a href="javascript:void(0)" onclick="openKtpModal('${p.ktpUrl}')" class="pill-ktp-link">📄 Lihat KTP</a>` : '';
            const unverifyAction = p.verified
                ? `<button class="pill-ktp-link" style="border:none;background:none;padding:0;cursor:pointer;" onclick='unverifyPassenger(${p.id}, ${JSON.stringify(p.nama)})'>↩ Batalkan</button>`
                : '';
            const verificationMeta = p.verified
                ? `<div class="activity-meta" style="margin-top:6px;">Diverifikasi ${p.verifiedBy || 'Unknown'} • ${formatDateTime(p.verifiedAt)}</div>`
                : '<div class="activity-meta" style="margin-top:6px;">Belum diverifikasi</div>';
            const statusBadge = p.verified
                ? '<span class="status-badge status-verified">Verified</span>'
                : '<span class="status-badge status-pending">Pending</span>';

            passHtml += `
                <div class="passenger-pill ${isRegClass} ${isVerifiedClass}">
                    <div class="pill-header">
                        <strong class="pill-name">${p.nama} ${isRegBadge}</strong>
                        <span style="display:flex;align-items:center;gap:8px;">${statusBadge}${statusIcon}</span>
                    </div>
                    ${(nikLabel || ktpLink || unverifyAction) ? `<div class="pill-footer">${nikLabel} ${ktpLink} ${unverifyAction}</div>` : ''}
                    ${verificationMeta}
                </div>
            `;
        });
        passHtml += '</div>';

        // Check KTP
        const ktpLink = reg.ktpUrl ? `<a href="javascript:void(0)" onclick="openKtpModal('${reg.ktpUrl}')" style="color: var(--accent-blue); text-decoration: none; font-size: 13px; margin-top: 6px; display: inline-flex; align-items: center; gap: 4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> Lihat KK</a>` : '<span style="color: var(--text-muted); font-size: 13px; display: block; margin-top: 6px;">Tidak ada KK</span>';

        // Check ID Card
        const idCardLink = reg.idCardUrl ? `<a href="javascript:void(0)" onclick="openKtpModal('${reg.idCardUrl}')" style="color: var(--accent-blue); text-decoration: none; font-size: 13px; margin-top: 6px; display: inline-flex; align-items: center; gap: 4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg> Lihat ID Card</a>` : '';

        tr.innerHTML = `
            <td>${actualIndex}</td>
            <td>
                <strong style="font-size: 15px;">${reg.id}</strong><br>
                ${ktpLink}
                ${idCardLink ? `<div>${idCardLink}</div>` : ''}
            </td>
            <td>${reg.phone || '-'}</td>
            <td>${passHtml}</td>
            <td style="text-align: center;">
                <div style="display:flex;flex-direction:column;gap:8px;align-items:center;">
                    ${reg.passengers.some((passenger) => passenger.verified)
                        ? `<button class="btn-secondary-admin" onclick="unverifyRegistration('${reg.id}')" style="padding: 8px 12px; font-size: 12px; margin: 0 auto; width: 100%; justify-content: center; border-color: rgba(248, 113, 113, 0.35); color: #fecaca;">↩ Batalkan Semua</button>`
                        : '<span class="activity-meta">Belum ada aksi admin</span>'}
                </div>
            </td>
        `;

        tableBody.appendChild(tr);
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

