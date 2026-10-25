import { PROJECTS } from './project-data.js'

const STORAGE_KEY = 'radit_portfolio_projects_v3'
const STORAGE_VERSION_KEY = `${STORAGE_KEY}_data_version`
const DATA_VERSION = JSON.stringify(PROJECTS)

export const DEFAULT_PROJECTS = PROJECTS

function isProjectList(value) {
  return Array.isArray(value) && value.every((project) => (
    project &&
    typeof project.id === 'string' &&
    typeof project.title === 'string' &&
    typeof project.stack === 'string' &&
    typeof project.description === 'string' &&
    typeof project.image === 'string' &&
    typeof project.link === 'string' &&
    typeof project.linkLabel === 'string'
  ))
}

export function loadProjects() {
  const storedVersion = localStorage.getItem(STORAGE_VERSION_KEY)
  if (storedVersion !== DATA_VERSION) {
    saveProjects(PROJECTS)
    return [...PROJECTS]
  }

  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    saveProjects(PROJECTS)
    return [...PROJECTS]
  }

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    console.warn('Saved projects could not be parsed; restoring the source data.', error)
  }

  if (isProjectList(parsed)) return normalizeProjects(parsed)

  saveProjects(PROJECTS)
  return [...PROJECTS]
}

export function saveProjects(projects) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
  localStorage.setItem(STORAGE_VERSION_KEY, DATA_VERSION)
}

export function addProject(project) {
  const projects = loadProjects()
  const next = [{ ...project, id: crypto.randomUUID() }, ...projects]
  saveProjects(next)
  return next
}

export function updateProject(id, patch) {
  const projects = loadProjects().map((p) => (p.id === id ? { ...p, ...patch } : p))
  saveProjects(projects)
  return projects
}

export function deleteProject(id) {
  const projects = loadProjects().filter((p) => p.id !== id)
  saveProjects(projects)
  return projects
}

export function resetProjects() {
  saveProjects(PROJECTS)
  return [...PROJECTS]
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/* ---------- Normalisasi & validasi link (dipakai editor & index) ---------- */

const INTERNAL_FILE_EXT = /\.(html|htm|pdf|png|jpg|jpeg|webp|svg|txt)(\?|#|$)/i

function hasControlChars(value) {
  return /[\u0000-\u001f\u007f-\u009f]/.test(value)
}

function hasMiddleSpaces(value) {
  return /\s/.test(value.slice(1, -1))
}

function dangerousScheme(value) {
  return /^(javascript|data|vbscript|file):/i.test(value)
}

export function normalizeLink(input) {
  const raw = String(input ?? '').trim()

  /* Kosong: biarkan seperti sekarang (kolom opsional) */
  if (raw === '') {
    return { href: '#', type: 'anchor', valid: true, error: null, original: '' }
  }

  /* mailto: dan tel: diizinkan utuh */
  if (/^(mailto|tel):/i.test(raw)) {
    return { href: raw, type: 'contact', valid: true, error: null, original: raw }
  }

  /* Skema berbahaya ditolak */
  if (dangerousScheme(raw)) {
    return {
      href: '#',
      type: 'invalid',
      valid: false,
      error: 'Link tidak aman: skema javascript:, data:, vbscript:, atau file: tidak diperbolehkan.',
      original: raw,
    }
  }

  /* Spasi di tengah ditolak */
  if (hasMiddleSpaces(raw)) {
    return {
      href: '#',
      type: 'invalid',
      valid: false,
      error: 'Link tidak boleh mengandung spasi di tengah teks.',
      original: raw,
    }
  }

  /* Karakter kontrol ditolak */
  if (hasControlChars(raw)) {
    return {
      href: '#',
      type: 'invalid',
      valid: false,
      error: 'Link mengandung karakter yang tidak valid.',
      original: raw,
    }
  }

  /* URL lengkap dengan skema http/https */
  if (/^https?:\/\//i.test(raw)) {
    return { href: raw, type: 'external', valid: true, error: null, original: raw }
  }

  /* Anchor halaman yang sama (termasuk path dengan fragment, mis. /index.html#projects) */
  if (raw.includes('#')) {
    return { href: raw, type: 'anchor', valid: true, error: null, original: raw }
  }

  /* Halaman/berkas internal dengan ekstensi file: photography.html, ./photography.html, /photography.html, /projects.html?x=1 */
  if (INTERNAL_FILE_EXT.test(raw)) {
    let normalized = raw.replace(/^\.\//, '')
    if (!normalized.startsWith('/')) normalized = `/${normalized}`
    return { href: normalized, type: 'internal', valid: true, error: null, original: raw }
  }

  /* Domain tanpa skema, mis. github.com/user/repo → https://github.com/user/repo */
  if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/|\?|#|$)/.test(raw)) {
    return {
      href: `https://${raw}`,
      type: 'external',
      valid: true,
      error: null,
      original: raw,
    }
  }

  /* Path internal: dengan atau tanpa garis miring depan, mis. ./about, /about, folder/page */
  if (/^\.?\//.test(raw) || /^[a-zA-Z0-9][a-zA-Z0-9._-]*\//.test(raw)) {
    let normalized = raw.replace(/^\.\//, '')
    if (!normalized.startsWith('/')) normalized = `/${normalized}`
    return { href: normalized, type: 'internal', valid: true, error: null, original: raw }
  }

  /* Tidak dikenal sebagai alamat apa pun */
  return {
    href: '#',
    type: 'invalid',
    valid: false,
    error: 'Masukkan alamat yang valid, contoh: /photography.html, #bagian, https://..., mailto:, atau tel:.',
    original: raw,
  }
}

/* Migrasi data lama saat dibaca: normalisasi link & path gambar tanpa menghapus project */
function normalizeProject(project) {
  let img = String(project.image || '')
  if (img.startsWith('public/')) {
    img = '/' + img.slice(7)
  }
  const result = normalizeLink(project.link)
  if (!result.valid) {
    /* Jika data lama tidak aman, biarkan '#' agar tidak merusak tampilan, jangan hapus project */
    return { ...project, image: img, link: '#' }
  }
  return { ...project, image: img, link: result.href }
}

export function normalizeProjects(projects) {
  return projects.map(normalizeProject)
}
