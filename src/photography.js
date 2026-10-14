import { photos } from './photography-data.js';
import photoOverrides from './photo-overrides.json' with { type: 'json' };

const $ = (id) => document.getElementById(id);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const optimizedPhotoVariants = import.meta.env.PROD && typeof __PHOTO_VARIANTS__ !== 'undefined'
  ? __PHOTO_VARIANTS__
  : null;
const photoPlaceholders = typeof __PHOTO_PLACEHOLDERS__ !== 'undefined'
  ? __PHOTO_PLACEHOLDERS__
  : {};
const photoMetadata = typeof __PHOTO_METADATA__ !== 'undefined' ? __PHOTO_METADATA__ : {};
const storyAsset = typeof __STORY_ASSET__ !== 'undefined' ? __STORY_ASSET__ : null;

let activeFilter = 'all';
let filteredPhotos = [];
let lightboxIndex = 0;
let lightboxPhotos = [];
let archiveObserver;
const featuredPhoto = photos.find(photo => photo.src === '/img/IMG_9409 2.JPG');

document.documentElement.classList.add('js');

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initPreloader();
  initNav();
  initStoryPhoto();
  initHero();
  initScrollProgress();
  initReveal();
  initArchiveParallax();
  initFilters();
  renderGallery('all');
  initLightbox();
  initBackToTop();
  initCustomCursor();
  initMagnetic();
  initTilt();
  initYear();
  initPhotoSummary();

  const grid = $('photoGrid');
  if (grid && 'ResizeObserver' in window) {
    const ro = new ResizeObserver(debounce(() => updateLayout(), 120));
    ro.observe(grid);
  } else {
    window.addEventListener('resize', debounce(() => updateLayout(), 120), { passive: true });
  }
});

function initPreloader() {
  const el = $('preloader');
  if (!el) return;
  let done = false;
  el.classList.remove('hidden');
  const hide = () => {
    if (done) return;
    done = true;
    el.classList.add('hidden');
    document.querySelector('.photo-hero')?.classList.add('is-loaded');
  };
  setTimeout(hide, 800);
  window.addEventListener('load', hide, { once: true });
}

function initTheme() {
  const root = document.documentElement;
  const apply = (t) => {
    root.setAttribute('data-theme', t);
    try { localStorage.setItem('theme', t); } catch {}
    const icon = t === 'dark' ? 'fa-sun' : 'fa-moon';
    $$('#themeTogglePhoto i, #themeToggleMobile i').forEach(i => { i.className = `fas ${icon}`; });
  };
  let saved = null;
  try { saved = localStorage.getItem('theme'); } catch {}
  if (!saved) saved = 'dark';
  apply(saved);
  const toggle = () => apply(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  $('themeTogglePhoto')?.addEventListener('click', toggle);
  $('themeToggleMobile')?.addEventListener('click', toggle);
}

function initNav() {
  const btn = $('photoMenuToggle');
  const menu = $('photoMobileMenu');
  const nav = $('photoNav');
  if (!btn || !menu) return;

  const setOpen = (open) => {
    btn.setAttribute('aria-expanded', String(open));
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    document.body.style.overflow = open ? 'hidden' : '';
  };
  const isOpen = () => menu.classList.contains('is-open');
  window.addEventListener('resize', () => {
    if (window.matchMedia('(min-width: 769px)').matches && isOpen()) setOpen(false);
  }, { passive: true });

  btn.addEventListener('click', () => setOpen(!isOpen()));

  menu.querySelector('[data-close-menu]')?.addEventListener('click', () => setOpen(false));
  $$('.photo-mobile-menu-nav a, .photo-mobile-menu-footer a').forEach(a => a.addEventListener('click', () => setOpen(false)));

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen()) setOpen(false); });
  document.addEventListener('click', (e) => {
    if (!isOpen()) return;
    if (!menu.contains(e.target) && !btn.contains(e.target)) setOpen(false);
  });
  let lastY = scrollY;
  window.addEventListener('scroll', () => {
    if (isOpen() && Math.abs(scrollY - lastY) > 12) setOpen(false);
    lastY = scrollY;
  }, { passive: true });

  const onScroll = () => nav.classList.toggle('is-scrolled', scrollY > 16);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

function initHero() {
  const hero = document.querySelector('.photo-hero');
  const img = document.querySelector('.photo-hero-bg img');
  if (!hero || !img) return;
  img.classList.add('is-animating');
  $$('.photo-hero-title i, .photo-hero-desc, .photo-hero-meta').forEach(el => el.classList.add('is-animating'));
  setTimeout(() => {
    img.classList.remove('is-animating');
    $$('.photo-hero-title i, .photo-hero-desc, .photo-hero-meta').forEach(el => el.classList.remove('is-animating'));
  }, 1900);
  requestAnimationFrame(() => hero.classList.add('is-loaded'));
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = Math.min(scrollY * 0.12, 80);
      img.style.setProperty('--hero-scroll-y', `${y}px`);
      img.style.setProperty('--hero-scroll-scale', String(1 - Math.min(scrollY * 0.00008, 0.06)));
      ticking = false;
    });
  }, { passive: true });
}

