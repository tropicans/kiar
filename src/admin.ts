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
const btnBackToHome = document.getElementById('btnBackToHome') as HTMLButtonElement;

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
const crudAdminPin = document.getElementById('crudAdminPin') as HTMLInputElement;
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

// --- State ---
let registrationsData: Registration[] = [];
let filteredData: Registration[] = [];
let currentPage = 1;
const ITEMS_PER_PAGE = 20;
const ADMIN_PIN_KEY = 'qrscan_admin_pin';
let adminSummaryData: AdminSummaryResponse | null = null;
let adminAuditEntries: AdminAuditEntry[] = [];
let verificationTrendChart: Chart | null = null;
let adminToastTimeout: ReturnType<typeof setTimeout> | null = null;
let busStatsData: BusStatsEntry[] = [];
type CrudModalState =
    | { kind: 'registration'; registrationId: string }
    | { kind: 'passenger'; passengerId: number };
let crudModalState: CrudModalState | null = null;

// --- Admin API Key ---
const ADMIN_KEY_STORAGE = 'adminApiKey';

function getAdminApiKey(): string {
    return localStorage.getItem(ADMIN_KEY_STORAGE) || '';
}

function getAdminHeaders(): Record<string, string> {
    const key = getAdminApiKey();
    if (!key) return {};
    return { 'x-admin-key': key };
}

function adminFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = { ...getAdminHeaders(), ...(options.headers as Record<string, string> || {}) };
    return fetch(url, { ...options, headers });
}

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

function getRegistrationById(registrationId: string): Registration | undefined {
    return registrationsData.find((item) => item.id === registrationId);
}

function getPassengerById(passengerId: number): Passenger | undefined {
    return registrationsData.flatMap((registration) => registration.passengers).find((item) => item.id === passengerId);
}

function showCrudError(message: string) {
    crudModalError.textContent = message;
    crudModalError.style.display = 'block';
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
    crudAdminPin.value = '';
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
    crudAdminPin.value = '';
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
    crudAdminPin.value = '';
    hideCrudError();
    crudModal.style.display = 'flex';
    window.setTimeout(() => crudFieldPrimary.focus(), 60);
}

async function saveCrudModal() {
    if (!crudModalState) return;

    const enteredPin = crudAdminPin.value.trim();
    if (!enteredPin) {
        showCrudError('Masukkan Admin PIN.');
        return;
    }

    const isValidPin = await verifyAdminPin(enteredPin);
    if (!isValidPin) {
        showCrudError('Admin PIN salah.');
        crudAdminPin.focus();
        return;
    }

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
    const approved = await requestAdminPinApproval(`membatalkan verifikasi ${passengerName}`);
    if (!approved) return;

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

    await loadData();
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

    await loadData();
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

    await loadData();
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
    const approved = await requestAdminPinApproval(`${nextActive ? 'mengaktifkan' : 'menonaktifkan'} rombongan ${registrationId}`);
    if (!approved) return;

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
    const approved = await requestAdminPinApproval(`${nextActive ? 'mengaktifkan' : 'menonaktifkan'} penumpang ${passenger.nama}`);
    if (!approved) return;

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
statusFilter.addEventListener('change', () => {
    currentPage = 1;
    applySearchFilter();
    updateVisibleCountLabel();
    renderTable();
});
activeFilter.addEventListener('change', () => {
    currentPage = 1;
    applySearchFilter();
    updateVisibleCountLabel();
    renderTable();
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
    const key = getAdminApiKey();
    const exportUrl = key ? `${url}${query ? '&' : '?'}adminKey=${encodeURIComponent(key)}` : url;
    window.open(exportUrl, '_blank');
});
closeCrudModal.addEventListener('click', closeCrudEditor);
crudCancelBtn.addEventListener('click', closeCrudEditor);
crudSaveBtn.addEventListener('click', () => { void saveCrudModal(); });
auditFilter.addEventListener('change', renderAuditTable);
crudModal.addEventListener('click', (event) => {
    if (event.target === crudModal) {
        closeCrudEditor();
    }
});

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
    const statusMode = statusFilter.value;
    const activeMode = activeFilter.value;

    filteredData = registrationsData.filter((reg) => {
        const matchesStatus = statusMode === 'all'
            || (statusMode === 'verified' && reg.passengers.some((p) => p.verified))
            || (statusMode === 'pending' && !reg.passengers.some((p) => p.verified));
        const matchesActive = activeMode === 'all'
            || (activeMode === 'active' && reg.active)
            || (activeMode === 'inactive' && true)
            || (activeMode === 'only-inactive' && !reg.active);

        if (!matchesStatus || !matchesActive) {
            return false;
        }

        if (!query) {
            return true;
        }

        const matchId = reg.id.toLowerCase().includes(query);
        const matchPhone = reg.phone && reg.phone.includes(query);
        const matchRegistrationState = reg.active
            ? ('aktif'.includes(query) || 'active'.includes(query))
            : ('nonaktif'.includes(query) || 'inactive'.includes(query));
        const matchPassenger = reg.passengers.some((p) => p.nama.toLowerCase().includes(query)
            || (p.nik && p.nik.includes(query))
            || (p.verifiedBy && p.verifiedBy.toLowerCase().includes(query))
            || (p.active ? ('aktif'.includes(query) || 'active'.includes(query)) : ('nonaktif'.includes(query) || 'inactive'.includes(query))));
        return matchId || matchPhone || matchRegistrationState || matchPassenger;
    });
}

