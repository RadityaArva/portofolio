import {
  loadProjects,
  saveProjects,
  addProject,
  updateProject,
  deleteProject,
  normalizeLink,
  fileToDataUrl,
  DEFAULT_PROJECTS,
} from './projects-store.js'

const $ = (id) => document.getElementById(id)
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)]

/* ---------- State ---------- */
let editingId = null
let autoSaveTimer = null
let currentImageFile = null
let currentImageUrl = null
const AUTO_SAVE_INTERVAL = 5000

/* ---------- Migrasi penyimpanan lama (hanya sekali) ---------- */
const STORAGE_KEY_LEGACY = 'autoSavedProjects'
const STORAGE_KEY_NEW = 'radit_portfolio_projects_v3'

function migrasiDataLama() {
  const legacyRaw = localStorage.getItem(STORAGE_KEY_LEGACY)
  if (!legacyRaw) return

  try {
    const legacy = JSON.parse(legacyRaw)
    if (!Array.isArray(legacy) || legacy.length === 0) return

    const existing = localStorage.getItem(STORAGE_KEY_NEW)
    if (existing) return // data baru sudah ada, jangan timpa

    const normalized = legacy.map((p) => ({
      id: p.id || crypto.randomUUID(),
      title: String(p.title || ''),
      stack: String(p.stack || ''),
      description: String(p.description || ''),
      image: String(p.image || ''),
      link: String(p.link || '#'),
      linkLabel: String(p.linkLabel || 'Lihat Project'),
    }))

    saveProjects(normalized)
    console.log('Data project lama berhasil dimigrasi ke kunci baru.')
  } catch (error) {
    console.error('Gagal memigrasi data project lama:', error)
  }
}

/* ---------- Toast ---------- */
function showToast(message, type = 'success') {
  let toast = document.querySelector('.admin-toast')
  if (!toast) {
    toast = document.createElement('div')
    toast.className = 'admin-toast'
    document.body.appendChild(toast)
  }
  toast.className = `admin-toast ${type === 'error' ? 'is-error' : ''}`
  toast.innerHTML = `
    <div class="admin-toast-icon"><i class="fas ${type === 'error' ? 'fa-circle-exclamation' : 'fa-check-circle'}"></i></div>
    <div class="admin-toast-message">${message}</div>
  `
  toast.style.display = 'flex'
  toast.style.opacity = '1'
  toast.style.transform = 'translateX(-50%) translateY(0)'

  clearTimeout(toast._timer)
  toast._timer = setTimeout(() => {
    toast.style.transform = 'translateX(-50%) translateY(100px)'
    toast.style.opacity = '0'
    setTimeout(() => { toast.style.display = 'none' }, 400)
  }, 3000)
}

