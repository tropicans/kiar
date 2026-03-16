import {
    Chart,
    BarController, LineController,
    CategoryScale, LinearScale,
    BarElement, LineElement, PointElement,
    Legend, Tooltip, Filler,
} from 'chart.js';

Chart.register(
    BarController, LineController,
    CategoryScale, LinearScale,
    BarElement, LineElement, PointElement,
    Legend, Tooltip, Filler,
);

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
    active: boolean;
}

interface Registration {
    id: string;
    phone: string;
    phoneRaw?: string;
    ktpUrl: string;
    idCardUrl?: string;
    passengers: Passenger[];
    active: boolean;
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

interface BusStatsEntry {
    busCode: string;
    route: string | null;
    destination: string | null;
    busGroup: string | null;
    busCapacity: number | null;
    manifestCount: number;
    passengerCount: number;
    verifiedCount: number;
    pendingCount: number;
    expectedCount: number;
    registrationsCount: number;
}

interface BusStatsResponse {
    items: BusStatsEntry[];
    totals: {
        passengerCount: number;
        verifiedCount: number;
        pendingCount: number;
        manifestCount: number;
        expectedCount: number;
        registrationsCount: number;
        busCapacity: number;
    };
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

interface AdminAuditEntry {
    id: string;
    entry_type: 'crud' | 'verification';
    action: string;
    entity_type: string;
    entity_id: string;
    field_name: string;
    old_value: string | null;
    new_value: string | null;
    actor: string;
    notes: string | null;
    created_at: string;
    passenger_name: string | null;
    registration_id: string | null;
}

// --- DOM Elements ---
const dashboardContent = document.getElementById('dashboardContent') as HTMLDivElement;

const tableBody = document.getElementById('tableBody') as HTMLTableSectionElement;
const totalDataCount = document.getElementById('totalDataCount') as HTMLSpanElement;
const totalDataMeta = document.getElementById('totalDataMeta') as HTMLSpanElement;
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
const auditTableBody = document.getElementById('auditTableBody') as HTMLTableSectionElement;
const auditFilter = document.getElementById('auditFilter') as HTMLSelectElement;
const statusFilter = document.getElementById('statusFilter') as HTMLSelectElement;
const activeFilter = document.getElementById('activeFilter') as HTMLSelectElement;
const crudModal = document.getElementById('crudModal') as HTMLDivElement;
const crudModalHeading = document.getElementById('crudModalHeading') as HTMLHeadingElement;
const crudModalSubtitle = document.getElementById('crudModalSubtitle') as HTMLDivElement;
const crudFieldPrimary = document.getElementById('crudFieldPrimary') as HTMLInputElement;
const crudFieldSecondary = document.getElementById('crudFieldSecondary') as HTMLInputElement;
const crudFieldSecondaryWrap = document.getElementById('crudFieldSecondaryWrap') as HTMLDivElement;
const crudFieldTertiary = document.getElementById('crudFieldTertiary') as HTMLInputElement;
const crudFieldTertiaryWrap = document.getElementById('crudFieldTertiaryWrap') as HTMLDivElement;
const crudActiveWrap = document.getElementById('crudActiveWrap') as HTMLLabelElement;
const crudActiveCheckbox = document.getElementById('crudActiveCheckbox') as HTMLInputElement;
const crudActiveLabel = document.getElementById('crudActiveLabel') as HTMLSpanElement;

const crudModalError = document.getElementById('crudModalError') as HTMLDivElement;
const closeCrudModal = document.getElementById('closeCrudModal') as HTMLButtonElement;
const crudCancelBtn = document.getElementById('crudCancelBtn') as HTMLButtonElement;
const crudSaveBtn = document.getElementById('crudSaveBtn') as HTMLButtonElement;

// Search and Pagination Elements
const searchInput = document.getElementById('searchInput') as HTMLInputElement;
const paginationControls = document.getElementById('paginationControls') as HTMLDivElement;
const pagStart = document.getElementById('pagStart') as HTMLSpanElement;
const pagEnd = document.getElementById('pagEnd') as HTMLSpanElement;
const pagTotal = document.getElementById('pagTotal') as HTMLSpanElement;
const btnPrevPage = document.getElementById('btnPrevPage') as HTMLButtonElement;
const btnNextPage = document.getElementById('btnNextPage') as HTMLButtonElement;
const pageNumbersContainer = document.getElementById('pageNumbersContainer') as HTMLDivElement;

// Audit Pagination Elements
const auditPagination = document.getElementById('auditPagination') as HTMLDivElement;
const auditPagStart = document.getElementById('auditPagStart') as HTMLSpanElement;
const auditPagEnd = document.getElementById('auditPagEnd') as HTMLSpanElement;
const auditPagTotal = document.getElementById('auditPagTotal') as HTMLSpanElement;
const btnAuditPrev = document.getElementById('btnAuditPrev') as HTMLButtonElement;
const btnAuditNext = document.getElementById('btnAuditNext') as HTMLButtonElement;
const auditPageNumbers = document.getElementById('auditPageNumbers') as HTMLDivElement;
const tabBadgePeserta = document.getElementById('tabBadgePeserta') as HTMLSpanElement;

// Modal Elements
const ktpModal = document.getElementById('ktpModal') as HTMLDivElement;
const ktpModalImage = document.getElementById('ktpModalImage') as HTMLImageElement;
const modalCloseBtn = document.getElementById('modalCloseBtn') as HTMLButtonElement;

// Group Verify Modal Elements
const groupVerifyModal = document.getElementById('groupVerifyModal') as HTMLDivElement;
const groupVerifyMessage = document.getElementById('groupVerifyMessage') as HTMLParagraphElement;
const groupVerifyListWrap = document.getElementById('groupVerifyListWrap') as HTMLDivElement;
const groupVerifyList = document.getElementById('groupVerifyList') as HTMLDivElement;
const groupVerifyConfirm = document.getElementById('groupVerifyConfirm') as HTMLButtonElement;
const groupVerifyCancel = document.getElementById('groupVerifyCancel') as HTMLButtonElement;
const closeGroupVerify = document.getElementById('closeGroupVerify') as HTMLButtonElement;
const busStatsList = document.getElementById('busStatsList') as HTMLDivElement;
const busStatsTotals = document.getElementById('busStatsTotals') as HTMLDivElement;
const busFilterSelect = document.getElementById('busFilterSelect') as HTMLSelectElement;
const busStatusFilterSelect = document.getElementById('busStatusFilter') as HTMLSelectElement;
const busStatsExportBtn = document.getElementById('busStatsExportBtn') as HTMLButtonElement;

// Bus Passengers Modal Elements
const busPassengersModal = document.getElementById('busPassengersModal') as HTMLDivElement;
const busPassengersModalTitle = document.getElementById('busPassengersModalTitle') as HTMLHeadingElement;
const closeBusPassengersModal = document.getElementById('closeBusPassengersModal') as HTMLButtonElement;
const busPassengersLoading = document.getElementById('busPassengersLoading') as HTMLDivElement;
const busPassengersContent = document.getElementById('busPassengersContent') as HTMLDivElement;
const busPassengersSearch = document.getElementById('busPassengersSearch') as HTMLInputElement;
const busVerifiedCount = document.getElementById('busVerifiedCount') as HTMLSpanElement;
const busVerifiedList = document.getElementById('busVerifiedList') as HTMLDivElement;
const busPendingCount = document.getElementById('busPendingCount') as HTMLSpanElement;
const busPendingList = document.getElementById('busPendingList') as HTMLDivElement;
const busPassengersCloseBtn = document.getElementById('busPassengersCloseBtn') as HTMLButtonElement;

// --- State ---
let registrationsData: Registration[] = [];
let filteredData: Registration[] = [];
let currentBusPassengers: Passenger[] = [];
let currentPage = 1;
const ITEMS_PER_PAGE = 10;
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const SEARCH_DEBOUNCE_MS = 300;

let adminSummaryData: AdminSummaryResponse | null = null;
let adminAuditEntries: AdminAuditEntry[] = [];
let auditCurrentPage = 1;
const AUDIT_PER_PAGE = 20;
let verificationTrendChart: Chart | null = null;
let adminToastTimeout: ReturnType<typeof setTimeout> | null = null;
let busStatsData: BusStatsEntry[] = [];
let totalRegistrations = 0;
type CrudModalState =
    | { kind: 'registration'; registrationId: string }
    | { kind: 'passenger'; passengerId: number };
let crudModalState: CrudModalState | null = null;

// --- Session Auth ---
const SESSION_KEY = 'authToken';

function getSessionToken(): string {
    return localStorage.getItem(SESSION_KEY) || '';
}

function getAuthHeaders(): Record<string, string> {
    const token = getSessionToken();
    if (!token) return {};
    return { 'Authorization': `Bearer ${token}` };
}

function adminFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = { ...getAuthHeaders(), ...(options.headers as Record<string, string> || {}) };
    return fetch(url, { ...options, headers });
}



function getRegistrationById(registrationId: string): Registration | undefined {
    return registrationsData.find((item) => item.id === registrationId);
}

function getPassengerById(passengerId: number): Passenger | undefined {
    return registrationsData.flatMap((registration) => registration.passengers).find((item) => item.id === passengerId);
}



function hideCrudError() {
    crudModalError.style.display = 'none';
    crudModalError.textContent = '';
}

function closeCrudEditor() {
    crudModalState = null;
    crudModal.style.display = 'none';
    crudFieldPrimary.value = '';
    crudFieldSecondary.value = '';
    crudFieldTertiary.value = '';
    crudActiveCheckbox.checked = false;
    hideCrudError();
}

function openRegistrationCrudModal(registration: Registration) {
    crudModalState = { kind: 'registration', registrationId: registration.id };
    crudModalHeading.textContent = `Edit Rombongan ${registration.id}`;
    crudModalSubtitle.textContent = 'Perbarui nomor WA dan status aktif rombongan.';
    crudFieldPrimary.value = registration.phone || registration.phoneRaw || '';
    crudFieldPrimary.placeholder = 'Nomor WA';
    crudFieldSecondaryWrap.style.display = 'grid';
    crudFieldSecondary.previousElementSibling!.textContent = 'URL KK / KTP keluarga';
    crudFieldSecondary.value = registration.ktpUrl || '';
    crudFieldSecondary.placeholder = 'https://...';
    crudFieldTertiaryWrap.style.display = 'grid';
    crudFieldTertiary.previousElementSibling!.textContent = 'URL ID Card';
    crudFieldTertiary.value = registration.idCardUrl || '';
    crudFieldTertiary.placeholder = 'https://...';
    crudActiveWrap.style.display = 'flex';
    crudActiveCheckbox.checked = registration.active;
    crudActiveLabel.textContent = 'Rombongan aktif';

    hideCrudError();
    crudModal.style.display = 'flex';
    window.setTimeout(() => crudFieldPrimary.focus(), 60);
}

function openPassengerCrudModal(passenger: Passenger) {
    crudModalState = { kind: 'passenger', passengerId: passenger.id };
    crudModalHeading.textContent = `Edit Penumpang ${passenger.nama}`;
    crudModalSubtitle.textContent = 'Koreksi nama, NIK, dan status aktif penumpang.';
    crudFieldPrimary.value = passenger.nama;
    crudFieldPrimary.placeholder = 'Nama penumpang';
    crudFieldSecondaryWrap.style.display = 'grid';
    crudFieldSecondary.value = passenger.nik || '';
    crudFieldSecondary.placeholder = 'NIK penumpang';
    crudFieldSecondary.previousElementSibling!.textContent = 'NIK penumpang';
    crudFieldTertiaryWrap.style.display = 'grid';
    crudFieldTertiary.previousElementSibling!.textContent = 'URL KTP penumpang';
    crudFieldTertiary.value = passenger.ktpUrl || '';
    crudFieldTertiary.placeholder = 'https://...';
    crudActiveWrap.style.display = 'flex';
    crudActiveCheckbox.checked = passenger.active;
    crudActiveLabel.textContent = 'Penumpang aktif';

    hideCrudError();
    crudModal.style.display = 'flex';
    window.setTimeout(() => crudFieldPrimary.focus(), 60);
}

async function saveCrudModal() {
    if (!crudModalState) return;

    if (crudModalState.kind === 'registration') {
        await updateRegistration(crudModalState.registrationId, {
            phone: crudFieldPrimary.value,
            ktpUrl: crudFieldSecondary.value,
            idCardUrl: crudFieldTertiary.value,
            active: crudActiveCheckbox.checked,
        });
        closeCrudEditor();
        showAdminToast(`Rombongan ${crudModalState.registrationId} berhasil diperbarui.`);
        return;
    }

    await updatePassenger(crudModalState.passengerId, {
        nama: crudFieldPrimary.value,
        nik: crudFieldSecondary.value,
        ktpUrl: crudFieldTertiary.value,
        active: crudActiveCheckbox.checked,
    });
    closeCrudEditor();
    showAdminToast('Data penumpang berhasil diperbarui.');
}

async function unverifyPassenger(passengerId: number, passengerName: string) {
    if (!confirm(`Batalkan verifikasi ${passengerName}?`)) return;

    const reason = window.prompt(`Alasan membatalkan verifikasi untuk ${passengerName}:`, 'Salah pilih operator');
    if (reason === null) return;

    const response = await adminFetch('/api/unverify-passengers', {
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

    // Performance: lightweight refresh — only update stats, not full registrations
    await refreshDashboardStats();
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

    if (!confirm(`Batalkan verifikasi rombongan ${registrationId}?`)) return;

    const reason = window.prompt(
        `Alasan membatalkan ${verifiedPassengers.length} verifikasi pada rombongan ${registrationId}:`,
        'Koreksi verifikasi rombongan',
    );
    if (reason === null) return;

    const response = await adminFetch('/api/unverify-passengers', {
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

    await refreshDashboardStats();
}

async function updateRegistration(registrationId: string, payload: { phone?: string | null; ktpUrl?: string | null; idCardUrl?: string | null; active?: boolean }) {
    const response = await adminFetch(`/api/admin/registrations/${encodeURIComponent(registrationId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`);
    }

    await refreshDashboardStats();
}

async function updatePassenger(passengerId: number, payload: { nama?: string; nik?: string | null; ktpUrl?: string | null; active?: boolean }) {
    const response = await adminFetch(`/api/admin/passengers/${passengerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`);
    }

    await refreshDashboardStats();
}

async function editRegistrationPhone(registrationId: string) {
    const registration = getRegistrationById(registrationId);
    if (!registration) {
        throw new Error('Rombongan tidak ditemukan');
    }
    openRegistrationCrudModal(registration);
}

async function toggleRegistrationActive(registrationId: string) {
    const registration = registrationsData.find((item) => item.id === registrationId);
    if (!registration) {
        throw new Error('Rombongan tidak ditemukan');
    }

    const nextActive = !registration.active;
    if (!confirm(`${nextActive ? 'Aktifkan' : 'Nonaktifkan'} rombongan ${registrationId}?`)) return;

    await updateRegistration(registrationId, { active: nextActive });
}

async function editPassenger(passengerId: number) {
    const passenger = getPassengerById(passengerId);
    if (!passenger) {
        throw new Error('Penumpang tidak ditemukan');
    }
    openPassengerCrudModal(passenger);
}

async function togglePassengerActive(passengerId: number) {
    const passenger = registrationsData.flatMap((registration) => registration.passengers).find((item) => item.id === passengerId);
    if (!passenger) {
        throw new Error('Penumpang tidak ditemukan');
    }

    const nextActive = !passenger.active;
    if (!confirm(`${nextActive ? 'Aktifkan' : 'Nonaktifkan'} penumpang ${passenger.nama}?`)) return;

    await updatePassenger(passengerId, { active: nextActive });
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

(window as any).editRegistrationPhone = async (registrationId: string) => {
    try {
        await editRegistrationPhone(registrationId);
        showAdminToast(`Nomor WA rombongan ${registrationId} berhasil diperbarui.`);
    } catch (error: any) {
        console.error(error);
        showAdminToast(`Gagal mengubah nomor WA: ${error.message}`);
    }
};

(window as any).toggleRegistrationActive = async (registrationId: string) => {
    try {
        await toggleRegistrationActive(registrationId);
        showAdminToast(`Status rombongan ${registrationId} berhasil diperbarui.`);
    } catch (error: any) {
        console.error(error);
        showAdminToast(`Gagal mengubah status rombongan: ${error.message}`);
    }
};

(window as any).editPassenger = async (passengerId: number) => {
    try {
        await editPassenger(passengerId);
        showAdminToast('Data penumpang berhasil diperbarui.');
    } catch (error: any) {
        console.error(error);
        showAdminToast(`Gagal mengubah data penumpang: ${error.message}`);
    }
};

(window as any).togglePassengerActive = async (passengerId: number) => {
    try {
        await togglePassengerActive(passengerId);
        showAdminToast('Status penumpang berhasil diperbarui.');
    } catch (error: any) {
        console.error(error);
        showAdminToast(`Gagal mengubah status penumpang: ${error.message}`);
    }
};



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
statusFilter.addEventListener('change', async () => {
    currentPage = 1;
    try {
        await fetchRegistrationsPage();
        updateVisibleCountLabel();
        renderTable();
    } catch (err: any) { console.error('Filter failed:', err); }
});
activeFilter.addEventListener('change', async () => {
    currentPage = 1;
    try {
        await fetchRegistrationsPage();
        updateVisibleCountLabel();
        renderTable();
    } catch (err: any) { console.error('Filter failed:', err); }
});
busFilterSelect.addEventListener('change', () => {
    renderBusStats();
});
busStatusFilterSelect.addEventListener('change', () => {
    renderBusStats();
});
busStatsExportBtn.addEventListener('click', () => {
    const params = new URLSearchParams();
    if (busFilterSelect.value) params.set('bus', busFilterSelect.value);
    if (busStatusFilterSelect.value !== 'all') params.set('status', busStatusFilterSelect.value);
    const query = params.toString();
    const url = `/api/admin/bus-stats/export${query ? `?${query}` : ''}`;
    // For window.open, we can't set headers, so open via adminFetch + blob
    adminFetch(url).then(r => r.blob()).then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'bus-stats.csv';
        a.click();
    }).catch(err => showAdminToast(`Export gagal: ${err.message}`));
});
closeCrudModal.addEventListener('click', closeCrudEditor);
crudCancelBtn.addEventListener('click', closeCrudEditor);
crudSaveBtn.addEventListener('click', () => { void saveCrudModal(); });
auditFilter?.addEventListener('change', () => { auditCurrentPage = 1; renderAuditTable(); });
btnAuditPrev?.addEventListener('click', () => { if (auditCurrentPage > 1) { auditCurrentPage--; renderAuditTable(); } });
btnAuditNext?.addEventListener('click', () => { auditCurrentPage++; renderAuditTable(); });
crudModal.addEventListener('click', (event) => {
    if (event.target === crudModal) {
        closeCrudEditor();
    }
});

function closeBusPassengersWrapper() {
    if (busPassengersModal) busPassengersModal.style.display = 'none';
}

if (closeBusPassengersModal) closeBusPassengersModal.addEventListener('click', closeBusPassengersWrapper);
if (busPassengersCloseBtn) busPassengersCloseBtn.addEventListener('click', closeBusPassengersWrapper);
if (busPassengersModal) busPassengersModal.addEventListener('click', (e) => {
    if (e.target === busPassengersModal) closeBusPassengersWrapper();
});

function renderBusPassengerList(passengers: Passenger[], query: string = '') {
    const q = query.toLowerCase().trim();
    const filtered = passengers.filter(p => {
        if (!q) return true;
        const nameMatch = p.nama.toLowerCase().includes(q);
        const nikMatch = p.nik?.toLowerCase().includes(q);
        const groupMatch = (p as any).registrationId?.toLowerCase().includes(q);
        return nameMatch || nikMatch || groupMatch;
    });

    const verified = filtered.filter(p => p.verified);
    const pending = filtered.filter(p => !p.verified);
    
    if (busVerifiedCount) busVerifiedCount.textContent = String(verified.length);
    if (busPendingCount) busPendingCount.textContent = String(pending.length);
        
    const renderItem = (p: Passenger) => `
        <div class="group-verify-list-item" style="display:flex; justify-content:space-between; align-items:center; border:1px solid var(--border-glass); padding:10px 14px; border-radius:10px; background:rgba(255,255,255,0.02);">
            <div>
                <div style="font-weight:600; font-size:14px; color:var(--text-primary);">${p.nama} ${p.verified ? '<span class="verified-badge">Verified</span>' : ''}</div>
                <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">NIK: ${p.nik || '-'} &bull; Group: <button type="button" class="btn-ghost" style="padding:0; min-width:auto; height:auto; font-size:12px; font-weight:700; background:transparent; border:none; color:var(--accent-blue);" onclick="navigator.clipboard.writeText('${(p as any).registrationId}'); showAdminToast('ID Rombongan disalin');">${(p as any).registrationId}</button></div>
            </div>
            ${p.verified && p.verifiedAt ? `
                <div style="font-size:11px; color:var(--text-muted); text-align:right;">
                    Oleh: ${p.verifiedBy || '-'}<br/>${formatDateTime(p.verifiedAt)}
                </div>
            ` : ''}
        </div>
    `;
    
    if (busVerifiedList) {
        if (verified.length > 0) {
            busVerifiedList.innerHTML = verified.map(renderItem).join('');
        } else {
            busVerifiedList.innerHTML = '<div class="empty-mini-state">Tidak ada penumpang terverifikasi</div>';
        }
    }
    
    if (busPendingList) {
        if (pending.length > 0) {
            busPendingList.innerHTML = pending.map(renderItem).join('');
        } else {
            busPendingList.innerHTML = '<div class="empty-mini-state">Semua penumpang sudah terverifikasi</div>';
        }
    }
}

if (busPassengersSearch) {
    busPassengersSearch.addEventListener('input', (e) => {
        const query = (e.target as HTMLInputElement).value;
        renderBusPassengerList(currentBusPassengers, query);
    });
}

async function openBusPassengersModal(busCode: string) {
    if (!busPassengersModal) return;
    
    // Reset modal
    if (busPassengersModalTitle) {
        busPassengersModalTitle.innerHTML = `
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
            Penumpang: ${busCode}
        `;
    }
    
    if (busPassengersSearch) busPassengersSearch.value = '';
    
    if (busPassengersLoading) busPassengersLoading.style.display = 'block';
    if (busPassengersLoading) busPassengersLoading.innerHTML = '<div class="spinner"></div><div>Memuat data penumpang...</div>';
    if (busPassengersContent) busPassengersContent.style.display = 'none';
    if (busVerifiedList) busVerifiedList.innerHTML = '';
    if (busPendingList) busPendingList.innerHTML = '';
    if (busVerifiedCount) busVerifiedCount.textContent = '0';
    if (busPendingCount) busPendingCount.textContent = '0';
    
    busPassengersModal.style.display = 'flex';
    
    try {
        const response = await adminFetch(`/api/admin/bus-passengers/${encodeURIComponent(busCode)}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        currentBusPassengers = data.passengers || [];
        
        renderBusPassengerList(currentBusPassengers);
        
        if (busPassengersLoading) busPassengersLoading.style.display = 'none';
        if (busPassengersContent) busPassengersContent.style.display = 'flex';
    } catch (err: any) {
        console.error('Failed to fetch bus passengers:', err);
        if (busPassengersLoading) {
            busPassengersLoading.innerHTML = `<div class="crud-error" style="text-align:center;">Gagal memuat data penumpang: ${err.message}</div>`;
        }
    }
}

(window as any).openBusPassengersModal = openBusPassengersModal;

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

// Server-side filtering — build query params for paginated API
function buildRegistrationParams(): URLSearchParams {
    const params = new URLSearchParams();
    params.set('page', String(currentPage));
    params.set('perPage', String(ITEMS_PER_PAGE));
    const query = searchInput.value.trim();
    if (query.length >= 2) params.set('search', query);
    if (statusFilter.value !== 'all') params.set('status', statusFilter.value);
    if (activeFilter.value !== 'all') params.set('active', activeFilter.value);
    return params;
}

async function fetchRegistrationsPage() {
    const params = buildRegistrationParams();
    const res = await adminFetch(`/api/registrations?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch registrations');
    const data = await res.json() as { items: Registration[]; total: number; page: number; perPage: number };

    registrationsData = (data.items || []).map(reg => {
        if (reg.phone) {
            reg.phone = reg.phone.split(/\s*DAN\s*|\s*dan\s*|\s*\/\s*|\s*,\s*/)[0].trim();
        }
        return reg;
    });
    filteredData = registrationsData;
    totalRegistrations = data.total || 0;
    currentPage = data.page || 1;
}

function updateVisibleCountLabel() {
    totalDataCount.textContent = totalRegistrations.toString();
    if (tabBadgePeserta) tabBadgePeserta.textContent = totalRegistrations.toString();

    const filterDesc = [];
    if (activeFilter.value === 'active') filterDesc.push('aktif saja');
    else if (activeFilter.value === 'only-inactive') filterDesc.push('hanya nonaktif');
    if (statusFilter.value === 'verified') filterDesc.push('sudah verifikasi');
    else if (statusFilter.value === 'pending') filterDesc.push('belum verifikasi');
    if (searchInput.value.trim()) filterDesc.push(`pencarian: "${searchInput.value.trim()}"`);
    totalDataMeta.textContent = filterDesc.length > 0
        ? `(filter: ${filterDesc.join(', ')})`
        : `(menampilkan ${registrationsData.length} dari ${totalRegistrations})`;
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

function computeBusTotals(entries: BusStatsEntry[]) {
    return entries.reduce((acc, entry) => {
        acc.busCount += 1;
        acc.passengerCount += entry.passengerCount;
        acc.verifiedCount += entry.verifiedCount;
        acc.pendingCount += entry.pendingCount;
        acc.registrationsCount += entry.registrationsCount;
        acc.manifestCount += entry.manifestCount;
        return acc;
    }, { busCount: 0, passengerCount: 0, verifiedCount: 0, pendingCount: 0, registrationsCount: 0, manifestCount: 0 });
}

function populateBusFilterOptions() {
    const currentValue = busFilterSelect.value;
    const options = Array.from(new Set(busStatsData.map((entry) => entry.busCode))).filter(Boolean).sort();
    busFilterSelect.innerHTML = '<option value="">Semua Bis</option>' + options.map((code) => `<option value="${code}">${code}</option>`).join('');
    if (currentValue && options.includes(currentValue)) {
        busFilterSelect.value = currentValue;
    }
}

function getFilteredBusStats(): BusStatsEntry[] {
    const busValue = busFilterSelect.value;
    const statusValue = busStatusFilterSelect.value;
    return busStatsData.filter((entry) => {
        const matchesBus = !busValue || entry.busCode === busValue;
        if (!matchesBus) return false;
        if (statusValue === 'complete') return entry.pendingCount === 0 && entry.passengerCount > 0;
        if (statusValue === 'pending') return entry.pendingCount > 0;
        return true;
    });
}

function renderBusStats() {
    if (!busStatsList) return;
    if (!busStatsData.length) {
        busStatsList.innerHTML = '<div class="empty-mini-state">Belum ada data bis.</div>';
        if (busStatsTotals) {
            busStatsTotals.textContent = 'Tidak ada data bis yang tersedia.';
        }
        return;
    }

    const filtered = getFilteredBusStats();
    const totals = computeBusTotals(filtered);
    if (busStatsTotals) {
        if (filtered.length === 0) {
            busStatsTotals.textContent = 'Tidak ada bis yang cocok dengan filter.';
        } else {
            busStatsTotals.textContent = `Menampilkan ${filtered.length} bis • ${totals.verifiedCount}/${totals.passengerCount} penumpang aktif sudah diverifikasi • ${totals.pendingCount} menunggu`;
        }
    }

    if (filtered.length === 0) {
        busStatsList.innerHTML = '<div class="empty-mini-state">Filter saat ini tidak menemukan bis.</div>';
        return;
    }

    busStatsList.innerHTML = filtered.map((entry) => {
        const percentage = entry.passengerCount > 0 ? Math.min(100, Math.round((entry.verifiedCount / entry.passengerCount) * 100)) : 0;
        const destinationLabel = entry.destination ? entry.destination : 'Tujuan belum diisi';
        const routeLabel = entry.route ? entry.route : 'Jurusan belum diisi';
        const busMetaParts = [destinationLabel, routeLabel].filter(Boolean).join(' • ');
        const capacityLabel = entry.busCapacity ? `${entry.busCapacity} kursi` : 'Kapasitas ?';
        return `
            <div class="bus-stats-card" onclick="openBusPassengersModal('${entry.busCode}')" style="cursor:pointer; transition:all 0.2s ease;">
                <div class="bus-stats-header">
                    <div>
                        <div class="bus-stats-name">${entry.busCode}</div>
                        <div class="bus-stats-meta">${busMetaParts || 'Detail rute belum diisi'}</div>
                    </div>
                    <div class="status-badge" style="background: rgba(59,130,246,0.12); color: #93c5fd;">${capacityLabel}</div>
                </div>
                <div class="bus-stats-meta">
                    <span>${entry.verifiedCount}/${entry.passengerCount} penumpang aktif</span>
                    <span>${entry.pendingCount} belum diverifikasi</span>
                    <span>${entry.registrationsCount} rombongan</span>
                </div>
                <div class="bus-stats-progress">
                    <div class="bus-stats-progress-bar" style="width:${percentage}%"></div>
                </div>
            </div>
        `;
    }).join('');
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

function renderAuditTable() {
    if (!auditFilter || !auditTableBody) return;
    const filterMode = auditFilter.value;
    const visibleEntries = adminAuditEntries.filter((entry) => {
        if (filterMode === 'all') return true;
        if (filterMode === 'crud') return entry.entry_type === 'crud';
        if (filterMode === 'verification') return entry.entry_type === 'verification';
        if (filterMode === 'unverify') return entry.action === 'unverify';
        if (filterMode === 'toggle_active') return entry.action === 'toggle_active';
        if (filterMode === 'update') return entry.action === 'update';
        return true;
    });

    if (visibleEntries.length === 0) {
        auditTableBody.innerHTML = '<tr><td colspan="5" class="loading-state">Belum ada audit admin.</td></tr>';
        auditPagination.style.display = 'none';
        return;
    }

    const totalPages = Math.ceil(visibleEntries.length / AUDIT_PER_PAGE);
    if (auditCurrentPage > totalPages) auditCurrentPage = totalPages;
    if (auditCurrentPage < 1) auditCurrentPage = 1;
    const startIdx = (auditCurrentPage - 1) * AUDIT_PER_PAGE;
    const endIdx = Math.min(startIdx + AUDIT_PER_PAGE, visibleEntries.length);
    const pageEntries = visibleEntries.slice(startIdx, endIdx);

    auditTableBody.innerHTML = pageEntries.map((entry) => {
        const target = entry.entry_type === 'crud'
            ? `${entry.entity_type} ${entry.entity_id}`
            : `${entry.passenger_name || 'Penumpang'}${entry.registration_id ? ` - ${entry.registration_id}` : ''}`;
        const changeText = entry.entry_type === 'crud'
            ? `${entry.field_name}: ${entry.old_value || '-'} -> ${entry.new_value || '-'}`
            : `${entry.action === 'unverify' ? 'Batalkan verifikasi' : entry.action}${entry.notes ? ` (${entry.notes})` : ''}`;

        return `
            <tr>
                <td>${formatDateTime(entry.created_at)}</td>
                <td><span class="activity-badge ${entry.action === 'unverify' ? 'unverify' : 'verify'}">${entry.entry_type === 'crud' ? 'CRUD' : 'Verifikasi'}</span></td>
                <td>${target}</td>
                <td class="audit-value">${changeText}</td>
                <td>${entry.actor || 'Admin Dashboard'}</td>
            </tr>
        `;
    }).join('');

    // Render audit pagination
    if (visibleEntries.length > AUDIT_PER_PAGE) {
        auditPagination.style.display = 'flex';
        auditPagStart.textContent = String(startIdx + 1);
        auditPagEnd.textContent = String(endIdx);
        auditPagTotal.textContent = String(visibleEntries.length);
        btnAuditPrev.disabled = auditCurrentPage <= 1;
        btnAuditNext.disabled = auditCurrentPage >= totalPages;

        // Page number buttons
        let pageHtml = '';
        for (let i = 1; i <= totalPages; i++) {
            if (i === auditCurrentPage) {
                pageHtml += `<button class="btn-secondary-admin page-btn active" style="padding:6px 12px;min-width:unset;background:var(--accent-gradient);color:#fff;border:none;">${i}</button>`;
            } else if (i === 1 || i === totalPages || Math.abs(i - auditCurrentPage) <= 1) {
                pageHtml += `<button class="btn-secondary-admin page-btn audit-page-num" data-page="${i}" style="padding:6px 12px;min-width:unset;">${i}</button>`;
            } else if (Math.abs(i - auditCurrentPage) === 2) {
                pageHtml += `<span style="color:var(--text-muted);">…</span>`;
            }
        }
        auditPageNumbers.innerHTML = pageHtml;
        auditPageNumbers.querySelectorAll('.audit-page-num').forEach((btn) => {
            btn.addEventListener('click', () => {
                auditCurrentPage = Number((btn as HTMLElement).dataset.page);
                renderAuditTable();
            });
        });
    } else {
        auditPagination.style.display = 'none';
    }
}

// --- Tab Switching ---
function initTabs() {
    const tabBar = document.getElementById('adminTabs');
    if (!tabBar) return;
    const tabs = tabBar.querySelectorAll<HTMLButtonElement>('.admin-tab');
    const panels = document.querySelectorAll<HTMLDivElement>('.tab-panel');

    function switchTab(tabName: string) {
        tabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === tabName));
        panels.forEach((p) => p.classList.toggle('active', p.dataset.tab === tabName));
        sessionStorage.setItem('adminActiveTab', tabName);
    }

    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            const name = tab.dataset.tab;
            if (name) switchTab(name);
        });
    });

