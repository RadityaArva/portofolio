import './style.css'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { loadProjects, normalizeLink } from './projects-store.js'

gsap.registerPlugin(ScrollTrigger)

const $ = (id) => document.getElementById(id)
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)]
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const easeSoft = 'power3.out'

/* ---------- Tahap 4 — kemampuan perangkat & progressive enhancement ---------- */
document.documentElement.classList.add('js')
const reduceMotionMQ = window.matchMedia('(prefers-reduced-motion: reduce)')
const isWeakDevice = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4
const mobileViewportMQ = window.matchMedia('(max-width: 767px)')
const BASE_AMPLITUDE = 24 // px
let parallaxAmplitude = BASE_AMPLITUDE

function recomputeAmplitude() {
  let amp = BASE_AMPLITUDE
  if (reduceMotion || isWeakDevice) amp = 0
  else if (mobileViewportMQ.matches) amp = BASE_AMPLITUDE / 2
  parallaxAmplitude = amp
}
recomputeAmplitude()
reduceMotionMQ.addEventListener('change', recomputeAmplitude)
mobileViewportMQ.addEventListener('change', recomputeAmplitude)

/* ---------- Theme ---------- */
const root = document.documentElement
const themeBtn = $('themeToggle')
const themeIcon = themeBtn?.querySelector('i')

function applyTheme(dark) {
  if (dark) {
    root.setAttribute('data-theme', 'dark')
    if (themeIcon) themeIcon.className = 'fas fa-sun'
  } else {
    root.removeAttribute('data-theme')
    if (themeIcon) themeIcon.className = 'fas fa-moon'
  }
  ScrollTrigger.refresh()
}

// Force dark mode by default
applyTheme(true)
localStorage.setItem('theme', 'dark')

const saved = localStorage.getItem('theme')
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
applyTheme(saved === 'dark' || (!saved && prefersDark))

themeBtn?.addEventListener('click', () => {
  const next = !root.hasAttribute('data-theme')
  applyTheme(next)
  localStorage.setItem('theme', next ? 'dark' : 'light')
})

/* ---------- Mobile menu ---------- */
const menuBtn = $('menuToggle')
const mobileMenu = $('mobileMenu')
let menuScrollY = 0
let menuTouchY = 0

function closeMenu() {
  gsap.to(mobileMenu, {
    opacity: 0,
    y: -10,
    scale: 0.95,
    duration: 0.25,
    ease: 'power2.inOut',
    onComplete: () => {
      mobileMenu?.classList.add('hidden')
      if (mobileMenu) {
        mobileMenu.style.opacity = '1'
        mobileMenu.style.transform = 'none'
      }
    }
  })
  menuBtn?.setAttribute('aria-expanded', 'false')
  window.removeEventListener('scroll', scrollCloseHandler)
  window.removeEventListener('touchmove', touchCloseHandler)
}

function scrollCloseHandler() {
  if (Math.abs(window.scrollY - menuScrollY) > 10) {
    closeMenu()
  }
}

function touchCloseHandler(e) {
  const touch = e.touches[0]
  if (Math.abs(touch.clientY - menuTouchY) > 10) {
    closeMenu()
  }
}

menuBtn?.addEventListener('click', () => {
  const open = mobileMenu.classList.toggle('hidden') === false
  menuBtn.setAttribute('aria-expanded', String(open))
  
  if (open) {
    mobileMenu.style.opacity = '0'
    mobileMenu.style.transform = 'translateY(-10px) scale(0.95)'
    gsap.to(mobileMenu, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.4,
      ease: 'back.out(1.7)'
    })
    menuScrollY = window.scrollY
    menuTouchY = 0
    window.addEventListener('scroll', scrollCloseHandler, { passive: true })
    window.addEventListener('touchmove', touchCloseHandler, { passive: true })
  } else {
    closeMenu()
  }
})

mobileMenu?.addEventListener('touchstart', (e) => {
  menuTouchY = e.touches[0].clientY
}, { passive: true })

$$('#mobileMenu a').forEach((a) => a.addEventListener('click', closeMenu))

/* ---------- Navbar (always visible + section underline) ---------- */
const navbar = $('navbar')
const scrollProgress = $('scrollProgress')
const sections = $$('section[id]')
const navLinks = $$('[data-nav]')

