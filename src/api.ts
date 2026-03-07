// ============================================
// API Service Layer (PostgreSQL Backend)
// ============================================

export interface PassengerData {
    id: number;
    registrationId?: string;
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
    matchedPassengerIds?: number[];
}

export interface LookupResult {
    success: boolean;
    data?: RegistrantData;
    error?: string;
}

export interface AmbiguousLookupResult {
    success: false;
    error: string;
    matches: string[];
}

export interface NikSearchResult {
    success: boolean;
    passengers?: PassengerData[];
    error?: string;
}

export interface NameSearchResult {
    success: boolean;
    passengers?: PassengerData[];
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
 * Lookup registrant by last 6 digits of NIK
 */
export async function lookupByNikSuffix(last6: string): Promise<LookupResult | AmbiguousLookupResult> {
    try {
        const response = await fetch(`/api/lookup-nik/${encodeURIComponent(last6)}`);

        if (response.status === 404) {
            return { success: false, error: 'Data tidak ditemukan' };
        }

        if (response.status === 409) {
            const data = await response.json();
            return {
                success: false,
                error: data.error || 'Ditemukan lebih dari satu data',
                matches: Array.isArray(data.matches) ? data.matches : [],
            };
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
 * Search passengers by last 6 digits of NIK
 */
export async function searchPassengersByNikSuffix(last6: string): Promise<NikSearchResult> {
    try {
        const response = await fetch(`/api/search-nik/${encodeURIComponent(last6)}`);

        if (response.status === 404) {
            return { success: false, error: 'Data tidak ditemukan' };
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        return {
            success: true,
            passengers: Array.isArray(data.passengers) ? data.passengers : [],
        };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Search passengers by name
 */
export async function searchPassengersByName(query: string): Promise<NameSearchResult> {
    try {
        const response = await fetch(`/api/search-name?q=${encodeURIComponent(query)}`);

        if (response.status === 404) {
            return { success: false, error: 'Data tidak ditemukan' };
        }

        if (response.status === 400) {
            const data = await response.json();
            return { success: false, error: data.error || 'Input nama tidak valid' };
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        return {
            success: true,
            passengers: Array.isArray(data.passengers) ? data.passengers : [],
        };
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

/**
 * Verify selected passengers directly
 */
export async function verifyPassengers(
    passengerIds: number[],
    verifiedBy?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const response = await fetch('/api/verify-passengers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
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