function updateVisibleCountLabel() {
    const activeCount = registrationsData.filter((reg) => reg.active).length;
    const inactiveCount = registrationsData.length - activeCount;
    totalDataCount.textContent = filteredData.length.toString();

    if (activeFilter.value === 'active') {
        totalDataMeta.textContent = `(aktif saja, total aktif ${activeCount})`;
        return;
    }

    if (activeFilter.value === 'only-inactive') {
        totalDataMeta.textContent = `(hanya nonaktif, total nonaktif ${inactiveCount})`;
        return;
    }

    totalDataMeta.textContent = `(aktif ${activeCount}, nonaktif ${inactiveCount})`;
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
            <div class="bus-stats-card">
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
        return;
    }

    auditTableBody.innerHTML = visibleEntries.map((entry) => {
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
}

// Check secure session access set by main app
document.addEventListener('DOMContentLoaded', () => {
    initTheme();

    // Prompt for admin API key if not stored
    if (!getAdminApiKey()) {
        const key = window.prompt('Masukkan Admin API Key:');
        if (key) {
            localStorage.setItem(ADMIN_KEY_STORAGE, key.trim());
        } else {
            window.location.href = '/';
            return;
        }
    }

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
        const [registrationsResponse, summaryResponse, busStatsResponse, auditResponse] = await Promise.all([
            adminFetch('/api/registrations?includeInactive=1'),
            adminFetch('/api/admin-summary'),
            adminFetch('/api/admin/bus-stats'),
            adminFetch('/api/admin-audit'),
        ]);

        if (!registrationsResponse.ok) throw new Error('Failed to fetch registrations');
        if (!summaryResponse.ok) throw new Error('Failed to fetch admin summary');
        if (!busStatsResponse.ok) throw new Error('Failed to fetch bus stats');
        if (!auditResponse.ok) throw new Error('Failed to fetch admin audit');

        const rawData: Registration[] = await registrationsResponse.json();
        adminSummaryData = await summaryResponse.json() as AdminSummaryResponse;
        const busStatsPayload = await busStatsResponse.json() as BusStatsResponse;
        const auditPayload = await auditResponse.json() as { entries: AdminAuditEntry[] };
        adminAuditEntries = Array.isArray(auditPayload.entries) ? auditPayload.entries : [];
        busStatsData = Array.isArray(busStatsPayload.items) ? busStatsPayload.items : [];

        registrationsData = rawData;

        // Clean up No WhatsApp field (take only the first number if " DAN " is present)
        registrationsData = registrationsData.map(reg => {
            if (reg.phone) {
                reg.phone = reg.phone.split(/\s*DAN\s*|\s*dan\s*|\s*\/\s*|\s*,\s*/)[0].trim();
            }
            return reg;
        });

        applySearchFilter();
        updateVisibleCountLabel();

        renderTable();
        renderSummary();
        renderAuditTable();
        populateBusFilterOptions();
        renderBusStats();

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

    // Optional admin pin approval for this step or we could skip it for dashboard verifying.
    // The requirement didn't explicitly mention admin pin for verification, but if we need to be consistent with unverify, we could do it. 
    // Wait, the regular scan app doesn't ask for pin again for every verification unless you are the verifier.
    // Let's ask for the Admin Pin for security (consistent with unverifyRegistration).
    const approved = await requestAdminPinApproval(`memverifikasi ${selectedIds.length} penumpang`);
    if (!approved) return;

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
