import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { api } from './api'
import { useAuth } from './auth-context'

const COLD_START_MS = 65_000

function usePoll(fn, ms = 5000, enabled = true) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [warmingUp, setWarmingUp] = useState(true)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => setWarmingUp(false), COLD_START_MS)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    let active = true
    let timer

    const poll = async () => {
      setLoading(true)
      try {
        const result = await fn()
        if (active) {
          setData(result)
          setError('')
        }
      } catch (requestError) {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : String(requestError))
        }
      } finally {
        if (active) setLoading(false)
      }

      if (active && enabled) timer = setTimeout(poll, ms)
    }

    poll()
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [fn, ms, enabled, refresh])

  const reload = useCallback(() => setRefresh((value) => value + 1), [])
  return { data, error, loading, warmingUp, reload }
}

const STYLE = {
  success: 'bg-green-100 text-green-800', active: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800', cancelled: 'bg-slate-200 text-slate-700',
  running: 'bg-blue-100 text-blue-800', queued: 'bg-amber-100 text-amber-800',
  superseded: 'bg-slate-200 text-slate-700', rolled_back: 'bg-amber-100 text-amber-800',
}
const FEATURED_PROJECTS = [
  {
    name: 'Cloud Kitchen Cashflow OS',
    description: 'AI-powered cashflow operating system for cloud kitchens.',
    url: 'https://ai-powered-cashflow-operating-system-for-cloud-kitch-1e8ljezix.vercel.app/',
  },
  {
    name: 'Personalized Attendance Tracking',
    description: 'A personalized attendance tracking application.',
    url: 'https://personalized-attendance-tracking.vercel.app/',
  },
]
const Badge = ({ status }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${STYLE[status] || 'bg-slate-100 text-slate-600'}`}><span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />{status.replace('_', ' ')}</span>
)
const when = (iso) => (iso ? new Date(iso).toLocaleString() : '-')
const secs = (ms) => (ms != null ? `${Math.round(ms / 1000)}s` : '-')

function DataState({ data, error, loading, warmingUp }) {
  const hasData = data !== null
  const configError = error.includes('VITE_API_URL')

  if (!hasData && (loading || (error && !configError && warmingUp))) {
    return (
      <div role="status" className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
        Waking up the server… the first request can take about a minute.
      </div>
    )
  }

  if (error) {
    return <p role="alert" className={`rounded-xl border p-4 text-sm ${hasData ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-red-200 bg-red-50 text-red-700'}`}>{hasData ? 'Could not refresh data' : 'Could not load data'}: {error}. Check that the backend is available and VITE_API_URL is set correctly.</p>
  }

  return null
}

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
  const { user, login, authError, authNotice, retrySession, clearSession } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (user) return <Navigate to="/" replace />

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(email, password)
      nav('/')
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : String(loginError))
    } finally {
      setBusy(false)
    }
  }

  const input = 'w-full rounded border border-slate-300 px-3 py-2 focus:outline-2 focus:outline-blue-600'
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-3xl border border-white/10 bg-white p-8 shadow-2xl">
        <div className="mb-8"><div className="mb-6 grid h-12 w-12 place-items-center rounded-2xl bg-blue-600 text-xl font-black text-white">D</div><p className="mb-2 text-sm font-bold uppercase tracking-widest text-blue-600">Welcome back</p><h1 className="text-3xl font-bold tracking-tight">Sign in to DeployX</h1><p className="mt-2 text-sm text-slate-500">Your deployment control plane, in one place.</p></div>
        {(error || authError) && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error || authError}</p>}
        {authNotice && <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{authNotice}</p>}
        {authError && !error && (
          <div className="flex gap-3 text-sm">
            <button type="button" onClick={retrySession} className="font-semibold text-blue-700">Retry session check</button>
            <button type="button" onClick={clearSession} className="font-semibold text-slate-600">Clear saved session</button>
          </div>
        )}
        <label className="block text-sm font-medium">Email
          <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className={input} />
        </label>
        <label className="block text-sm font-medium">Password
          <input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className={input} />
        </label>
        <button disabled={busy} className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-50">
          {busy ? 'Waking up the server…' : 'Sign in'}
        </button>
        {busy && <p role="status" className="text-center text-xs text-slate-500">The first request can take about a minute while the backend wakes up.</p>}
      </form>
    </div>
  )
}