/* Navbar logic fix: ensure links are always tracked, and underline is visible */
const updateNav = () => {
  const y = window.scrollY;
  navbar?.classList.toggle('scrolled', y > 10);
    
  let current = '';
  sections.forEach((section) => {
    // Adjusted trigger area
    if (y >= section.offsetTop - 200) current = section.id;
  });

  navLinks.forEach((link) => {
    const href = link.getAttribute('href');
    const isActive = href === `#${current}`;
    link.classList.toggle('active', isActive);
    // Ensure specific contact link behavior
    if (href === '#contact' && current === 'contact') {
      link.classList.add('active');
    }
  });
};

window.addEventListener('scroll', updateNav, { passive: true })
updateNav()

/* ---------- Tahap 4 — parallax loop ringan (rAF bersama, smooth lerp) ---------- */
const supportsScrollTimeline = CSS.supports('animation-timeline: scroll()')

let parallaxRAF = null
let parallaxScrollY = 0
let docHidden = false
const active = new Map() // elemen yang sedang terlihat dan dianimasikan
const MAX_ACTIVE = 12
const LERP = 0.12 // semakin kecil semakin halus/lembut

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)) }

/* Progress bar tipis di atas halaman */
function updateProgress() {
  const bar = $('scrollProgress')
  if (!bar) return
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight
  const p = maxScroll > 0 ? clamp(parallaxScrollY / maxScroll, 0, 1) : 0
  bar.style.width = (p * 100) + '%'
}

function setWillChange(el, active) {
  el.style.willChange = active ? 'transform, opacity' : 'auto'
}

/* Hitung transform parallax untuk satu elemen. Hanya translate3d + opacity. */
function applyParallax(el) {
  const vh = window.innerHeight
  const rect = el.getBoundingClientRect()
  const center = rect.top + parallaxScrollY + rect.height / 2
  const mid = parallaxScrollY + vh / 2
  // p: -1 (di bawah layar) .. 0 (tengah layar) .. 1 (di atas layar)
  const p = clamp((mid - center) / (vh / 2), -1, 1)
  const amp = parallaxAmplitude // sudah difaktorkan (0 bila reduced-motion/lemah, setengah di HP)
  const factor = Number(el.dataset.parallax) || 1
  const y = -p * amp * factor
  const rot = clamp(p * 2, -2, 2) // rotasi maks 2 derajat, lebih halus
  el.style.transform = `translate3d(0, ${y}px, 0) rotate(${rot}deg)`
  el.style.opacity = 1 - Math.abs(p) * 0.1
  setWillChange(el, true)
}

function resetParallax(el) {
  el.style.transform = ''
  el.style.opacity = ''
  setWillChange(el, false)
}

function heroExitEffect() {
  const hero = $('hero')
  if (!hero) return
  const rect = hero.getBoundingClientRect()
  // hero mulai keluar layar atas: skala mengecil sedikit + memudar
  const exit = clamp((-rect.bottom) / 220, 0, 1)
  if (exit > 0) {
    hero.style.transform = `scale(${1 - exit * 0.03})`
    hero.style.opacity = 1 - exit * 0.25
    setWillChange(hero, true)
  } else {
    hero.style.transform = ''
    hero.style.opacity = ''
    setWillChange(hero, false)
  }
}

function loop() {
  parallaxRAF = null
  if (docHidden || reduceMotion || isWeakDevice || parallaxAmplitude === 0) {
    active.forEach(resetParallax)
    active.clear()
    return
  }
  updateProgress()
  heroExitEffect()
  // batasi jumlah elemen aktif bersamaan
  let n = 0
  for (const el of active.keys()) {
    if (n >= MAX_ACTIVE) { resetParallax(el); active.delete(el); continue }
    applyParallax(el)
    n++
  }
  if (!docHidden) parallaxRAF = requestAnimationFrame(loop)
}

function startParallax() {
  if (supportsScrollTimeline) return // CSS scroll-driven menangani animasi
  if (parallaxRAF !== null) return
  parallaxRAF = requestAnimationFrame(loop)
}

window.addEventListener(
  'scroll',
  () => { parallaxScrollY = window.scrollY; startParallax() },
  { passive: true }
)