function initScrollProgress() {
  const bar = $('scrollProgress');
  if (!bar) return;
  const update = () => {
    const h = document.documentElement.scrollHeight - innerHeight;
    const p = h > 0 ? scrollY / h : 0;
    bar.style.transform = `scaleX(${p})`;
  };
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
}

function initReveal() {
  const headingTargets = $$('.photo-featured .section-head, .photo-archive .section-head, .photo-story .story-title');
  headingTargets.forEach(el => el.classList.add('reveal'));
  const targets = $$('.reveal');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    targets.forEach(el => el.classList.add('is-visible'));
    return;
  }
  if (!('IntersectionObserver' in window)) {
    targets.forEach(el => el.classList.add('is-visible'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('is-animating');
        e.target.classList.add('is-visible');
        setTimeout(() => e.target.classList.remove('is-animating'), 700);
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  targets.forEach(el => io.observe(el));
}

function initYear() {
  const y = $('photoYear');
  if (y) y.textContent = String(new Date().getFullYear());
}

function initPhotoSummary() {
  const count = $('photoCount');
  if (count) count.textContent = String(photos.length);

  const years = photos.flatMap(photo => {
    const year = String(getPhotoMetadata(photo).dateTimeOriginal || '').match(/^\d{4}/)?.[0];
    return year ? [Number(year)] : [];
  });
  const dateRange = $('photoDateRange');
  if (dateRange) {
    dateRange.hidden = years.length === 0;
    if (years.length) dateRange.textContent = `${Math.min(...years)} — ${Math.max(...years)}`;
  }

  $$('[data-filter-count]').forEach(element => {
    const filter = element.dataset.filterCount;
    const total = filter === 'all' ? photos.length : photos.filter(photo => photo.category === filter).length;
    element.textContent = String(total);
  });

  if (!featuredPhoto) throw new Error('Featured photo is missing from the photography data.');
  const featuredCard = document.querySelector('.featured-card');
  if (!featuredCard) return;

  const image = featuredCard.querySelector('img');
  if (image) {
    const sources = getPhotoImageSources(featuredPhoto);
    image.srcset = sources.srcset;
    image.sizes = 'min(100vw, 1400px)';
    image.src = sources.src;
    image.alt = featuredPhoto.alt || featuredPhoto.title;
  }
  const category = $('featuredCategory');
  const title = $('featuredTitle');
  const number = $('featuredNo');
  const date = $('featuredDate');
  const camera = $('featuredCamera');
  if (category) category.textContent = `${featuredPhoto.category[0].toUpperCase()}${featuredPhoto.category.slice(1)} · Featured`;
  if (title) title.textContent = featuredPhoto.title;
  if (number) number.textContent = `01 / ${photos.length}`;
  const featuredMetadata = getPhotoMetadata(featuredPhoto);
  if (date) {
    date.textContent = formatPhotoCalendarDate(featuredMetadata.dateTimeOriginal);
    if (date.parentElement) date.parentElement.hidden = !date.textContent;
  }
  if (camera) {
    camera.textContent = getPhotoCamera(featuredMetadata);
    if (camera.parentElement) camera.parentElement.hidden = !camera.textContent;
  }
}

function getPhotoImageSources(photo) {
  const variants = optimizedPhotoVariants?.[photo.src];
  if (variants?.length) {
    const sources = variants.map(variant => ({
      src: `${import.meta.env.BASE_URL}${variant.file}`,
      width: variant.width,
    }));
    const fallback = sources.find(source => source.width >= 960) || sources[sources.length - 1];
    return {
      src: fallback.src,
      srcset: sources.map(source => `${source.src} ${source.width}w`).join(', '),
      placeholder: photoPlaceholders[photo.src] || '',
    };
  }

  const src = encodeURI(photo.src || '');
  const width = photo.width || 800;
  return { src, srcset: `${src} ${width}w`, placeholder: photoPlaceholders[photo.src] || '' };
}

function watchPhotoImage(image, sources, onLoaded, onFailed) {
  let retried = false;
  image.classList.remove('is-loaded', 'is-error');
  image.onload = () => {
    image.classList.add('is-loaded');
    onLoaded();
  };
  image.onerror = () => {
    if (!retried) {
      retried = true;
      const failedSource = image.currentSrc || sources.src;
      const retrySource = new URL(failedSource, document.baseURI);
      retrySource.searchParams.set('retry', '1');
      image.removeAttribute('srcset');
      image.src = retrySource.href;
      return;
    }
    image.classList.add('is-error');
    onFailed();
  };
  if (image.hasAttribute('src') && image.complete) {
    if (image.naturalWidth > 0) image.onload();
    else if (image.currentSrc || image.src) image.onerror();
  }
}

function preloadAdjacentPhotos(index, photoList) {
  if (photoList.length < 2) return;
  const adjacent = new Set([
    (index - 1 + photoList.length) % photoList.length,
    (index + 1) % photoList.length,
  ]);
  adjacent.forEach(photoIndex => {
    const sources = getPhotoImageSources(photoList[photoIndex]);
    const preload = new Image();
    preload.decoding = 'async';
    preload.sizes = '(max-width: 768px) 100vw, (max-width: 1280px) 92vw, 1280px';
    preload.srcset = sources.srcset;
    preload.src = sources.src;
  });
}

function renderGallery(filter = 'all') {
  activeFilter = filter;
  const grid = $('photoGrid');
  const empty = $('filterEmpty');
  if (!grid) return;

  filteredPhotos = filter === 'all' ? [...photos] : photos.filter(p => p.category === filter);
  if (empty) empty.classList.toggle('hidden', filteredPhotos.length !== 0);

  const doRender = () => {
    grid.innerHTML = filteredPhotos.map((photo, index) => {
      const r = (photo.width && photo.height) ? photo.width / photo.height : 1.33;
      const sources = getPhotoImageSources(photo);
      const category = photo.category || '';
      const categoryLabel = category ? category.charAt(0).toUpperCase() + category.slice(1) : '';
      const photoExif = getPhotoMetadata(photo);
      const metadata = [
        formatPhotoCalendarDate(photoExif.dateTimeOriginal),
        getPhotoCamera(photoExif),
      ].filter(Boolean).join(' · ');
      const placeholderStyle = sources.placeholder
        ? ` style="--photo-placeholder:url('${sources.placeholder}')"`
        : '';
      return `<div class="photo-card" data-index="${index}" style="--ar:${r.toFixed(4)}" tabindex="0" role="button" aria-label="${escapeHtml(photo.title)}">
        <div class="photo-card-inner"${placeholderStyle}>
          <img class="is-loading" src="${escapeHtml(sources.src)}" srcset="${escapeHtml(sources.srcset)}" sizes="100vw" alt="${escapeHtml(photo.alt || photo.title)}" width="${photo.width || 800}" height="${photo.height || 600}" loading="lazy" decoding="async" />
          <p class="photo-load-error" role="status" hidden>Foto gagal dimuat</p>
        </div>
        ${categoryLabel ? `<span class="photo-card-category" data-category="${escapeHtml(category.toLowerCase())}" aria-label="${escapeHtml(categoryLabel)}">${escapeHtml(categoryLabel)}</span>` : ''}
        ${metadata ? `<span class="photo-card-metadata" aria-hidden="true">${escapeHtml(metadata)}</span>` : ''}
        <span class="photo-card-title">${escapeHtml(photo.title || '')}</span>
      </div>`;
    }).join('');

    $$('.photo-card', grid).forEach(card => {
      card.addEventListener('click', () => openLightbox(Number(card.dataset.index)));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(Number(card.dataset.index)); }
      });
    });
    $$('.photo-card', grid).forEach(card => {
      const image = card.querySelector('img');
      const error = card.querySelector('.photo-load-error');
      if (!image) return;
      const photo = filteredPhotos[Number(card.dataset.index)];
      const sources = getPhotoImageSources(photo);
      watchPhotoImage(image, sources, () => {
        error?.setAttribute('hidden', '');
      }, () => {
        if (error) error.hidden = false;
      });
    });

    requestAnimationFrame(() => {
      updateLayout();
      updateFilterIndicator();
    });
  };

  if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.startViewTransition(() => doRender());
  } else {
    doRender();
  }
}

function escapeHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function getPhotoMetadata(photo) {
  const source = photoMetadata[photo.src] || {};
  const manual = photoOverrides[photo.src] || {};
  const fields = [
    'dateTimeOriginal', 'offsetTimeOriginal', 'make', 'model', 'lensModel',
    'focalLength', 'fNumber', 'exposureTime', 'iso',
  ];
  return Object.fromEntries(fields.flatMap(field => {
    const value = manual[field] ?? source[field];
    return value === undefined || value === null || value === '' ? [] : [[field, value]];
  }));
}

function formatPhotoDateTime(dateTimeOriginal, offsetTimeOriginal) {
  const match = String(dateTimeOriginal || '').match(
    /^(\d{4})[:/-](\d{2})[:/-](\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/
  );
  if (!match) return dateTimeOriginal ? String(dateTimeOriginal) : '';
  const [, year, month, day, hour, minute, second] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)));
  const formatted = new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  }).format(date);
  return `${formatted}${offsetTimeOriginal ? ` · UTC${offsetTimeOriginal}` : ''}`;
}

function getPhotoDeviceDetails(metadata) {
  return [
    getPhotoCamera(metadata),
    metadata.lensModel,
    metadata.focalLength !== undefined ? `${metadata.focalLength}mm` : '',
    metadata.fNumber !== undefined ? `f/${metadata.fNumber}` : '',
    metadata.exposureTime !== undefined ? `${metadata.exposureTime}s` : '',
    metadata.iso !== undefined ? `ISO ${metadata.iso}` : '',
  ].filter(Boolean).join(' · ');
}