    // Restore last active tab
    const saved = sessionStorage.getItem('adminActiveTab');
    if (saved && tabBar.querySelector(`[data-tab="${saved}"]`)) {
        switchTab(saved);
    }
}

// Check secure session access set by main app
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initTabs();

    const token = getSessionToken();
    if (!token) {
        // Show Google Sign-In
        dashboardContent.style.display = 'none';
        const overlay = document.createElement('div');
        overlay.className = 'auth-overlay';
        overlay.innerHTML = `
            <div class="auth-container">
                <div class="auth-logo">
                    <img src="/logo.png" alt="Logo" class="auth-logo-img" />
                    <h2>MUDIK YKSN 2026</h2>
                </div>
                <div class="auth-badge">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                    Admin Dashboard
                </div>
                <p class="auth-subtitle">Login dengan akun Google yang telah<br>didaftarkan sebagai admin</p>
                <div id="adminGoogleBtn" class="auth-btn-wrap"></div>
                <div id="adminLoginError" class="auth-error" style="display:none;"></div>
                <div class="auth-divider">atau</div>
                <a href="/" class="auth-back">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
                    </svg>
                    Kembali ke Scanner
                </a>
                <p class="auth-hint">Hubungi super admin untuk mendapatkan akses</p>
            </div>
        `;
        document.body.appendChild(overlay);

        let adminGsiRetries = 0;
        const ADMIN_GSI_MAX_RETRIES = 25;

        const showAdminFallbackBtn = () => {
            const btnEl = document.getElementById('adminGoogleBtn');
            if (!btnEl) return;
            btnEl.innerHTML = `
                <button id="adminFallbackGoogleBtn" style="
                    display: inline-flex; align-items: center; gap: 10px;
                    padding: 12px 24px; border-radius: 8px;
                    background: #4285f4; color: white; border: none;
                    font-size: 15px; font-weight: 600; cursor: pointer;
                    font-family: var(--font); transition: background 0.2s;
                ">
                    <svg width="20" height="20" viewBox="0 0 48 48">
                        <path fill="#fff" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"/>
                    </svg>
                    Sign in with Google
                </button>
                <p style="color: var(--text-muted); font-size: 12px; margin-top: 8px;">Google SDK gagal dimuat. Klik untuk mencoba ulang.</p>
            `;
            const fallbackBtn = document.getElementById('adminFallbackGoogleBtn');
            if (fallbackBtn) {
                fallbackBtn.addEventListener('click', () => {
                    btnEl.innerHTML = '<div class="loading-spinner small" style="margin:12px auto;"></div>';
                    const script = document.createElement('script');
                    script.src = 'https://accounts.google.com/gsi/client';
                    script.onload = () => {
                        adminGsiRetries = 0;
                        initGSI();
                    };
                    script.onerror = () => {
                        btnEl.innerHTML = '<p style="color:#fda4af;font-size:13px;">Gagal memuat Google Sign-In. Periksa koneksi internet lalu <a href="javascript:location.reload()" style="color:#93c5fd;">muat ulang halaman</a>.</p>';
                    };
                    document.head.appendChild(script);
                });
            }
        };

        const initGSI = () => {
            if (!(window as any).google?.accounts?.id) {
                adminGsiRetries++;
                if (adminGsiRetries >= ADMIN_GSI_MAX_RETRIES) {
                    console.warn('Google Sign-In SDK gagal dimuat, menampilkan tombol fallback');
                    showAdminFallbackBtn();
                    return;
                }
                setTimeout(initGSI, 200);
                return;
            }
            (window as any).google.accounts.id.initialize({
                client_id: '262804834085-jlrslmph5ghovf6ufq796gre8uuoq1ci.apps.googleusercontent.com',
                callback: async (response: any) => {
                    const errorEl = document.getElementById('adminLoginError');
                    try {
                        const res = await fetch('/api/auth/google', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ credential: response.credential }),
                        });
                        const data = await res.json();
                        if (!res.ok) {
                            if (errorEl) { errorEl.style.display = 'block'; errorEl.textContent = data.error || 'Login gagal'; }
                            return;
                        }
                        if (!data.isAdmin) {
                            if (errorEl) { errorEl.style.display = 'block'; errorEl.textContent = 'Akun ini bukan admin. Hubungi super admin.'; }
                            return;
                        }
                        localStorage.setItem(SESSION_KEY, data.token);
                        localStorage.setItem('authUser', JSON.stringify(data));
                        location.reload();
                    } catch (err: any) {
                        if (errorEl) { errorEl.style.display = 'block'; errorEl.textContent = err.message; }
                    }
                },
            });
            const btnEl = document.getElementById('adminGoogleBtn');
            if (btnEl) {
                (window as any).google.accounts.id.renderButton(btnEl, { theme: 'filled_black', size: 'large', width: 280, text: 'signin_with' });
            }
        };
        initGSI();
        return;
    }

    // Admin header logout button
    const adminLogoutBtn = document.getElementById('adminLogoutBtn');
    adminLogoutBtn?.addEventListener('click', () => {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem('authUser');
        location.reload();
    });

    // --- User Management (superadmin only) ---
    const authUserStr = localStorage.getItem('authUser');
    const authUser = authUserStr ? JSON.parse(authUserStr) : null;
    const isSuperAdmin = authUser?.role === 'superadmin';
    const tabUsersBtn = document.getElementById('tabUsers');
    const userTableBody = document.getElementById('userTableBody') as HTMLTableSectionElement;
    const newUserEmail = document.getElementById('newUserEmail') as HTMLInputElement;
    const newUserRole = document.getElementById('newUserRole') as HTMLSelectElement;
    const btnAddUser = document.getElementById('btnAddUser') as HTMLButtonElement;
    let usersLoaded = false;

    if (isSuperAdmin && tabUsersBtn) {
        tabUsersBtn.style.display = 'inline-flex';
    }

    async function loadUsers() {
        if (!isSuperAdmin || !userTableBody) return;
        userTableBody.innerHTML = '<tr><td colspan="5" class="loading-state">Memuat user...</td></tr>';
        try {
            const res = await adminFetch('/api/admin/users');
            if (!res.ok) throw new Error('Gagal memuat data user');
            const data = await res.json();
            renderUsers(data.users || []);
        } catch (err: any) {
            userTableBody.innerHTML = `<tr><td colspan="5" class="loading-state" style="color:#fda4af;">${err.message}</td></tr>`;
        }
    }

    function renderUsers(users: any[]) {
        if (!userTableBody) return;
        if (users.length === 0) {
            userTableBody.innerHTML = '<tr><td colspan="5" class="loading-state">Belum ada user.</td></tr>';
            return;
        }
        userTableBody.innerHTML = users.map((user: any) => {
            const isSA = user.role === 'superadmin';
            const roleBadge = `<span class="role-badge ${user.role}">${user.role}</span>`;
            const statusDot = `<span class="user-status-dot ${user.active ? 'active' : 'inactive'}"></span>${user.active ? 'Aktif' : 'Nonaktif'}`;
            const createdAt = user.created_at ? new Date(user.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
            const actions = isSA
                ? '<span style="color:var(--text-muted);font-size:0.72rem;">Protected</span>'
                : `<div class="user-actions" style="justify-content:flex-end;">
                    <button class="user-toggle-role" data-id="${user.id}" data-role="${user.role}">${user.role === 'admin' ? '→ Operator' : '→ Admin'}</button>
                    <button class="user-toggle-active" data-id="${user.id}" data-active="${user.active}">${user.active ? 'Nonaktifkan' : 'Aktifkan'}</button>
                    <button class="danger user-delete" data-id="${user.id}" data-email="${user.email}">Hapus</button>
                   </div>`;
            return `<tr>
                <td>${user.email}</td>
                <td>${roleBadge}</td>
                <td>${statusDot}</td>
                <td>${createdAt}</td>
                <td style="text-align:right;">${actions}</td>
            </tr>`;
        }).join('');

        // Wire up action buttons
        userTableBody.querySelectorAll('.user-toggle-role').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const id = (btn as HTMLElement).dataset.id;
                const currentRole = (btn as HTMLElement).dataset.role;
                const newRole = currentRole === 'admin' ? 'operator' : 'admin';
                try {
                    const res = await adminFetch(`/api/admin/users/${id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ role: newRole }),
                    });
                    if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
                    showAdminToast(`Role diubah ke ${newRole}`);
                    loadUsers();
                } catch (err: any) { showAdminToast(err.message); }
            });
        });

        userTableBody.querySelectorAll('.user-toggle-active').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const id = (btn as HTMLElement).dataset.id;
                const isActive = (btn as HTMLElement).dataset.active === 'true';
                try {
                    const res = await adminFetch(`/api/admin/users/${id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ active: !isActive }),
                    });
                    if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
                    showAdminToast(isActive ? 'User dinonaktifkan' : 'User diaktifkan');
                    loadUsers();
                } catch (err: any) { showAdminToast(err.message); }
            });
        });

        userTableBody.querySelectorAll('.user-delete').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const id = (btn as HTMLElement).dataset.id;
                const email = (btn as HTMLElement).dataset.email;
                if (!confirm(`Hapus user ${email}? Tindakan ini tidak dapat dibatalkan.`)) return;
                try {
                    const res = await adminFetch(`/api/admin/users/${id}`, { method: 'DELETE' });
                    if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
                    showAdminToast('User dihapus');
                    loadUsers();
                } catch (err: any) { showAdminToast(err.message); }
            });
        });
    }

    // Add user handler
    if (btnAddUser) {
        btnAddUser.addEventListener('click', async () => {
            const email = newUserEmail?.value?.trim();
            const role = newUserRole?.value;
            if (!email) { showAdminToast('Email tidak boleh kosong'); return; }
            try {
                const res = await adminFetch('/api/admin/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, role }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                showAdminToast(data.message || 'User ditambahkan');
                newUserEmail.value = '';
                loadUsers();
            } catch (err: any) { showAdminToast(err.message); }
        });
    }

    // Load users when tab is first clicked
    const tabBar = document.getElementById('adminTabs');
    tabBar?.querySelector('[data-tab="users"]')?.addEventListener('click', () => {
        if (!usersLoaded) { usersLoaded = true; loadUsers(); }
    });

    dashboardContent.style.display = 'block';
    loadData();
});