document.addEventListener('visibilitychange', () => {
  docHidden = document.hidden
  if (docHidden) {
    if (parallaxRAF !== null) { cancelAnimationFrame(parallaxRAF); parallaxRAF = null }
    active.forEach(resetParallax)
    active.clear()
  } else {
    startParallax()
  }
})

/* Kumpulkan target parallax dan pantau visibilitas lewat IntersectionObserver */
function initParallaxTargets() {
  if (reduceMotion || isWeakDevice || parallaxAmplitude === 0) return
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const el = entry.target
      if (entry.isIntersecting) {
        if (active.size < MAX_ACTIVE) active.set(el, true)
      } else {
        active.delete(el)
        resetParallax(el)
      }
    })
  }, { rootMargin: '12% 0% 12% 0%', threshold: 0 })

  const targets = [...$$('.parallax-orb'), ...$$('[data-parallax]')]
  const heroGrid = $('hero')?.querySelector('.container-site')
  if (heroGrid) targets.push(heroGrid)
  targets.forEach((el) => io.observe(el))

  startParallax()
}

initParallaxTargets()

/* ---------- Hero name + photo animations ---------- */
function initHeroMotion() {
  const lines = $$('#heroName .hero-name-line span')
  const photo = document.querySelector('.hero-photo')
  // Note: hero-photo-wrap removed, using .hero-photo directly

  // Always ensure name is readable even if animation fails
  const showName = () => {
    lines.forEach((el) => {
      el.style.opacity = '1'
      el.style.transform = 'none'
    })
  }

  if (!lines.length) return

  if (reduceMotion) {
    showName()
    if (photo) photo.style.opacity = '1'
    return
  }

  gsap.from(lines, {
    y: 36,
    opacity: 0,
    duration: 1,
    stagger: 0.1,
    ease: easeSoft,
    delay: 0.08,
    clearProps: 'transform',
    onComplete: showName,
  })

  if (!photo) return

  gsap.from(photo, {
    opacity: 0,
    y: 40,
    scale: 0.97,
    filter: 'grayscale(0.25)',
    duration: 1.15,
    ease: easeSoft,
    delay: 0.18,
    clearProps: 'scale,filter',
  })

  gsap.to(photo, {
    y: -4,
    duration: 6,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
    delay: 1.5,
  })

  photo.addEventListener('pointermove', (e) => {
    const rect = photo.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    gsap.to(photo, {
      rotateY: x * 4,
      rotateX: -y * 4,
      perspective: 1200,
      duration: 0.4,
      ease: 'power2.out',
    })
  })

  photo.addEventListener('pointerleave', () => {
    gsap.to(photo, { rotateX: 0, rotateY: 0, duration: 0.7, ease: easeSoft })
  })
}

initHeroMotion()

/* ---------- Scroll reveals ---------- */
function initReveals() {
  const els = $$('[data-reveal]')

  if (reduceMotion) {
    els.forEach((el) => {
      el.style.opacity = '1'
      el.style.transform = 'none'
    })
    return
  }

  els.forEach((el) => {
    const type = el.getAttribute('data-reveal')
    const delay = Number(el.dataset.delay || 0)
    const from = { opacity: 0, y: 20, x: 0, scale: 1 }

    if (type === 'left') {
      from.x = -20
      from.y = 10
    } else if (type === 'right') {
      from.x = 20
      from.y = 10
    } else if (type === 'scale') {
      from.scale = 0.98
      from.y = 16
    }

    gsap.fromTo(
      el,
      from,
      {
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
        duration: 1.2,
        delay,
        ease: 'power4.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          toggleActions: 'play none none reverse',
        },
      }
    )
  })

  gsap.utils.toArray('.skill-item').forEach((item, i) => {
    gsap.from(item, {
      opacity: 0,
      y: 10,
      scale: 0.98,
      duration: 1.0,
      delay: Math.min(i * 0.03, 1.2),
      ease: 'power4.out',
      scrollTrigger: {
        trigger: '#skills',
        start: 'top 82%',
        toggleActions: 'play none none reverse',
      },
    })
  })
}

initReveals()

/* ---------- Counters ---------- */
$$('[data-count]').forEach((el) => {
  const target = Number(el.dataset.count) || 0
  ScrollTrigger.create({
    trigger: el,
    start: 'top 90%',
    onEnter: () => {
      const obj = { n: 0 }
      gsap.to(obj, {
        n: target,
        duration: reduceMotion ? 0 : 1.2,
        ease: 'power2.out',
        onUpdate: () => {
          el.textContent = String(Math.round(obj.n))
        },
      })
    },
    onLeaveBack: () => {
      el.textContent = '0'
    },
  })
})

