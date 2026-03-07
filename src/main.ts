import './style.css';
import {
  lookupById,
  searchPassengersByName,
  searchPassengersByNikSuffix,
  verifyPassengers,
  isConfigured,
  type PassengerData,
} from './api';

// ============================================
// Types
// ============================================

interface ScanHistoryItem {
  id: string;
  text: string;
  type: 'verified' | 'pending' | 'text';
  timestamp: number;
}

// ============================================
// Constants
// ============================================

const HISTORY_KEY = 'qrscan_history';
const THEME_KEY = 'qrscan_theme';
const PIN_KEY = 'qrscan_pin';
const ADMIN_PIN_KEY = 'qrscan_admin_pin';
const ACTIVE_STAFF_KEY = 'qrscan_active_staff';
const AUTO_SCAN_KEY = 'qrscan_autoscan';
const COMPACT_MODE_KEY = 'qrscan_compact_mode';
const MAX_HISTORY = 50;
const MAX_PIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 30000; // 30 seconds

// ============================================
// State
// ============================================

let currentMatches: PassengerData[] = [];
let currentSearchValue = '';
let currentSearchMode: 'nik' | 'name' = 'nik';
let currentStaffName = '';
let selectedByNamePassengerId: number | null = null;
let groupVerifyOnConfirm: (() => void) | null = null;
let groupVerifyOnCancel: (() => void) | null = null;

// Rate limiter state
let loginFailedAttempts = 0;
let loginLockoutUntil = 0;
let adminFailedAttempts = 0;
let adminLockoutUntil = 0;

// ============================================
// Scan Beep Sound (Web Audio API)
// ============================================

let audioCtx: AudioContext | null = null;

function playScanBeep() {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    osc.frequency.setValueAtTime(1320, audioCtx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.2);
  } catch { /* skip */ }
}

function playVerifyBeep() {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const g1 = audioCtx.createGain();
    const g2 = audioCtx.createGain();
    osc1.connect(g1); g1.connect(audioCtx.destination);
    osc2.connect(g2); g2.connect(audioCtx.destination);
    osc1.type = 'sine'; osc1.frequency.value = 660;
    g1.gain.setValueAtTime(0.25, audioCtx.currentTime);
    g1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    osc1.start(audioCtx.currentTime); osc1.stop(audioCtx.currentTime + 0.15);
    osc2.type = 'sine'; osc2.frequency.value = 1047;
    g2.gain.setValueAtTime(0.25, audioCtx.currentTime + 0.12);
    g2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
    osc2.start(audioCtx.currentTime + 0.12); osc2.stop(audioCtx.currentTime + 0.35);
  } catch { /* skip */ }
}

// ============================================
// DOM Elements
// ============================================

// Manual Input
const manualForm = document.getElementById('manualForm') as HTMLFormElement;
const manualIdInput = document.getElementById('manualIdInput') as HTMLInputElement;

// Auto-scan
const autoScanCheck = document.getElementById('autoScanCheck') as HTMLInputElement;
const compactModeCheck = document.getElementById('compactModeCheck') as HTMLInputElement;

// Persist Auto-Scan toggle state
autoScanCheck.checked = localStorage.getItem(AUTO_SCAN_KEY) === 'true';
autoScanCheck.addEventListener('change', () => {
  localStorage.setItem(AUTO_SCAN_KEY, autoScanCheck.checked.toString());
});

// Verification Panel
const verifySection = document.getElementById('verifySection') as HTMLElement;
const verifyLoading = document.getElementById('verifyLoading') as HTMLDivElement;
const verifyError = document.getElementById('verifyError') as HTMLDivElement;
const verifyErrorMsg = document.getElementById('verifyErrorMsg') as HTMLParagraphElement;
const verifyData = document.getElementById('verifyData') as HTMLDivElement;
const closeVerify = document.getElementById('closeVerify') as HTMLButtonElement;
const retryScanBtn = document.getElementById('retryScanBtn') as HTMLButtonElement;
const selectAllBtn = document.getElementById('selectAllBtn') as HTMLButtonElement | null;

// Registrant Info
const regId = document.getElementById('regId') as HTMLDivElement;
const regNama = document.getElementById('regNama') as HTMLDivElement;
const regPhone = document.getElementById('regPhone') as HTMLDivElement;
const infoGrid = document.querySelector('.info-grid') as HTMLDivElement;
const statusBadge = document.getElementById('statusBadge') as HTMLSpanElement;
const verifyBtn = document.getElementById('verifyBtn') as HTMLButtonElement;
const verifyAllBtn = document.getElementById('verifyAllBtn') as HTMLButtonElement;
const verifyActions = document.getElementById('verifyActions') as HTMLDivElement;
const alreadyVerified = document.getElementById('alreadyVerified') as HTMLDivElement;
const verifiedTime = document.getElementById('verifiedTime') as HTMLSpanElement;
const groupVerifyModal = document.getElementById('groupVerifyModal') as HTMLDivElement;
const groupVerifyMessage = document.getElementById('groupVerifyMessage') as HTMLParagraphElement;
const groupVerifyListWrap = document.getElementById('groupVerifyListWrap') as HTMLDivElement;
const groupVerifyList = document.getElementById('groupVerifyList') as HTMLDivElement;
const groupVerifyConfirm = document.getElementById('groupVerifyConfirm') as HTMLButtonElement;
const groupVerifyCancel = document.getElementById('groupVerifyCancel') as HTMLButtonElement;
const closeGroupVerify = document.getElementById('closeGroupVerify') as HTMLButtonElement;

// KTP
const ktpContainer = document.getElementById('ktpContainer') as HTMLDivElement;
const ktpImage = document.getElementById('ktpImage') as HTMLImageElement;
const ktpLoading = document.getElementById('ktpLoading') as HTMLDivElement;
const ktpFullscreenBtn = document.getElementById('ktpFullscreenBtn') as HTMLButtonElement;
const ktpModal = document.getElementById('ktpModal') as HTMLDivElement;
const ktpModalImage = document.getElementById('ktpModalImage') as HTMLImageElement;
const modalCloseBtn = document.getElementById('modalCloseBtn') as HTMLButtonElement;

