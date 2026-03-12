#!/usr/bin/env node
/**
 * Compress all images in /uploads/ directory.
 * Resizes to max 1200px wide and compresses JPEG to quality 75.
 * Creates backup of originals in /uploads/_originals/ before processing.
 *
 * Usage: node scripts/compress-uploads.js [--no-backup] [--quality 75] [--max-width 1200]
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.resolve(__dirname, '../uploads');
const BACKUP_DIR = path.join(UPLOADS_DIR, '_originals');

// Parse CLI args
const args = process.argv.slice(2);
const noBackup = args.includes('--no-backup');
const qualityIdx = args.indexOf('--quality');
const quality = qualityIdx >= 0 ? parseInt(args[qualityIdx + 1], 10) : 75;
const maxWidthIdx = args.indexOf('--max-width');
const maxWidth = maxWidthIdx >= 0 ? parseInt(args[maxWidthIdx + 1], 10) : 1200;

async function run() {
    if (!fs.existsSync(UPLOADS_DIR)) {
        console.error('❌ Uploads directory not found:', UPLOADS_DIR);
        process.exit(1);
    }

    const files = fs.readdirSync(UPLOADS_DIR).filter(f => {
        const ext = f.toLowerCase();
        return (ext.endsWith('.jpg') || ext.endsWith('.jpeg') || ext.endsWith('.png')) &&
               !f.startsWith('.');
    });

    if (files.length === 0) {
        console.log('No images found in', UPLOADS_DIR);
        return;
    }

    console.log(`\n🖼️  Found ${files.length} images in ${UPLOADS_DIR}`);
    console.log(`   Quality: ${quality}, Max width: ${maxWidth}px, Backup: ${!noBackup}\n`);

    // Create backup directory
    if (!noBackup && !fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    let totalOriginal = 0;
    let totalCompressed = 0;
    let processed = 0;
    let skipped = 0;

    for (const file of files) {
        const filePath = path.join(UPLOADS_DIR, file);
        const stat = fs.statSync(filePath);
        const originalSize = stat.size;

        // Skip files already under 150KB
        if (originalSize < 150 * 1024) {
            skipped++;
            continue;
        }

        try {
            // Read file into buffer first (avoids Windows file locking)
            const inputBuffer = fs.readFileSync(filePath);

            // Backup original
            if (!noBackup) {
                const backupPath = path.join(BACKUP_DIR, file);
                if (!fs.existsSync(backupPath)) {
                    fs.writeFileSync(backupPath, inputBuffer);
                }
            }

            const ext = file.toLowerCase();
            const isJpeg = ext.endsWith('.jpg') || ext.endsWith('.jpeg');

            let pipeline = sharp(inputBuffer)
                .resize({ width: maxWidth, withoutEnlargement: true });

            if (isJpeg) {
                pipeline = pipeline.jpeg({ quality, mozjpeg: true });
            } else {
                pipeline = pipeline.png({ quality, effort: 10 });
            }

            const buffer = await pipeline.toBuffer();

            // Only write if actually smaller
            if (buffer.length < originalSize) {
                fs.writeFileSync(filePath, buffer);
                totalOriginal += originalSize;
                totalCompressed += buffer.length;
                processed++;
                const pct = ((1 - buffer.length / originalSize) * 100).toFixed(0);
                console.log(`  ✅ ${file}: ${formatSize(originalSize)} → ${formatSize(buffer.length)} (-${pct}%)`);
            } else {
                skipped++;
            }
        } catch (err) {
            console.error(`  ❌ ${file}: ${err.message}`);
        }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Processed: ${processed} files`);
    console.log(`   Skipped: ${skipped} files (already small or no gain)`);
    if (processed > 0) {
        const savedBytes = totalOriginal - totalCompressed;
        const savedPct = ((savedBytes / totalOriginal) * 100).toFixed(1);
        console.log(`   Total saved: ${formatSize(savedBytes)} (${savedPct}%)`);
        console.log(`   ${formatSize(totalOriginal)} → ${formatSize(totalCompressed)}`);
    }
    if (!noBackup) {
        console.log(`   Originals backed up in: ${BACKUP_DIR}`);
    }
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

run().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