/* ---------- Project slider ---------- */
function escapeHtml(str = '') {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function renderSlides(projects) {
  const track = $('sliderTrack')
  const dotsEl = $('sliderDots')
  const prev = $('sliderPrev')
  const next = $('sliderNext')
  if (!track || !dotsEl || !prev || !next) return

  track.innerHTML = ''
  dotsEl.innerHTML = ''

  const list = projects.length
    ? projects
    : [
        {
          title: 'Coming Soon',
          stack: 'Portfolio',
          description: 'New projects will appear here soon.',
          image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&h=800&fit=crop&q=80',
          link: '#',
          linkLabel: 'Stay Tuned',
        },
      ]

  const total = list.length

  list.forEach((project, i) => {
    const num = String(i + 1).padStart(2, '0')
    const totalStr = String(total).padStart(2, '0')

    const stackItems = (project.stack || '')
      .split(/[·,]/)
      .map((s) => s.trim())
      .filter(Boolean)

    const stackBadges = stackItems.length
      ? stackItems.map((s) => `<span class="slide-tag">${escapeHtml(s)}</span>`).join('')
      : `<span class="slide-tag">${escapeHtml(project.stack || 'Project')}</span>`

    let imgSrc = project.image || ''
    if (imgSrc.startsWith('public/')) {
      imgSrc = '/' + imgSrc.replace(/^public\//, '')
    }

    const article = document.createElement('article')
    article.className = 'slide'
    article.innerHTML = `
      <div class="slide-img">
        <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(project.title)}" width="1600" height="1000" sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 40vw" loading="${i === 0 ? 'eager' : 'lazy'}" />
        <span class="slide-fallback" aria-hidden="true"><i class="fas fa-image mr-2"></i><span>Gambar tidak tersedia</span></span>
      </div>
      <div class="slide-body">
        <div class="slide-meta">
          <span class="slide-counter">${num} / ${totalStr}</span>
          <div class="slide-tags">${stackBadges}</div>
        </div>
        <h3 class="slide-title font-display text-2xl sm:text-3xl font-semibold tracking-tight">${escapeHtml(project.title)}</h3>
        <p class="slide-desc leading-relaxed line-clamp-3 sm:line-clamp-4">${escapeHtml(project.description)}</p>
        <div class="slide-link-container pt-1"></div>
      </div>
    `
    track.appendChild(article)

    /* Render tombol lewat DOM (setAttribute) bukan innerHTML, dengan validasi ulang */
    const linkContainer = article.querySelector('.slide-link-container')
    const linkResult = normalizeLink(project.link || '#')
    if (linkResult.valid) {
      const a = document.createElement('a')
      a.className = 'project-btn-cta group'
      a.setAttribute('href', linkResult.href)

      const span = document.createElement('span')
      span.textContent = project.linkLabel || 'View Project'
      a.appendChild(span)

      const icon = document.createElement('i')
      icon.className = 'fas fa-arrow-right text-xs transition-transform duration-300 group-hover:translate-x-1'
      a.appendChild(icon)

      if (linkResult.type === 'external') {
        a.setAttribute('target', '_blank')
        a.setAttribute('rel', 'noopener noreferrer')
      }
      linkContainer.appendChild(a)
    }

    const slideImg = article.querySelector('.slide-img')
    const slideImgEl = slideImg.querySelector('img')
    slideImgEl.addEventListener('error', () => {
      slideImgEl.classList.add('is-broken')
      slideImg.classList.add('has-broken-image')
    }, { once: true })

    /* Subtle interactive card tilt for extra life on desktop */
    if (!reduceMotion && !isWeakDevice) {
      article.addEventListener('pointermove', (e) => {
        const rect = article.getBoundingClientRect()
        const x = (e.clientX - rect.left) / rect.width - 0.5
        const y = (e.clientY - rect.top) / rect.height - 0.5
        gsap.to(slideImg, {
          rotateY: x * 5,
          rotateX: -y * 5,
          transformPerspective: 1000,
          duration: 0.35,
          ease: 'power2.out',
        })
      })
      article.addEventListener('pointerleave', () => {
        gsap.to(slideImg, { rotateX: 0, rotateY: 0, duration: 0.6, ease: easeSoft })
      })
    }
  })

  let current = 0
  let timer

  list.forEach((_, i) => {
    const dot = document.createElement('button')
    dot.type = 'button'
    dot.className = 'slider-dot' + (i === 0 ? ' active' : '')
    dot.setAttribute('aria-label', `Project ${i + 1}`)
    dot.addEventListener('click', () => goTo(i))
    dotsEl.appendChild(dot)
  })

  function goTo(index) {
    current = ((index % total) + total) % total
    track.style.transform = `translateX(-${current * 100}%)`
    $$('.slider-dot', dotsEl).forEach((d, i) => d.classList.toggle('active', i === current))
    resetAuto()
  }

  function resetAuto() {
    clearInterval(timer)
    if (reduceMotion || total < 2) return
    timer = setInterval(() => goTo(current + 1), 5600)
  }

  prev.onclick = () => goTo(current - 1)
  next.onclick = () => goTo(current + 1)

  let startX = 0
  track.addEventListener(
    'touchstart',
    (e) => {
      startX = e.touches[0].clientX
    },
    { passive: true }
  )
  track.addEventListener(
    'touchend',
    (e) => {
      const diff = startX - e.changedTouches[0].clientX
      if (Math.abs(diff) > 48) goTo(current + (diff > 0 ? 1 : -1))
    },
    { passive: true }
  )

  resetAuto()
}

renderSlides(loadProjects())

/* ---------- Cursor follower & ambient glow (Mouse Holder) ---------- */
function initCursorFollower() {
  if (reduceMotion || window.matchMedia('(hover: none) or (pointer: coarse)').matches) return

  const glow = $('cursorGlow')
  const dot = $('cursorDot')
  if (!glow && !dot) return

  let mouseX = window.innerWidth / 2
  let mouseY = window.innerHeight / 2
  let glowX = mouseX
  let glowY = mouseY
  let dotX = mouseX
  let dotY = mouseY
  let isVisible = false
  let isHovering = false

  window.addEventListener('pointermove', (e) => {
    mouseX = e.clientX
    mouseY = e.clientY
    if (!isVisible) {
      isVisible = true
      glowX = mouseX
      glowY = mouseY
      dotX = mouseX
      dotY = mouseY
      if (glow) glow.style.opacity = '1'
      if (dot) dot.style.opacity = '1'
    }
  }, { passive: true })

  document.addEventListener('mouseleave', () => {
    isVisible = false
    if (glow) glow.style.opacity = '0'
    if (dot) dot.style.opacity = '0'
  })

  document.addEventListener('mouseenter', () => {
    isVisible = true
    if (glow) glow.style.opacity = '1'
    if (dot) dot.style.opacity = '1'
  })

  const interactiveSelector = 'a, button, input, textarea, select, .slide, .skill-item, [role="button"], .slider-btn'
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest(interactiveSelector)) {
      if (!isHovering) {
        isHovering = true
        dot?.classList.add('is-hovering')
      }
    } else {
      if (isHovering) {
        isHovering = false
        dot?.classList.remove('is-hovering')
      }
    }
  }, { passive: true })

  function renderCursor() {
    if (isVisible) {
      glowX += (mouseX - glowX) * 0.08
      glowY += (mouseY - glowY) * 0.08
      if (glow) glow.style.transform = `translate3d(${glowX}px, ${glowY}px, 0)`

      dotX += (mouseX - dotX) * 0.22
      dotY += (mouseY - dotY) * 0.22
      if (dot) dot.style.transform = `translate3d(${dotX}px, ${dotY}px, 0)`
    }
    requestAnimationFrame(renderCursor)
  }

  requestAnimationFrame(renderCursor)
}

initCursorFollower()

/* ---------- Smooth anchor scroll behavior ---------- */
$$('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener('click', (e) => {
    const href = anchor.getAttribute('href')
    if (href === '#' || !href) return
    const target = document.querySelector(href)
    if (target) {
      e.preventDefault()
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      if (history.pushState) {
        history.pushState(null, '', href)
      }
    }
  })
})

const year = $('year')
if (year) year.textContent = String(new Date().getFullYear())
