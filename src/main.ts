import './style.css';
import { Html5Qrcode } from 'html5-qrcode';
import {
  lookupById,
  verifyRegistrant,
  isConfigured,
  getAppsScriptUrl,
  setAppsScriptUrl,
  testConnection,
  type RegistrantData,
} from './sheets';

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
const MAX_HISTORY = 50;
const MAX_PIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 30000; // 30 seconds

// ============================================
// State
// ============================================

let html5Qrcode: Html5Qrcode | null = null;
let isScanning = false;
let isScannerStarting = false;
let currentRegistrant: RegistrantData | null = null;
let currentStaffName = '';
let lastScannedText = '';
let lastScanTime = 0;

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

// Scanner
const startScanBtn = document.getElementById('startScanBtn') as HTMLButtonElement;
const stopScanBtn = document.getElementById('stopScanBtn') as HTMLButtonElement;
const scannerPlaceholder = document.getElementById('scannerPlaceholder') as HTMLDivElement;

// Manual Input
const manualForm = document.getElementById('manualForm') as HTMLFormElement;
const manualIdInput = document.getElementById('manualIdInput') as HTMLInputElement;

// Auto-scan
const autoScanCheck = document.getElementById('autoScanCheck') as HTMLInputElement;

// Viewfinder
const viewfinderOverlay = document.getElementById('viewfinderOverlay') as HTMLDivElement;

// Verification Panel
const verifySection = document.getElementById('verifySection') as HTMLElement;
const verifyLoading = document.getElementById('verifyLoading') as HTMLDivElement;
const verifyError = document.getElementById('verifyError') as HTMLDivElement;
const verifyErrorMsg = document.getElementById('verifyErrorMsg') as HTMLParagraphElement;
const verifyData = document.getElementById('verifyData') as HTMLDivElement;
const closeVerify = document.getElementById('closeVerify') as HTMLButtonElement;
const retryScanBtn = document.getElementById('retryScanBtn') as HTMLButtonElement;

// Registrant Info
const regId = document.getElementById('regId') as HTMLDivElement;
const regNama = document.getElementById('regNama') as HTMLDivElement;
const regPhone = document.getElementById('regPhone') as HTMLDivElement;
const statusBadge = document.getElementById('statusBadge') as HTMLSpanElement;
const verifyBtn = document.getElementById('verifyBtn') as HTMLButtonElement;
const verifyActions = document.getElementById('verifyActions') as HTMLDivElement;
const alreadyVerified = document.getElementById('alreadyVerified') as HTMLDivElement;
const verifiedTime = document.getElementById('verifiedTime') as HTMLSpanElement;

// KTP
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
const settingsUrl = document.getElementById('settingsUrl') as HTMLInputElement;
const testConnectionBtn = document.getElementById('testConnectionBtn') as HTMLButtonElement;
const settingsUrlStatus = document.getElementById('settingsUrlStatus') as HTMLDivElement;
const settingsPin = document.getElementById('settingsPin') as HTMLInputElement;
const settingsAdminPin = document.getElementById('settingsAdminPin') as HTMLInputElement;
const saveSettingsBtn = document.getElementById('saveSettingsBtn') as HTMLButtonElement;

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
  settingsUrl.value = getAppsScriptUrl();
  settingsPin.value = '';
  settingsAdminPin.value = '';
  settingsUrlStatus.textContent = '';
  settingsUrlStatus.className = 'settings-status';
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

async function handleTestConnection() {
  const url = settingsUrl.value.trim();
  if (!url) {
    settingsUrlStatus.textContent = '⚠️ Masukkan URL terlebih dahulu';
    settingsUrlStatus.className = 'settings-status error';
    return;
  }

  // Validate URL format
  if (!url.startsWith('https://script.google.com/')) {
    settingsUrlStatus.textContent = '✗ URL harus dimulai dengan https://script.google.com/';
    settingsUrlStatus.className = 'settings-status error';
    return;
  }

  // Save old URL, temporarily set new URL for testing
  const oldUrl = getAppsScriptUrl();
  try {
    setAppsScriptUrl(url);
  } catch {
    settingsUrlStatus.textContent = '✗ URL tidak valid';
    settingsUrlStatus.className = 'settings-status error';
    return;
  }

  testConnectionBtn.disabled = true;
  testConnectionBtn.textContent = '...';
  settingsUrlStatus.textContent = 'Menghubungkan...';
  settingsUrlStatus.className = 'settings-status';

  const result = await testConnection();

  testConnectionBtn.disabled = false;
  testConnectionBtn.textContent = 'Test';

  if (result.success) {
    settingsUrlStatus.textContent = '✓ Koneksi berhasil!';
    settingsUrlStatus.className = 'settings-status success';
  } else {
    // Restore old URL on failure
    setAppsScriptUrl(oldUrl);
    settingsUrlStatus.textContent = '✗ Koneksi gagal. Periksa URL dan coba lagi.';
    settingsUrlStatus.className = 'settings-status error';
  }
}