export function Dashboard() {
  const state = usePoll(api.getStats)
  const { data } = state
  const stats = data ? [
    ['Repositories', data.metrics.totalRepositories], ['Pipelines', data.metrics.totalPipelines], ['Success rate', data.metrics.successRate],
    ['Failed', data.metrics.failedPipelines], ['Active deployments', data.metrics.activeDeployments], ['Avg duration', `${data.metrics.averagePipelineDurationSec}s`],
  ] : []

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Overview" title="Good morning, shipper." description="Here’s what’s happening across your delivery pipeline." />
      <DataState {...state} />
      {data && <>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {stats.map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-2xl font-bold tracking-tight text-slate-950">{value}</div>
              <div className="mt-1 text-xs font-medium text-slate-500">{label}</div>
            </div>
          ))}
        </div>
        <section className="space-y-2">
          <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Recent pipeline runs</h2><Link to="/pipelines" className="text-sm font-semibold text-blue-600 hover:text-blue-700">View all →</Link></div>
          <Table head={['Run', 'Repository', 'Branch', 'Status', 'Started']}>
            {data.recentPipelines.length ? data.recentPipelines.map((pipeline) => (
              <tr key={pipeline.id}><td>{pipeline.id}</td><td>{pipeline.repoName}</td><td>{pipeline.branch}</td><td><Badge status={pipeline.status} /></td><td>{when(pipeline.startedAt)}</td></tr>
            )) : <tr><td colSpan="5" className="text-center text-slate-500">No pipeline runs yet.</td></tr>}
          </Table>
        </section>
        <section className="space-y-2">
          <h2 className="text-lg font-bold">Active deployments</h2>
          <Table head={['Repository', 'Environment', 'Version', 'Live URL']}>
            {data.activeDeploymentsList.length ? data.activeDeploymentsList.map((deployment) => (
              <tr key={deployment.id}><td>{deployment.repoName}</td><td>{deployment.environment}</td><td>{deployment.version}</td>
                <td>{deployment.url ? <a className="text-blue-700 underline" href={deployment.url} target="_blank" rel="noreferrer">{deployment.url}</a> : '-'}</td></tr>
            )) : <tr><td colSpan="4" className="text-center text-slate-500">No active deployments.</td></tr>}
          </Table>
        </section>
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-bold">Other live projects</h2>
            <p className="text-sm text-slate-500">Explore these deployed projects.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {FEATURED_PROJECTS.map((project) => (
              <a
                key={project.url}
                href={project.url}
                target="_blank"
                rel="noreferrer"
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-slate-900 group-hover:text-blue-700">{project.name}</h3>
                    <p className="mt-2 text-sm text-slate-500">{project.description}</p>
                  </div>
                  <span aria-hidden="true" className="text-blue-600">↗</span>
                </div>
                <span className="mt-4 inline-block text-xs font-semibold text-blue-700">Visit live project</span>
              </a>
            ))}
          </div>
        </section>
      </>}
    </div>
  )
}

export function Pipelines() {
  const runs = usePoll(api.getPipelines, 3000)
  const repos = usePoll(api.getRepos, 60000, false)
  const [repoId, setRepoId] = useState('')
  const [note, setNote] = useState('')
  const act = async (action, successMessage) => {
    try {
      await action()
      setNote(successMessage)
    } catch (actionError) {
      setNote(`Action failed: ${actionError.message}`)
    }
    runs.reload()
  }
  const chosen = repoId || repos.data?.[0]?.id

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Delivery" title="Pipelines" description="Trigger builds, monitor stages, and inspect every run." />
      <DataState {...repos} />
      {repos.data && repos.data.length === 0 && <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">No repositories are connected yet. Connect a repository before running a pipeline.</p>}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
        <select aria-label="Repository" value={chosen || ''} onChange={(event) => setRepoId(event.target.value)} className="rounded border border-slate-300 px-3 py-2">
          {(repos.data || []).map((repository) => <option key={repository.id} value={repository.id}>{repository.name}</option>)}
        </select>
        <button disabled={!chosen} onClick={() => act(() => api.runPipeline(chosen), 'Pipeline started')} className={`${btn} bg-blue-600 hover:bg-blue-700`}>Run pipeline</button>
        {note && <span role="status" className={note.startsWith('Action failed') ? 'text-red-700' : 'text-slate-600'}>{note}</span>}
      </div>
      <DataState {...runs} />
      {runs.data && (
        <Table head={['Run', 'Repository', 'Branch', 'Commit', 'Stages', 'Status', 'Duration', 'Started', '']}>
          {runs.data.length ? runs.data.map((pipeline) => (
            <tr key={pipeline.id}>
              <td className="font-medium">{pipeline.id}</td><td>{pipeline.repoName}</td><td>{pipeline.branch}</td>
              <td className="font-mono">{pipeline.commitHash}</td>
              <td><div className="flex flex-wrap gap-1">{(pipeline.stages || []).map((stage) => (
                <span key={stage.id} title={stage.status} className={`rounded px-1.5 py-0.5 text-xs ${STYLE[stage.status] || 'bg-slate-100 text-slate-600'}`}>{stage.name}</span>
              ))}</div></td>
              <td><Badge status={pipeline.status} /></td><td>{secs(pipeline.durationMs)}</td><td>{when(pipeline.startedAt)}</td>
              <td className="space-x-2 whitespace-nowrap">
                <Link className="text-blue-700 underline" to={`/logs/${pipeline.id}`}>Logs</Link>
                {(pipeline.status === 'running' || pipeline.status === 'queued') && <button onClick={() => act(() => api.cancelPipeline(pipeline.id), 'Pipeline cancelled')} className={`${btn} bg-slate-600`}>Cancel</button>}
                {(pipeline.status === 'failed' || pipeline.status === 'cancelled') && <button onClick={() => act(() => api.retryPipeline(pipeline.id), 'Pipeline retry started')} className={`${btn} bg-blue-600`}>Retry</button>}
              </td>
            </tr>
          )) : <tr><td colSpan="9" className="text-center text-slate-500">No pipeline runs yet. Start one with a connected repository.</td></tr>}
        </Table>
      )}
    </div>
  )
}