async function loadData() {
    // Performance: progressive loading — render each section independently as data arrives
    const summaryPromise = adminFetch('/api/admin-summary')
        .then(async (res) => {
            if (!res.ok) throw new Error('Failed to fetch admin summary');
            adminSummaryData = await res.json() as AdminSummaryResponse;
            renderSummary();
        })
        .catch((err: any) => {
            console.error('Summary load failed:', err);
        });

    const busStatsPromise = adminFetch('/api/admin/bus-stats')
        .then(async (res) => {
            if (!res.ok) throw new Error('Failed to fetch bus stats');
            const busStatsPayload = await res.json() as BusStatsResponse;
            busStatsData = Array.isArray(busStatsPayload.items) ? busStatsPayload.items : [];
            populateBusFilterOptions();
            renderBusStats();
        })
        .catch((err: any) => {
            console.error('Bus stats load failed:', err);
        });

    const auditPromise = adminFetch('/api/admin-audit')
        .then(async (res) => {
            if (!res.ok) throw new Error('Failed to fetch admin audit');
            const auditPayload = await res.json() as { entries: AdminAuditEntry[] };
            adminAuditEntries = Array.isArray(auditPayload.entries) ? auditPayload.entries : [];
            renderAuditTable();
        })
        .catch((err: any) => {
            console.error('Audit load failed:', err);
        });

    const registrationsPromise = fetchRegistrationsPage()
        .then(() => {
            updateVisibleCountLabel();
            renderTable();
        })
        .catch((err: any) => {
            console.error('Registrations load failed:', err);
            showAdminToast(`Gagal memuat data peserta: ${err.message}`);
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--error-msg); padding: 32px;">Gagal memuat data: ${err.message}</td></tr>`;
        });

    await Promise.allSettled([summaryPromise, busStatsPromise, auditPromise, registrationsPromise]);
}