function getPhotoCamera(metadata) {
  const make = String(metadata.make || '').trim();
  const model = String(metadata.model || '').trim();
  return make && model && model.toLowerCase().startsWith(make.toLowerCase())
    ? model
    : [make, model].filter(Boolean).join(' ');
}

function formatPhotoCalendarDate(dateTimeOriginal) {
  const match = String(dateTimeOriginal || '').match(/^(\d{4})[:/-](\d{2})[:/-](\d{2})/);
  if (!match) return '';
  const [, year, month, day] = match;
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))));
}

function initStoryPhoto() {
  const image = $('storyImage');
  const frame = image?.closest('.story-media-frame');
  if (!image || !frame) return;

  let retried = false;
  const errorMessage = frame.querySelector('.story-image-error');
  image.sizes = '(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 640px';
  if (storyAsset) {
    image.width = storyAsset.width;
    image.height = storyAsset.height;
    frame.style.setProperty('--photo-placeholder', `url("${storyAsset.placeholder}")`);
  }

  const loaded = () => {
    image.classList.add('is-loaded');
    image.classList.remove('is-error');
    frame.classList.remove('is-error');
    errorMessage?.setAttribute('hidden', '');
    frame.style.removeProperty('--photo-placeholder');
  };
  const failed = () => {
    if (!retried && storyAsset?.src) {
      retried = true;
      image.removeAttribute('srcset');
      image.src = `${import.meta.env.BASE_URL}${encodeURI(storyAsset.src.replace(/^\//, ''))}?retry=1`;
      if (image.complete) {
        if (image.naturalWidth > 0) loaded();
        else {
          frame.classList.add('is-error');
          errorMessage?.removeAttribute('hidden');
        }
      }
      return;
    }
    image.classList.remove('is-loading');
    image.classList.add('is-error');
    frame.classList.add('is-error');
    errorMessage?.removeAttribute('hidden');
  };
  image.addEventListener('load', loaded);
  image.addEventListener('error', failed);

  const variants = storyAsset?.variants || [];
  if (variants.length) {
    image.srcset = variants.map(variant => `${import.meta.env.BASE_URL}${variant.file} ${variant.width}w`).join(', ');
    const fallback = variants.find(variant => variant.width >= 960) || variants[variants.length - 1];
    image.src = `${import.meta.env.BASE_URL}${fallback.file}`;
  } else if (storyAsset) {
    image.src = encodeURI(storyAsset.src);
  }

  if (image.complete) {
    if (image.naturalWidth > 0) loaded();
    else if (image.currentSrc) failed();
  }
}

function revealRows() {
  archiveObserver?.disconnect();
  const rows = $$('#photoGrid .photo-row');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    rows.forEach(row => row.classList.add('is-visible'));
    return;
  }
  if (!('IntersectionObserver' in window)) {
    rows.forEach(row => row.classList.add('is-visible'));
    return;
  }
  rows.forEach(row => row.classList.remove('is-visible'));
  archiveObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const el = e.target;
        el.classList.add('is-animating');
        requestAnimationFrame(() => el.classList.add('is-visible'));
        setTimeout(() => el.classList.remove('is-animating'), 600);
        archiveObserver?.unobserve(el);
      }
    });
  }, { threshold: 0.08 });
  rows.forEach((row, i) => {
    row.style.transitionDelay = `${Math.min((i % 6) * 45, 225)}ms`;
    archiveObserver.observe(row);
  });
  setTimeout(() => {
    rows.forEach(row => row.classList.add('is-visible'));
  }, 1400);
}

function updateLayout() {
  const grid = $('photoGrid');
  if (!grid || !grid.offsetWidth) return;
  const cards = $$('.photo-card', grid);
  if (cards.length === 0) return;

  const containerWidth = grid.clientWidth;
  const gap = 8;
  const vw = innerWidth;
  const targetH = vw < 640 ? 172 : vw <= 1024 ? 240 : 300;
  const rows = linearPartition(filteredPhotos, containerWidth, targetH, gap);
  const fragment = document.createDocumentFragment();

  rows.forEach(({ start, end, height }) => {
    const row = document.createElement('div');
    row.className = 'photo-row';
    row.style.height = `${height.toFixed(2)}px`;

    const rowPhotos = filteredPhotos.slice(start, end);
    const availableWidth = containerWidth - (rowPhotos.length - 1) * gap;
    const exactWidths = rowPhotos.map(photo => {
      const ratio = photo.width && photo.height ? photo.width / photo.height : 1.33;
      return ratio * height;
    });
    const widths = exactWidths.map(Math.floor);
    const remainder = availableWidth - widths.reduce((sum, width) => sum + width, 0);
    const remainderOrder = exactWidths
      .map((width, index) => ({ index, fraction: width - Math.floor(width) }))
      .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

    for (let i = 0; i < remainder; i++) {
      widths[remainderOrder[i % remainderOrder.length].index] += 1;
    }

    for (let i = start; i < end; i++) {
      const card = cards[i];
      if (!card) continue;
      card.style.width = `${widths[i - start]}px`;
      card.style.height = '100%';
      const image = card.querySelector('img');
      if (image) image.sizes = `${widths[i - start]}px`;
      row.append(card);
    }
    fragment.append(row);
  });

  grid.replaceChildren(fragment);
  updateArchiveParallax();
  requestAnimationFrame(revealRows);
}

