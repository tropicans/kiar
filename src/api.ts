// ============================================
// API Service Layer (PostgreSQL Backend)
// ============================================

export interface PassengerData {
    id: number;
    nama: string;
    isRegistrant?: boolean;
    nik?: string;
    ktpUrl?: string;
    verified: boolean;
    verifiedAt?: string;
    verifiedBy?: string;
}

export interface RegistrantData {
    id: string;
    phone: string;
    ktpUrl: string;
    passengers: PassengerData[];
}

export interface LookupResult {
    success: boolean;
    data?: RegistrantData;
    error?: string;
}

/**
 * Lookup registrant by ID from the backend API
 */
export async function lookupById(id: string): Promise<LookupResult> {
    try {
        const response = await fetch(`/api/lookup/${encodeURIComponent(id)}`);

        if (response.status === 404) {
            return { success: false, error: 'Data tidak ditemukan' };
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        return { success: true, data };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Verify a registrant
 */
export async function verifyRegistrant(
    id: string,
    passengerIds: number[],
    verifiedBy?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const response = await fetch('/api/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id,
                passengerIds,
                verifiedBy: verifiedBy || 'Unknown'
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            return { success: false, error: result.error || `HTTP ${response.status}` };
        }

        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

// Legacy compatibility (to minimize changes in main.ts)
export function isConfigured(): boolean {
    return true; // Always configured with local backend
}