export function Deployments() {
  const state = usePoll(api.getDeployments)
  const { data, reload } = state
  const [note, setNote] = useState('')
  const rollback = async (deployment) => {
    try {
      await api.rollback(deployment.id)
      setNote(`Rolled back ${deployment.repoName}`)
    } catch (error) {
      setNote(`Rollback failed: ${error.message}`)
    }
    reload()
  }

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Release management" title="Deployments" description="Track what’s live and safely roll back when needed." />
      {note && <p role="status" className={`rounded-xl border p-3 text-sm ${note.startsWith('Rollback failed') ? 'border-red-200 bg-red-50 text-red-700' : 'border-blue-100 bg-blue-50 text-blue-800'}`}>{note}</p>}
      <DataState {...state} />
      {data && (
        <Table head={['Repository', 'Environment', 'Version', 'Commit', 'Status', 'Deployed', 'Live URL', '']}>
          {data.length ? data.map((deployment) => (
            <tr key={deployment.id}>
              <td className="font-medium">{deployment.repoName}</td><td>{deployment.environment}</td><td>{deployment.version}</td>
              <td className="font-mono">{deployment.commitHash}</td><td><Badge status={deployment.status} /></td><td>{when(deployment.deployedAt)}</td>
              <td>{deployment.url ? <a className="text-blue-700 underline" href={deployment.url} target="_blank" rel="noreferrer">open</a> : '-'}</td>
              <td>{deployment.status === 'active' && <button onClick={() => rollback(deployment)} className={`${btn} bg-slate-700`}>Roll back</button>}</td>
            </tr>
          )) : <tr><td colSpan="8" className="text-center text-slate-500">No deployments yet.</td></tr>}
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
  const [query, setQuery] = useState('')
  const fetchLogs = useCallback(() => (id ? api.getLogs(id) : Promise.resolve(null)), [id])
  const logs = usePoll(fetchLogs, 3000, live && Boolean(id))
  const lines = (logs.data || []).filter((line) => line.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Observability" title="Logs and monitoring" description="Follow pipeline output in real time." />
      <DataState {...runs} />
      {runs.data && runs.data.length === 0 && <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">No pipeline runs yet, so there are no logs to display.</p>}
      {runs.data && runs.data.length > 0 && <>
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
          <select aria-label="Pipeline run" value={id || ''} onChange={(event) => nav(`/logs/${event.target.value}`)} className="rounded border border-slate-300 bg-white px-3 py-2">
            {runs.data.map((pipeline) => <option key={pipeline.id} value={pipeline.id}>{pipeline.id} - {pipeline.repoName} ({pipeline.status})</option>)}
          </select>
          <input aria-label="Filter log lines" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter log lines" className="rounded border border-slate-300 px-3 py-2" />
          <label className="flex items-center gap-2"><input type="checkbox" checked={live} onChange={(event) => setLive(event.target.checked)} />Auto-refresh</label>
        </div>
        <DataState {...logs} />
        {logs.data && (
          <pre className="min-h-40 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950 p-5 text-sm leading-relaxed text-slate-100 shadow-xl">
            {logs.data.length === 0 ? 'No log lines yet. This pipeline may still be starting.' : lines.length ? lines.map((line, index) => (
              <div key={`${index}-${line}`} className={/error|fail/i.test(line) ? 'text-red-400' : ''}>{line}</div>
            )) : 'No log lines match your filter.'}
          </pre>
        )}
      </>}
    </div>
  )
}
