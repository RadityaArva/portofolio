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

  if (isProjectList(parsed)) return parsed

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