let archiveParallaxFrame = 0;
let archiveScrollDirection = 0;
let previousArchiveScrollY = window.scrollY;

function initArchiveParallax() {
  const scheduleUpdate = (trackDirection = false) => {
    if (trackDirection) {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - previousArchiveScrollY;
      if (delta !== 0) archiveScrollDirection = Math.sign(delta);
      previousArchiveScrollY = currentScrollY;
    }
    if (archiveParallaxFrame) return;
    archiveParallaxFrame = requestAnimationFrame(() => {
      archiveParallaxFrame = 0;
      updateArchiveParallax();
    });
  };

  window.addEventListener('scroll', () => scheduleUpdate(true), { passive: true });
  window.addEventListener('resize', scheduleUpdate, { passive: true });
  window.addEventListener('pageshow', () => {
    previousArchiveScrollY = window.scrollY;
    scheduleUpdate();
  });
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  motionPreference.addEventListener('change', () => {
    previousArchiveScrollY = window.scrollY;
    archiveScrollDirection = 0;
    scheduleUpdate();
  });
  updateArchiveParallax();
}

function updateArchiveParallax() {
  const grid = $('photoGrid');
  const rows = $$('#archive .photo-row');
  if (!grid || !rows.length) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    rows.forEach(row => row.style.removeProperty('--archive-parallax-y'));
    return;
  }

  const viewportCenter = innerHeight / 2;
  const travel = Math.max(innerHeight, 1);
  const gridTop = grid.getBoundingClientRect().top;
  rows.forEach(row => {
    const rowCenter = gridTop + row.offsetTop + row.offsetHeight / 2;
    const positionOffset = ((rowCenter - viewportCenter) / travel) * -24;
    const directionOffset = archiveScrollDirection * 3;
    const offset = Math.max(-14, Math.min(14, positionOffset + directionOffset));
    row.style.setProperty('--archive-parallax-y', `${offset.toFixed(2)}px`);
  });
}

function linearPartition(photosList, containerWidth, targetHeight, gap) {
  const count = photosList.length;
  if (count === 0 || containerWidth <= 0) return [];

  const ratios = photosList.map(photo => (
    photo.width && photo.height ? photo.width / photo.height : 1.33
  ));
  const minHeight = targetHeight * 0.7;
  const maxHeight = targetHeight * 1.4;

  const solve = (allowOutOfRange) => {
    const costs = Array(count + 1).fill(Infinity);
    const starts = Array(count + 1).fill(-1);
    const heights = Array(count + 1).fill(0);
    costs[0] = 0;

    for (let end = 1; end <= count; end++) {
      let ratioSum = 0;
      for (let start = end - 1; start >= 0; start--) {
        ratioSum += ratios[start];
        const availableWidth = containerWidth - (end - start - 1) * gap;
        if (availableWidth <= 0) break;

        const height = availableWidth / ratioSum;
        const outsideBounds = height < minHeight || height > maxHeight;
        if (!allowOutOfRange && height < minHeight) break;
        if (!allowOutOfRange && outsideBounds) continue;

        const deviation = height - targetHeight;
        const penalty = allowOutOfRange && outsideBounds
          ? 1_000_000 + Math.abs(deviation) ** 2
          : 0;
        const cost = costs[start] + deviation ** 2 + penalty;
        if (cost < costs[end]) {
          costs[end] = cost;
          starts[end] = start;
          heights[end] = height;
        }
      }
    }

    if (starts[count] === -1) return null;
    const rows = [];
    for (let end = count; end > 0;) {
      const start = starts[end];
      rows.unshift({ start, end, height: heights[end] });
      end = start;
    }
    return rows;
  };

  return solve(false) || solve(true) || [];
}

function initFilters() {
  const bar = document.querySelector('.filter-bar');
  const wrap = document.querySelector('.filter-wrap');
  const pills = $$('.filter-pill');
  if (!bar || !wrap || pills.length === 0) return;

  pills.forEach(p => p.addEventListener('click', () => {
    const f = p.dataset.filter || 'all';
    pills.forEach(x => { x.classList.remove('active'); x.setAttribute('aria-selected','false'); });
    p.classList.add('active'); p.setAttribute('aria-selected','true');
    p.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    renderGallery(f);
  }));

  const updateFilterState = debounce(() => {
    updateFilterIndicator(false);
    updateFilterEdges(bar, wrap);
  }, 80);
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(updateFilterState);
    ro.observe(bar);
    ro.observe(wrap);
    pills.forEach(pill => ro.observe(pill));
  } else {
    window.addEventListener('resize', updateFilterState, { passive: true });
  }
  bar.addEventListener('scroll', () => updateFilterEdges(bar, wrap), { passive: true });
  requestAnimationFrame(() => {
    updateFilterIndicator(false);
    updateFilterEdges(bar, wrap);
  });
}

