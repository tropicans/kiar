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
const STAFF_KEY = 'qrscan_staff_list';
const ACTIVE_STAFF_KEY = 'qrscan_active_staff';
const MAX_HISTORY = 50;

// ============================================
// State
// ============================================

let html5Qrcode: Html5Qrcode | null = null;
let isScanning = false;
let currentRegistrant: RegistrantData | null = null;
let currentStaffName = '';

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
const staffSelect = document.getElementById('staffSelect') as HTMLSelectElement;
const lockUnlockBtn = document.getElementById('lockUnlockBtn') as HTMLButtonElement;

// Settings
const settingsBtn = document.getElementById('settingsBtn') as HTMLButtonElement;
const settingsModal = document.getElementById('settingsModal') as HTMLDivElement;
const closeSettings = document.getElementById('closeSettings') as HTMLButtonElement;
const settingsUrl = document.getElementById('settingsUrl') as HTMLInputElement;
const testConnectionBtn = document.getElementById('testConnectionBtn') as HTMLButtonElement;
const settingsUrlStatus = document.getElementById('settingsUrlStatus') as HTMLDivElement;
const settingsPin = document.getElementById('settingsPin') as HTMLInputElement;
const settingsStaff = document.getElementById('settingsStaff') as HTMLTextAreaElement;
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

function getPin(): string {
  return localStorage.getItem(PIN_KEY) || '';
}

function getStaffList(): string[] {
  try {
    const data = localStorage.getItem(STAFF_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function isPinEnabled(): boolean {
  return getPin().length > 0;
}

function initLockScreen() {
  if (!isPinEnabled()) {
    // No PIN set — skip lock screen, use last staff or empty
    lockScreen.classList.add('hidden');
    currentStaffName = localStorage.getItem(ACTIVE_STAFF_KEY) || '';
    updateStaffBadge();
    return;
  }

  // Show lock screen
  lockScreen.classList.remove('hidden');

  // Populate staff dropdown
  populateStaffSelect();

  // Focus PIN input
  setTimeout(() => pinInput.focus(), 100);
}

function populateStaffSelect() {
  const staffList = getStaffList();

  // Clear existing options except placeholder
  while (staffSelect.options.length > 1) {
    staffSelect.remove(1);
  }

  staffList.forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    staffSelect.appendChild(opt);
  });

  // Pre-select last active staff if any
  const lastStaff = localStorage.getItem(ACTIVE_STAFF_KEY);
  if (lastStaff && staffList.includes(lastStaff)) {
    staffSelect.value = lastStaff;
  }
}

function updateStaffBadge() {
  if (currentStaffName) {
    staffBadge.style.display = 'flex';
    staffBadgeName.textContent = currentStaffName;
  } else {
    staffBadge.style.display = 'none';
  }
}

function handleUnlock() {
  const pin = getPin();
  const enteredPin = pinInput.value.trim();

  if (enteredPin !== pin) {
    pinInput.classList.add('error');
    lockError.style.display = 'block';
    lockError.textContent = 'PIN salah';
    setTimeout(() => pinInput.classList.remove('error'), 400);
    pinInput.value = '';
    pinInput.focus();
    return;
  }

  const selectedStaff = staffSelect.value;
  if (getStaffList().length > 0 && !selectedStaff) {
    lockError.style.display = 'block';
    lockError.textContent = 'Pilih nama staf terlebih dahulu';
    return;
  }

  // Unlock!
  currentStaffName = selectedStaff || '';
  localStorage.setItem(ACTIVE_STAFF_KEY, currentStaffName);
  lockScreen.classList.add('hidden');
  lockError.style.display = 'none';
  updateStaffBadge();
  showToast(`Selamat datang, ${currentStaffName || 'Staf'}!`);
}

// ============================================
// Settings
// ============================================

function openSettings() {
  // Load current values
  settingsUrl.value = getAppsScriptUrl();
  settingsPin.value = getPin();
  settingsStaff.value = getStaffList().join('\n');
  settingsUrlStatus.textContent = '';
  settingsUrlStatus.className = 'settings-status';
  settingsModal.style.display = 'flex';
}

function closeSettingsModal() {
  settingsModal.style.display = 'none';
}

async function handleTestConnection() {
  const url = settingsUrl.value.trim();
  if (!url) {
    settingsUrlStatus.textContent = '⚠️ Masukkan URL terlebih dahulu';
    settingsUrlStatus.className = 'settings-status error';
    return;
  }

  // Temporarily set URL for testing
  setAppsScriptUrl(url);

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
    settingsUrlStatus.textContent = `✗ ${result.error}`;
    settingsUrlStatus.className = 'settings-status error';
  }
}

function handleSaveSettings() {
  // Save URL
  const url = settingsUrl.value.trim();
  setAppsScriptUrl(url);

  // Save PIN
  const pin = settingsPin.value.trim();
  if (pin) {
    localStorage.setItem(PIN_KEY, pin);
  } else {
    localStorage.removeItem(PIN_KEY);
  }

  // Save Staff List
  const staffText = settingsStaff.value.trim();
  const staffList = staffText
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  localStorage.setItem(STAFF_KEY, JSON.stringify(staffList));

  closeSettingsModal();
  showToast('✓ Pengaturan tersimpan');

  // Update config state
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
  if (navigator.vibrate) navigator.vibrate(100);
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
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
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
  if (isScanning) return;

  try {
    html5Qrcode = new Html5Qrcode('reader');
    const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };

    scannerPlaceholder.style.display = 'none';
    startScanBtn.style.display = 'none';
    stopScanBtn.style.display = 'inline-flex';
    isScanning = true;

    await html5Qrcode.start(
      { facingMode: 'environment' }, config, onScanSuccess,
      () => { } // ignore no-QR frames
    );
  } catch (err) {
    console.error('Scanner error:', err);
    showToast('Gagal mengakses kamera. Pastikan izin kamera diberikan.');
    resetScanner();
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
  startScanBtn.style.display = 'inline-flex';
  stopScanBtn.style.display = 'none';
}

function onScanSuccess(decodedText: string) {
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
  } catch (err: any) {
    showVerifyError('Terjadi kesalahan: ' + err.message);
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
  regPhone.textContent = data.phone;

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
  ktpImage.onload = () => { ktpLoading.style.display = 'none'; ktpImage.style.opacity = '1'; };
  ktpImage.onerror = () => { ktpLoading.style.display = 'none'; ktpImage.style.opacity = '1'; };
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
      showToast('✓ Berhasil diverifikasi!');
      flashSuccess();

      if (autoScanCheck.checked) {
        setTimeout(() => hideVerify(), 1500);
      }
    } else {
      showToast('Gagal memverifikasi: ' + (result.error || 'Unknown error'));
      resetVerifyBtn();
    }
  } catch (err: any) {
    showToast('Error: ' + err.message);
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
clearHistoryBtn.addEventListener('click', clearHistory);

// Theme
themeToggle.addEventListener('click', toggleTheme);

// Lock Screen
lockUnlockBtn.addEventListener('click', handleUnlock);
pinInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleUnlock(); });

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

if (!isConfigured()) {
  console.log('%c⚠️ QR Scan: Mode Demo — buka Settings untuk set URL Google Sheet', 'color: #feca57; font-weight: bold');
}
