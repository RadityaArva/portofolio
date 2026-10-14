import exifr from 'exifr';
import sharp from 'sharp';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

const outputRoot = resolve('dist');
if (!existsSync(outputRoot)) {
  throw new Error('dist is missing. Run the production build before checking image metadata.');
}

const collectFiles = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  const filePath = resolve(directory, entry.name);
  if (!filePath.startsWith(`${outputRoot}${sep}`)) {
    throw new Error(`Build output is outside dist: ${entry.name}`);
  }
  return entry.isDirectory() ? collectFiles(filePath) : entry.isFile() ? [filePath] : [];
});
const allFiles = collectFiles(outputRoot);
const imageFiles = allFiles.filter(filePath =>
  /\.(?:jpe?g|png|webp|avif|tiff?|hei[cf])$/i.test(filePath)
);
const filesWithGps = [];
const heicFiles = [];

for (const imagePath of imageFiles) {
  const fileName = relative(outputRoot, imagePath);
  if (/\.hei[cf]$/i.test(imagePath)) {
    heicFiles.push(fileName);
    continue;
  }

  let metadata;
  try {
    if (/\.(?:jpe?g|png|tiff?)$/i.test(imagePath)) {
      metadata = await exifr.parse(imagePath, {
        gps: true,
        pick: ['GPSLatitude', 'GPSLongitude', 'GPSAltitude'],
      });
    } else {
      const image = await sharp(imagePath).metadata();
      if (image.exif) {
        metadata = await exifr.parse(image.exif, {
          gps: true,
          pick: ['GPSLatitude', 'GPSLongitude', 'GPSAltitude'],
        });
      }
    }
  } catch (error) {
    throw new Error(`Unable to inspect deployed image metadata for ${fileName}.`, { cause: error });
  }
  if ([metadata?.GPSLatitude, metadata?.GPSLongitude, metadata?.GPSAltitude]
    .some(value => value !== undefined && value !== null)) {
    filesWithGps.push(fileName);
  }
}

if (heicFiles.length) {
  throw new Error(`HEIC images remain in deployment output: ${heicFiles.join(', ')}`);
}
if (filesWithGps.length) {
  throw new Error(`GPS metadata remains in deployed images: ${filesWithGps.join(', ')}`);
}

const dataFiles = ['src/photography-data.js', 'src/photo-overrides.json'];
const coordinatePattern = /-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?/;
for (const file of dataFiles) {
  const contents = readFileSync(file, 'utf8');
  if (coordinatePattern.test(contents)) {
    throw new Error(`Location coordinates are stored in ${file}.`);
  }
}

console.log(`No GPS metadata in ${imageFiles.length} deployed images or photography data; no HEIC images in dist.`);