// History
const historyList = document.getElementById('historyList') as HTMLDivElement;
const historyCount = document.getElementById('historyCount') as HTMLSpanElement;
const clearHistoryBtn = document.getElementById('clearHistoryBtn') as HTMLButtonElement;
const emptyHistory = document.getElementById('emptyHistory') as HTMLDivElement;

// Stats
const statTotal = document.getElementById('statTotal') as HTMLDivElement;
const statVerified = document.getElementById('statVerified') as HTMLDivElement;
const statPending = document.getElementById('statPending') as HTMLDivElement;

// Network
const networkStatus = document.getElementById('networkStatus') as HTMLDivElement;
const networkLabel = document.getElementById('networkLabel') as HTMLSpanElement;
const networkDot = networkStatus.querySelector('.network-dot') as HTMLSpanElement;

// Staff Badge
const staffBadge = document.getElementById('staffBadge') as HTMLDivElement;
const staffBadgeName = document.getElementById('staffBadgeName') as HTMLSpanElement;
const compactModeBadge = document.getElementById('compactModeBadge') as HTMLDivElement;

// Lock Screen
const lockScreen = document.getElementById('lockScreen') as HTMLDivElement;
const pinInput = document.getElementById('pinInput') as HTMLInputElement;
const lockError = document.getElementById('lockError') as HTMLDivElement;
const staffNameInput = document.getElementById('staffNameInput') as HTMLInputElement;
const lockUnlockBtn = document.getElementById('lockUnlockBtn') as HTMLButtonElement;

// Admin PIN Prompt
const adminPinModal = document.getElementById('adminPinModal') as HTMLDivElement;
const adminPinInput = document.getElementById('adminPinInput') as HTMLInputElement;
const adminPinError = document.getElementById('adminPinError') as HTMLDivElement;
const adminPinSubmit = document.getElementById('adminPinSubmit') as HTMLButtonElement;
const closeAdminPin = document.getElementById('closeAdminPin') as HTMLButtonElement;

// Settings
const settingsBtn = document.getElementById('settingsBtn') as HTMLButtonElement;
const settingsModal = document.getElementById('settingsModal') as HTMLDivElement;
const closeSettings = document.getElementById('closeSettings') as HTMLButtonElement;
const settingsPin = document.getElementById('settingsPin') as HTMLInputElement;
const settingsAdminPin = document.getElementById('settingsAdminPin') as HTMLInputElement;
const saveSettingsBtn = document.getElementById('saveSettingsBtn') as HTMLButtonElement;
const btnOpenAdminDashboard = document.getElementById('btnOpenAdminDashboard') as HTMLButtonElement;

// Others
const themeToggle = document.getElementById('themeToggle') as HTMLButtonElement;
const toast = document.getElementById('toast') as HTMLDivElement;
const toastMessage = document.getElementById('toastMessage') as HTMLSpanElement;

// ============================================
// Theme
// ============================================

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

function applyCompactMode(enabled: boolean) {
  document.body.classList.toggle('compact-mode', enabled);
  compactModeBadge.style.display = enabled ? 'inline-flex' : 'none';
}

// ============================================
// Toast
// ============================================

let toastTimeout: ReturnType<typeof setTimeout>;

function showToast(message: string) {
  toastMessage.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 2500);
}

// ============================================
// Network Status
// ============================================

function updateNetworkStatus() {
  const online = navigator.onLine;
  networkDot.className = `network-dot ${online ? 'online' : 'offline'}`;
  networkLabel.textContent = online ? 'Online' : 'Offline';
  networkStatus.title = online ? 'Koneksi aktif' : 'Tidak ada koneksi internet';
}

// ============================================
// Lock Screen & PIN
// ============================================

function getStoredPinHash(): string {
  return localStorage.getItem(PIN_KEY) || '';
}

function getStoredAdminPinHash(): string {
  return localStorage.getItem(ADMIN_PIN_KEY) || '';
}

async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPin(enteredPin: string): Promise<boolean> {
  const storedHash = getStoredPinHash();
  if (!storedHash) return false;
  const enteredHash = await hashPin(enteredPin);
  return enteredHash === storedHash;
}

async function verifyAdminPin(enteredPin: string): Promise<boolean> {
  const storedHash = getStoredAdminPinHash();
  if (!storedHash) return false;
  const enteredHash = await hashPin(enteredPin);
  return enteredHash === storedHash;
}

function isAdminPinSet(): boolean {
  return getStoredAdminPinHash().length > 0;
}

function isPinEnabled(): boolean {
  return getStoredPinHash().length > 0;
}

// --- Rate Limiter ---
function isLockedOut(type: 'login' | 'admin'): boolean {
  const now = Date.now();
  if (type === 'login') {
    if (loginLockoutUntil > now) return true;
    if (loginFailedAttempts >= MAX_PIN_ATTEMPTS) {
      loginLockoutUntil = now + LOCKOUT_DURATION;
      return true;
    }
    return false;
  } else {
    if (adminLockoutUntil > now) return true;
    if (adminFailedAttempts >= MAX_PIN_ATTEMPTS) {
      adminLockoutUntil = now + LOCKOUT_DURATION;
      return true;
    }
    return false;
  }
}

function recordFailedAttempt(type: 'login' | 'admin') {
  if (type === 'login') loginFailedAttempts++;
  else adminFailedAttempts++;
}

function resetAttempts(type: 'login' | 'admin') {
  if (type === 'login') { loginFailedAttempts = 0; loginLockoutUntil = 0; }
  else { adminFailedAttempts = 0; adminLockoutUntil = 0; }
}

function getRemainingLockout(type: 'login' | 'admin'): number {
  const until = type === 'login' ? loginLockoutUntil : adminLockoutUntil;
  return Math.max(0, Math.ceil((until - Date.now()) / 1000));
}

