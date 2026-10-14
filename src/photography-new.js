import { photos, featuredPhoto, gridPhotos, stats, getPhotosByCategory } from './photography-data-real.js';

const $ = (id) => document.getElementById(id);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const root = document.documentElement;
const themeBtn = $("themeTogglePhoto");
const themeBtnMobile = $("themeToggleMobile");
const themeIcon = themeBtn?.querySelector("i");
const themeIconMobile = themeBtnMobile?.querySelector("i");

function applyTheme(dark) {
  if (dark) {
    root.setAttribute("data-theme", "dark");
    if (themeIcon) themeIcon.className = "fas fa-sun";
    if (themeIconMobile) themeIconMobile.className = "fas fa-sun";
  } else {
    root.setAttribute("data-theme", "light");
    if (themeIcon) themeIcon.className = "fas fa-moon";
    if (themeIconMobile) themeIconMobile.className = "fas fa-moon";
  }
}

const saved = localStorage.getItem("theme");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
applyTheme(saved === "dark" || (!saved && prefersDark));

function toggleTheme() {
  const isDark = root.getAttribute("data-theme") === "dark";
  const next = !isDark;
  applyTheme(next);
  localStorage.setItem("theme", next ? "dark" : "light");
}

themeBtn?.addEventListener("click", toggleTheme);
themeBtnMobile?.addEventListener("click", toggleTheme);

const burger = $("photoMenuToggle");
const mobileMenu = $("photoMobileMenu");
const menuBackdrop = mobileMenu?.querySelector(".photo-mobile-menu-backdrop");
const menuLinks = $$(".photo-mobile-menu-nav a");
let menuScrollY = 0;
let menuTouchY = 0;

function openMenu() {
  if (!mobileMenu || !burger) return;
  mobileMenu.setAttribute("aria-hidden", "false");
  burger.setAttribute("aria-expanded", "true");
  
  const firstLink = mobileMenu.querySelector("a");
  setTimeout(() => firstLink?.focus(), 100);
  
  menuScrollY = window.scrollY;
  menuTouchY = 0;
  window.addEventListener("scroll", scrollCloseHandler, { passive: true });
  window.addEventListener("touchmove", touchCloseHandler, { passive: true });
}

function closeMenu() {
  if (!mobileMenu || !burger) return;
  mobileMenu.setAttribute("aria-hidden", "true");
  burger.setAttribute("aria-expanded", "false");
  burger.focus();
  window.removeEventListener("scroll", scrollCloseHandler);
  window.removeEventListener("touchmove", touchCloseHandler);
}

function scrollCloseHandler() {
  if (Math.abs(window.scrollY - menuScrollY) > 10) {
    closeMenu();
  }
}

function touchCloseHandler(e) {
  const touch = e.touches[0];
  if (Math.abs(touch.clientY - menuTouchY) > 10) {
    closeMenu();
  }
}

burger?.addEventListener("click", () => {
  const isOpen = burger.getAttribute("aria-expanded") === "true";
  isOpen ? closeMenu() : openMenu();
});

mobileMenu?.addEventListener("touchstart", (e) => {
  menuTouchY = e.touches[0].clientY;
}, { passive: true });

menuBackdrop?.addEventListener("click", closeMenu);
menuLinks.forEach((a) => a.addEventListener("click", closeMenu));

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && mobileMenu?.getAttribute("aria-hidden") === "false") {
    closeMenu();
  }
});

mobileMenu?.addEventListener("keydown", (e) => {
  if (e.key === "Tab" && mobileMenu.getAttribute("aria-hidden") === "false") {
    const focusable = $$("a, button", mobileMenu).filter(el => el.offsetParent !== null);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  }
});

const pills = $$(".filter-pill");
const emptyMsg = $("filterEmpty");
let activeFilter = "all";

function applyFilter(cat) {
  activeFilter = cat;
  pills.forEach((p) => {
    const on = p.dataset.filter === cat;
    p.classList.toggle("active", on);
    p.setAttribute("aria-selected", String(on));
  });
  
  const cards = $$("#photoGrid .photo-card");
  let visible = 0;
  cards.forEach((card) => {
    const cardCat = card.dataset.category;
    const show = cat === "all" || cardCat === cat;
    if (show) visible++;
    card.style.display = show ? "" : "none";
  });
  
  if (emptyMsg) emptyMsg.classList.toggle("hidden", visible !== 0);
}

pills.forEach((btn) => btn.addEventListener("click", () => applyFilter(btn.dataset.filter)));

function renderPhotos() {
  const grid = $('photoGrid');
  if (!grid) return;
  
  grid.innerHTML = gridPhotos.map(photo => {
    const categoryLabel = photo.category.charAt(0).toUpperCase() + photo.category.slice(1);
    const ratio = photo.width / photo.height;
    
    return `
      <figure class="photo-card" 
        data-category="${photo.category}" 
        data-id="${photo.id}" 
        data-photo='${JSON.stringify(photo).replace(/'/g, "&apos;")}'
        style="aspect-ratio: ${photo.width}/${photo.height}; flex-grow: ${ratio.toFixed(4)}; flex-basis: ${Math.round(ratio * 200)}px;"
        tabindex="0" 
        role="button" 
        aria-label="Open ${photo.title}">
        <img src="${photo.src}" 
          alt="${photo.alt || photo.title}" 
          width="${photo.width}" 
          height="${photo.height}" 
          loading="lazy" 
          decoding="async"
          style="object-fit: contain; width: 100%; height: 100%;" />
        <span class="photo-chip">${categoryLabel}</span>
        <figcaption class="photo-overlay">
          <h3>${photo.title}</h3>
        </figcaption>
      </figure>
    `;
  }).join('');
  
  $$('.photo-card').forEach(card => {
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { 
        e.preventDefault(); 
        card.click(); 
      }
    });
  });
}

