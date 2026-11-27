const API_BASE = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, '')

async function request(path, options = {}) {
  if (!API_BASE) {
    throw new Error('VITE_API_URL is not configured. Set it in the frontend environment.')
  }

  const headers = new Headers(options.headers)
  const token = localStorage.getItem('token')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers })
  const text = await response.text()
  let body = null

  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      if (response.ok) throw new Error('The backend returned an invalid response.')
    }
  }

  if (!response.ok) {
    const error = new Error(body?.message || body?.error || `Request failed (${response.status})`)
    error.status = response.status
    throw error
  }

  return body
}

const post = (path, data) => request(path, {
  method: 'POST',
  body: JSON.stringify(data),
})

export const api = {
  login: (email, password) => post('/api/auth/login', { email, password }),
  getCurrentUser: () => request('/api/auth/me').then((body) => body.user),
  logout: () => post('/api/auth/logout', {}),
  getStats: () => request('/api/dashboard/stats'),
  getProjects: () => request('/api/projects'),
  getProject: (id) => request(`/api/projects/${id}`),
  getRepos: () => request('/api/repositories').then((body) => body.repositories),
  getPipelines: (filters = {}) => {
    const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value))
    const queryString = query.toString()
    return request(`/api/pipelines${queryString ? `?${queryString}` : ''}`).then((body) => body.pipelines)
  },
  runPipeline: (repoId) => post('/api/pipelines', { repoId }),
  runProjectPipeline: (projectId) => post('/api/pipelines', { projectId }),
  cancelPipeline: (id) => post(`/api/pipelines/${id}/cancel`, {}),
  retryPipeline: (id) => post(`/api/pipelines/${id}/retry`, {}),
  getLogs: (id) => request(`/api/pipelines/${id}/logs`).then((body) => body.logs),
  getDeployments: (filters = {}) => {
    const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value))
    const queryString = query.toString()
    return request(`/api/deployments${queryString ? `?${queryString}` : ''}`).then((body) => body.deployments)
  },
  rollback: (id) => post(`/api/deployments/${id}/rollback`, {}),
}