// --- Lock Screen ---
function initLockScreen() {
  if (!isPinEnabled()) {
    lockScreen.classList.add('hidden');
    currentStaffName = localStorage.getItem(ACTIVE_STAFF_KEY) || '';
    updateStaffBadge();
    return;
  }

  lockScreen.classList.remove('hidden');

  // Pre-fill last staff name
  const lastStaff = localStorage.getItem(ACTIVE_STAFF_KEY);
  if (lastStaff) staffNameInput.value = lastStaff;

  setTimeout(() => pinInput.focus(), 100);
}

function updateStaffBadge() {
  if (currentStaffName) {
    staffBadge.style.display = 'flex';
    staffBadgeName.textContent = currentStaffName;
  } else {
    staffBadge.style.display = 'none';
  }
}

async function handleUnlock() {
  // Rate limit check
  if (isLockedOut('login')) {
    const remaining = getRemainingLockout('login');
    lockError.style.display = 'block';
    lockError.textContent = `Terlalu banyak percobaan. Tunggu ${remaining} detik.`;
    return;
  }

  const enteredPin = pinInput.value.trim();
  const isValid = await verifyPin(enteredPin);

  if (!isValid) {
    recordFailedAttempt('login');
    pinInput.classList.add('error');
    lockError.style.display = 'block';

    if (isLockedOut('login')) {
      lockError.textContent = `Terlalu banyak percobaan. Tunggu 30 detik.`;
      setTimeout(() => resetAttempts('login'), LOCKOUT_DURATION);
    } else {
      const left = MAX_PIN_ATTEMPTS - loginFailedAttempts;
      lockError.textContent = `PIN salah (${left} percobaan tersisa)`;
    }

    setTimeout(() => pinInput.classList.remove('error'), 400);
    pinInput.value = '';
    pinInput.focus();
    return;
  }

  const staffName = staffNameInput.value.trim();
  if (!staffName) {
    lockError.style.display = 'block';
    lockError.textContent = 'Masukkan nama Anda terlebih dahulu';
    staffNameInput.focus();
    return;
  }

  // Unlock!
  resetAttempts('login');
  currentStaffName = staffName;
  localStorage.setItem(ACTIVE_STAFF_KEY, currentStaffName);
  lockScreen.classList.add('hidden');
  lockError.style.display = 'none';
  updateStaffBadge();
  showToast(`Selamat datang, ${currentStaffName}!`);
  setTimeout(() => focusLookupInput(true), 80);
}

// ============================================
// Settings
// ============================================

function openSettings() {
  // Don't allow access behind lock screen
  if (!lockScreen.classList.contains('hidden')) return;

  // If Admin PIN is set, require it first
  if (isAdminPinSet()) {
    adminPinInput.value = '';
    adminPinError.style.display = 'none';
    adminPinModal.style.display = 'flex';
    setTimeout(() => adminPinInput.focus(), 100);
    return;
  }

  // No Admin PIN set — open Settings directly (first-time setup)
  showSettingsModal();
}

function showSettingsModal() {
  settingsPin.value = '';
  settingsAdminPin.value = '';
  settingsModal.style.display = 'flex';
}

function closeSettingsModal() {
  settingsModal.style.display = 'none';
}

function closeAdminPinModal() {
  adminPinModal.style.display = 'none';
  adminPinInput.value = '';
  adminPinError.style.display = 'none';
}

async function handleAdminPinSubmit() {
  // Rate limit check
  if (isLockedOut('admin')) {
    const remaining = getRemainingLockout('admin');
    adminPinError.style.display = 'block';
    adminPinError.textContent = `Terlalu banyak percobaan. Tunggu ${remaining} detik.`;
    return;
  }

  const enteredPin = adminPinInput.value.trim();
  if (!enteredPin) {
    adminPinError.style.display = 'block';
    adminPinError.textContent = 'Masukkan Admin PIN';
    return;
  }

  const isValid = await verifyAdminPin(enteredPin);

  if (!isValid) {
    recordFailedAttempt('admin');
    adminPinError.style.display = 'block';

    if (isLockedOut('admin')) {
      adminPinError.textContent = `Terlalu banyak percobaan. Tunggu 30 detik.`;
      setTimeout(() => resetAttempts('admin'), LOCKOUT_DURATION);
    } else {
      const left = MAX_PIN_ATTEMPTS - adminFailedAttempts;
      adminPinError.textContent = `Admin PIN salah (${left} percobaan tersisa)`;
    }

    adminPinInput.value = '';
    adminPinInput.focus();
    return;
  }

  // Success
  resetAttempts('admin');
  closeAdminPinModal();
  showSettingsModal();
}

// handleTestConnection removed

async function handleSaveSettings() {
  // URL setting removed


  // Save Login PIN (hashed)
  const pin = settingsPin.value.trim();
  if (pin) {
    const pinHash = await hashPin(pin);
    localStorage.setItem(PIN_KEY, pinHash);
  }

  // Save Admin PIN (hashed) — only update if user typed something
  const adminPin = settingsAdminPin.value.trim();
  if (adminPin) {
    if (adminPin.length < 4) {
      showToast('Admin PIN minimal 4 digit');
      return;
    }
    const adminPinHash = await hashPin(adminPin);
    localStorage.setItem(ADMIN_PIN_KEY, adminPinHash);
  }

  closeSettingsModal();
  showToast('✓ Pengaturan tersimpan');

  if (!isConfigured()) {
    console.log('%c⚠️ Mode Demo — backend data belum terhubung', 'color: #feca57; font-weight: bold');
  }
}

// ============================================
// Utility
// ============================================

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Baru saja';
  if (diffMin < 60) return `${diffMin} menit lalu`;
  if (diffHour < 24) return `${diffHour} jam lalu`;
  if (diffDay < 7) return `${diffDay} hari lalu`;

  return date.toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDateTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return dateStr; }
}

// ============================================
// Scan Success Flash
// ============================================

function flashSuccess() {
  const overlay = document.createElement('div');
  overlay.className = 'scan-success-overlay';
  document.body.appendChild(overlay);
  setTimeout(() => overlay.remove(), 500);
  // Haptic feedback — short vibration on scan
  if (navigator.vibrate) navigator.vibrate(100);
}

