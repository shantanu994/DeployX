import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { api } from './api'
import { useAuth } from './auth-context'

// Fetches on mount, then re-fetches every `ms` (live status).
function usePoll(fn, ms = 5000, enabled = true) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const load = useCallback(() => {
    fn().then((d) => { setData(d); setError('') }).catch((e) => setError(e.message))
  }, [fn])
  useEffect(() => {
    load()
    if (!enabled) return
    const t = setInterval(load, ms)
    return () => clearInterval(t)
  }, [load, ms, enabled])
  return { data, error, reload: load }
}

const STYLE = {
  success: 'bg-green-100 text-green-800', active: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800', cancelled: 'bg-slate-200 text-slate-700',
  running: 'bg-blue-100 text-blue-800', queued: 'bg-amber-100 text-amber-800',
  superseded: 'bg-slate-200 text-slate-700', rolled_back: 'bg-amber-100 text-amber-800',
}
const Badge = ({ status }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${STYLE[status] || 'bg-slate-100 text-slate-600'}`}><span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />{status.replace('_', ' ')}</span>
)
const when = (iso) => (iso ? new Date(iso).toLocaleString() : '-')
const secs = (ms) => (ms != null ? `${Math.round(ms / 1000)}s` : '-')
const Msg = ({ data, error }) =>
  error ? <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Could not reach the backend: {error}. Check that it is running and that VITE_API_URL in .env is correct.</p>
  : !data ? <div className="flex items-center gap-3 py-8 text-sm text-slate-500"><span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />Loading data...</div> : null
const Table = ({ head, children }) => (
  <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
    <table className="w-full min-w-[700px] text-left text-sm">
      <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500"><tr>{head.map((h) => <th key={h} className="p-4 font-semibold">{h}</th>)}</tr></thead>
      <tbody className="[&>tr]:border-t [&>tr]:border-slate-100 [&>tr]:transition [&>tr:hover]:bg-slate-50 [&_td]:p-4">{children}</tbody>
    </table>
  </div>
)
const btn = 'rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40'
const PageHeader = ({ eyebrow, title, description, children }) => (
  <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
    <div><p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-600">{eyebrow}</p><h1 className="text-3xl font-bold tracking-tight text-slate-950">{title}</h1>{description && <p className="mt-2 text-sm text-slate-500">{description}</p>}</div>
    {children}
  </div>
)

export function Login() {
  const { user, login } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  if (user) return <Navigate to="/" replace />
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    await login(email, password)
    nav('/')
  }
  const input = 'w-full rounded border border-slate-300 px-3 py-2 focus:outline-2 focus:outline-blue-600'
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-3xl border border-white/10 bg-white p-8 shadow-2xl">
        <div className="mb-8"><div className="mb-6 grid h-12 w-12 place-items-center rounded-2xl bg-blue-600 text-xl font-black text-white">D</div><p className="mb-2 text-sm font-bold uppercase tracking-widest text-blue-600">Welcome back</p><h1 className="text-3xl font-bold tracking-tight">Sign in to DeployX</h1><p className="mt-2 text-sm text-slate-500">Your deployment control plane, in one place.</p></div>
        <label className="block text-sm font-medium">Email
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
        </label>
        <label className="block text-sm font-medium">Password
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
        </label>
        <button disabled={busy} className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-50">
          {busy ? 'Signing in...' : 'Sign in'}
        </button>
        <p className="text-xs text-slate-500">The backend has no login API yet, so any email and password works.</p>
      </form>
    </div>
  )
}

export function Dashboard() {
  const { data, error } = usePoll(api.getStats)
  if (!data) return <Msg data={data} error={error} />
  const m = data.metrics
  const stats = [
    ['Repositories', m.totalRepositories], ['Pipelines', m.totalPipelines], ['Success rate', m.successRate],
    ['Failed', m.failedPipelines], ['Active deployments', m.activeDeployments], ['Avg duration', `${m.averagePipelineDurationSec}s`],
  ]
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Overview" title="Good morning, shipper." description="Here’s what’s happening across your delivery pipeline." />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {stats.map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-2xl font-bold tracking-tight text-slate-950">{v}</div>
            <div className="mt-1 text-xs font-medium text-slate-500">{k}</div>
          </div>
        ))}
      </div>
      <section className="space-y-2">
        <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Recent pipeline runs</h2><Link to="/pipelines" className="text-sm font-semibold text-blue-600 hover:text-blue-700">View all →</Link></div>
        <Table head={['Run', 'Repository', 'Branch', 'Status', 'Started']}>
          {data.recentPipelines.map((p) => (
            <tr key={p.id}><td>{p.id}</td><td>{p.repoName}</td><td>{p.branch}</td><td><Badge status={p.status} /></td><td>{when(p.startedAt)}</td></tr>
          ))}
        </Table>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-bold">Active deployments</h2>
        <Table head={['Repository', 'Environment', 'Version', 'Live URL']}>
          {data.activeDeploymentsList.map((d) => (
            <tr key={d.id}><td>{d.repoName}</td><td>{d.environment}</td><td>{d.version}</td>
              <td><a className="text-blue-700 underline" href={d.url} target="_blank" rel="noreferrer">{d.url}</a></td></tr>
          ))}
        </Table>
      </section>
    </div>
  )
}

export function Pipelines() {
  const runs = usePoll(api.getPipelines, 3000)
  const repos = usePoll(api.getRepos, 60000, false)
  const [repoId, setRepoId] = useState('')
  const [note, setNote] = useState('')
  const act = async (fn, okMsg) => {
    try { await fn(); setNote(okMsg) } catch (e) { setNote(`Failed: ${e.message}`) }
    runs.reload()
  }
  const chosen = repoId || repos.data?.[0]?.id
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Delivery" title="Pipelines" description="Trigger builds, monitor stages, and inspect every run." />
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
        <select value={chosen || ''} onChange={(e) => setRepoId(e.target.value)} className="rounded border border-slate-300 px-3 py-2">
          {(repos.data || []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <button disabled={!chosen} onClick={() => act(() => api.runPipeline(chosen), 'Pipeline started')} className={`${btn} bg-blue-600 hover:bg-blue-700`}>Run pipeline</button>
        {note && <span className="text-slate-600">{note}</span>}
      </div>
      <Msg data={runs.data} error={runs.error || repos.error} />
      {runs.data && (
        <Table head={['Run', 'Repository', 'Branch', 'Commit', 'Stages', 'Status', 'Duration', 'Started', '']}>
          {runs.data.map((p) => (
            <tr key={p.id}>
              <td className="font-medium">{p.id}</td><td>{p.repoName}</td><td>{p.branch}</td>
              <td className="font-mono">{p.commitHash}</td>
              <td><div className="flex flex-wrap gap-1">{(p.stages || []).map((s) => (
                <span key={s.id} title={s.status} className={`rounded px-1.5 py-0.5 text-xs ${STYLE[s.status] || 'bg-slate-100 text-slate-600'}`}>{s.name}</span>
              ))}</div></td>
              <td><Badge status={p.status} /></td><td>{secs(p.durationMs)}</td><td>{when(p.startedAt)}</td>
              <td className="space-x-2 whitespace-nowrap">
                <Link className="text-blue-700 underline" to={`/logs/${p.id}`}>Logs</Link>
                {(p.status === 'running' || p.status === 'queued') && <button onClick={() => act(() => api.cancelPipeline(p.id), 'Cancelled')} className={`${btn} bg-slate-600`}>Cancel</button>}
                {(p.status === 'failed' || p.status === 'cancelled') && <button onClick={() => act(() => api.retryPipeline(p.id), 'Retrying')} className={`${btn} bg-blue-600`}>Retry</button>}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  )
}

export function Deployments() {
  const { data, error, reload } = usePoll(api.getDeployments)
  const [note, setNote] = useState('')
  const rollback = async (d) => {
    try { await api.rollback(d.id); setNote(`Rolled back ${d.repoName}`) } catch (e) { setNote(`Rollback failed: ${e.message}`) }
    reload()
  }
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Release management" title="Deployments" description="Track what’s live and safely roll back when needed." />
      {note && <p className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">{note}</p>}
      <Msg data={data} error={error} />
      {data && (
        <Table head={['Repository', 'Environment', 'Version', 'Commit', 'Status', 'Deployed', 'Live URL', '']}>
          {data.map((d) => (
            <tr key={d.id}>
              <td className="font-medium">{d.repoName}</td><td>{d.environment}</td><td>{d.version}</td>
              <td className="font-mono">{d.commitHash}</td><td><Badge status={d.status} /></td><td>{when(d.deployedAt)}</td>
              <td><a className="text-blue-700 underline" href={d.url} target="_blank" rel="noreferrer">open</a></td>
              <td>{d.status === 'active' && <button onClick={() => rollback(d)} className={`${btn} bg-slate-700`}>Roll back</button>}</td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  )
}

export function Logs() {
  const { buildId } = useParams()
  const nav = useNavigate()
  const runs = usePoll(api.getPipelines, 10000)
  const id = buildId || runs.data?.[0]?.id
  const [live, setLive] = useState(true)
  const [q, setQ] = useState('')
  const fetchLogs = useCallback(() => (id ? api.getLogs(id) : Promise.resolve([])), [id])
  const logs = usePoll(fetchLogs, 3000, live)
  const lines = (logs.data || []).filter((l) => l.toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Observability" title="Logs and monitoring" description="Follow pipeline output in real time." />
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
        <select value={id || ''} onChange={(e) => nav(`/logs/${e.target.value}`)} className="rounded border border-slate-300 bg-white px-3 py-2">
          {(runs.data || []).map((p) => <option key={p.id} value={p.id}>{p.id} - {p.repoName} ({p.status})</option>)}
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter log lines" className="rounded border border-slate-300 px-3 py-2" />
        <label className="flex items-center gap-2"><input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} />Auto-refresh</label>
      </div>
      <Msg data={logs.data} error={logs.error || runs.error} />
      <pre className="min-h-40 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950 p-5 text-sm leading-relaxed text-slate-100 shadow-xl">
        {lines.length ? lines.map((l, i) => (
          <div key={i} className={/error|fail/i.test(l) ? 'text-red-400' : ''}>{l}</div>
        )) : 'No log lines match.'}
      </pre>
    </div>
  )
}