async function handleSaveSettings() {
  // Save URL (with validation)
  const url = settingsUrl.value.trim();
  try {
    setAppsScriptUrl(url);
  } catch (err: any) {
    showToast('✗ ' + err.message);
    return;
  }

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
    console.log('%c⚠️ Mode Demo — Google Sheet belum terhubung', 'color: #feca57; font-weight: bold');
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
  if (!confirm('Hapus semua riwayat scan?')) return;
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
    handleScanResult(item.text);
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

// ============================================
// Scanner
// ============================================

async function startScanner() {
  if (isScanning || isScannerStarting) return;
  isScannerStarting = true;
  startScanBtn.disabled = true;

  try {
    html5Qrcode = new Html5Qrcode('reader');
    const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };

    scannerPlaceholder.style.display = 'none';
    startScanBtn.style.display = 'none';
    stopScanBtn.style.display = 'flex';
    viewfinderOverlay.style.display = 'flex';

    await html5Qrcode.start(
      { facingMode: 'environment' }, config, onScanSuccess,
      () => { } // ignore no-QR frames
    );
    isScanning = true;
  } catch (err) {
    console.error('Scanner error:', err);
    showToast('Gagal mengakses kamera. Pastikan izin kamera diberikan.');
    resetScanner();
  } finally {
    isScannerStarting = false;
    startScanBtn.disabled = false;
  }
}

async function stopScanner() {
  if (!html5Qrcode || !isScanning) return;
  try {
    await html5Qrcode.stop();
    html5Qrcode.clear();
  } catch (err) { console.error('Stop scanner error:', err); }
  resetScanner();
}

function resetScanner() {
  isScanning = false;
  scannerPlaceholder.style.display = 'flex';
  startScanBtn.style.display = 'flex';
  stopScanBtn.style.display = 'none';
  viewfinderOverlay.style.display = 'none';
}

function onScanSuccess(decodedText: string) {
  // Debounce: ignore duplicate scans within 3 seconds
  const now = Date.now();
  if (decodedText === lastScannedText && now - lastScanTime < 3000) return;
  lastScannedText = decodedText;
  lastScanTime = now;

  playScanBeep();
  flashSuccess();
  stopScanner();
  handleScanResult(decodedText);
}

// ============================================
// Verification Flow
// ============================================

async function handleScanResult(scannedId: string) {
  const trimmedId = scannedId.trim();
  if (!trimmedId) return;

  verifySection.style.display = 'block';
  verifyLoading.style.display = 'flex';
  verifyError.style.display = 'none';
  verifyData.style.display = 'none';
  verifySection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  try {
    const result = await lookupById(trimmedId);

    if (!result.success || !result.data) {
      showVerifyError(result.error || 'Data tidak ditemukan untuk ID: ' + trimmedId);
      addToHistory(trimmedId, 'text');
      renderHistory();
      return;
    }

    currentRegistrant = result.data;
    showVerifyData(result.data);
    addToHistory(trimmedId, result.data.verified ? 'verified' : 'pending');
    renderHistory();

    if (!isConfigured()) {
      showToast('⚠️ Mode demo — Google Sheet belum terhubung');
    }
  } catch {
    showVerifyError('Terjadi kesalahan koneksi. Periksa jaringan dan coba lagi.');
    addToHistory(trimmedId, 'text');
    renderHistory();
  }
}

function showVerifyError(message: string) {
  verifyLoading.style.display = 'none';
  verifyError.style.display = 'flex';
  verifyData.style.display = 'none';
  verifyErrorMsg.textContent = message;
}