function updateFilterEdges(bar, wrap) {
  const maxScroll = Math.max(0, bar.scrollWidth - bar.clientWidth);
  wrap.classList.toggle('can-scroll-left', bar.scrollLeft > 2);
  wrap.classList.toggle('can-scroll-right', maxScroll - bar.scrollLeft > 2);
}

function updateFilterIndicator(animate = true) {
  const bar = document.querySelector('.filter-bar');
  const ind = document.querySelector('.filter-indicator');
  const active = document.querySelector('.filter-pill.active');
  if (!bar || !ind || !active) return;
  const br = bar.getBoundingClientRect();
  const ar = active.getBoundingClientRect();
  const left = ar.left - br.left + bar.scrollLeft;
  const width = Math.round(ar.width);
  const previousWidth = ind.getBoundingClientRect().width || width;
  ind.style.transition = 'none';
  ind.style.width = `${width}px`;
  ind.style.transform = `translateX(${Math.round(left)}px) scaleX(${animate ? previousWidth / width : 1})`;
  ind.classList.add('is-visible');
  if (animate) ind.classList.add('is-animating');
  requestAnimationFrame(() => {
    ind.style.transition = '';
    if (animate) {
      ind.style.transform = `translateX(${Math.round(left)}px) scaleX(1)`;
      setTimeout(() => ind.classList.remove('is-animating'), 500);
    }
  });
}

