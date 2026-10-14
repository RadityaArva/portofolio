import './style.css'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { loadProjects } from './projects-store.js'

gsap.registerPlugin(ScrollTrigger)

const $ = (id) => document.getElementById(id)
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)]
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const easeSoft = 'power3.out'

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

/* ---------- Soft parallax ---------- */
function initParallax() {
  if (reduceMotion) return

  const orbs = $$('.parallax-orb')
  const dots = document.querySelector('.bg-dots')
  const layers = $$('[data-parallax]')
  const state = { y: 0, target: 0 }

  window.addEventListener(
    'scroll',
    () => {
      state.target = window.scrollY
    },
    { passive: true }
  )

  gsap.ticker.add(() => {
    state.y += (state.target - state.y) * 0.06
    const y = state.y

    if (dots) dots.style.transform = `translate3d(0, ${y * 0.06}px, 0)`

    orbs.forEach((orb, i) => {
      const speed = 0.03 + i * 0.025
      orb.style.transform = `translate3d(0, ${y * speed}px, 0)`
    })

    layers.forEach((el) => {
      const speed = Number(el.dataset.parallax) || 0.1
      const rect = el.getBoundingClientRect()
      const offset = (rect.top + rect.height / 2 - window.innerHeight / 2) * speed * -1
      el.style.transform = `translate3d(0, ${offset}px, 0)`
    })
  })
}

initParallax()

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
    const from = { opacity: 0, y: 30, x: 0, scale: 1 }

    if (type === 'left') {
      from.x = -28
      from.y = 12
    } else if (type === 'right') {
      from.x = 28
      from.y = 12
    } else if (type === 'scale') {
      from.scale = 0.97
      from.y = 20
    }

    gsap.fromTo(
      el,
      from,
      {
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
        duration: 1.05,
        delay,
        ease: easeSoft,
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          toggleActions: 'play none none reverse',
        },
      }
    )
  })

  gsap.utils.toArray('.skill-item').forEach((item, i) => {
    gsap.from(item, {
      opacity: 0,
      y: 22,
      scale: 0.97,
      duration: 0.65,
      delay: (i % 7) * 0.04,
      ease: easeSoft,
      scrollTrigger: {
        trigger: '#skills',
        start: 'top 78%',
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
    const article = document.createElement('article')
    article.className = 'slide'
    article.innerHTML = `
      <div class="slide-img">
        <img src="${escapeHtml(project.image)}" alt="${escapeHtml(project.title)}" width="800" height="520" loading="${i === 0 ? 'eager' : 'lazy'}" />
      </div>
      <div class="slide-body">
        <span class="text-xs font-semibold uppercase tracking-[0.16em] text-mute">${num} / ${totalStr} · ${escapeHtml(project.stack)}</span>
        <h3 class="font-display text-2xl font-semibold md:text-3xl">${escapeHtml(project.title)}</h3>
        <p class="text-mute">${escapeHtml(project.description)}</p>
        <a href="${escapeHtml(project.link || '#')}" class="btn-ghost mt-2" ${project.link && project.link !== '#' ? 'target="_blank" rel="noopener noreferrer"' : ''}>
          ${escapeHtml(project.linkLabel || 'View Project')} <i class="fas fa-arrow-right text-xs"></i>
        </a>
      </div>
    `
    track.appendChild(article)
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

const year = $('year')
if (year) year.textContent = String(new Date().getFullYear())
