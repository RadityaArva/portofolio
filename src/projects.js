import './style.css'
import {
  loadProjects,
  addProject,
  updateProject,
  deleteProject,
  resetProjects,
  fileToDataUrl,
} from './projects-store.js'

const $ = (id) => document.getElementById(id)
const root = document.documentElement

/* Theme */
const themeBtn = $('themeToggle')
const themeIcon = themeBtn.querySelector('i')

function applyTheme(dark) {
  if (dark) {
    root.setAttribute('data-theme', 'dark')
    themeIcon.className = 'fas fa-sun'
  } else {
    root.removeAttribute('data-theme')
    themeIcon.className = 'fas fa-moon'
  }
}

const saved = localStorage.getItem('theme')
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
applyTheme(saved === 'dark' || (!saved && prefersDark))

themeBtn.addEventListener('click', () => {
  const next = !root.hasAttribute('data-theme')
  applyTheme(next)
  localStorage.setItem('theme', next ? 'dark' : 'light')
})

/* Form state */
const form = $('projectForm')
const listEl = $('projectList')
const preview = $('imagePreview')
const dropzone = $('dropzone')
const imageInput = $('imageInput')
const statusEl = $('formStatus')
const editId = $('editId')
const submitBtn = $('submitBtn')
const projectCount = $('projectCount')

let imageData = ''

function setStatus(msg, ok = true) {
  statusEl.textContent = msg
  statusEl.className = `admin-form-status${msg ? ` is-visible${ok ? '' : ' is-error'}` : ''}`
}

function showPreview(src) {
  imageData = src
  preview.src = src
  preview.classList.remove('hidden')
  dropzone.classList.add('has-preview')
  dropzone.querySelector('[data-drop-label]')?.classList.add('hidden')
}

function clearPreview() {
  imageData = ''
  preview.src = ''
  preview.classList.add('hidden')
  dropzone.classList.remove('has-preview')
  dropzone.querySelector('[data-drop-label]')?.classList.remove('hidden')
  imageInput.value = ''
}

async function handleFile(file) {
  if (!file) return
  if (!file.type.startsWith('image/')) {
    setStatus('File harus berupa gambar (JPG, PNG, WebP).', false)
    return
  }
  if (file.size > 2.5 * 1024 * 1024) {
    setStatus('Ukuran gambar maksimal 2.5MB.', false)
    return
  }
  const dataUrl = await fileToDataUrl(file)
  showPreview(dataUrl)
  setStatus('Gambar siap diunggah.')
}

dropzone.addEventListener('click', () => imageInput.click())
imageInput.addEventListener('change', () => handleFile(imageInput.files?.[0]))

;['dragenter', 'dragover'].forEach((evt) => {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault()
    dropzone.classList.add('dragover')
  })
})

;['dragleave', 'drop'].forEach((evt) => {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault()
    dropzone.classList.remove('dragover')
  })
})

dropzone.addEventListener('drop', (e) => {
  handleFile(e.dataTransfer.files?.[0])
})

function resetForm() {
  form.reset()
  editId.value = ''
  clearPreview()
  submitBtn.textContent = 'Tambah Project'
  setStatus('')
}

$('resetFormBtn').addEventListener('click', resetForm)

$('resetAllBtn').addEventListener('click', () => {
  if (!confirm('Kembalikan project ke data contoh awal?')) return
  resetProjects()
  renderList()
  resetForm()
  setStatus('Project dikembalikan ke data awal.')
})

form.addEventListener('submit', (e) => {
  e.preventDefault()

  const title = $('titleInput').value.trim()
  const stack = $('stackInput').value.trim()
  const description = $('descInput').value.trim()
  const link = $('linkInput').value.trim() || '#'
  const linkLabel = $('linkLabelInput').value.trim() || 'Lihat Project'
  const imageUrl = $('imageUrlInput').value.trim()

  const image = imageData || imageUrl
  if (!title || !stack || !description || !image) {
    setStatus('Lengkapi judul, stack, deskripsi, dan gambar.', false)
    return
  }

  const payload = { title, stack, description, link, linkLabel, image }

  if (editId.value) {
    updateProject(editId.value, payload)
    setStatus('Project berhasil diperbarui.')
  } else {
    addProject(payload)
    setStatus('Project berhasil ditambahkan.')
  }

  renderList()
  resetForm()
})

function renderList() {
  const projects = loadProjects()
  listEl.innerHTML = ''
  projectCount.textContent = String(projects.length).padStart(2, '0')
  projectCount.setAttribute('aria-label', `${projects.length} project`)

  if (!projects.length) {
    listEl.innerHTML = `
      <div class="admin-empty-state">
        <span class="admin-empty-icon"><i class="fas fa-box-open" aria-hidden="true"></i></span>
        <h3>Belum ada project</h3>
        <p>Project yang kamu tambahkan akan muncul di sini.</p>
      </div>
    `
    return
  }

  projects.forEach((project, index) => {
    const card = document.createElement('article')
    card.className = 'admin-project-card'
    card.innerHTML = `
      <div class="admin-card-cover">
        <img src="${project.image}" alt="${project.title}" loading="lazy" />
        <span class="admin-card-fallback" aria-hidden="true"><i class="fas fa-layer-group"></i><span>Project cover</span></span>
        <span class="admin-card-number">${String(index + 1).padStart(2, '0')}</span>
      </div>
      <div class="admin-card-body">
        <p class="admin-card-stack">${project.stack}</p>
        <h3>${project.title}</h3>
        <p class="admin-card-description">${project.description}</p>
        <div class="admin-card-actions">
          <button type="button" data-edit="${project.id}" class="admin-card-edit"><i class="fas fa-pen" aria-hidden="true"></i> Edit project</button>
          <button type="button" data-delete="${project.id}" class="admin-card-delete" aria-label="Hapus ${project.title}"><i class="fas fa-trash-can" aria-hidden="true"></i></button>
        </div>
      </div>
    `
    listEl.appendChild(card)
    card.querySelector('.admin-card-cover img').addEventListener('error', (event) => {
      const image = event.currentTarget
      image.hidden = true
      image.closest('.admin-card-cover').classList.add('is-image-missing')
    }, { once: true })
  })

  listEl.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const project = loadProjects().find((p) => p.id === btn.getAttribute('data-edit'))
      if (!project) return
      editId.value = project.id
      $('titleInput').value = project.title
      $('stackInput').value = project.stack
      $('descInput').value = project.description
      $('linkInput').value = project.link === '#' ? '' : project.link
      $('linkLabelInput').value = project.linkLabel || ''
      $('imageUrlInput').value = project.image.startsWith('data:') ? '' : project.image
      if (project.image) showPreview(project.image)
      submitBtn.textContent = 'Simpan Perubahan'
      setStatus('Mode edit aktif.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  })

  listEl.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!confirm('Hapus project ini?')) return
      deleteProject(btn.getAttribute('data-delete'))
      renderList()
      setStatus('Project dihapus.')
    })
  })
}

renderList()

const year = $('year')
if (year) year.textContent = String(new Date().getFullYear())