function initLightbox() {
  const lb = $('lightbox');
  if (!lb) return;
  const img = $('lightboxImg');
  const title = $('lightboxTitle');
  const desc = $('lightboxDesc');
  const details = $('lightboxDetails');
  const counter = $('lightboxCounter');
  const imageError = lb.querySelector('.lightbox-error');
  const closeBtn = lb.querySelector('.lightbox-close');
  const prevBtn = lb.querySelector('.lightbox-nav.prev');
  const nextBtn = lb.querySelector('.lightbox-nav.next');
  const backdrop = lb.querySelector('[data-close-lightbox]');
  const shell = lb.querySelector('.lightbox-shell');
  const featuredCard = document.querySelector('.featured-card');
  let sourceCard = null;
  let closeTimer = 0;
  let previousBodyOverflow = '';

  const render = (animateDir = 0) => {
    const p = lightboxPhotos[lightboxIndex];
    if (!p || !img) return;
    const sources = getPhotoImageSources(p);
    const placeholderStyle = sources.placeholder
      ? `url("${sources.placeholder}")`
      : '';
    const frame = img.closest('.lightbox-image-frame');
    if (frame) frame.style.setProperty('--photo-placeholder', placeholderStyle);
    img.onload = null;
    img.onerror = null;
    img.removeAttribute('src');
    img.removeAttribute('srcset');
    img.classList.remove('is-loaded', 'is-error');
    img.classList.add('is-loading');
    img.alt = p.alt || p.title || '';
    if (imageError) imageError.hidden = true;
    img.sizes = '(max-width: 768px) 100vw, (max-width: 1280px) 92vw, 1280px';
    if (animateDir !== 0 && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      img.classList.add('is-entering');
      requestAnimationFrame(() => requestAnimationFrame(() => {
        watchPhotoImage(img, sources, () => {
          img.classList.remove('is-loading', 'is-entering');
          frame?.style.removeProperty('--photo-placeholder');
        }, () => {
          img.classList.remove('is-loading', 'is-entering');
          frame?.style.removeProperty('--photo-placeholder');
          if (imageError) imageError.hidden = false;
        });
        img.srcset = sources.srcset;
        img.src = sources.src;
        setTimeout(() => img.classList.remove('is-entering'), 360);
      }));
    } else {
      watchPhotoImage(img, sources, () => {
        img.classList.remove('is-loading');
        frame?.style.removeProperty('--photo-placeholder');
      }, () => {
        img.classList.remove('is-loading');
        frame?.style.removeProperty('--photo-placeholder');
        if (imageError) imageError.hidden = false;
      });
      img.srcset = sources.srcset;
      img.src = sources.src;
    }
    if (title) title.textContent = p.title;
    if (desc) {
      desc.textContent = p.caption || '';
      desc.hidden = !p.caption;
    }
    if (details) {
      const parts = [];
      const metadata = getPhotoMetadata(p);
      const date = formatPhotoDateTime(metadata.dateTimeOriginal, metadata.offsetTimeOriginal);
      const device = getPhotoDeviceDetails(metadata);
      if (date) parts.push(`<span class="lightbox-detail-date"><span class="lightbox-detail-label">Date</span>: ${escapeHtml(date)}</span>`);
      if (device) parts.push(`<span class="lightbox-detail-device"><span class="lightbox-detail-label">Device</span>: ${escapeHtml(device)}</span>`);
      details.innerHTML = parts.join('');
      details.hidden = parts.length === 0;
    }
    if (counter) counter.textContent = `${lightboxIndex + 1} / ${lightboxPhotos.length}`;
    preloadAdjacentPhotos(lightboxIndex, lightboxPhotos);
  };

  const open = (i, photoList = filteredPhotos, originCard = null) => {
    if (!photoList.length) return;
    clearTimeout(closeTimer);
    lightboxPhotos = photoList;
    shell?.classList.remove('is-animating');
    if (shell) {
      shell.style.transform = '';
      shell.style.opacity = '';
      shell.style.transition = '';
    }
    lightboxIndex = Math.max(0, Math.min(i, lightboxPhotos.length - 1));
    sourceCard = originCard || document.querySelector(`#photoGrid .photo-card[data-index="${lightboxIndex}"]`);
    previousBodyOverflow = document.body.style.overflow;
    render(0);
    lb.classList.remove('is-closing');
    lb.classList.remove('hidden');
    lb.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
    if (shell && sourceCard && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const source = sourceCard.getBoundingClientRect();
      const target = shell.getBoundingClientRect();
      const scale = Math.min(source.width / target.width, source.height / target.height);
      const x = source.left + source.width / 2 - (target.left + target.width / 2);
      const y = source.top + source.height / 2 - (target.top + target.height / 2);
      shell.style.transition = 'none';
      shell.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
      shell.style.opacity = '0.7';
      shell.classList.add('is-animating');
      requestAnimationFrame(() => requestAnimationFrame(() => {
        shell.style.transition = '';
        shell.style.transform = '';
        shell.style.opacity = '';
        setTimeout(() => shell.classList.remove('is-animating'), 450);
      }));
    }
    window.setTimeout(() => {
      if (!lb.classList.contains('hidden') && !lb.classList.contains('is-closing')) {
        closeBtn?.focus({ preventScroll: true });
      }
    }, 50);
  };

  const close = () => {
    lb.setAttribute('aria-hidden','true');
    document.body.style.overflow = previousBodyOverflow;
    if (shell && sourceCard?.isConnected && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const source = sourceCard.getBoundingClientRect();
      const target = shell.getBoundingClientRect();
      const scale = Math.min(source.width / target.width, source.height / target.height);
      const x = source.left + source.width / 2 - (target.left + target.width / 2);
      const y = source.top + source.height / 2 - (target.top + target.height / 2);
      lb.classList.add('is-closing');
      shell.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
      shell.style.opacity = '0.7';
      shell.classList.add('is-animating');
      closeTimer = window.setTimeout(() => {
        lb.classList.add('hidden');
        lb.classList.remove('is-closing');
        shell.style.transform = '';
        shell.style.opacity = '';
        shell.classList.remove('is-animating');
        sourceCard?.focus({ preventScroll: true });
        sourceCard = null;
      }, 420);
    } else {
      lb.classList.add('hidden');
      sourceCard?.focus({ preventScroll: true });
      sourceCard = null;
    }
  };

  const next = () => { lightboxIndex = (lightboxIndex + 1) % lightboxPhotos.length; render(1); };
  const prev = () => { lightboxIndex = (lightboxIndex - 1 + lightboxPhotos.length) % lightboxPhotos.length; render(-1); };

  window.openLightbox = open;

  closeBtn?.addEventListener('click', close);
  backdrop?.addEventListener('click', close);
  nextBtn?.addEventListener('click', next);
  prevBtn?.addEventListener('click', prev);

  document.addEventListener('keydown', (e) => {
    if (lb.classList.contains('hidden') || lb.classList.contains('is-closing')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'Tab') {
      const focusable = [...lb.querySelectorAll('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')]
        .filter(element => element.getClientRects().length && !element.closest('[hidden]'));
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && (document.activeElement === first || !lb.contains(document.activeElement))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !lb.contains(document.activeElement))) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  let sx = 0, sy = 0, dx = 0, dy = 0, dragging = false;
  const onStart = (x, y, target) => {
    if (target instanceof Element && target.closest('button')) return;
    sx = x; sy = y; dx = 0; dy = 0; dragging = true;
    if (img) img.style.transition = 'none';
  };
  const onMove = (x, y) => {
    if (!dragging) return;
    dx = x - sx; dy = y - sy;
    if (Math.abs(dy) > Math.abs(dx) && dy > 0 && shell) {
      shell.style.transform = `translateY(${dy * 0.55}px) scale(${Math.max(0.92, 1 - dy * 0.0009)})`;
      shell.style.opacity = String(Math.max(0.35, 1 - dy * 0.003));
    } else if (shell && Math.abs(dx) > 12) {
      if (img) img.style.transform = `translateX(${dx * 0.35}px)`;
    }
  };
  const onEnd = () => {
    if (!dragging) return;
    dragging = false;
    if (shell) { shell.style.transform = ''; shell.style.opacity = ''; }
    if (img) { img.style.transition = ''; img.style.transform = ''; img.style.opacity = ''; }
    if (dy > 90 && Math.abs(dy) > Math.abs(dx)) close();
    else if (dx < -60) next();
    else if (dx > 60) prev();
  };

  lb.addEventListener('touchstart', (e) => {
    const t = e.touches[0]; if (!t) return; onStart(t.clientX, t.clientY, e.target);
  }, { passive: true });
  lb.addEventListener('touchmove', (e) => {
    const t = e.touches[0]; if (!t) return; onMove(t.clientX, t.clientY);
  }, { passive: true });
  lb.addEventListener('touchend', onEnd, { passive: true });

  let md = false;
  lb.addEventListener('mousedown', (e) => {
    onStart(e.clientX, e.clientY, e.target);
    md = dragging;
  });
  window.addEventListener('mousemove', (e) => { if (md) onMove(e.clientX, e.clientY); });
  window.addEventListener('mouseup', () => { if (md) { md = false; onEnd(); } });

  const openFeatured = () => {
    if (!featuredPhoto || !featuredCard) return;
    open(photos.indexOf(featuredPhoto), photos, featuredCard);
  };
  featuredCard?.addEventListener('click', openFeatured);
  featuredCard?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFeatured(); }
  });
}

