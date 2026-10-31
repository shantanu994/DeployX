import { BrowserRouter, Routes, Route, Navigate, NavLink, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth'
import { Login, Dashboard, Pipelines, Deployments, Logs } from './pages'

function Layout() {
  const { user, logout } = useAuth()
  const link = ({ isActive }) =>
    `rounded px-3 py-1.5 text-sm ${isActive ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3">
          <span className="mr-4 text-lg font-bold text-blue-700">DeployX</span>
          <nav className="flex flex-wrap gap-1">
            <NavLink to="/" end className={link}>Dashboard</NavLink>
            <NavLink to="/pipelines" className={link}>Pipelines</NavLink>
            <NavLink to="/deployments" className={link}>Deployments</NavLink>
            <NavLink to="/logs" className={link}>Logs</NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm text-slate-500">
            <span>{user.email}</span>
            <button onClick={logout} className="rounded border border-slate-300 px-3 py-1 hover:bg-slate-100">Sign out</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6"><Outlet /></main>
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
