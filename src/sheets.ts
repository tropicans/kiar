// ============================================
// Google Sheets Service Layer
// ============================================
// URL is now stored in localStorage (configured via Settings UI)
// Falls back to demo data when URL is not set.
// ============================================

const STORAGE_KEY = 'qrscan_apps_script_url';

export interface RegistrantData {
    id: string;
    nama: string;
    phone: string;
    ktpUrl: string;
    verified: boolean;
    verifiedAt?: string;
    verifiedBy?: string;
    rawData?: Record<string, string>;
}

export interface LookupResult {
    success: boolean;
    data?: RegistrantData;
    error?: string;
}

// ============================================
// Configuration
// ============================================

export function getAppsScriptUrl(): string {
    return localStorage.getItem(STORAGE_KEY) || '';
}

export function setAppsScriptUrl(url: string): void {
    localStorage.setItem(STORAGE_KEY, url.trim());
}

export function isConfigured(): boolean {
    return getAppsScriptUrl().length > 0;
}

/**
 * Test connection to the Apps Script Web App
 */
export async function testConnection(): Promise<{ success: boolean; error?: string }> {
    const url = getAppsScriptUrl();
    if (!url) {
        return { success: false, error: 'URL belum diatur' };
    }

    try {
        const response = await fetch(`${url}?action=ping`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
        });

        if (!response.ok) {
            return { success: false, error: `HTTP ${response.status}` };
        }

        // If we get a response, connection works
        return { success: true };
    } catch (err: any) {
        return { success: false, error: `Koneksi gagal: ${err.message}` };
    }
}

// ============================================
// Lookup
// ============================================

export async function lookupById(id: string): Promise<LookupResult> {
    if (!isConfigured()) {
        return getDemoData(id);
    }

    try {
        const url = getAppsScriptUrl();
        const response = await fetch(`${url}?action=lookup&id=${encodeURIComponent(id)}`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();

        if (result.error) {
            return { success: false, error: result.error };
        }

        return {
            success: true,
            data: {
                id: result.id,
                nama: result.nama,
                phone: result.phone,
                ktpUrl: result.ktpUrl || '',
                verified: result.verified === true || result.verified === 'TRUE',
                verifiedAt: result.verifiedAt || '',
                verifiedBy: result.verifiedBy || '',
                rawData: result,
            }
        };
    } catch (err: any) {
        return {
            success: false,
            error: `Gagal mengambil data: ${err.message}`,
        };
    }
}

// ============================================
// Verify
// ============================================

export async function verifyRegistrant(
    id: string,
    staffName?: string
): Promise<{ success: boolean; error?: string }> {
    if (!isConfigured()) {
        return { success: true };
    }

    try {
        const url = getAppsScriptUrl();
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'verify',
                id: id,
                verifiedAt: new Date().toISOString(),
                verifiedBy: staffName || 'Unknown',
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();

        if (result.error) {
            return { success: false, error: result.error };
        }

        return { success: true };
    } catch (err: any) {
        return { success: false, error: `Gagal memverifikasi: ${err.message}` };
    }
}

// ============================================
// Demo Data
// ============================================

function getDemoData(id: string): LookupResult {
    const demoRecords: Record<string, RegistrantData> = {
        'REG-001': {
            id: 'REG-001',
            nama: 'Ahmad Rizky Pratama',
            phone: '081234567890',
            ktpUrl: 'https://placehold.co/600x400/1a1a2e/a29bfe?text=KTP+Preview+%0AAhmad+Rizky',
            verified: false,
        },
        'REG-002': {
            id: 'REG-002',
            nama: 'Siti Nurhaliza',
            phone: '087654321098',
            ktpUrl: 'https://placehold.co/600x400/1a1a2e/00d2a0?text=KTP+Preview+%0ASiti+Nurhaliza',
            verified: true,
            verifiedAt: '2026-02-14T10:30:00',
            verifiedBy: 'Pak Budi',
        },
        'REG-003': {
            id: 'REG-003',
            nama: 'Budi Santoso',
            phone: '089912345678',
            ktpUrl: 'https://placehold.co/600x400/1a1a2e/feca57?text=KTP+Preview+%0ABudi+Santoso',
            verified: false,
        },
    };

    const data = demoRecords[id.toUpperCase()];

    if (data) {
        return { success: true, data };
    }

    return {
        success: true,
        data: {
            id: id,
            nama: `Demo User (${id})`,
            phone: '08xx-xxxx-xxxx',
            ktpUrl: `https://placehold.co/600x400/1a1a2e/6c5ce7?text=KTP+Preview+%0A${encodeURIComponent(id)}`,
            verified: false,
        }
    };
}
