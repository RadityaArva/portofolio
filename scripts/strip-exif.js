import exifr from 'exifr';
import { readdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const photoDir = './public/img';
let files = readdirSync(photoDir).filter(f => /\.(jpe?g|JPG|jpeg)$/i.test(f));
console.log(`Scanning ${files.length} JPG/JPEG in ${photoDir}...`);
let gpsFiles = [];
for (const file of files) {
  try {
    const data = await exifr.parse(join(photoDir, file), { gps: true });
    if (data && data.latitude != null) gpsFiles.push(file);
  } catch {}
}
if (!gpsFiles.length) { console.log('No GPS found. Nothing to strip.'); process.exit(0); }
console.log(`Found ${gpsFiles.length} files with GPS:`);
gpsFiles.forEach(f => console.log(' - ' + f));
console.log('');
// Cek exiftool
try { execSync('exiftool -ver', { stdio: 'pipe' }); } catch {
  console.error('exiftool belum terpasang. Jalankan: brew install exiftool');
  console.error('Lalu ulangi: node scripts/strip-exif.js  (lossless, tanpa re-encode, orientation+ICC tetap)');
  process.exit(2);
}
console.log('Menjalankan exiftool lossless (hapus GPS saja, tanpa re-encode)...');
for (const file of gpsFiles) {
  const p = join(photoDir, file);
  // -gps:all= hanya hapus GPS, -overwrite_original tanpa buat *_original
  execSync(`exiftool -gps:all= -xmp:geotag= -overwrite_original "${p}"`, { stdio: 'inherit' });
}
console.log('Selesai. Verifikasi ulang...');
for (const file of gpsFiles) {
  const data = await exifr.parse(join(photoDir, file), { gps: true });
  if (data && data.latitude != null) console.error(`MASIH ADA GPS: ${file}`);
  else console.log(`bersih: ${file}`);
}