/* ---------- Render daftar project ---------- */
function renderList() {
  const listEl = $('projectList')
  const countEl = $('projectCount')
  const searchInput = $('searchProjects')
  if (!listEl || !countEl) return

  const projects = loadProjects()
  const term = (searchInput?.value || '').toLowerCase().trim()

  const filtered = projects.filter((p) => {
    if (!term) return true
    const haystack = `${p.title} ${p.stack} ${p.description}`.toLowerCase()
    return haystack.includes(term)
  })

  countEl.textContent = filtered.length

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div class="admin-empty-state">
        <div class="admin-empty-icon"><i class="fas fa-folder-open"></i></div>
        <h3>Belum ada project</h3>
        <p>Tambah project pertama melalui editor di sebelah kiri.</p>
      </div>
    `
    return
  }

  listEl.innerHTML = filtered.map((p, i) => {
    const imgSrc = p.image || ''
    const num = String(i + 1).padStart(2, '0')
    const stacks = (p.stack || 'Portfolio').split(/[·,]/).map(s => s.trim()).filter(Boolean)
    const stackChips = stacks.map(s => `<span class="admin-chip">${s}</span>`).join('')
    const isEditing = p.id === editingId
    return `
      <article class="admin-project-card${isEditing ? ' is-editing' : ''}" style="animation-delay: ${i * 0.08}s">
        <div class="admin-card-cover">
          ${imgSrc
            ? `<img src="${imgSrc}" alt="Cover ${p.title}" loading="lazy" onerror="this.parentElement.classList.add('is-image-missing')" />`
            : `<div class="admin-card-fallback"><i class="fas fa-image"></i><span>Tidak ada cover</span></div>`}
          <span class="admin-card-number">${num}</span>
          ${isEditing ? '<span class="admin-editing-badge">Sedang diedit</span>' : ''}
        </div>
        <div class="admin-card-body">
          <div class="admin-card-stack">${stackChips}</div>
          <h3>${p.title}</h3>
          <p class="admin-card-description">${p.description}</p>
          <div class="admin-card-actions">
            <button class="admin-card-edit" type="button" title="Edit" data-id="${p.id}"><i class="fas fa-pen" aria-hidden="true"></i><span>Edit</span></button>
            <button class="admin-card-delete" type="button" title="Hapus" data-id="${p.id}" aria-label="Hapus project"><i class="fas fa-trash" aria-hidden="true"></i></button>
          </div>
        </div>
      </article>
    `
  }).join('')

  /* Pasang event listener pada tombol edit/hapus kartu */
  $$('.admin-card-edit').forEach((btn) => {
    btn.addEventListener('click', () => loadProjectForEdit(btn.dataset.id))
  })
  $$('.admin-card-delete').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (confirm('Hapus project ini?')) {
        deleteProject(btn.dataset.id)
        renderList()
        showToast('Project dihapus', 'success')
      }
    })
  })
}

/* ---------- Form: reset ke keadaan awal ---------- */
function resetForm() {
  editingId = null
  renderList()
  $('editId').value = ''
  $('formModeTitle').textContent = 'Tambah project'
  $('formModeSubtitle').textContent = 'Isi detail project baru untuk ditambahkan ke portfolio.'
  $('cancelEditBtn').style.display = 'none'
  $('submitBtn').innerHTML = '<i class="fas fa-plus" aria-hidden="true"></i> Tambah Project'
  
  /* Hide edit badge */
  const badge = document.getElementById('formModeBadge')
  if (badge) badge.style.display = 'none'
  
  $('projectForm').reset()
  $('stackChips').style.display = 'none'
  $('imageInput').value = ''
  $('imagePreview').src = ''
  $('imagePreview').classList.add('hidden')
  $('dropzone').classList.remove('has-preview')
  currentImageFile = null
  currentImageUrl = null
  $('imageUrlField').style.display = 'none'
  $('toggleImageUrlBtn').textContent = 'Pakai URL gambar'
  $('imageFileInfo').style.display = 'none'
  $('imageFileThumb').src = ''
  $('imageFileName').textContent = ''
  $('imageFileSize').textContent = ''
  $('imageUrlInput').value = ''
  updateLivePreview()
  $('formStatus').textContent = ''
  $('formStatus').className = 'admin-form-status'
}

/* ---------- Form: muat project ke editor untuk diedit ---------- */
function loadProjectForEdit(id) {
  const projects = loadProjects()
  const project = projects.find((p) => p.id === id)
  if (!project) return

  editingId = id
  $('editId').value = id
  $('formModeTitle').textContent = 'Mengedit'
  $('formModeSubtitle').textContent = 'Ubah detail project ini.'
  $('cancelEditBtn').style.display = 'inline-flex'
  $('submitBtn').innerHTML = '<i class="fas fa-save" aria-hidden="true"></i> Simpan Perubahan'
  
  /* Add edit badge to form header */
  let badge = document.getElementById('formModeBadge')
  if (!badge) {
    badge = document.createElement('span')
    badge.id = 'formModeBadge'
    badge.className = 'admin-form-header-badge'
    $('formModeTitle').parentNode.appendChild(badge)
  }
  badge.textContent = project.title
  badge.style.display = 'inline-flex'
  
  renderList()

  $('titleInput').value = project.title
  $('stackInput').value = project.stack
  $('descInput').value = project.description
  $('linkInput').value = project.link === '#' ? '' : project.link
  $('linkLabelInput').value = project.linkLabel

  /* Stack chips preview */
  const stacks = project.stack.split(/[·,]/).map(s => s.trim()).filter(Boolean)
  $('stackChips').innerHTML = stacks.map(s => `<span class="admin-chip">${s}</span>`).join('')
  $('stackChips').style.display = stacks.length ? 'flex' : 'none'

  /* Gambar */
  currentImageUrl = project.image || null
  currentImageFile = null
  if (project.image) {
    $('imagePreview').src = project.image
    $('imagePreview').classList.remove('hidden')
    $('dropzone').classList.add('has-preview')
    $('imageFileInfo').style.display = 'grid'
    $('imageFileThumb').src = project.image
    const name = project.image.split('/').pop() || 'cover'
    $('imageFileName').textContent = name
    $('imageFileSize').textContent = 'Cover terpasang'
  } else {
    $('imagePreview').src = ''
    $('imagePreview').classList.add('hidden')
    $('dropzone').classList.remove('has-preview')
    $('imageFileInfo').style.display = 'none'
  }

  $('imageUrlField').style.display = 'none'
  $('toggleImageUrlBtn').textContent = 'Pakai URL gambar'

  updateLivePreview()
  $('formStatus').textContent = ''
  $('formStatus').className = 'admin-form-status'

  /* Scroll ke form */
  $('projectForm').scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/* ---------- Live preview ---------- */
function updateLivePreview() {
  const titleVal = $('titleInput').value.trim()
  const stackVal = $('stackInput').value.trim()
  const descVal = $('descInput').value.trim()
  const link = $('linkInput').value.trim() || '#'
  const linkLabel = $('linkLabelInput').value.trim() || 'Lihat Project'
  const imgSrc = $('imagePreview').src && !$('imagePreview').classList.contains('hidden')
    ? $('imagePreview').src
    : (currentImageUrl || '')

  /* Title with placeholder state */
  const previewTitleEl = $('previewTitle')
  if (titleVal) {
    previewTitleEl.textContent = titleVal
    previewTitleEl.classList.remove('placeholder')
  } else {
    previewTitleEl.textContent = 'Judul project'
    previewTitleEl.classList.add('placeholder')
  }

  /* Stack: render individual chips */
  const previewStackEl = $('previewStack')
  if (stackVal) {
    const chips = stackVal.split(/[·,]/).map(s => s.trim()).filter(Boolean)
    previewStackEl.innerHTML = chips.map(s => `<span class="admin-chip">${s}</span>`).join('')
  } else {
    previewStackEl.innerHTML = '<span class="admin-chip">Portfolio</span>'
  }

  /* Description with placeholder state */
  const previewDescEl = $('previewDescription')
  if (descVal) {
    previewDescEl.textContent = descVal
    previewDescEl.classList.remove('placeholder')
  } else {
    previewDescEl.textContent = 'Deskripsi singkat tentang project ini akan ditampilkan di sini.'
    previewDescEl.classList.add('placeholder')
  }

  /* Preview number: next project number when adding, or current position when editing */
  const projects = loadProjects()
  let previewNum = projects.length + 1
  if (editingId) {
    const idx = projects.findIndex(p => p.id === editingId)
    if (idx >= 0) previewNum = idx + 1
  }
  $('previewNumber').textContent = String(previewNum).padStart(2, '0')

  $('previewLink').textContent = linkLabel
  $('previewLink').href = link
  if (imgSrc) {
    $('previewCoverImg').src = imgSrc
    $('previewCoverImg').classList.remove('hidden')
  } else {
    $('previewCoverImg').classList.add('hidden')
  }

  /* Counter */
  $('descCounterVal').textContent = $('descInput').value.length
}

/* ---------- Form: kirim (tambah / edit) ---------- */
function handleFormSubmit(e) {
  e.preventDefault()

  const title = $('titleInput').value.trim()
  const stack = $('stackInput').value.trim()
  const desc = $('descInput').value.trim()
  const linkRaw = $('linkInput').value.trim()
  const linkLabel = $('linkLabelInput').value.trim() || 'Lihat Project'

  if (!title || !stack || !desc) {
    showToast('Judul, tech stack, dan deskripsi wajib diisi.', 'error')
    return
  }

  const linkResult = normalizeLink(linkRaw || '#')
  if (!linkResult.valid) {
    showToast(linkResult.error, 'error')
    return
  }

  /* Tentukan gambar: prioritas file upload, lalu URL, lalu kosong */
  let image = ''
  if (currentImageFile) {
    image = currentImageFile
  } else if (currentImageUrl) {
    image = currentImageUrl
  }

  /* Jika ada file, konversi ke data URL dulu */
  if (currentImageFile) {
    $('submitBtn').disabled = true
    $('submitBtn').innerHTML = '<i class="fas fa-circle-notch fa-spin" aria-hidden="true"></i> Memproses...'
    fileToDataUrl(currentImageFile)
      .then((dataUrl) => {
        finishSave({ title, stack, description: desc, image: dataUrl, link: linkResult.href, linkLabel })
      })
      .catch((err) => {
        console.error(err)
        showToast('Gagal memproses gambar.', 'error')
        $('submitBtn').disabled = false
        $('submitBtn').innerHTML = editingId
          ? '<i class="fas fa-save" aria-hidden="true"></i> Simpan Perubahan'
          : '<i class="fas fa-plus" aria-hidden="true"></i> Tambah Project'
      })
  } else {
    finishSave({ title, stack, description: desc, image, link: linkResult.href, linkLabel })
  }
}

function finishSave(project) {
  if (editingId) {
    updateProject(editingId, project)
    showToast('Project diperbarui', 'success')
  } else {
    addProject(project)
    showToast('Project ditambahkan', 'success')
  }
  renderList()
  resetForm()
}

/* ---------- Gambar: dropzone & file input ---------- */
function setupImageHandlers() {
  const dropzone = $('dropzone')
  const imageInput = $('imageInput')
  const imagePreview = $('imagePreview')
  const toggleUrlBtn = $('toggleImageUrlBtn')
  const imageUrlField = $('imageUrlField')
  const imageUrlInput = $('imageUrlInput')
  const replaceBtn = $('replaceImageBtn')
  const removeBtn = $('removeImageBtn')
  const imageFileInfo = $('imageFileInfo')
  const imageFileThumb = $('imageFileThumb')
  const imageFileName = $('imageFileName')
  const imageFileSize = $('imageFileSize')

  /* Klik dropzone -> buka file input */
  dropzone.addEventListener('click', () => {
    imageInput.click()
  })

  /* Pilih file */
  imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2.5 * 1024 * 1024) {
      showToast('File maksimal 2.5 MB.', 'error')
      return
    }
    currentImageFile = file
    currentImageUrl = null

    const reader = new FileReader()
    reader.onload = (ev) => {
      imagePreview.src = ev.target.result
      imagePreview.classList.remove('hidden')
      dropzone.classList.add('has-preview')
      imageFileInfo.style.display = 'grid'
      imageFileThumb.src = ev.target.result
      imageFileName.textContent = file.name
      imageFileSize.textContent = (file.size / 1024 / 1024).toFixed(2) + ' MB'
      imageUrlField.style.display = 'none'
      toggleUrlBtn.textContent = 'Pakai URL gambar'
      updateLivePreview()
    }
    reader.readAsDataURL(file)
  })

  /* Toggle URL vs file */
  toggleUrlBtn.addEventListener('click', () => {
    if (imageUrlField.style.display === 'none') {
      imageUrlField.style.display = 'block'
      toggleUrlBtn.textContent = 'Ganti ke unggah file'
      currentImageFile = null
      imageInput.value = ''
      if (!currentImageUrl) {
        imagePreview.src = ''
        imagePreview.classList.add('hidden')
        dropzone.classList.remove('has-preview')
        imageFileInfo.style.display = 'none'
      }
    } else {
      imageUrlField.style.display = 'none'
      toggleUrlBtn.textContent = 'Pakai URL gambar'
      currentImageUrl = null
      imageUrlInput.value = ''
      if (!currentImageFile) {
        imagePreview.src = ''
        imagePreview.classList.add('hidden')
        dropzone.classList.remove('has-preview')
        imageFileInfo.style.display = 'none'
      }
    }
    updateLivePreview()
  })

  /* Input URL gambar */
  imageUrlInput.addEventListener('input', (e) => {
    const url = e.target.value.trim()
    currentImageUrl = url || null
    currentImageFile = null
    imageInput.value = ''
    if (url) {
      imagePreview.src = url
      imagePreview.classList.remove('hidden')
      dropzone.classList.add('has-preview')
      imageFileInfo.style.display = 'grid'
      imageFileThumb.src = url
      imageFileName.textContent = 'Gambar dari URL'
      imageFileSize.textContent = 'External URL'
    } else {
      imagePreview.src = ''
      imagePreview.classList.add('hidden')
      dropzone.classList.remove('has-preview')
      imageFileInfo.style.display = 'none'
    }
    updateLivePreview()
  })

  /* Ganti gambar */
  replaceBtn.addEventListener('click', () => {
    imageFileInfo.style.display = 'none'
    imagePreview.src = ''
    imagePreview.classList.add('hidden')
    dropzone.classList.remove('has-preview')
    currentImageFile = null
    currentImageUrl = null
    imageInput.value = ''
    imageUrlInput.value = ''
    imageUrlField.style.display = 'none'
    toggleUrlBtn.textContent = 'Pakai URL gambar'
    updateLivePreview()
    imageInput.click()
  })

  /* Hapus gambar */
  removeBtn.addEventListener('click', () => {
    imageFileInfo.style.display = 'none'
    imagePreview.src = ''
    imagePreview.classList.add('hidden')
    dropzone.classList.remove('has-preview')
    currentImageFile = null
    currentImageUrl = null
    imageInput.value = ''
    imageUrlInput.value = ''
    imageUrlField.style.display = 'none'
    toggleUrlBtn.textContent = 'Pakai URL gambar'
    updateLivePreview()
  })
}

/* ---------- Link: pratinjau & uji ---------- */
function setupLinkHandlers() {
  const linkInput = $('linkInput')
  const linkPreview = $('linkPreview')
  const testLinkBtn = $('testLinkBtn')
  const linkLabelInput = $('linkLabelInput')

  function updateLinkPreview() {
    const raw = linkInput.value.trim()
    const result = normalizeLink(raw || '#')
    if (raw === '') {
      linkPreview.textContent = ''
      linkPreview.className = 'admin-link-preview'
      return
    }
    if (result.valid) {
      linkPreview.textContent = result.href
      linkPreview.className = 'admin-link-preview admin-link-preview-ok'
    } else {
      linkPreview.textContent = result.error
      linkPreview.className = 'admin-link-preview admin-link-preview-error'
    }
  }

  linkInput.addEventListener('input', () => {
    updateLinkPreview()
    updateLivePreview()
  })

  linkLabelInput.addEventListener('input', updateLivePreview)

  testLinkBtn.addEventListener('click', () => {
    const raw = linkInput.value.trim()
    const result = normalizeLink(raw || '#')
    if (!result.valid) {
      showToast(result.error, 'error')
      return
    }
    if (result.type === 'external') {
      window.open(result.href, '_blank')
    } else {
      window.location.href = result.href
    }
  })
}

/* ---------- Auto-save ---------- */
function setupAutoSave() {
  const autoSaveBtn = $('autoSaveBtn')
  const fields = ['titleInput', 'stackInput', 'descInput', 'linkInput', 'imageUrlInput']

  autoSaveBtn.addEventListener('click', () => {
    const projects = loadProjects()
    localStorage.setItem(STORAGE_KEY_NEW, JSON.stringify(projects))
    showToast('Data berhasil disimpan ke browser.', 'success')
  })

  fields.forEach((id) => {
    $(id)?.addEventListener('input', () => {
      updateLivePreview() // real-time preview
      if (autoSaveTimer) clearTimeout(autoSaveTimer)
      autoSaveTimer = setTimeout(() => {
        showToast('Data disinkronkan secara otomatis', 'success')
      }, AUTO_SAVE_INTERVAL)
    })
  })

  $('stackInput')?.addEventListener('input', () => {
    const stacks = $('stackInput').value.split(/[·,]/).map(s => s.trim()).filter(Boolean)
    $('stackChips').innerHTML = stacks.map(s => `<span class="admin-chip">${s}</span>`).join('')
    $('stackChips').style.display = stacks.length ? 'flex' : 'none'
    updateLivePreview()
  })
}

/* ---------- Daftar: cari & reset ---------- */
function setupListHandlers() {
  const searchInput = $('searchProjects')
  const clearSearchBtn = $('clearSearchBtn')
  const resetAllBtn = $('resetAllBtn')

  searchInput?.addEventListener('input', () => {
    if (searchInput.value.trim()) {
      clearSearchBtn.style.display = 'block'
    } else {
      clearSearchBtn.style.display = 'none'
    }
    renderList()
  })

  clearSearchBtn?.addEventListener('click', () => {
    searchInput.value = ''
    clearSearchBtn.style.display = 'none'
    renderList()
  })

  resetAllBtn?.addEventListener('click', () => {
    if (confirm('Mengembalikan project ke data awal akan menghapus semua project yang Anda tambahkan. Lanjutkan?')) {
      saveProjects(DEFAULT_PROJECTS)
      renderList()
      showToast('Project dikembalikan ke data awal.', 'success')
    }
  })
}

/* ---------- Ekspor data ---------- */
function setupExportHandler() {
  const exportBtn = $('exportDataBtn')
  exportBtn?.addEventListener('click', () => {
    const projects = loadProjects()
    const blob = new Blob([
      `export const PROJECTS = ${JSON.stringify(projects, null, 2)}\n`
    ], { type: 'text/javascript' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'project-data.js'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showToast('File project-data.js berhasil diunduh.', 'success')
  })
}

/* ---------- Tema ---------- */
function setupThemeToggle() {
  const root = document.documentElement
  const btn = $('themeToggle')
  const icon = btn?.querySelector('i')
  if (!btn) return

  function applyTheme(dark) {
    if (dark) {
      root.setAttribute('data-theme', 'dark')
      if (icon) icon.className = 'fas fa-sun'
    } else {
      root.removeAttribute('data-theme')
      if (icon) icon.className = 'fas fa-moon'
    }
  }

  const saved = localStorage.getItem('theme')
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  applyTheme(saved === 'dark' || (!saved && prefersDark))

  btn.addEventListener('click', () => {
    const next = !root.hasAttribute('data-theme')
    applyTheme(next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  })
}

/* ---------- Inisialisasi ---------- */
window.addEventListener('DOMContentLoaded', () => {
  migrasiDataLama()
  renderList()
  resetForm()
  setupThemeToggle()
  setupImageHandlers()
  setupLinkHandlers()
  setupAutoSave()
  setupListHandlers()
  setupExportHandler()

  /* Tombol batal edit */
  $('cancelEditBtn')?.addEventListener('click', resetForm)

  /* Tombol reset form */
  $('resetFormBtn')?.addEventListener('click', resetForm)

  /* Submit form */
  $('projectForm')?.addEventListener('submit', handleFormSubmit)

  /* Akordion pratinjau */
  $('previewAccordionToggle')?.addEventListener('click', function () {
    const card = $('previewCard')
    const expanded = this.getAttribute('aria-expanded') === 'true'
    this.setAttribute('aria-expanded', String(!expanded))
    card.classList.toggle('collapsed', expanded)
    this.querySelector('.fas').className = expanded ? 'fas fa-chevron-down' : 'fas fa-chevron-up'
  })

  /* Akordion form */
  $('formAccordionToggle')?.addEventListener('click', function () {
    const content = $('projectFormContent')
    const expanded = this.getAttribute('aria-expanded') === 'true'
    this.setAttribute('aria-expanded', String(!expanded))
    content.style.display = expanded ? 'none' : 'block'
    this.querySelector('.fas').className = expanded ? 'fas fa-chevron-down' : 'fas fa-chevron-up'
  })
})
