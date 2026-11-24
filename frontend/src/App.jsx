import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, NavLink, Outlet } from 'react-router-dom'
import { AuthProvider } from './auth'
import { useAuth } from './auth-context'
import { Login, Dashboard, Pipelines, Deployments, Logs } from './pages'

function Layout() {
  const { user, logout, authError } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)
  const link = ({ isActive }) =>
    `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
      isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-white/10 hover:text-white'
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
    <div className="min-h-screen bg-slate-950 lg:flex">
      <aside className="flex w-full flex-col border-b border-white/10 bg-slate-950 px-4 py-4 lg:fixed lg:inset-y-0 lg:w-64 lg:border-b-0 lg:border-r lg:px-5 lg:py-7">
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500 text-lg font-black text-white shadow-lg shadow-blue-500/25">D</div>
          <div><p className="text-lg font-bold tracking-tight text-white">DeployX</p><p className="text-xs text-slate-500">Ship with confidence</p></div>
        </div>
        <nav className="flex gap-1 overflow-x-auto lg:block lg:space-y-2">
          <NavLink to="/" end className={link}><span>▦</span>Dashboard</NavLink>
          <NavLink to="/pipelines" className={link}><span>⇄</span>Pipelines</NavLink>
          <NavLink to="/deployments" className={link}><span>↗</span>Deployments</NavLink>
          <NavLink to="/logs" className={link}><span>≡</span>Logs</NavLink>
        </nav>
        <div className="mt-auto hidden border-t border-white/10 pt-5 lg:block">
          <div className="mb-4 flex items-center gap-3 px-2">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-blue-500/20 text-sm font-bold text-blue-300">{user.email?.[0]?.toUpperCase() || '?'}</div>
            <div className="min-w-0"><p className="truncate text-sm font-medium text-white">{user.email}</p><p className="text-xs text-slate-500">Workspace owner</p></div>
          </div>
          <button onClick={signOut} disabled={loggingOut} className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-400 transition hover:bg-white/10 hover:text-white disabled:opacity-50">{loggingOut ? 'Signing out…' : 'Sign out'}</button>
        </div>
      </aside>
      <main className="min-h-screen flex-1 bg-slate-50 lg:ml-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
          {authError && <p role="alert" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Session check could not reach the server: {authError}</p>}
          <Outlet />
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
          Waking up the server… checking your session.
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
          <p className="text-sm text-slate-600">The free backend may take up to a minute to wake up. Try again, or return to sign in.</p>
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