// Performance: lightweight refresh — update stats panels and re-fetch current page of registrations
async function refreshDashboardStats() {
    try {
        const [summaryResponse, busStatsResponse, auditResponse] = await Promise.all([
            adminFetch('/api/admin-summary'),
            adminFetch('/api/admin/bus-stats'),
            adminFetch('/api/admin-audit'),
        ]);

        if (summaryResponse.ok) {
            adminSummaryData = await summaryResponse.json() as AdminSummaryResponse;
            renderSummary();
        }
        if (busStatsResponse.ok) {
            const busStatsPayload = await busStatsResponse.json() as BusStatsResponse;
            busStatsData = Array.isArray(busStatsPayload.items) ? busStatsPayload.items : [];
            populateBusFilterOptions();
            renderBusStats();
        }
        if (auditResponse.ok) {
            const auditPayload = await auditResponse.json() as { entries: AdminAuditEntry[] };
            adminAuditEntries = Array.isArray(auditPayload.entries) ? auditPayload.entries : [];
            renderAuditTable();
        }

        // Re-fetch current page from server
        await fetchRegistrationsPage();
        updateVisibleCountLabel();
        renderTable();
    } catch (err: any) {
        console.error('refreshDashboardStats error:', err);
    }
}

// --- Search and Pagination Logic ---