// Haptic feedback — double pulse on verify
function hapticVerify() {
  if (navigator.vibrate) navigator.vibrate([80, 50, 80]);
}

// ============================================
// Statistics
// ============================================

function updateStats() {
  const history = getHistory();
  const total = history.length;
  const verified = history.filter(h => h.type === 'verified').length;
  const pending = history.filter(h => h.type === 'pending').length;
  animateNumber(statTotal, total);
  animateNumber(statVerified, verified);
  animateNumber(statPending, pending);
}

function animateNumber(el: HTMLElement, target: number) {
  const current = parseInt(el.textContent || '0');
  if (current === target) return;
  el.textContent = target.toString();
  el.style.transform = 'scale(1.2)';
  el.style.transition = 'transform 0.2s ease';
  setTimeout(() => { el.style.transform = 'scale(1)'; }, 200);
}

// ============================================
// History
// ============================================

function getHistory(): ScanHistoryItem[] {
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function saveHistory(history: ScanHistoryItem[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch {
    // localStorage full (e.g. Safari private mode) — silently fail
  }
}

function addToHistory(text: string, type: 'verified' | 'pending' | 'text' = 'text'): ScanHistoryItem {
  const history = getHistory();
  const existingIdx = history.findIndex(item => item.text === text);
  const item: ScanHistoryItem = {
    id: existingIdx >= 0 ? history[existingIdx].id : generateId(),
    text, type, timestamp: Date.now(),
  };
  if (existingIdx >= 0) history.splice(existingIdx, 1);
  history.unshift(item);
  saveHistory(history);
  return item;
}

function removeFromHistory(id: string) {
  const history = getHistory().filter(item => item.id !== id);
  saveHistory(history);
  renderHistory();
}

function clearHistory() {
  if (!confirm('Hapus semua riwayat pencarian?')) return;
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
  showToast('Riwayat dihapus');
}

function renderHistory() {
  const history = getHistory();
  historyCount.textContent = history.length.toString();

  const existingItems = historyList.querySelectorAll('.history-item');
  existingItems.forEach(item => item.remove());

  if (history.length === 0) {
    emptyHistory.style.display = 'flex';
    updateStats();
    return;
  }

  emptyHistory.style.display = 'none';
  history.forEach(item => {
    const el = createHistoryItemElement(item);
    historyList.insertBefore(el, emptyHistory);
  });
  updateStats();
}

function createHistoryItemElement(item: ScanHistoryItem): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'history-item';
  el.dataset.id = item.id;

  const isVerified = item.type === 'verified';
  const iconClass = isVerified ? 'url-icon' : '';

  const iconSvg = isVerified
    ? `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
       </svg>`
    : `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
       </svg>`;

  el.innerHTML = `
    <div class="history-item-icon ${iconClass}">${iconSvg}</div>
    <div class="history-item-content">
      <div class="history-item-text">${escapeHtml(item.text)}</div>
      <div class="history-item-time">${formatTime(item.timestamp)}</div>
    </div>
    <div class="history-item-actions">
      <button class="icon-btn history-delete-btn" title="Hapus" aria-label="Hapus item">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  `;

  el.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('.history-delete-btn')) return;
    handleScanResult(parseHistoryLookupText(item.text));
  });

  const deleteBtn = el.querySelector('.history-delete-btn') as HTMLButtonElement;
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    el.style.transform = 'translateX(100px)';
    el.style.opacity = '0';
    setTimeout(() => removeFromHistory(item.id), 200);
  });

  return el;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function normalizeNikSuffix(raw: string): string {
  return raw.replace(/\D/g, '').slice(-6);
}

function normalizeLookupText(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

function detectLookupMode(rawInput: string): 'nik' | 'name' {
  const normalizedText = normalizeLookupText(rawInput);
  return /^\d{6}$/.test(normalizedText) ? 'nik' : 'name';
}

function getLookupPrompt(mode: 'nik' | 'name') {
  return mode === 'nik'
    ? 'Masukkan 6 digit terakhir NIK'
    : 'Masukkan minimal 3 karakter nama pemudik';
}

function getLookupHistoryLabel(mode: 'nik' | 'name', value: string) {
  return mode === 'nik' ? value : `Nama: ${value}`;
}

function parseHistoryLookupText(value: string): string {
  return value.startsWith('Nama: ') ? value.slice(6) : value;
}

function focusLookupInput(select = false) {
  manualIdInput.focus();
  if (select && manualIdInput.value) {
    manualIdInput.select();
  }
}

function updateManualInputMode(mode: 'nik' | 'name') {
  manualIdInput.dataset.lookupMode = mode;
  manualIdInput.inputMode = mode === 'nik' ? 'numeric' : 'text';
}

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
}

function collapseHistoryPanel() {
  historyList.classList.add('history-collapsed');
  const historyToggle = document.getElementById('historyToggle') as HTMLDivElement | null;
  if (historyToggle) {
    historyToggle.setAttribute('aria-expanded', 'false');
  }
  const historyChevron = document.getElementById('historyChevron') as HTMLElement | null;
  if (historyChevron) {
    historyChevron.classList.remove('rotated');
  }
}

// ============================================
// Verification Flow
// ============================================

