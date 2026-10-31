// All backend calls live here. Endpoints match backend/src/routes/* (Sharva's API).
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

async function req(path, opts = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json' },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.message || body.error || `Request failed (${res.status})`)
  return body
}
const post = (path, data) => req(path, { method: 'POST', body: JSON.stringify(data || {}) })

export const api = {
  // The backend has no login endpoint yet, so sign-in is a UI-only gate.
  login: async (email) => ({ token: 'ui-only', user: { email } }),
  getStats: () => req('/api/dashboard/stats'),
  getRepos: () => req('/api/repositories').then((d) => d.repositories),
  getPipelines: () => req('/api/pipelines').then((d) => d.pipelines),
  runPipeline: (repoId) => post('/api/pipelines', { repoId }),
  cancelPipeline: (id) => post(`/api/pipelines/${id}/cancel`),
  retryPipeline: (id) => post(`/api/pipelines/${id}/retry`),
  getLogs: (id) => req(`/api/pipelines/${id}/logs`).then((d) => d.logs),
  getDeployments: () => req('/api/deployments').then((d) => d.deployments),
  rollback: (id) => post(`/api/deployments/${id}/rollback`),
}
