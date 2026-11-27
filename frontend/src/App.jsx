import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import { AuthProvider } from './auth'
import { useAuth } from './auth-context'
import { Login, Dashboard, Projects, ProjectDetails, Pipelines, Deployments, Logs } from './pages'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/projects', label: 'Projects', icon: 'projects' },
  { to: '/pipelines', label: 'Pipelines', icon: 'pipelines' },
  { to: '/deployments', label: 'Deployments', icon: 'deployments' },
  { to: '/logs', label: 'Logs & Monitoring', icon: 'logs' },
]

function NavIcon({ name }) {
  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></>,
    projects: <><rect x="3" y="5" width="18" height="15" rx="2" /><path d="M8 5V3h8v2M3 10h18M10 10v2h4v-2" /></>,
    pipelines: <><circle cx="6" cy="6" r="2" /><circle cx="18" cy="18" r="2" /><path d="M8 6h4a4 4 0 0 1 4 4v4a4 4 0 0 0 4 4M6 8v8a4 4 0 0 0 4 4h6" /></>,
    deployments: <><path d="M12 3v12m0 0 5-5m-5 5-5-5" /><path d="M5 17v4h14v-4" /></>,
    logs: <><path d="M4 5h16M4 10h16M4 15h10M4 20h8" /></>,
  }
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0">{paths[name]}</svg>
}

function Layout() {
  const { user, logout, authError } = useAuth()
  const location = useLocation()
  const [loggingOut, setLoggingOut] = useState(false)
  const link = ({ isActive }) =>
    `group relative flex min-w-max items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200 lg:min-w-0 ${
      isActive ? 'bg-blue-500/15 text-blue-200 ring-1 ring-inset ring-blue-400/20 before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-blue-400' : 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-100'
    }`
  const signOut = async () => {
    setLoggingOut(true)
    try {
      await logout()
    } finally {
      setLoggingOut(false)
    }
  }
  return (
    <div className="min-h-screen bg-[#f6f8fb] lg:flex">
      <aside className="z-20 flex w-full flex-col border-b border-white/[0.07] bg-[#0b1220] px-4 py-4 text-white shadow-xl shadow-slate-950/5 lg:fixed lg:inset-y-0 lg:w-64 lg:border-b-0 lg:border-r lg:border-white/[0.07] lg:px-5 lg:py-7 lg:shadow-none">
        <div className="mb-5 flex items-center justify-between px-1 lg:mb-10 lg:px-2">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-blue-400 to-blue-700 text-lg font-black text-white shadow-lg shadow-blue-500/20">D</div>
            <div><p className="text-[17px] font-bold tracking-tight text-white">DeployX</p><p className="mt-0.5 text-[11px] tracking-wide text-slate-500">DEPLOYMENT CONTROL PLANE</p></div>
          </div>
          <span className="rounded-full border border-blue-300/15 bg-blue-300/[0.08] px-2.5 py-1 text-[10px] font-semibold tracking-wide text-blue-200 lg:hidden">DEMO</span>
        </div>
        <p className="mb-2 hidden px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600 lg:block">Workspace</p>
        <nav aria-label="Main navigation" className="flex gap-1 overflow-x-auto pb-1 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={link}>
              <NavIcon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/[0.08] pt-3 lg:mt-auto lg:block lg:pt-5">
          <div className="flex min-w-0 items-center gap-3 px-1 lg:mb-4 lg:px-2">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-blue-300/15 bg-blue-400/10 text-xs font-bold text-blue-200">{user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}</div>
            <div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-200">{user.name || user.email}</p><p className="truncate text-[11px] text-slate-500">{user.email}</p></div>
          </div>
          <button onClick={signOut} disabled={loggingOut} className="rounded-lg px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-50 lg:w-full lg:text-left">{loggingOut ? 'Signing out…' : 'Sign out'}</button>
        </div>
      </aside>
      <main className="min-h-screen min-w-0 flex-1 bg-[#f6f8fb] lg:ml-64">
        <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/85 px-4 py-3 backdrop-blur-md sm:px-6 lg:px-10">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div className="text-xs text-slate-500">Workspace <span className="mx-1.5 text-slate-300">/</span><span className="font-medium text-slate-700">{NAV_ITEMS.find((item) => item.to === location.pathname)?.label || (location.pathname.startsWith('/projects/') ? 'Project details' : location.pathname.startsWith('/logs/') ? 'Logs & Monitoring' : 'DeployX')}</span></div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              Demo environment
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
          {authError && <p role="alert" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Session check could not reach the server: {authError}</p>}
          <div key={location.pathname} className="page-enter"><Outlet /></div>
        </div>
      </main>
    </div>
  )
}

function Protected() {
  const { user } = useAuth()
  return user ? <Layout /> : <Navigate to="/login" replace />
}

function SessionGate() {
  const { user, ready, authError, retrySession, clearSession } = useAuth()

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-200">
        <div className="flex items-center gap-3 text-sm">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-blue-400" />
          Loading your workspace…
        </div>
      </div>
    )
  }

  if (authError && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
        <div className="max-w-lg space-y-4 rounded-2xl bg-white p-6">
          <h1 className="text-xl font-bold">Could not verify your session</h1>
          <p role="alert" className="text-sm text-red-700">{authError}</p>
          <p className="text-sm text-slate-600">Check your connection and try again, or return to sign in.</p>
          <div className="flex gap-3">
            <button onClick={retrySession} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Try again</button>
            <button onClick={clearSession} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Sign in</button>
          </div>
        </div>
      </div>
    )
  }

  return <AppRoutes />
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Protected />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:projectId" element={<ProjectDetails />} />
        <Route path="/pipelines" element={<Pipelines />} />
        <Route path="/deployments" element={<Deployments />} />
        <Route path="/logs" element={<Logs />} />
        <Route path="/logs/:buildId" element={<Logs />} />
      </Route>
      <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <SessionGate />
      </BrowserRouter>
    </AuthProvider>
  )
}