function showVerifyData(data: RegistrantData) {
  verifyLoading.style.display = 'none';
  verifyError.style.display = 'none';
  verifyData.style.display = 'block';

  regId.textContent = data.id;
  regNama.textContent = data.nama;

  // Phone masking — show masked, click to reveal
  const phone = data.phone || '';
  const masked = phone.length > 4
    ? phone.substring(0, 4) + '****' + phone.substring(phone.length - 4)
    : phone;
  regPhone.innerHTML = `<span class="phone-masked" title="Klik untuk tampilkan">${escapeHtml(masked)}</span>`;
  const phoneSpan = regPhone.querySelector('.phone-masked') as HTMLSpanElement;
  if (phoneSpan) {
    phoneSpan.style.cursor = 'pointer';
    phoneSpan.addEventListener('click', () => {
      phoneSpan.innerHTML = `<a href="tel:${escapeHtml(phone)}" style="color:inherit;text-decoration:underline">${escapeHtml(phone)}</a>`;
      phoneSpan.style.cursor = 'default';
    }, { once: true });
  }

  // === DUPLICATE GUARD ===
  if (data.verified) {
    statusBadge.className = 'status-badge status-verified';
    statusBadge.innerHTML = `
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
      Sudah Diverifikasi
    `;
    verifyActions.style.display = 'none';
    alreadyVerified.style.display = 'flex';

    // Show who verified and when
    let verifiedInfo = '';
    if (data.verifiedBy) {
      verifiedInfo += `oleh ${data.verifiedBy}`;
    }
    if (data.verifiedAt) {
      verifiedInfo += verifiedInfo ? ` — ${formatDateTime(data.verifiedAt)}` : formatDateTime(data.verifiedAt);
    }
    verifiedTime.textContent = verifiedInfo;
  } else {
    statusBadge.className = 'status-badge status-pending';
    statusBadge.innerHTML = `
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      Belum Diverifikasi
    `;
    verifyActions.style.display = 'block';
    alreadyVerified.style.display = 'none';
    verifyBtn.disabled = false;
    verifyBtn.innerHTML = `
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
      Verifikasi Sekarang
    `;
  }

  loadKtpImage(data.ktpUrl);
}

function loadKtpImage(url: string) {
  if (!url) {
    ktpLoading.style.display = 'none';
    ktpImage.src = '';
    ktpImage.alt = 'Tidak ada gambar KTP';
    return;
  }
  ktpLoading.style.display = 'flex';
  ktpImage.style.opacity = '0';
  ktpImage.style.display = 'block';
  ktpImage.onload = () => { ktpLoading.style.display = 'none'; ktpImage.style.opacity = '1'; };
  ktpImage.onerror = () => { ktpLoading.style.display = 'none'; ktpImage.style.display = 'none'; };
  ktpImage.src = url;
}

function hideVerify() {
  verifySection.style.display = 'none';
  currentRegistrant = null;
  if (autoScanCheck.checked) {
    setTimeout(() => startScanner(), 300);
  }
}

// ============================================
// Verify Action (with staff name)
// ============================================

async function handleVerify() {
  if (!currentRegistrant) return;

  verifyBtn.disabled = true;
  verifyBtn.innerHTML = `
    <div class="loading-spinner small" style="width:18px;height:18px;border-width:2px;"></div>
    Memverifikasi...
  `;

  try {
    // Pass current staff name to verifyRegistrant
    const result = await verifyRegistrant(currentRegistrant.id, currentStaffName);

    if (result.success) {
      currentRegistrant.verified = true;
      currentRegistrant.verifiedAt = new Date().toISOString();
      currentRegistrant.verifiedBy = currentStaffName;
      showVerifyData(currentRegistrant);

      addToHistory(currentRegistrant.id, 'verified');
      renderHistory();

      playVerifyBeep();
      hapticVerify();
      showToast('✓ Berhasil diverifikasi!');
      flashSuccess();

      if (autoScanCheck.checked) {
        setTimeout(() => hideVerify(), 1500);
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
  verifyBtn.disabled = false;
  verifyBtn.innerHTML = `
    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
    Verifikasi Sekarang
  `;
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

// Scanner
startScanBtn.addEventListener('click', startScanner);
stopScanBtn.addEventListener('click', stopScanner);

// Manual Input
manualForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const id = manualIdInput.value.trim();
  if (!id) { showToast('Masukkan ID terlebih dahulu'); manualIdInput.focus(); return; }
  playScanBeep();
  handleScanResult(id);
  manualIdInput.value = '';
});

// Verification
closeVerify.addEventListener('click', hideVerify);
retryScanBtn.addEventListener('click', () => { hideVerify(); startScanner(); });
verifyBtn.addEventListener('click', handleVerify);

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
testConnectionBtn.addEventListener('click', handleTestConnection);
saveSettingsBtn.addEventListener('click', handleSaveSettings);
settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) closeSettingsModal(); });

// Network
window.addEventListener('online', () => { updateNetworkStatus(); showToast('✓ Koneksi kembali aktif'); });
window.addEventListener('offline', () => { updateNetworkStatus(); showToast('⚠️ Koneksi terputus'); });

// Keyboard
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeKtpFullscreen();
    closeAdminPinModal();
    closeSettingsModal();
  }
});

// ============================================
// PWA Registration
// ============================================

if ('serviceWorker' in navigator) {
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

// Persist auto-scan preference
autoScanCheck.checked = localStorage.getItem(AUTO_SCAN_KEY) === 'true';
autoScanCheck.addEventListener('change', () => {
  try { localStorage.setItem(AUTO_SCAN_KEY, autoScanCheck.checked.toString()); } catch { /* */ }
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
  console.log('%c⚠️ QR Scan: Mode Demo — buka Settings untuk set URL Google Sheet', 'color: #feca57; font-weight: bold');
}