renderPhotos();

const featuredCard = document.querySelector('.featured-card');
if (featuredCard) {
  featuredCard.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { 
      e.preventDefault(); 
      featuredCard.click(); 
    }
  });
}

const revealTargets = $$(".photo-featured, .photo-archive, .photo-card");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (!reduceMotion) {
  revealTargets.forEach((el) => el.classList.add("reveal"));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -32px 0px" });
  revealTargets.forEach((el) => io.observe(el));
} else {
  revealTargets.forEach((el) => el.classList.add("in"));
}

const lightbox = $("lightbox");
const lbImg = $("lightboxImg");
const lbTitle = $("lightboxTitle");
const lbDesc = $("lightboxDesc");
const lbDetails = $("lightboxDetails");
const lbCounter = $("lightboxCounter");

function collectItems() {
  const items = [];
  
  if (featuredCard) {
    items.push({
      el: featuredCard,
      photo: featuredPhoto,
      src: featuredPhoto.src,
      title: featuredPhoto.title,
      caption: featuredPhoto.caption,
      alt: featuredPhoto.alt,
      category: featuredPhoto.category,
      location: featuredPhoto.location,
      date: featuredPhoto.date,
      exif: featuredPhoto.exif
    });
  }
  
  $$("#photoGrid .photo-card").forEach((card) => {
    try {
      const photoData = JSON.parse(card.dataset.photo);
      items.push({
        el: card,
        photo: photoData,
        src: photoData.src,
        title: photoData.title,
        caption: photoData.caption,
        alt: photoData.alt,
        category: photoData.category,
        location: photoData.location,
        date: photoData.date,
        exif: photoData.exif
      });
    } catch (e) {
      console.error('Failed to parse photo data', e);
    }
  });
  
  return items;
}

let items = collectItems();
let currentIdx = 0;

function preloadNext(idx) {
  const next = items[(idx + 1) % items.length];
  const prev = items[(idx - 1 + items.length) % items.length];
  [next, prev].forEach((it) => {
    if (!it?.src) return;
    const im = new Image();
    im.decoding = "async";
    im.src = it.src;
  });
}

function openLightbox(idx) {
  items = collectItems();
  currentIdx = ((idx % items.length) + items.length) % items.length;
  const it = items[currentIdx];
  if (!it) return;
  
  lbImg.src = it.src;
  lbImg.alt = it.alt || it.title;
  lbImg.style.objectFit = 'contain';
  lbTitle.textContent = it.title;
  lbDesc.textContent = it.caption;
  
  const detailsParts = [];
  if (it.category) detailsParts.push(it.category.charAt(0).toUpperCase() + it.category.slice(1));
  if (it.location) detailsParts.push(it.location);
  if (it.date) {
    const dateObj = new Date(it.date);
    detailsParts.push(dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
  }
  if (it.exif) detailsParts.push(it.exif);
  
  lbDetails.textContent = detailsParts.join(' · ');
  lbCounter.textContent = String(currentIdx + 1).padStart(2, "0") + " / " + String(items.length).padStart(2, "0");
  
  lightbox.classList.remove("hidden");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  lightbox.querySelector(".lightbox-close")?.focus();
  preloadNext(currentIdx);
}

function closeLightbox() {
  lightbox.classList.add("hidden");
  lightbox.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function step(dir) { openLightbox(currentIdx + dir); }

document.addEventListener("click", (e) => {
  const card = e.target.closest(".photo-card, .featured-card");
  if (card && !e.target.closest(".lightbox") && !e.target.closest(".photo-nav")) {
    const idx = items.findIndex((it) => it.el === card);
    openLightbox(idx >= 0 ? idx : 0);
  }
});

$("lightbox")?.querySelector(".lightbox-backdrop")?.addEventListener("click", closeLightbox);
$$(".lightbox-close").forEach((b) => b.addEventListener("click", closeLightbox));
$$(".lightbox-nav.prev").forEach((b) => b.addEventListener("click", () => step(-1)));
$$(".lightbox-nav.next").forEach((b) => b.addEventListener("click", () => step(1)));

let touchX = 0;
lightbox.addEventListener("touchstart", (e) => { touchX = e.changedTouches[0].clientX; }, { passive: true });
lightbox.addEventListener("touchend", (e) => {
  const dx = e.changedTouches[0].clientX - touchX;
  if (Math.abs(dx) > 48) step(dx < 0 ? 1 : -1);
}, { passive: true });

document.addEventListener("keydown", (e) => {
  if (lightbox.classList.contains("hidden")) return;
  if (e.key === "Escape") closeLightbox();
  if (e.key === "ArrowLeft") step(-1);
  if (e.key === "ArrowRight") step(1);
});

const yearEl = $("photoYear");
if (yearEl) yearEl.textContent = String(new Date().getFullYear());
