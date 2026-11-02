import { BrowserRouter, Routes, Route, Navigate, NavLink, Outlet } from 'react-router-dom'
import { AuthProvider } from './auth'
import { useAuth } from './auth-context'
import { Login, Dashboard, Pipelines, Deployments, Logs } from './pages'

function Layout() {
  const { user, logout } = useAuth()
  const link = ({ isActive }) =>
    `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
      isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-white/10 hover:text-white'
    }`
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
            <div className="grid h-9 w-9 place-items-center rounded-full bg-blue-500/20 text-sm font-bold text-blue-300">{user.email[0].toUpperCase()}</div>
            <div className="min-w-0"><p className="truncate text-sm font-medium text-white">{user.email}</p><p className="text-xs text-slate-500">Workspace owner</p></div>
          </div>
          <button onClick={logout} className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-400 transition hover:bg-white/10 hover:text-white">Sign out</button>
        </div>
      </aside>
      <main className="min-h-screen flex-1 bg-slate-50 lg:ml-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-9"><Outlet /></div>
      </main>
    </div>
  )
}

function Protected() {
  const { user } = useAuth()
  return user ? <Layout /> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Protected />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pipelines" element={<Pipelines />} />
            <Route path="/deployments" element={<Deployments />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/logs/:buildId" element={<Logs />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