async function handleScanResult(rawInput: string) {
  const inputValue = normalizeLookupText(rawInput);
  const lookupMode = detectLookupMode(inputValue);

  if (lookupMode === 'nik') {
    const nikSuffix = normalizeNikSuffix(inputValue);
    if (nikSuffix.length !== 6) {
      showToast(getLookupPrompt('nik'));
      focusLookupInput(true);
      return;
    }
    currentSearchMode = 'nik';
    currentSearchValue = nikSuffix;
  } else {
    if (inputValue.length < 3) {
      showToast(getLookupPrompt('name'));
      focusLookupInput(true);
      return;
    }
    currentSearchMode = 'name';
    currentSearchValue = inputValue;
  }

  verifySection.style.display = 'block';
  document.body.classList.add('verify-active');
  collapseHistoryPanel();
  verifyLoading.style.display = 'flex';
  verifyError.style.display = 'none';
  verifyData.style.display = 'none';
  verifySection.scrollIntoView({ behavior: 'smooth', block: 'start' });

  try {
    const result = currentSearchMode === 'nik'
      ? await searchPassengersByNikSuffix(currentSearchValue)
      : await searchPassengersByName(currentSearchValue);

    if (!result.success || !result.passengers || result.passengers.length === 0) {
      showVerifyError(result.error || `Data tidak ditemukan untuk ${currentSearchValue}`);
      addToHistory(getLookupHistoryLabel(currentSearchMode, currentSearchValue), 'text');
      renderHistory();
      focusLookupInput(true);
      return;
    }

    currentMatches = result.passengers;
    showVerifyData(result.passengers);
    setTimeout(() => verifyData.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);

    const allVerified = result.passengers.every((p) => p.verified);
    addToHistory(getLookupHistoryLabel(currentSearchMode, currentSearchValue), allVerified ? 'verified' : 'pending');
    renderHistory();

    if (!isConfigured()) {
      showToast('⚠️ Mode demo — backend data belum terhubung');
    }

    // High-Speed UX: auto-verify matched passengers in queue mode
    const selectedCount = document.querySelectorAll('.passenger-checkbox:checked:not([disabled])').length;
    if (autoScanCheck.checked && !allVerified && selectedCount > 0) {
      setTimeout(() => {
        handleVerify();
      }, 80);
    }
  } catch {
    showVerifyError('Terjadi kesalahan koneksi. Periksa jaringan dan coba lagi.');
    addToHistory(getLookupHistoryLabel(currentSearchMode, currentSearchValue), 'text');
    renderHistory();
    focusLookupInput(true);
  }
}

function showVerifyError(message: string) {
  verifyLoading.style.display = 'none';
  verifyError.style.display = 'flex';
  verifyData.style.display = 'none';
  verifyErrorMsg.textContent = message;
}

function updateSelectAllButtonState() {
  if (!selectAllBtn) return;
  const checkboxes = document.querySelectorAll('.passenger-checkbox:not([disabled])') as NodeListOf<HTMLInputElement>;
  if (checkboxes.length === 0) {
    selectAllBtn.disabled = true;
    selectAllBtn.textContent = 'Pilih Semua Belum Verified';
    selectAllBtn.title = 'Pilih semua penumpang yang belum verified';
    selectAllBtn.setAttribute('aria-label', 'Pilih semua penumpang yang belum verified');
    updateVerifyButtonState();
    return;
  }

  selectAllBtn.disabled = false;
  const allChecked = Array.from(checkboxes).every((cb) => cb.checked);
  selectAllBtn.textContent = allChecked ? 'Batal Pilih' : 'Pilih Semua Belum Verified';
  selectAllBtn.title = allChecked
    ? 'Batalkan pilihan semua penumpang'
    : 'Pilih semua penumpang yang belum verified';
  selectAllBtn.setAttribute(
    'aria-label',
    allChecked
      ? 'Batalkan pilihan semua penumpang'
      : 'Pilih semua penumpang yang belum verified',
  );
  updateVerifyButtonState();
}

function updateVerifyButtonState() {
  const selectedCount = document.querySelectorAll('.passenger-checkbox:checked:not([disabled])').length;
  const unverifiedCount = document.querySelectorAll('.passenger-checkbox:not([disabled])').length;
  const effectiveSelectedCount = selectedCount > 0
    ? selectedCount
    : (selectedByNamePassengerId ? 1 : 0);

  verifyBtn.disabled = effectiveSelectedCount === 0;
  verifyBtn.innerHTML = `
    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
    ${effectiveSelectedCount > 0 ? `Verifikasi (${effectiveSelectedCount})` : 'Pilih penumpang dulu'}
  `;

  verifyAllBtn.disabled = unverifiedCount === 0;
  verifyAllBtn.textContent = unverifiedCount > 0
    ? `Verifikasi Semua Belum Verified (${unverifiedCount})`
    : 'Semua Sudah Diverifikasi';
}

