// Photography data - Generated from EXIF metadata
// 34 unique photos (1 duplicate removed)

import metadata from './photo-metadata.json';
import { photos as reviewedPhotos } from './photography-data.js';

const reviewedPhotosBySource = new Map(reviewedPhotos.map(photo => [photo.src, photo]));

function categorizePhoto(photo) {
  const ratio = photo.width / photo.height;
  const fileName = photo.fileName.toLowerCase();
  
  // Portrait: tall photos
  if (ratio < 0.9) return 'portrait';
  
  // Landscape: wide photos
  if (ratio > 1.3) return 'landscape';
  
  // Based on filename patterns
  if (fileName.includes('img_3') || fileName.includes('img_5') || fileName.includes('img_7')) return 'portrait';
  if (fileName.includes('img_6') || fileName.includes('img_9') || fileName.includes('ofm')) return 'landscape';
  
  // Default to street for square-ish unknown photos
  return 'street';
}

function generateTitle(photo, index) {
  const date = new Date(photo.date);
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const year = date.getFullYear();
  
  if (photo.gps?.lat && photo.gps?.lon) {
    // Has GPS - use location-based title
    return `Moment in Gresik ${month} ${year}`;
  }
  
  const ratio = photo.width / photo.height;
  if (ratio < 0.9) return `Portrait Study ${index + 1}`;
  if (ratio > 1.3) return `Landscape View ${index + 1}`;
  
  return `Urban Frame ${index + 1}`;
}

function generateCaption(photo) {
  const date = new Date(photo.date);
  const dateStr = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  
  if (photo.gps?.lat) {
    return `Captured in Gresik, East Java on ${dateStr}`;
  }
  
  if (photo.camera) {
    return `Shot with ${photo.camera} on ${dateStr}`;
  }
  
  return `Captured on ${dateStr}`;
}

export const photos = metadata.photoData.map((photo, index) => {
  const category = categorizePhoto(photo);
  const title = generateTitle(photo, index);
  const caption = generateCaption(photo);
  
  // Build EXIF string only if data exists
  let exifParts = [];
  if (photo.camera) exifParts.push(photo.camera);
  if (photo.focalLength) exifParts.push(photo.focalLength);
  if (photo.aperture) exifParts.push(photo.aperture);
  if (photo.shutter) exifParts.push(photo.shutter);
  if (photo.iso) exifParts.push(photo.iso);
  
  const exifString = exifParts.length > 0 ? exifParts.join(' · ') : null;
  const src = `/img/${photo.fileName.replace('./', '')}`;
  const reviewed = reviewedPhotosBySource.get(src);
  
  return {
    id: photo.fileName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase(),
    src,
    title: reviewed?.title ?? title,
    caption: reviewed?.caption ?? caption,
    category: reviewed?.category ?? category,
    ...(reviewed ? { alt: reviewed.alt } : {}),
    location: photo.gps?.lat ? 'Gresik, East Java' : null,
    date: photo.date,
    exif: exifString,
    width: photo.width,
    height: photo.height,
    featured: index === 0 // First photo is featured
  };
});

export const featuredPhoto = photos.find(p => p.featured) || photos[0];

export const gridPhotos = photos.filter(p => !p.featured);

export const stats = {
  total: photos.length,
  categories: [...new Set(photos.map(p => p.category))].sort(),
  dateRange: {
    start: new Date(Math.min(...photos.map(p => new Date(p.date)))).getFullYear(),
    end: new Date(Math.max(...photos.map(p => new Date(p.date)))).getFullYear()
  },
  locations: [...new Set(photos.map(p => p.location).filter(Boolean))],
  withGPS: photos.filter(p => p.location).length,
  withEXIF: photos.filter(p => p.exif).length
};

export function getPhotosByCategory(category) {
  if (category === 'all') return gridPhotos;
  return gridPhotos.filter(p => p.category === category);
}
