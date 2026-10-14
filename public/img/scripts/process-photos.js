import exifr from 'exifr';
import { createHash } from 'crypto';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const photoDir = '.';
const extensions = ['.jpg', '.JPG', '.jpeg'];

async function processPhotos() {
  const files = readdirSync(photoDir)
    .filter(f => extensions.some(ext => f.endsWith(ext)))
    .map(f => join(photoDir, f));

  console.log(`Found ${files.length} photos\n`);

  const photoData = [];
  const hashes = new Map();
  const duplicates = [];

  for (const filePath of files) {
    try {
      const buffer = readFileSync(filePath);
      const hash = createHash('md5').update(buffer).digest('hex');
      const stats = statSync(filePath);
      const fileName = filePath.replace('./', '');

      if (hashes.has(hash)) {
        const original = hashes.get(hash);
        const originalSize = statSync(original.filePath).size;
        const currentSize = stats.size;
        
        if (currentSize > originalSize) {
          duplicates.push({ kept: fileName, removed: original.fileName, reason: 'Higher resolution' });
          const idx = photoData.findIndex(p => p.fileName === original.fileName);
          if (idx >= 0) photoData.splice(idx, 1);
          hashes.set(hash, { filePath, fileName });
        } else {
          duplicates.push({ kept: original.fileName, removed: fileName, reason: 'Lower resolution' });
          continue;
        }
      } else {
        hashes.set(hash, { filePath, fileName });
      }

      const exif = await exifr.parse(filePath, {
        tiff: true,
        exif: true,
        gps: true,
        interop: false,
        ifd0: true,
        ifd1: false
      });

      const width = exif?.ImageWidth || exif?.ExifImageWidth || 4032;
      const height = exif?.ImageHeight || exif?.ExifImageHeight || 3024;
      const date = exif?.DateTimeOriginal || exif?.CreateDate || exif?.DateTime || stats.mtime;
      
      let camera = exif?.Make && exif?.Model ? `${exif.Make} ${exif.Model}` : null;
      if (camera) camera = camera.replace(/Apple/i, 'iPhone').replace(/\s+/g, ' ').trim();
      
      const lens = exif?.LensModel || exif?.LensMake || null;
      const focalLength = exif?.FocalLength ? `${Math.round(exif.FocalLength)}mm` : null;
      const aperture = exif?.FNumber ? `f/${exif.FNumber}` : null;
      const shutter = exif?.ExposureTime ? (exif.ExposureTime >= 1 ? `${exif.ExposureTime}s` : `1/${Math.round(1/exif.ExposureTime)}`) : null;
      const iso = exif?.ISO ? `ISO ${exif.ISO}` : null;
      
      const lat = exif?.latitude;
      const lon = exif?.longitude;
      let location = null;
      if (lat && lon) {
        location = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
      }

      photoData.push({
        fileName,
        width,
        height,
        date: date instanceof Date ? date.toISOString() : new Date(date).toISOString(),
        camera,
        lens,
        focalLength,
        aperture,
        shutter,
        iso,
        location,
        gps: { lat, lon },
        fileSize: (stats.size / 1024 / 1024).toFixed(2) + ' MB'
      });

    } catch (err) {
      console.error(`Error processing ${filePath}:`, err.message);
    }
  }

  photoData.sort((a, b) => new Date(b.date) - new Date(a.date));

  console.log('=== DUPLICATES FOUND ===');
  if (duplicates.length === 0) {
    console.log('No duplicates found\n');
  } else {
    duplicates.forEach(d => {
      console.log(`✓ KEPT: ${d.kept}`);
      console.log(`✗ REMOVED: ${d.removed} (${d.reason})\n`);
    });
  }

  console.log('=== PHOTO METADATA ===');
  console.log(`Total unique photos: ${photoData.length}\n`);

  photoData.forEach((p, i) => {
    console.log(`${i + 1}. ${p.fileName}`);
    console.log(`   Size: ${p.width}x${p.height} (${p.fileSize})`);
    console.log(`   Date: ${new Date(p.date).toLocaleString()}`);
    console.log(`   Camera: ${p.camera || 'No EXIF'}`);
    if (p.lens) console.log(`   Lens: ${p.lens}`);
    if (p.focalLength || p.aperture || p.shutter || p.iso) {
      const exifStr = [p.focalLength, p.aperture, p.shutter, p.iso].filter(Boolean).join(' · ');
      console.log(`   Settings: ${exifStr}`);
    }
    if (p.location) console.log(`   GPS: ${p.location}`);
    console.log('');
  });

  console.log('\n=== PHOTOS WITHOUT GPS ===');
  const noGPS = photoData.filter(p => !p.location);
  console.log(`${noGPS.length} photos without GPS data`);
  noGPS.forEach(p => console.log(`  - ${p.fileName}`));

  console.log('\n=== PHOTOS WITHOUT CAMERA EXIF ===');
  const noCamera = photoData.filter(p => !p.camera);
  console.log(`${noCamera.length} photos without camera EXIF`);
  noCamera.forEach(p => console.log(`  - ${p.fileName}`));

  return { photoData, duplicates };
}

processPhotos().catch(console.error);