function showVerifyData(passengers: PassengerData[]) {
  selectedByNamePassengerId = null;
  verifyLoading.style.display = 'none';
  verifyError.style.display = 'none';
  verifyData.style.display = 'block';
  infoGrid.style.display = 'none';

  regId.textContent = currentSearchMode === 'nik'
    ? `6 Digit NIK: ${currentSearchValue}`
    : `Nama Pemudik: ${currentSearchValue}`;
  regNama.textContent = `${passengers.length} orang cocok`;
  regPhone.textContent = currentSearchMode === 'nik'
    ? 'Klik nama untuk tampilkan KTP'
    : 'Hasil nama perlu dicek manual dengan KTP';

  const passengerChecklist = document.getElementById('passengerChecklist') as HTMLDivElement;
  const passengerListItems = document.getElementById('passengerListItems') as HTMLDivElement;
  passengerListItems.innerHTML = '';

  if (passengers.length > 0) {
    passengerChecklist.style.display = 'block';
    let verifiedCount = 0;
    passengers.forEach((p) => {
      if (p.verified) verifiedCount++;

      const item = document.createElement('div');
      item.className = `passenger-item ${p.verified ? 'verified' : ''}`;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.name = 'passengerCheck';
      checkbox.value = p.id.toString();
      checkbox.className = 'passenger-checkbox';
      if (p.verified) {
        checkbox.checked = true;
        checkbox.disabled = true;
      } else {
        checkbox.checked = passengers.length === 1;
      }
      checkbox.addEventListener('change', updateSelectAllButtonState);

      const details = document.createElement('div');
      details.className = 'passenger-details';

      const nameNode = document.createElement('div');
      nameNode.className = 'passenger-name';
      nameNode.innerHTML = `<strong>${escapeHtml(p.nama)}</strong>`;

      const metaNode = document.createElement('div');
      metaNode.style.fontSize = '12px';
      metaNode.style.color = 'var(--text-muted)';
      metaNode.style.marginTop = '6px';
      const nikText = p.nik ? escapeHtml(p.nik) : '-';
      metaNode.innerHTML = `<span>NIK: ${nikText}</span>`;

      const stateNode = document.createElement('div');
      stateNode.className = 'passenger-state';
      if (p.verified) {
        stateNode.innerHTML = `<span class="status-verified-text">Sudah diverifikasi ${p.verifiedAt ? formatDateTime(p.verifiedAt) : ''}</span>`;
      } else {
        stateNode.innerHTML = '<span class="status-pending-text">Belum diverifikasi</span>';
      }

      details.appendChild(nameNode);
      details.appendChild(metaNode);
      details.appendChild(stateNode);

      details.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('input')) return;
        const existingSelected = passengerListItems.querySelector('.passenger-item.preview-selected') as HTMLDivElement | null;
        if (existingSelected) existingSelected.classList.remove('preview-selected');

        loadKtpImage(p.ktpUrl || '');
        if (p.ktpUrl) {
          setTimeout(() => {
            ktpContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 60);
        }
        selectedByNamePassengerId = p.verified ? null : p.id;
        if (!p.verified) {
          item.classList.add('preview-selected');
        }
        updateVerifyButtonState();
      });

      item.appendChild(checkbox);
      item.appendChild(details);
      passengerListItems.appendChild(item);

    });

    // Tampilkan KTP otomatis hanya jika hasil tepat 1 orang
    if (passengers.length === 1 && passengers[0].ktpUrl) {
      loadKtpImage(passengers[0].ktpUrl);
    } else {
      loadKtpImage('');
    }

    const isAllVerified = verifiedCount === passengers.length;
    updateSelectAllButtonState();

    if (isAllVerified) {
      statusBadge.className = 'status-badge status-verified';
      statusBadge.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        Semua sudah diverifikasi
      `;
      verifyActions.style.display = 'none';
      alreadyVerified.style.display = 'flex';
      verifiedTime.textContent = `${verifiedCount} orang`; 
    } else {
      statusBadge.className = 'status-badge status-pending';
      statusBadge.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        Ditemukan ${passengers.length} orang (sisa ${passengers.length - verifiedCount} belum diverifikasi)
      `;
      verifyActions.style.display = 'block';
      alreadyVerified.style.display = 'none';
      updateVerifyButtonState();
    }
  } else {
    passengerChecklist.style.display = 'none';
    loadKtpImage('');
  }
}

function loadKtpImage(url: string) {
  if (!url) {
    ktpContainer.style.display = 'none';
    ktpLoading.style.display = 'none';
    ktpImage.src = '';
    ktpImage.alt = 'Tidak ada gambar KTP';
    return;
  }

  ktpContainer.style.display = 'block';
  ktpLoading.style.display = 'flex';
  ktpImage.style.opacity = '0';
  ktpImage.style.display = 'block';
  ktpImage.onload = () => { ktpLoading.style.display = 'none'; ktpImage.style.opacity = '1'; };
  ktpImage.onerror = () => {
    ktpLoading.style.display = 'none';
    ktpImage.style.display = 'none';
    ktpContainer.style.display = 'none';
  };
  ktpImage.src = url;
}

function hideVerify() {
  verifySection.style.display = 'none';
  document.body.classList.remove('verify-active');
  closeGroupVerifyModal();
  selectedByNamePassengerId = null;
  currentMatches = [];
  currentSearchValue = '';
  currentSearchMode = 'nik';
  focusLookupInput(true);
}

// ============================================
// Verify Action (with staff name)
// ============================================

async function handleVerify(skipGroupPrompt = false, forcedPassengerIds: number[] | null = null) {
  if (currentMatches.length === 0) return;

  // Gather passenger checkboxes
  const checkboxes = document.querySelectorAll('.passenger-checkbox:checked:not([disabled])') as NodeListOf<HTMLInputElement>;
  let selectedPassengerIds = forcedPassengerIds
    ? [...forcedPassengerIds]
    : Array.from(checkboxes).map((cb) => parseInt(cb.value));

  if (selectedPassengerIds.length === 0 && selectedByNamePassengerId) {
    const selectedByName = currentMatches.find((p) => p.id === selectedByNamePassengerId);
    if (selectedByName && !selectedByName.verified) {
      selectedPassengerIds.push(selectedByNamePassengerId);
    }
  }

  if (!skipGroupPrompt && selectedPassengerIds.length === 1 && currentMatches.length > 1) {
    const selectedPassenger = currentMatches.find((p) => p.id === selectedPassengerIds[0]);
    const selectedRegistrationId = selectedPassenger?.registrationId || '';

    if (selectedPassenger && selectedRegistrationId) {
      const groupLookup = await lookupById(selectedRegistrationId);
      const groupPassengers = groupLookup.success && groupLookup.data
        ? groupLookup.data.passengers
        : [];
      const sameGroupUnverified = groupPassengers.filter((p) => !p.verified);

      if (sameGroupUnverified.length > 1) {
        const otherPassengers = sameGroupUnverified.filter((p) => p.id !== selectedPassenger.id);
        openGroupVerifyModal({
          message: `Masih ada ${sameGroupUnverified.length} penumpang dalam pendaftar yang sama. Check-in semua sekarang?`,
          confirmText: 'Ya, Check-in Semua',
          cancelText: 'Tetap Satu Orang',
          passengerList: otherPassengers,
          onConfirm: () => {
            selectedByNamePassengerId = null;
            updateSelectAllButtonState();
            void handleVerify(true, sameGroupUnverified.map((p) => p.id));
          },
          onCancel: () => {
            void handleVerify(true, [selectedPassenger.id]);
          },
        });
        return;
      }
    }

    openGroupVerifyModal({
      message: `Ditemukan ${currentMatches.length} data. Lanjut verifikasi 1 orang ini saja?`,
      confirmText: 'Ya, Verifikasi 1 Orang',
      cancelText: 'Batal',
      onConfirm: () => {
        void handleVerify(true, selectedPassenger ? [selectedPassenger.id] : selectedPassengerIds);
      },
    });
    return;
  }

  if (selectedPassengerIds.length === 0) {
    showToast('Pilih setidaknya 1 penumpang untuk diverifikasi');
    return;
  }

  verifyBtn.disabled = true;
  verifyAllBtn.disabled = true;
  verifyBtn.innerHTML = `
    <div class="loading-spinner small" style="width:18px;height:18px;border-width:2px;"></div>
    Memverifikasi...
  `;

  try {
    const result = await verifyPassengers(selectedPassengerIds, currentStaffName);

    if (result.success) {
      const now = new Date().toISOString();
      selectedPassengerIds.forEach((id) => {
        const p = currentMatches.find((item) => item.id === id);
        if (p) {
          p.verified = true;
          p.verifiedAt = now;
          p.verifiedBy = currentStaffName;
        }
      });

      showVerifyData(currentMatches);

      const allVerified = currentMatches.every((p) => p.verified);
      addToHistory(getLookupHistoryLabel(currentSearchMode, currentSearchValue || manualIdInput.value.trim()), allVerified ? 'verified' : 'pending');
      renderHistory();

      playVerifyBeep();
      hapticVerify();
      showToast(`✓ Berhasil memverifikasi ${selectedPassengerIds.length} penumpang!`);
      flashSuccess();

      if (autoScanCheck.checked) {
        setTimeout(() => hideVerify(), 250);
      } else {
        verifyBtn.focus();
      }
    } else {
      showToast('Gagal memverifikasi: ' + (result.error || 'Unknown error'));
      resetVerifyBtn();
    }
  } catch {
    showToast('Gagal memverifikasi. Periksa koneksi dan coba lagi.');
    resetVerifyBtn();
  }
}