function openLightbox(i) {
  if (typeof window.openLightbox === 'function') window.openLightbox(i);
}

function initBackToTop() {
  const btn = $('backToTop');
  if (!btn) return;
  const upd = () => btn.classList.toggle('is-visible', scrollY > 480);
  window.addEventListener('scroll', upd, { passive: true });
  upd();
}

function initCustomCursor() {
  const cur = $('customCursor');
  if (!cur) return;
  if (matchMedia('(hover: hover) and (pointer: fine)').matches === false) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let x = -100, y = -100, tx = -100, ty = -100, raf = 0, visible = false;
  const lerp = (a,b,t) => a + (b-a)*t;
  const loop = () => {
    x = lerp(x, tx, 0.16); y = lerp(y, ty, 0.16);
    cur.style.setProperty('--cursor-x', `${x}px`);
    cur.style.setProperty('--cursor-y', `${y}px`);
    if (Math.abs(x - tx) > 0.25 || Math.abs(y - ty) > 0.25) {
      raf = requestAnimationFrame(loop);
    } else {
      raf = 0;
    }
  };
  window.addEventListener('mousemove', (e) => {
    tx = e.clientX; ty = e.clientY;
    if (!raf) raf = requestAnimationFrame(loop);
    if (!visible) { visible = true; cur.classList.add('is-visible'); document.body.classList.add('has-custom-cursor'); }
  }, { passive: true });
  window.addEventListener('mouseleave', () => { visible = false; cur.classList.remove('is-visible'); }, { passive: true });
  document.addEventListener('mouseover', (e) => {
    const t = e.target;
    if (t.closest && t.closest('a, button, .photo-card, .featured-card')) cur.classList.add('is-hover');
    else cur.classList.remove('is-hover');
  });
  window.addEventListener('blur', () => cur.classList.remove('is-visible'));
}

function initMagnetic() {
  const btn = $('navCta');
  if (!btn) return;
  if (matchMedia('(hover: hover) and (pointer: fine)').matches === false) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let raf = 0;
  btn.addEventListener('mousemove', (e) => {
    const r = btn.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const dx = (e.clientX - cx) * 0.18, dy = (e.clientY - cy) * 0.28;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => { btn.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(1.02)`; btn.style.willChange = 'transform'; });
  });
  btn.addEventListener('mouseleave', () => {
    cancelAnimationFrame(raf);
    btn.style.transform = ''; btn.style.willChange = 'auto';
  });
}

function initTilt() {
  if (matchMedia('(hover: hover) and (pointer: fine)').matches === false) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.addEventListener('mousemove', (e) => {
    const card = e.target.closest?.('.photo-card');
    $$('.photo-card.is-tilting').forEach(c => {
      if (c !== card) {
        c.style.transform = '';
        c.style.willChange = 'auto';
        c.classList.remove('is-tilting');
      }
    });
    if (!card) return;
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    const rx = (-py * 4).toFixed(2), ry = (px * 6).toFixed(2);
    card.classList.add('is-tilting');
    card.style.transform = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-2px) scale(1.03)`;
    card.style.willChange = 'transform';
  }, { passive: true });
  document.addEventListener('mouseleave', () => {
    $$('.photo-card.is-tilting').forEach(c => { c.style.transform = ''; c.classList.remove('is-tilting'); c.style.willChange = 'auto'; });
  }, true);
}

function debounce(fn, ms) {
  let t = 0;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