searchInput.addEventListener('input', () => {
    // Performance: debounce search and fetch from server
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(async () => {
        currentPage = 1;
        try {
            await fetchRegistrationsPage();
            updateVisibleCountLabel();
            renderTable();
        } catch (err: any) {
            console.error('Search failed:', err);
        }
    }, SEARCH_DEBOUNCE_MS);
});

btnPrevPage.addEventListener('click', async () => {
    if (currentPage > 1) {
        currentPage--;
        await fetchRegistrationsPage();
        updateVisibleCountLabel();
        renderTable();
    }
});

btnNextPage.addEventListener('click', async () => {
    const totalPages = Math.ceil(totalRegistrations / ITEMS_PER_PAGE);
    if (currentPage < totalPages) {
        currentPage++;
        await fetchRegistrationsPage();
        updateVisibleCountLabel();
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

    btn.addEventListener('click', async () => {
        currentPage = pageNum;
        await fetchRegistrationsPage();
        updateVisibleCountLabel();
        renderTable();
    });
    return btn;
}

function renderPagination() {
    const totalItems = totalRegistrations;
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
    const paginatedItems = filteredData; // Already server-paginated

    renderPagination();

    for (const [idx, reg] of paginatedItems.entries()) {
        const actualIndex = startIdx + idx + 1;
        const tr = document.createElement('tr');

        // Passengers HTML (Pill UI)
        // Only show active passengers; sort registrant first
        const visiblePassengers = reg.passengers
            .filter(p => p.active !== false)
            .sort((a, b) => {
                if (a.isRegistrant && !b.isRegistrant) return -1;
                if (!a.isRegistrant && b.isRegistrant) return 1;
                return 0;
            });

        let passHtml = '<div class="passenger-pills">';
        visiblePassengers.forEach((p) => {
            const isRegClass = p.isRegistrant ? 'passenger-pill-utama' : '';
            const isVerifiedClass = p.verified ? 'passenger-pill-verified' : '';
            const inactiveStyle = p.active ? '' : 'opacity:0.6;';
            const statusIcon = p.verified
                ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>'
                : '';

            const isRegBadge = p.isRegistrant ? '<span style="font-size: 10px; background: rgba(0, 195, 255, 0.1); color: var(--accent-light); padding: 2px 6px; border-radius: 4px; margin-left: 6px; font-weight: bold;">PENDAFTAR</span>' : '';

            const nikLabel = p.nik ? `<span class="pill-meta">${p.nik}</span>` : '';
            const ktpLink = p.ktpUrl ? `<a href="javascript:void(0)" onclick="openKtpModal('${p.ktpUrl}')" class="pill-ktp-link">📄 Lihat KTP</a>` : '';
            const unverifyAction = p.verified
                ? `<button class="pill-ktp-link" style="border:none;background:none;padding:0;cursor:pointer;" onclick='unverifyPassenger(${p.id}, ${JSON.stringify(p.nama)})'>↩ Batalkan</button>`
                : '';
            const verifyAction = (!p.verified && p.active)
                ? `<button class="pill-ktp-link" style="border:none;background:none;padding:0;cursor:pointer;color:var(--accent-green);" onclick="promptVerifyGroup('${reg.id}')">✓ Verifikasi</button>`
                : '';
            const editAction = `<button class="pill-ktp-link" style="border:none;background:none;padding:0;cursor:pointer;" onclick="editPassenger(${p.id})">✎ Edit</button>`;
            const toggleAction = `<button class="pill-ktp-link" style="border:none;background:none;padding:0;cursor:pointer;${p.active ? '' : 'color:#fda4af;'}" onclick="togglePassengerActive(${p.id})">${p.active ? 'Nonaktifkan' : 'Aktifkan'}</button>`;
            const verificationMeta = p.verified
                ? `<div class="activity-meta" style="margin-top:6px;">Diverifikasi ${p.verifiedBy || 'Unknown'} • ${formatDateTime(p.verifiedAt)}</div>`
                : '<div class="activity-meta" style="margin-top:6px;">Belum diverifikasi</div>';
            const mediaMeta = p.ktpUrl
                ? `<div class="activity-meta" style="margin-top:4px;">KTP penumpang tersedia</div>`
                : '<div class="activity-meta" style="margin-top:4px;">KTP penumpang belum diisi</div>';
            const statusBadge = p.verified
                ? '<span class="status-badge status-verified">Verified</span>'
                : '<span class="status-badge status-pending">Pending</span>';
            const activeBadge = p.active
                ? '<span class="status-badge status-verified">Aktif</span>'
                : '<span class="status-badge" style="background:rgba(248,113,113,.16);color:#fecaca;">Nonaktif</span>';

            passHtml += `
                <div class="passenger-pill ${isRegClass} ${isVerifiedClass}" style="${inactiveStyle}">
                    <div class="pill-header">
                        <strong class="pill-name">${p.nama} ${isRegBadge}</strong>
                        <span style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end;">${activeBadge}${statusBadge}${statusIcon}</span>
                    </div>
                    ${(nikLabel || ktpLink || editAction || toggleAction || unverifyAction || verifyAction) ? `<div class="pill-footer">${nikLabel} ${verifyAction} ${ktpLink} ${editAction} ${toggleAction} ${unverifyAction}</div>` : ''}
                    ${verificationMeta}
                    ${mediaMeta}
                </div>
            `;
        });
        passHtml += '</div>';

        // Check KTP
        const ktpLink = reg.ktpUrl ? `<a href="javascript:void(0)" onclick="openKtpModal('${reg.ktpUrl}')" style="color: var(--accent-blue); text-decoration: none; font-size: 13px; margin-top: 6px; display: inline-flex; align-items: center; gap: 4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> Lihat KK</a>` : '<span style="color: var(--text-muted); font-size: 13px; display: block; margin-top: 6px;">Tidak ada KK</span>';

        // Check ID Card
        const idCardLink = reg.idCardUrl ? `<a href="javascript:void(0)" onclick="openKtpModal('${reg.idCardUrl}')" style="color: var(--accent-blue); text-decoration: none; font-size: 13px; margin-top: 6px; display: inline-flex; align-items: center; gap: 4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg> Lihat ID Card</a>` : '';

        const registrationStateBadge = reg.active
            ? '<span class="status-badge status-verified">Aktif</span>'
            : '<span class="status-badge" style="background:rgba(248,113,113,.16);color:#fecaca;">Nonaktif</span>';

        tr.innerHTML = `
            <td style="vertical-align:top;">${actualIndex}</td>
            <td style="vertical-align:top;">
                <strong style="font-size: 15px;">${reg.id}</strong> ${registrationStateBadge}<br>
                ${ktpLink}
                ${idCardLink ? `<div>${idCardLink}</div>` : ''}
            </td>
            <td>${reg.phone || '-'}</td>
            <td>${passHtml}</td>
            <td style="text-align: center;">
                <div style="display:flex;flex-direction:column;gap:8px;align-items:center;">
                    <button class="btn-secondary-admin" onclick="editRegistrationPhone('${reg.id}')" style="padding: 8px 12px; font-size: 12px; margin: 0 auto; width: 100%; justify-content: center;">✎ Edit WA</button>
                    <button class="btn-secondary-admin" onclick="toggleRegistrationActive('${reg.id}')" style="padding: 8px 12px; font-size: 12px; margin: 0 auto; width: 100%; justify-content: center; ${reg.active ? '' : 'border-color: rgba(74,222,128,.35); color:#bbf7d0;'}">${reg.active ? 'Nonaktifkan' : 'Aktifkan'}</button>
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

let pendingVerificationGroup: {
    registrationId: string;
    passengerIds: number[];
} | null = null;

(window as any).promptVerifyGroup = (registrationId: string) => {
    const registration = getRegistrationById(registrationId);
    if (!registration) return;

    const unverifiedPassengers = registration.passengers.filter(p => !p.verified && p.active);

    pendingVerificationGroup = {
        registrationId,
        passengerIds: unverifiedPassengers.map(p => p.id)
    };

    if (unverifiedPassengers.length === 1) {
        groupVerifyMessage.textContent = `Verifikasi penumpang ${unverifiedPassengers[0].nama}?`;
        groupVerifyListWrap.style.display = 'none';
        groupVerifyConfirm.textContent = 'Ya, Verifikasi (1)';
    } else {
        groupVerifyMessage.textContent = `Verifikasi rombongan ${registration.id}?`;
        groupVerifyListWrap.style.display = 'block';

        groupVerifyList.innerHTML = unverifiedPassengers.map((p) => `
            <label class="crud-checkbox" style="margin-bottom: 8px; align-items: flex-start; cursor: pointer;">
                <input type="checkbox" class="group-verify-checkbox" value="${p.id}" checked>
                <div style="display: flex; flex-direction: column;">
                    <span style="font-weight: 600; color: var(--text-primary);">${p.nama}</span>
                    ${p.nik ? `<span style="font-size: 11px; color: var(--text-muted);">NIK: ${p.nik}</span>` : ''}
                </div>
            </label>
        `).join('');

        const checkboxes = groupVerifyList.querySelectorAll('.group-verify-checkbox');
        checkboxes.forEach(cb => {
            cb.addEventListener('change', updateGroupVerifySelectedCount);
        });

        updateGroupVerifySelectedCount();
    }

    groupVerifyModal.style.display = 'flex';
};

function updateGroupVerifySelectedCount() {
    const checkboxes = groupVerifyList.querySelectorAll('.group-verify-checkbox:checked');
    const count = checkboxes.length;

    if (count === 0) {
        groupVerifyConfirm.disabled = true;
        groupVerifyConfirm.textContent = 'Pilih minimal 1';
        groupVerifyConfirm.style.opacity = '0.5';
    } else {
        groupVerifyConfirm.disabled = false;
        groupVerifyConfirm.textContent = `Ya, Verifikasi (${count})`;
        groupVerifyConfirm.style.opacity = '1';
    }
}

function closeGroupVerifyModal() {
    groupVerifyModal.style.display = 'none';
    pendingVerificationGroup = null;
}

closeGroupVerify.addEventListener('click', closeGroupVerifyModal);
groupVerifyCancel.addEventListener('click', closeGroupVerifyModal);

groupVerifyModal.addEventListener('click', (e) => {
    if (e.target === groupVerifyModal) closeGroupVerifyModal();
});

groupVerifyConfirm.addEventListener('click', async () => {
    if (!pendingVerificationGroup) return;

    let selectedIds: number[] = [];

    const registration = getRegistrationById(pendingVerificationGroup.registrationId);
    const unverifiedPassengers = registration?.passengers.filter(p => !p.verified && p.active) || [];

    if (unverifiedPassengers.length === 1) {
        selectedIds = [unverifiedPassengers[0].id];
    } else {
        const checkboxes = groupVerifyList.querySelectorAll('.group-verify-checkbox:checked') as NodeListOf<HTMLInputElement>;
        selectedIds = Array.from(checkboxes).map(cb => parseInt(cb.value));
    }

    if (selectedIds.length === 0) return;

    if (!confirm(`Verifikasi ${selectedIds.length} penumpang?`)) return;

    try {
        const response = await adminFetch('/api/verify-passengers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                passengerIds: selectedIds,
                verifiedBy: 'Admin Dashboard'
            })
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || `HTTP ${response.status}`);
        }

        showAdminToast(`Berhasil memverifikasi ${selectedIds.length} penumpang.`);
        closeGroupVerifyModal();
        await loadData();
    } catch (error: any) {
        console.error(error);
        showAdminToast(`Gagal verifikasi: ${error.message}`);
    }
});

// --- Add Registration Modal ---
const addRegistrationModal = document.getElementById('addRegistrationModal') as HTMLDivElement;
const closeAddRegistration = document.getElementById('closeAddRegistration') as HTMLButtonElement;
const addRegPhone = document.getElementById('addRegPhone') as HTMLInputElement;
const addRegJurusan = document.getElementById('addRegJurusan') as HTMLInputElement;
const addRegKotaTujuan = document.getElementById('addRegKotaTujuan') as HTMLInputElement;
const addRegBis = document.getElementById('addRegBis') as HTMLInputElement;
const addRegKtpUrl = document.getElementById('addRegKtpUrl') as HTMLInputElement;
const addRegIdCardUrl = document.getElementById('addRegIdCardUrl') as HTMLInputElement;
const addPassengerRows = document.getElementById('addPassengerRows') as HTMLDivElement;
const btnAddPassengerRow = document.getElementById('btnAddPassengerRow') as HTMLButtonElement;
const addRegError = document.getElementById('addRegError') as HTMLDivElement;
const addRegCancelBtn = document.getElementById('addRegCancelBtn') as HTMLButtonElement;
const addRegSaveBtn = document.getElementById('addRegSaveBtn') as HTMLButtonElement;
const btnAddRegistration = document.getElementById('btnAddRegistration') as HTMLButtonElement;

let addPassengerCount = 0;

function createPassengerRowHtml(index: number): string {
    return `<div class="add-passenger-row" data-index="${index}" style="display:grid; grid-template-columns:1fr 1fr auto; gap:8px; align-items:end; padding:12px; background:rgba(255,255,255,0.03); border:1px solid var(--border-glass); border-radius:10px;">
        <div class="crud-field" style="margin:0;">
            <label style="font-size:0.72rem;">Nama Penumpang ${index + 1} *</label>
            <input class="settings-input add-pass-nama" type="text" placeholder="Nama lengkap" autocomplete="off" />
        </div>
        <div class="crud-field" style="margin:0;">
            <label style="font-size:0.72rem;">NIK (opsional)</label>
            <input class="settings-input add-pass-nik" type="text" placeholder="NIK 16 digit" autocomplete="off" />
        </div>
        <button type="button" class="icon-btn remove-passenger-btn" title="Hapus penumpang" aria-label="Hapus penumpang" style="margin-bottom:4px; width:32px; height:32px; flex-shrink:0;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
    </div>`;
}

function addPassengerRowToForm() {
    if (addPassengerCount >= 10) {
        showAdminToast('Maksimal 10 penumpang per rombongan.');
        return;
    }
    addPassengerRows.insertAdjacentHTML('beforeend', createPassengerRowHtml(addPassengerCount));
    addPassengerCount++;
    updatePassengerRowLabels();
}

function updatePassengerRowLabels() {
    const rows = addPassengerRows.querySelectorAll('.add-passenger-row');
    rows.forEach((row, i) => {
        const label = row.querySelector('label');
        if (label) {
            label.textContent = `Nama Penumpang ${i + 1} *`;
        }
    });
}

function resetAddRegistrationForm() {
    addRegPhone.value = '';
    addRegJurusan.value = '';
    addRegKotaTujuan.value = '';
    addRegBis.value = '';
    addRegKtpUrl.value = '';
    addRegIdCardUrl.value = '';
    addPassengerRows.innerHTML = '';
    addPassengerCount = 0;
    addRegError.style.display = 'none';
    addRegError.textContent = '';
}

function openAddRegistrationModal() {
    resetAddRegistrationForm();
    addPassengerRowToForm(); // Start with 1 passenger row
    addRegistrationModal.style.display = 'flex';
    window.setTimeout(() => {
        const firstInput = addPassengerRows.querySelector('.add-pass-nama') as HTMLInputElement;
        if (firstInput) firstInput.focus();
    }, 60);
}

function closeAddRegistrationModal() {
    addRegistrationModal.style.display = 'none';
}

async function saveNewRegistration() {
    addRegError.style.display = 'none';

    // Collect passenger data
    const rows = addPassengerRows.querySelectorAll('.add-passenger-row');
    const passengers: { nama: string; nik: string; ktpUrl: string }[] = [];
    rows.forEach((row) => {
        const nama = (row.querySelector('.add-pass-nama') as HTMLInputElement)?.value?.trim() || '';
        const nik = (row.querySelector('.add-pass-nik') as HTMLInputElement)?.value?.trim() || '';
        if (nama) {
            passengers.push({ nama, nik, ktpUrl: '' });
        }
    });

    if (passengers.length === 0) {
        addRegError.textContent = 'Minimal 1 penumpang harus memiliki nama.';
        addRegError.style.display = 'block';
        return;
    }

    const payload = {
        phone: addRegPhone.value.trim() || null,
        ktpUrl: addRegKtpUrl.value.trim() || null,
        idCardUrl: addRegIdCardUrl.value.trim() || null,
        jurusan: addRegJurusan.value.trim() || null,
        kotaTujuan: addRegKotaTujuan.value.trim() || null,
        bis: addRegBis.value.trim() || null,
        passengers,
    };

    addRegSaveBtn.disabled = true;
    addRegSaveBtn.textContent = 'Menyimpan...';

    try {
        const response = await adminFetch('/api/admin/registrations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || `HTTP ${response.status}`);
        }

        closeAddRegistrationModal();
        showAdminToast(`Rombongan ${result.registrationId} berhasil ditambahkan dengan ${result.passengersCreated} penumpang.`);
        await loadData();
    } catch (error: any) {
        console.error(error);
        addRegError.textContent = error.message || 'Gagal menyimpan data.';
        addRegError.style.display = 'block';
    } finally {
        addRegSaveBtn.disabled = false;
        addRegSaveBtn.textContent = 'Simpan Rombongan';
    }
}

// Event listeners for Add Registration Modal
btnAddRegistration.addEventListener('click', openAddRegistrationModal);
closeAddRegistration.addEventListener('click', closeAddRegistrationModal);
addRegCancelBtn.addEventListener('click', closeAddRegistrationModal);
addRegSaveBtn.addEventListener('click', () => { void saveNewRegistration(); });
btnAddPassengerRow.addEventListener('click', addPassengerRowToForm);

addRegistrationModal.addEventListener('click', (e) => {
    if (e.target === addRegistrationModal) closeAddRegistrationModal();
});

addPassengerRows.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const removeBtn = target.closest('.remove-passenger-btn');
    if (removeBtn) {
        const row = removeBtn.closest('.add-passenger-row');
        if (row && addPassengerRows.children.length > 1) {
            row.remove();
            addPassengerCount = addPassengerRows.children.length;
            updatePassengerRowLabels();
        } else if (addPassengerRows.children.length <= 1) {
            showAdminToast('Minimal 1 penumpang harus ada.');
        }
    }
});