function resetVerifyBtn() {
  updateVerifyButtonState();
}

function openGroupVerifyModal(options: {
  message: string;
  confirmText: string;
  cancelText: string;
  passengerList?: PassengerData[];
  onConfirm: () => void;
  onCancel?: () => void;
}) {
  groupVerifyMessage.textContent = options.message;
  if (options.passengerList && options.passengerList.length > 0) {
    groupVerifyListWrap.style.display = 'block';
    groupVerifyList.innerHTML = options.passengerList
      .map((p) => {
        const nik = p.nik ? escapeHtml(p.nik) : '-';
        return `<div class="group-verify-list-item"><span class="group-verify-name">${escapeHtml(p.nama)}</span><span class="group-verify-nik">NIK: ${nik}</span></div>`;
      })
      .join('');
  } else {
    groupVerifyListWrap.style.display = 'none';
    groupVerifyList.innerHTML = '';
  }
  groupVerifyConfirm.textContent = options.confirmText;
  groupVerifyCancel.textContent = options.cancelText;
  groupVerifyOnConfirm = options.onConfirm;
  groupVerifyOnCancel = options.onCancel || null;
  groupVerifyModal.style.display = 'flex';
  setTimeout(() => groupVerifyConfirm.focus(), 80);
}

function closeGroupVerifyModal() {
  groupVerifyModal.style.display = 'none';
  groupVerifyOnConfirm = null;
  groupVerifyOnCancel = null;
  groupVerifyListWrap.style.display = 'none';
  groupVerifyList.innerHTML = '';
  groupVerifyConfirm.textContent = 'Ya, Verifikasi Semua';
  groupVerifyCancel.textContent = 'Batal';
}

function runGroupVerifyConfirm() {
  const handler = groupVerifyOnConfirm;
  closeGroupVerifyModal();
  if (handler) handler();
}

function runGroupVerifyCancel() {
  const handler = groupVerifyOnCancel;
  closeGroupVerifyModal();
  if (handler) handler();
}

function handleVerifyAllUnverified() {
  const checkboxes = document.querySelectorAll('.passenger-checkbox:not([disabled])') as NodeListOf<HTMLInputElement>;
  const total = checkboxes.length;

  if (total === 0) {
    showToast('Semua penumpang sudah diverifikasi');
    return;
  }

  openGroupVerifyModal({
    message: `Verifikasi semua ${total} penumpang yang belum verified?`,
    confirmText: 'Ya, Verifikasi Semua',
    cancelText: 'Batal',
    onConfirm: () => {
      checkboxes.forEach((cb) => {
        cb.checked = true;
      });
      selectedByNamePassengerId = null;
      updateSelectAllButtonState();
      handleVerify(true);
    },
  });
}

// ============================================
// KTP Fullscreen
// ============================================

function openKtpFullscreen() {
  if (!ktpImage.src) return;
  ktpModalImage.src = ktpImage.src;
  ktpModal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeKtpFullscreen() {
  ktpModal.style.display = 'none';
  document.body.style.overflow = '';
}

// ============================================
// Event Listeners
// ============================================

// Manual Input
manualForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const id = normalizeLookupText(manualIdInput.value);
  if (!id) { showToast('Masukkan 6 digit NIK atau nama pemudik'); focusLookupInput(); return; }
  playScanBeep();
  handleScanResult(id);
  manualIdInput.value = '';
});

manualIdInput.addEventListener('input', () => {
  const rawValue = manualIdInput.value;
  const collapsedValue = rawValue.replace(/\s+/g, ' ');
  const compactValue = collapsedValue.trim();

  if (/^\d+$/.test(compactValue)) {
    manualIdInput.value = normalizeNikSuffix(compactValue);
    updateManualInputMode('nik');
    return;
  }

  manualIdInput.value = collapsedValue.replace(/^\s+/, '');
  updateManualInputMode('name');
});

