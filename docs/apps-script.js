// ============================================
// Google Apps Script — Web App for QR Scan
// ============================================
// INSTRUCTIONS:
// 1. Buka Google Sheet Anda
// 2. Klik Extensions → Apps Script
// 3. Hapus kode default, paste kode di bawah ini
// 4. Sesuaikan SHEET_NAME dan nama kolom sesuai Sheet Anda
// 5. Deploy → New Deployment → Web App
//    - Execute as: Me
//    - Who has access: Anyone
// 6. Copy URL Web App → paste ke src/sheets.ts (APPS_SCRIPT_URL)
// ============================================

const SHEET_NAME = 'Sheet1'; // Ganti sesuai nama sheet

// Kolom di Google Sheet (sesuaikan dengan urutan kolom Anda)
const COL = {
    ID: 'ID',             // Kolom ID unik (yang ada di QR code)
    NAMA: 'Nama',         // Kolom nama lengkap
    PHONE: 'Phone',       // Kolom nomor telepon
    KTP_URL: 'KTP URL',   // Kolom URL gambar/PDF KTP
    VERIFIED: 'Verified', // Kolom status verifikasi (TRUE/FALSE)
    VERIFIED_AT: 'Verified At', // Kolom timestamp verifikasi
    VERIFIED_BY: 'Verified By', // Kolom nama staf yang memverifikasi
};

function doGet(e) {
    const action = e.parameter.action;

    if (action === 'lookup') {
        return handleLookup(e.parameter.id);
    }

    return jsonResponse({ error: 'Invalid action' });
}

function doPost(e) {
    const body = JSON.parse(e.postData.contents);

    if (body.action === 'verify') {
        return handleVerify(body.id, body.verifiedAt, body.verifiedBy);
    }

    return jsonResponse({ error: 'Invalid action' });
}

function handleLookup(id) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    const idCol = headers.indexOf(COL.ID);
    const namaCol = headers.indexOf(COL.NAMA);
    const phoneCol = headers.indexOf(COL.PHONE);
    const ktpCol = headers.indexOf(COL.KTP_URL);
    const verifiedCol = headers.indexOf(COL.VERIFIED);
    const verifiedAtCol = headers.indexOf(COL.VERIFIED_AT);
    const verifiedByCol = headers.indexOf(COL.VERIFIED_BY);

    for (let i = 1; i < data.length; i++) {
        if (String(data[i][idCol]).trim() === String(id).trim()) {
            return jsonResponse({
                id: data[i][idCol],
                nama: data[i][namaCol],
                phone: data[i][phoneCol],
                ktpUrl: data[i][ktpCol],
                verified: data[i][verifiedCol],
                verifiedAt: data[i][verifiedAtCol],
                verifiedBy: verifiedByCol >= 0 ? data[i][verifiedByCol] : '',
            });
        }
    }

    return jsonResponse({ error: 'ID tidak ditemukan' });
}

function handleVerify(id, verifiedAt, verifiedBy) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    const idCol = headers.indexOf(COL.ID);
    const verifiedCol = headers.indexOf(COL.VERIFIED);
    const verifiedAtCol = headers.indexOf(COL.VERIFIED_AT);
    const verifiedByCol = headers.indexOf(COL.VERIFIED_BY);

    for (let i = 1; i < data.length; i++) {
        if (String(data[i][idCol]).trim() === String(id).trim()) {
            const row = i + 1; // 1-indexed in Sheets
            sheet.getRange(row, verifiedCol + 1).setValue(true);
            sheet.getRange(row, verifiedAtCol + 1).setValue(verifiedAt || new Date().toISOString());
            if (verifiedByCol >= 0) {
                sheet.getRange(row, verifiedByCol + 1).setValue(verifiedBy || 'Unknown');
            }
            return jsonResponse({ success: true });
        }
    }

    return jsonResponse({ error: 'ID tidak ditemukan' });
}

function jsonResponse(data) {
    return ContentService
        .createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
}