// Verification
closeVerify.addEventListener('click', hideVerify);
retryScanBtn.addEventListener('click', () => {
  hideVerify();
  showToast('Masukkan 6 digit NIK atau nama pemudik berikutnya');
});
verifyBtn.addEventListener('click', () => { void handleVerify(); });
verifyAllBtn.addEventListener('click', handleVerifyAllUnverified);
groupVerifyConfirm.addEventListener('click', runGroupVerifyConfirm);
groupVerifyCancel.addEventListener('click', runGroupVerifyCancel);
closeGroupVerify.addEventListener('click', runGroupVerifyCancel);
groupVerifyModal.addEventListener('click', (e) => {
  if (e.target === groupVerifyModal) runGroupVerifyCancel();
});
if (selectAllBtn) {
  selectAllBtn.addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('.passenger-checkbox:not([disabled])') as NodeListOf<HTMLInputElement>;
    if (checkboxes.length === 0) return;
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    checkboxes.forEach(cb => cb.checked = !allChecked);
    updateSelectAllButtonState();
  });
}

// KTP
ktpFullscreenBtn.addEventListener('click', openKtpFullscreen);
ktpImage.addEventListener('click', openKtpFullscreen);
modalCloseBtn.addEventListener('click', closeKtpFullscreen);
ktpModal.addEventListener('click', (e) => { if (e.target === ktpModal) closeKtpFullscreen(); });

// History
clearHistoryBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  clearHistory();
});

// History Toggle (collapsible)
const historyToggle = document.getElementById('historyToggle') as HTMLDivElement;
const historyChevron = document.getElementById('historyChevron') as HTMLElement;

historyToggle.addEventListener('click', (e) => {
  // Don't toggle when clicking the clear button
  if ((e.target as HTMLElement).closest('#clearHistoryBtn')) return;
  historyList.classList.toggle('history-collapsed');
  historyChevron.classList.toggle('rotated');
  const expanded = !historyList.classList.contains('history-collapsed');
  historyToggle.setAttribute('aria-expanded', expanded.toString());
});

historyToggle.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    historyToggle.click();
  }
});

// Theme
themeToggle.addEventListener('click', toggleTheme);

// Lock Screen
lockUnlockBtn.addEventListener('click', handleUnlock);
pinInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleUnlock(); });
staffNameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleUnlock(); });

// Admin PIN
adminPinSubmit.addEventListener('click', handleAdminPinSubmit);
closeAdminPin.addEventListener('click', closeAdminPinModal);
adminPinInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleAdminPinSubmit(); });
adminPinModal.addEventListener('click', (e) => { if (e.target === adminPinModal) closeAdminPinModal(); });

// Settings
settingsBtn.addEventListener('click', openSettings);
closeSettings.addEventListener('click', closeSettingsModal);
saveSettingsBtn.addEventListener('click', handleSaveSettings);
settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) closeSettingsModal(); });

btnOpenAdminDashboard?.addEventListener('click', () => {
  sessionStorage.setItem('qr_admin_access', 'true');
  window.location.href = '/admin.html';
});
settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) closeSettingsModal(); });

// Network
window.addEventListener('online', () => { updateNetworkStatus(); showToast('✓ Koneksi kembali aktif'); });
window.addEventListener('offline', () => { updateNetworkStatus(); showToast('⚠️ Koneksi terputus'); });

// Keyboard
document.addEventListener('keydown', (e) => {
  if (isTypingTarget(e.target)) return;

  if (groupVerifyModal.style.display === 'flex' && e.key === 'Enter') {
    e.preventDefault();
    runGroupVerifyConfirm();
    return;
  }

  if (groupVerifyModal.style.display === 'flex' && e.key === 'Escape') {
    e.preventDefault();
    runGroupVerifyCancel();
    return;
  }

  if (e.key === 'Escape') {
    hideVerify();
    closeKtpFullscreen();
    closeGroupVerifyModal();
    closeAdminPinModal();
    closeSettingsModal();
    return;
  }

  if (e.key === 'F2') {
    e.preventDefault();
    focusLookupInput(true);
    return;
  }

  if (verifySection.style.display === 'block') {
    if (e.key === 'Enter' && document.activeElement !== manualIdInput && !verifyBtn.disabled) {
      e.preventDefault();
      handleVerify();
      return;
    }

    if ((e.key === 'a' || e.key === 'A') && selectAllBtn) {
      e.preventDefault();
      selectAllBtn.click();
      return;
    }

    if (/^[1-9]$/.test(e.key)) {
      const idx = parseInt(e.key, 10) - 1;
      const checkboxes = document.querySelectorAll('.passenger-checkbox:not([disabled])') as NodeListOf<HTMLInputElement>;
      if (idx >= 0 && idx < checkboxes.length) {
        e.preventDefault();
        checkboxes[idx].checked = !checkboxes[idx].checked;
        updateSelectAllButtonState();
      }
    }
  }
});

// ============================================
// PWA Registration
// ============================================

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { });
  });
}

// ============================================
// Init
// ============================================

initTheme();
updateNetworkStatus();
renderHistory();
initLockScreen();
loadKtpImage('');
updateManualInputMode('name');

if (!isPinEnabled()) {
  setTimeout(() => focusLookupInput(), 80);
}

// Persist auto-scan preference
autoScanCheck.checked = localStorage.getItem(AUTO_SCAN_KEY) === 'true';
autoScanCheck.addEventListener('change', () => {
  try { localStorage.setItem(AUTO_SCAN_KEY, autoScanCheck.checked.toString()); } catch { /* */ }
});

// Persist compact mode preference
compactModeCheck.checked = localStorage.getItem(COMPACT_MODE_KEY) === 'true';
applyCompactMode(compactModeCheck.checked);
compactModeCheck.addEventListener('change', () => {
  applyCompactMode(compactModeCheck.checked);
  try { localStorage.setItem(COMPACT_MODE_KEY, compactModeCheck.checked.toString()); } catch { /* */ }
});

// Refresh stale timestamps when app becomes visible again
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) renderHistory();
});

// Auto-scroll to scanner section on load (skip stats)
const scannerSection = document.getElementById('scannerSection');
if (scannerSection) {
  setTimeout(() => {
    scannerSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 500);
}

if (!isConfigured()) {
  console.log('%c⚠️ Mode Demo — backend data belum terhubung', 'color: #feca57; font-weight: bold');
}
