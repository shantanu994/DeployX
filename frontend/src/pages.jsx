import { useCallback, useEffect, useState } from 'react'
import { Fragment } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
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
  simulated: 'bg-violet-100 text-violet-800', inactive: 'bg-slate-100 text-slate-600',
}
const Badge = ({ status, label }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${STYLE[status] || 'bg-slate-100 text-slate-600'}`}><span className={`h-1.5 w-1.5 rounded-full bg-current opacity-70 ${status === 'running' ? 'animate-pulse' : ''}`} />{label || status.replace('_', ' ')}</span>
)
const when = (iso) => (iso ? new Date(iso).toLocaleString() : '-')
const secs = (ms) => (ms != null ? `${Math.round(ms / 1000)}s` : '-')
const stageSecs = (stage) => stage.startedAt && stage.finishedAt
  ? secs(new Date(stage.finishedAt) - new Date(stage.startedAt))
  : stage.startedAt ? 'In progress' : '-'

function DataState({ data, error, loading, warmingUp, reload }) {
  const hasData = data !== null
  const configError = error.includes('VITE_API_URL')

  if (!hasData && (loading || (error && !configError && warmingUp))) {
    return (
      <div role="status" className="space-y-3" aria-label="Loading workspace data">
        <div className="skeleton h-7 w-48 rounded-lg" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => <div key={item} className="surface-card h-28 p-4"><div className="skeleton h-4 w-24 rounded" /><div className="skeleton mt-5 h-7 w-16 rounded" /></div>)}
        </div>
      </div>
    )
  }

  if (error) {
    return <div role="alert" className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 text-sm ${hasData ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-red-200 bg-red-50 text-red-700'}`}><span>{hasData ? 'Could not refresh this data' : 'This data could not be loaded'}: {error}</span>{reload && <button onClick={reload} className="rounded-lg border border-current/20 px-3 py-1.5 text-xs font-semibold hover:bg-white/60">Try again</button>}</div>
  }

  return null
}

const Table = ({ head, children }) => (
  <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgb(15_23_42/.03)]">
    <table className="w-full min-w-[700px] text-left text-sm">
      <thead className="bg-slate-50/80 text-[10px] uppercase tracking-[0.12em] text-slate-500"><tr>{head.map((h) => <th key={h} className="whitespace-nowrap px-4 py-3.5 font-semibold">{h}</th>)}</tr></thead>
      <tbody className="[&>tr]:border-t [&>tr]:border-slate-100 [&>tr]:transition-colors [&>tr:hover]:bg-slate-50/80 [&_td]:px-4 [&_td]:py-3.5">{children}</tbody>
    </table>
  </div>
)
const btn = 'inline-flex items-center justify-center rounded-lg px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-40'
const PageHeader = ({ eyebrow, title, description, children }) => (
  <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
    <div><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">{eyebrow}</p><h1 className="text-[27px] font-bold tracking-[-0.035em] text-slate-950 sm:text-3xl">{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>}</div>
    {children}
  </div>
)

function Feedback({ message, error = false, onDismiss }) {
  useEffect(() => {
    if (!message) return undefined
    const timer = setTimeout(onDismiss, 3800)
    return () => clearTimeout(timer)
  }, [message, onDismiss])
  if (!message) return null
  return (
    <div role="status" className={`fixed right-4 top-20 z-50 flex max-w-[calc(100vw-2rem)] items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg ${error ? 'border-red-200 bg-white text-red-700' : 'border-slate-200 bg-white text-slate-700'}`}>
      <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${error ? 'bg-red-500' : 'bg-emerald-500'}`} />
      <span>{message}</span>
      <button onClick={onDismiss} aria-label="Dismiss notification" className="ml-1 text-slate-400 hover:text-slate-700">×</button>
    </div>
  )
}

function MetricIcon({ type }) {
  const icon = {
    projects: <><rect x="3" y="5" width="18" height="15" rx="2" /><path d="M8 5V3h8v2M3 10h18" /></>,
    runs: <><path d="M4 19V5m0 14h16" /><path d="m7 15 4-4 3 2 5-6" /></>,
    success: <><path d="m5 12 4 4L19 6" /><circle cx="12" cy="12" r="9" /></>,
    failed: <><path d="m8 8 8 8m0-8-8 8" /><circle cx="12" cy="12" r="9" /></>,
    deploy: <><path d="M12 3v12m0 0 5-5m-5 5-5-5" /><path d="M5 17v4h14v-4" /></>,
  }
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">{icon[type]}</svg>
}

const STAGE_ICONS = { checkout: '⌘', build: '⚒', test: '✓', docker_build: '▣', registry_push: '⇧', deploy: '↗' }

function PipelineFlow({ pipeline }) {
  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex min-w-[900px] items-stretch gap-2">
        {pipeline.stages.map((stage, index) => (
          <div className="flex min-w-0 flex-1 items-center gap-2" key={stage.id}>
            <article className={`min-w-0 flex-1 rounded-xl border px-3 py-3 ${stage.status === 'success' ? 'border-emerald-200 bg-emerald-50/70' : stage.status === 'failed' ? 'border-red-200 bg-red-50' : stage.status === 'running' ? 'pipeline-stage-running border-blue-200 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-center justify-between gap-2">
                <span className={`grid h-7 w-7 place-items-center rounded-lg text-sm font-bold ${stage.status === 'success' ? 'bg-emerald-100 text-emerald-700' : stage.status === 'failed' ? 'bg-red-100 text-red-700' : stage.status === 'running' ? 'bg-blue-100 text-blue-700' : 'bg-white text-slate-500'}`}>{STAGE_ICONS[stage.name] || '•'}</span>
                <span className={`h-1.5 w-1.5 rounded-full ${stage.status === 'success' ? 'bg-emerald-500' : stage.status === 'failed' ? 'bg-red-500' : stage.status === 'running' ? 'animate-pulse bg-blue-500' : 'bg-slate-300'}`} />
              </div>
              <p className="mt-3 truncate text-[11px] font-semibold uppercase tracking-wide text-slate-700">{stage.name.replace('_', ' ')}</p>
              <div className="mt-1 flex items-center justify-between gap-1">
                <span className="text-[10px] capitalize text-slate-500">{stage.status}</span>
                <span className="text-[10px] tabular-nums text-slate-400">{stageSecs(stage)}</span>
              </div>
            </article>
            {index < pipeline.stages.length - 1 && <span aria-hidden="true" className={`shrink-0 text-xs ${stage.status === 'success' ? 'text-emerald-400' : 'text-slate-300'}`}>›</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

function ActivityChart({ pipelines = [] }) {
  const ordered = [...pipelines].sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt))
  if (!ordered.length) {
    return <div className="grid h-48 place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 text-sm text-slate-500">Pipeline activity will appear here as runs are recorded.</div>
  }
  const groups = ordered.reduce((result, pipeline) => {
    const day = new Date(pipeline.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    const group = result.find((item) => item.day === day)
    if (group) group[pipeline.status === 'success' ? 'success' : pipeline.status === 'failed' ? 'failed' : 'other'] += 1
    else result.push({ day, success: pipeline.status === 'success' ? 1 : 0, failed: pipeline.status === 'failed' ? 1 : 0, other: ['success', 'failed'].includes(pipeline.status) ? 0 : 1 })
    return result
  }, [])
  const max = Math.max(1, ...groups.map((item) => item.success + item.failed + item.other))
  return (
    <div className="pt-3">
      <div className="flex items-center gap-4 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-emerald-500" />Successful</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-red-400" />Failed</span>
        {groups.some((item) => item.other > 0) && <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-blue-400" />In progress / other</span>}
        <span className="ml-auto">Last {ordered.length} recorded runs</span>
      </div>
      <div className="mt-4 flex h-40 items-end gap-3 border-b border-l border-slate-200 px-3 pb-0 pt-3 sm:gap-6">
        {groups.map((item, index) => {
          const count = item.success + item.failed + item.other
          const height = `${Math.max(14, (count / max) * 100)}%`
          return (
            <div key={`${item.day}-${index}`} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
              <span className="mb-1 text-[10px] font-semibold tabular-nums text-slate-500">{count}</span>
              <div className="flex w-full max-w-12 flex-col justify-end overflow-hidden rounded-t-md bg-slate-100" style={{ height }}>
                {item.other > 0 && <div className="bg-blue-400" style={{ height: `${(item.other / count) * 100}%` }} />}
                {item.failed > 0 && <div className="bg-red-400" style={{ height: `${(item.failed / count) * 100}%` }} />}
                {item.success > 0 && <div className="bg-emerald-500" style={{ height: `${(item.success / count) * 100}%` }} />}
              </div>
              <span className="mt-2 whitespace-nowrap text-[10px] text-slate-400">{item.day}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

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
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}

export function Dashboard() {
  const state = usePoll(api.getStats)
  const { user } = useAuth()
  const { data } = state
  const stats = data ? [
    { label: 'Total projects', value: data.metrics.totalProjects, note: 'Registered in workspace', icon: 'projects', color: 'blue' },
    { label: 'Pipeline runs', value: data.metrics.totalPipelines, note: 'Across all projects', icon: 'runs', color: 'violet' },
    { label: 'Successful runs', value: data.metrics.successfulPipelines, note: 'Completed in demo history', icon: 'success', color: 'emerald' },
    { label: 'Failed runs', value: data.metrics.failedPipelines, note: 'Need attention', icon: 'failed', color: 'rose' },
    { label: 'Active deployments', value: data.metrics.activeDeployments, note: 'Currently live', icon: 'deploy', color: 'cyan' },
  ] : []
  const colorStyles = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    violet: 'bg-violet-50 text-violet-700 ring-violet-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    rose: 'bg-rose-50 text-rose-700 ring-rose-100',
    cyan: 'bg-cyan-50 text-cyan-700 ring-cyan-100',
  }

  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Workspace overview" title="Good morning, Shantanu" description="Here's an overview of your deployment activity." />
      <DataState {...state} />
      {data && <>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {stats.map((stat) => (
            <article key={stat.label} className="surface-card group p-4 sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <div className={`grid h-10 w-10 place-items-center rounded-xl ring-1 ${colorStyles[stat.color]}`}><MetricIcon type={stat.icon} /></div>
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-200 transition group-hover:bg-blue-400" />
              </div>
              <div className="mt-4 text-[27px] font-bold tracking-tight text-slate-950">{stat.value}</div>
              <div className="mt-0.5 text-xs font-semibold text-slate-700">{stat.label}</div>
              <div className="mt-1 text-[11px] text-slate-400">{stat.note}</div>
            </article>
          ))}
        </div>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(250px,0.8fr)]">
          <section className="surface-card p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h2 className="text-base font-bold tracking-tight text-slate-900">Pipeline activity</h2><p className="mt-1 text-xs text-slate-500">Run outcomes over time from the latest activity.</p></div>
              <Link to="/pipelines" className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-blue-200 hover:text-blue-700">Pipeline history</Link>
            </div>
            <ActivityChart pipelines={data.recentPipelines} />
          </section>
          <section className="surface-card p-5 sm:p-6">
            <h2 className="text-base font-bold tracking-tight text-slate-900">Quick actions</h2>
            <p className="mt-1 text-xs text-slate-500">Jump back into your workflow.</p>
            <div className="mt-5 space-y-2">
              <Link to="/projects" className="group flex items-center justify-between rounded-xl border border-slate-200 p-3 transition hover:border-blue-200 hover:bg-blue-50/50">
                <span className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-700"><MetricIcon type="projects" /></span><span><b className="block text-xs text-slate-800">Browse projects</b><small className="text-[11px] text-slate-500">Manage connected applications</small></span></span><span className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600">→</span>
              </Link>
              <Link to="/pipelines" className="group flex items-center justify-between rounded-xl border border-slate-200 p-3 transition hover:border-blue-200 hover:bg-blue-50/50">
                <span className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-violet-50 text-violet-700"><MetricIcon type="runs" /></span><span><b className="block text-xs text-slate-800">Start a pipeline</b><small className="text-[11px] text-slate-500">Run a project workflow</small></span></span><span className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600">→</span>
              </Link>
              <Link to="/logs" className="group flex items-center justify-between rounded-xl border border-slate-200 p-3 transition hover:border-blue-200 hover:bg-blue-50/50">
                <span className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-600"><span className="font-mono text-sm">{'>_'}</span></span><span><b className="block text-xs text-slate-800">Inspect logs</b><small className="text-[11px] text-slate-500">Follow pipeline activity</small></span></span><span className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600">→</span>
              </Link>
            </div>
            {user?.name && <p className="mt-4 border-t border-slate-100 pt-3 text-[11px] text-slate-400">Signed in as {user.name}</p>}
          </section>
        </div>
        <section className="space-y-3">
          <div className="flex items-center justify-between"><div><h2 className="text-base font-bold tracking-tight">Recent pipeline runs</h2><p className="mt-1 text-xs text-slate-500">Latest activity across registered projects and repositories.</p></div><Link to="/pipelines" className="text-xs font-semibold text-blue-700 hover:text-blue-800">View all →</Link></div>
          <Table head={['Run', 'Project / repository', 'Branch', 'Trigger', 'Status', 'Started']}>
            {data.recentPipelines.length ? data.recentPipelines.map((pipeline) => (
              <tr key={pipeline.id}><td className="font-mono text-xs font-semibold text-slate-700">{pipeline.id}</td><td>{pipeline.projectId ? <Link className="font-medium text-slate-800 hover:text-blue-700" to={`/projects/${pipeline.projectId}`}>{pipeline.repoName}</Link> : pipeline.repoName}</td><td><span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px]">{pipeline.branch}</span></td><td className="capitalize text-slate-500">{pipeline.trigger}</td><td><Badge status={pipeline.status} label={pipeline.executionMode === 'simulation' ? `Demo · ${pipeline.status}` : undefined} /></td><td className="text-xs text-slate-500">{when(pipeline.startedAt)}</td></tr>
            )) : <tr><td colSpan="6" className="py-8 text-center text-slate-500">No pipeline runs yet. Start one from a project to see activity here.</td></tr>}
          </Table>
        </section>
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div><h2 className="text-base font-bold tracking-tight">Projects overview</h2><p className="mt-1 text-xs text-slate-500">Your registered applications at a glance.</p></div>
            <Link to="/projects" className="text-xs font-semibold text-blue-700 hover:text-blue-800">View all →</Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {data.projects.map((project) => (
              <article key={project.id} className="surface-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 font-bold text-blue-700">{project.name.split(' ').map((word) => word[0]).join('').slice(0, 2)}</span>
                    <div className="min-w-0"><Link to={`/projects/${project.id}`} className="truncate font-bold text-slate-950 hover:text-blue-700">{project.name}</Link><p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{project.description}</p></div>
                  </div>
                  <Badge status={project.status} />
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                  <span>{project.platform} <span className="mx-1.5 text-slate-300">·</span>{project.pipelineRunsCount} runs</span>
                  <Link to={`/pipelines?projectId=${project.id}`} className="font-semibold text-blue-700">View pipeline →</Link>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="space-y-3">
          <div><h2 className="text-base font-bold tracking-tight">Recent deployments</h2><p className="mt-1 text-xs text-slate-500">Live releases and recorded demo activity.</p></div>
          <Table head={['Project / repository', 'Environment', 'Deployment', 'Status', 'Date', 'Link']}>
            {data.recentDeployments?.length ? data.recentDeployments.map((deployment) => (
              <tr key={deployment.id}><td className="font-medium">{deployment.projectId ? <Link className="text-slate-800 hover:text-blue-700" to={`/projects/${deployment.projectId}`}>{deployment.repoName}</Link> : deployment.repoName}</td><td>{deployment.environment}</td><td className="font-mono text-xs">{deployment.id}</td>
                <td><Badge status={deployment.status} /></td><td className="text-xs text-slate-500">{deployment.deployedAt ? when(deployment.deployedAt) : 'Date unavailable'}</td>
                <td>{deployment.url ? <a className="text-xs font-semibold text-blue-700 hover:underline" href={deployment.url} target="_blank" rel="noreferrer">Open ↗</a> : '—'}</td></tr>
            )) : <tr><td colSpan="6" className="py-8 text-center text-slate-500">No deployment activity recorded yet.</td></tr>}
          </Table>
        </section>
      </>}
    </div>
  )
}

export function Pipelines() {
  const repos = usePoll(api.getRepos, 60000, false)
  const projects = usePoll(api.getProjects, 60000, false)
  const [searchParams] = useSearchParams()
  const [targetType, setTargetType] = useState('project')
  const [projectId, setProjectId] = useState(() => searchParams.get('projectId') || '')
  const [repoId, setRepoId] = useState('')
  const [note, setNote] = useState('')
  const [noticeError, setNoticeError] = useState(false)
  const chosenProject = projectId || projects.data?.projects?.[0]?.id
  const chosenRepo = repoId || repos.data?.[0]?.id
  const loadRuns = useCallback(
    () => {
      if (targetType === 'project') return chosenProject ? api.getPipelines({ projectId: chosenProject }) : Promise.resolve([])
      return chosenRepo ? api.getPipelines({ repoId: chosenRepo }) : Promise.resolve([])
    },
    [targetType, chosenProject, chosenRepo],
  )
  const runs = usePoll(loadRuns, 3000)
  const visibleRuns = runs.data?.filter((pipeline) =>
    targetType === 'project' ? pipeline.projectId === chosenProject : pipeline.repoId === chosenRepo
  )
  const act = async (action, successMessage) => {
    try {
      await action()
      setNote(successMessage)
      setNoticeError(false)
    } catch (actionError) {
      setNote(`Action failed: ${actionError.message}`)
      setNoticeError(true)
    }
    runs.reload()
  }
  const chosen = targetType === 'project' ? chosenProject : chosenRepo

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Delivery" title="Pipelines" description="Trigger builds, monitor stages, and inspect every run." />
      <Feedback message={note} error={noticeError} onDismiss={() => setNote('')} />
      {targetType === 'project' ? <DataState {...projects} /> : <DataState {...repos} />}
      <div className="surface-card flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:p-4">
        <div className="flex flex-1 flex-wrap items-center gap-2">
        <select aria-label="Pipeline target type" value={targetType} onChange={(event) => setTargetType(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10">
          <option value="project">Project</option><option value="repository">Repository</option>
        </select>
        {targetType === 'project' ? (
          <select aria-label="Project" value={chosenProject || ''} onChange={(event) => setProjectId(event.target.value)} className="min-w-52 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10">
            {(projects.data?.projects || []).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        ) : (
          <select aria-label="Repository" value={chosenRepo || ''} onChange={(event) => setRepoId(event.target.value)} className="min-w-52 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10">
            {(repos.data || []).map((repository) => <option key={repository.id} value={repository.id}>{repository.name}</option>)}
          </select>
        )}
        </div>
        <button disabled={!chosen} onClick={() => act(
          () => targetType === 'project' ? api.runProjectPipeline(chosen) : api.runPipeline(chosen),
          'Demo pipeline queued',
        )} className={`${btn} gap-2 bg-blue-600 px-4 py-2.5 text-sm hover:bg-blue-700`}><span aria-hidden="true">▶</span> Run pipeline</button>
      </div>
      <DataState {...runs} />
      {visibleRuns && (
        visibleRuns.length ? (
          <div className="space-y-4">
            {visibleRuns.map((pipeline) => {
              const completeStages = pipeline.stages.filter((stage) => ['success', 'failed', 'cancelled', 'skipped'].includes(stage.status)).length
              return (
                <article key={pipeline.id} className="surface-card overflow-hidden p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl ${pipeline.status === 'failed' ? 'bg-red-50 text-red-600' : pipeline.status === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}><MetricIcon type={pipeline.status === 'failed' ? 'failed' : 'runs'} /></span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2"><h2 className="font-mono text-sm font-bold text-slate-900">{pipeline.id}</h2><Badge status={pipeline.status} label={pipeline.executionMode === 'simulation' ? `Demo · ${pipeline.status}` : undefined} /></div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                          {pipeline.projectId ? <Link className="font-semibold text-blue-700 hover:underline" to={`/projects/${pipeline.projectId}`}>{pipeline.repoName}</Link> : <span className="font-semibold text-slate-700">{pipeline.repoName}</span>}
                          <span className="text-slate-300">·</span><span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">{pipeline.branch}</span>
                          <span className="text-slate-300">·</span><span className="font-mono">{pipeline.commitHash}</span>
                        </div>
                        <p className="mt-1.5 line-clamp-1 text-xs text-slate-400">{pipeline.commitMessage}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/logs/${pipeline.id}`} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-blue-200 hover:text-blue-700">View logs</Link>
                      {(pipeline.status === 'running' || pipeline.status === 'queued') && <button onClick={() => act(() => api.cancelPipeline(pipeline.id), 'Pipeline cancelled')} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-red-200 hover:text-red-700">Cancel</button>}
                      <button onClick={() => act(() => api.retryPipeline(pipeline.id), 'Demo pipeline queued again')} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700"><span aria-hidden="true">↻</span> Retry</button>
                    </div>
                  </div>
                  <div className="mt-5 border-t border-slate-100 pt-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400">Pipeline stages <span className="ml-1 font-medium normal-case tracking-normal text-slate-500">{completeStages}/6 complete</span></p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400"><span>{pipeline.trigger} trigger</span><span>Started {when(pipeline.startedAt)}</span><span>{secs(pipeline.durationMs)}</span></div>
                    </div>
                    <PipelineFlow pipeline={pipeline} />
                  </div>
                </article>
              )
            })}
          </div>
        ) : <div className="surface-card grid min-h-56 place-items-center p-8 text-center"><div><span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-700"><MetricIcon type="runs" /></span><p className="mt-3 font-semibold text-slate-800">No pipeline runs yet</p><p className="mt-1 text-sm text-slate-500">Choose a project above to start its first run.</p></div></div>
      )}
    </div>
  )
}

export function Projects() {
  const state = usePoll(api.getProjects)
  const projects = state.data?.projects
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const visibleProjects = (projects || []).filter((project) => {
    const matchesText = `${project.name} ${project.description} ${project.platform}`.toLowerCase().includes(query.toLowerCase())
    return matchesText && (statusFilter === 'all' || project.status === statusFilter)
  })

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Workspace" title="Projects" description="Your applications, deployments, and delivery activity in one place." >
        {projects && <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-sm"><span className="font-semibold text-slate-800">{projects.length}</span> registered projects</div>}
      </PageHeader>
      <DataState {...state} />
      {projects && (
        projects.length ? (
          <>
            <div className="surface-card flex flex-col gap-3 p-3 sm:flex-row">
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">Search projects</span>
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects" className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-500/10" />
              </label>
              <label className="sm:w-44"><span className="sr-only">Filter project status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10"><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
            </div>
            {visibleProjects.length ? <div className="grid gap-5 xl:grid-cols-2">
            {visibleProjects.map((project, index) => (
              <article key={project.id} className="surface-card group relative overflow-hidden p-5 sm:p-6">
                <div className={`absolute inset-x-0 top-0 h-1 ${index % 2 ? 'bg-gradient-to-r from-indigo-400 to-blue-500' : 'bg-gradient-to-r from-cyan-400 to-blue-500'}`} />
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-4">
                    <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl font-bold shadow-sm ring-1 ${index % 2 ? 'bg-indigo-50 text-indigo-700 ring-indigo-100' : 'bg-blue-50 text-blue-700 ring-blue-100'}`}>{project.name.split(' ').map((word) => word[0]).join('').slice(0, 2)}</span>
                    <div className="min-w-0">
                      <Link to={`/projects/${project.id}`} className="text-lg font-bold tracking-tight text-slate-950 hover:text-blue-700">{project.name}</Link>
                      <p className="mt-1 max-w-lg text-sm leading-5 text-slate-500">{project.description}</p>
                    </div>
                  </div>
                  <Badge status={project.status} />
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50/80 p-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Platform</p><p className="mt-1.5 text-sm font-semibold text-slate-800">{project.platform}</p></div>
                  <div className="rounded-xl bg-slate-50/80 p-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Pipeline runs</p><p className="mt-1.5 text-sm font-semibold text-slate-800">{project.pipelineRunsCount}</p></div>
                  <div className="col-span-2 rounded-xl bg-slate-50/80 p-3 sm:col-span-1"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Last deployment</p><p className="mt-1.5 truncate text-xs font-semibold text-slate-800">{project.lastDeployment?.source === 'external' ? 'Live · timestamp unavailable' : project.lastDeployment?.source === 'simulation' ? `Demo record · ${when(project.lastDeployment.deployedAt)}` : 'No deployment recorded'}</p></div>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                  <a href={project.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-900/10 hover:bg-blue-700">Live website <span aria-hidden="true">↗</span></a>
                  <Link to={`/pipelines?projectId=${project.id}`} className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50/50 hover:text-blue-700">View pipeline</Link>
                  <Link to={`/projects/${project.id}`} className="ml-auto rounded-lg px-3 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800">Details →</Link>
                </div>
              </article>
            ))}
            </div> : <div className="surface-card grid min-h-56 place-items-center p-8 text-center"><div><p className="font-semibold text-slate-800">No matching projects</p><p className="mt-1 text-sm text-slate-500">Try another search or status filter.</p><button onClick={() => { setQuery(''); setStatusFilter('all') }} className="mt-4 text-xs font-semibold text-blue-700">Clear filters</button></div></div>}
          </>
        ) : <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">No projects are registered yet.</p>
      )}
    </div>
  )
}

export function ProjectDetails() {
  const { projectId } = useParams()
  const loadProject = useCallback(() => api.getProject(projectId), [projectId])
  const state = usePoll(loadProject, 5000)
  const [note, setNote] = useState('')
  const [noticeError, setNoticeError] = useState(false)
  const details = state.data?.project?.id === projectId ? state.data : null
  const project = details?.project
  const pipelines = details?.pipelines || []
  const deployments = details?.deployments || []
  const successfulRuns = pipelines.filter((pipeline) => pipeline.status === 'success').length
  const failedRuns = pipelines.filter((pipeline) => pipeline.status === 'failed').length

  const runPipeline = async () => {
    try {
      await api.runProjectPipeline(project.id)
      setNote('Pipeline run added to the project history')
      setNoticeError(false)
      state.reload()
    } catch (error) {
      setNote(`Could not start pipeline: ${error.message}`)
      setNoticeError(true)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Project details" title={project?.name || 'Project'} description={project?.description}>
        {project && <div className="flex flex-wrap gap-2">
          <a href={project.url} target="_blank" rel="noreferrer" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Open live website</a>
          <button onClick={runPipeline} className="rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">Run pipeline</button>
        </div>}
      </PageHeader>
      <Feedback message={note} error={noticeError} onDismiss={() => setNote('')} />
      <DataState {...state} data={details} />
      {project && <>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['Project status', <Badge status={project.status} />],
            ['Platform', project.platform],
            ['Pipeline runs', project.pipelineRunsCount],
            ['Last deployment', project.lastDeployment?.source === 'simulation' ? `Simulated · ${when(project.lastDeployment.deployedAt)}` : project.lastDeployment?.deployedAt ? when(project.lastDeployment.deployedAt) : project.lastDeployment?.source === 'external' ? 'Timestamp unavailable' : 'Not recorded'],
          ].map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-medium text-slate-500">{label}</p><div className="mt-2 text-lg font-bold text-slate-950">{value}</div></div>)}
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-lg font-bold">Project information</h2><p className="mt-1 text-sm text-slate-500">Independent project configuration and live deployment details.</p></div>
            <Badge status={project.status} />
          </div>
          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
            <div><dt className="text-slate-500">Name</dt><dd className="mt-1 font-semibold">{project.name}</dd></div>
            <div><dt className="text-slate-500">Deployment platform</dt><dd className="mt-1 font-semibold">{project.platform}</dd></div>
            <div className="min-w-0"><dt className="text-slate-500">Live deployment URL</dt><dd className="mt-1 truncate"><a href={project.url} target="_blank" rel="noreferrer" className="font-semibold text-blue-700 underline">{project.url}</a></dd></div>
            <div><dt className="text-slate-500">Last deployment</dt><dd className="mt-1 font-semibold">{project.lastDeployment?.source === 'external' ? 'Existing Vercel deployment; exact timestamp not provided' : project.lastDeployment?.source === 'simulation' ? `Simulated · ${when(project.lastDeployment.deployedAt)}` : project.lastDeployment?.deployedAt ? when(project.lastDeployment.deployedAt) : 'Not recorded'}</dd></div>
            <div><dt className="text-slate-500">Pipeline outcomes</dt><dd className="mt-1 font-semibold"><span className="text-green-700">{successfulRuns} successful</span> · <span className="text-red-700">{failedRuns} failed</span></dd></div>
            <div><dt className="text-slate-500">Source repository</dt><dd className="mt-1 font-semibold">{project.sourceRepositoryUrl || 'Not connected'}</dd></div>
          </dl>
        </section>
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">Pipeline execution history</h2><Link to={`/pipelines?projectId=${project.id}`} className="text-sm font-semibold text-blue-700">Open project pipeline →</Link></div>
          <Table head={['Run', 'Status', 'Stages', 'Duration', 'Started', 'Logs']}>
            {pipelines.length ? pipelines.map((pipeline) => (
              <tr key={pipeline.id}>
                <td className="font-medium">{pipeline.id}</td>
                <td><Badge status={pipeline.status} label={pipeline.executionMode === 'simulation' ? `Demo · ${pipeline.status}` : undefined} /></td>
                <td><div className="flex max-w-[360px] flex-wrap gap-1">{pipeline.stages.map((stage) => <span key={stage.id} className={`rounded px-1.5 py-0.5 text-[10px] ${STYLE[stage.status] || 'bg-slate-100 text-slate-600'}`} title={`${stage.name}: ${stage.status}`}>{stage.name.replace('_', ' ')}</span>)}</div></td>
                <td>{secs(pipeline.durationMs)}</td><td>{when(pipeline.startedAt)}</td><td><Link to={`/logs/${pipeline.id}`} className="font-semibold text-blue-700 underline">View logs</Link></td>
              </tr>
            )) : <tr><td colSpan="6" className="text-center text-slate-500">No pipeline runs yet. Start a simulation to build this project’s history.</td></tr>}
          </Table>
        </section>
        <section className="space-y-3">
          <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Deployment history</h2><Link to={`/deployments?projectId=${project.id}`} className="text-sm font-semibold text-blue-700">View all →</Link></div>
          <Table head={['Version', 'Environment', 'Status', 'Timestamp', 'Source', 'Live URL']}>
            {deployments.length ? deployments.map((deployment) => (
              <tr key={deployment.id}><td className="font-medium">{deployment.version}</td><td>{deployment.environment}</td><td><Badge status={deployment.status} /></td>
                <td>{deployment.deployedAt ? when(deployment.deployedAt) : deployment.source === 'external' ? 'Timestamp unavailable' : '-'}</td><td className="capitalize">{deployment.source}</td>
                <td>{deployment.url ? <a href={deployment.url} target="_blank" rel="noreferrer" className="text-blue-700 underline">Open</a> : '-'}</td>
              </tr>
            )) : <tr><td colSpan="6" className="text-center text-slate-500">No deployment history is available.</td></tr>}
          </Table>
        </section>
        <section className="space-y-3">
          <h2 className="text-lg font-bold">Recent logs</h2>
          {details.recentLogs.length ? (
            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-100 shadow-xl">
              {details.recentLogs.map((entry, index) => <div key={`${entry.pipelineId}-${entry.stage}-${index}`} className="py-1"><span className="text-blue-300">[{entry.pipelineId} · {entry.stage}]</span> {entry.message}</div>)}
            </div>
          ) : <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">No logs yet. Run a pipeline simulation to generate project-scoped logs.</p>}
        </section>
      </>}
    </div>
  )
}

export function Deployments() {
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId') || ''
  const loadDeployments = useCallback(() => api.getDeployments({ projectId }), [projectId])
  const state = usePoll(loadDeployments)
  const pipelineRuns = usePoll(api.getPipelines, 10000)
  const { reload } = state
  const data = state.data?.filter((deployment) => !projectId || deployment.projectId === projectId)
  const [note, setNote] = useState('')
  const [noticeError, setNoticeError] = useState(false)
  const [expanded, setExpanded] = useState('')
  const pipelineById = new Map((pipelineRuns.data || []).map((pipeline) => [pipeline.id, pipeline]))
  const rollback = async (deployment) => {
    try {
      await api.rollback(deployment.id)
      setNote(`Rollback record created for ${deployment.repoName}`)
      setNoticeError(false)
    } catch (error) {
      setNote(`Rollback failed: ${error.message}`)
      setNoticeError(true)
    }
    reload()
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Release management" title="Deployments" description="Track what’s live and safely roll back when needed." />
      <Feedback message={note} error={noticeError} onDismiss={() => setNote('')} />
      <DataState {...state} />
      {data && (
        data.length ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500"><span>{data.length} deployment records</span><span>Newest activity first</span></div>
            <Table head={['Deployment / project', 'Environment', 'Branch', 'Status', 'Commit', 'Deployed', 'Actions']}>
              {data.map((deployment) => {
                const pipeline = pipelineById.get(deployment.pipelineId)
                return (
                  <Fragment key={deployment.id}>
                    <tr>
                      <td>
                        <div className="flex items-center gap-3">
                          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${deployment.status === 'failed' ? 'bg-red-50 text-red-600' : deployment.status === 'active' ? 'bg-emerald-50 text-emerald-700' : deployment.status === 'simulated' ? 'bg-violet-50 text-violet-700' : 'bg-slate-100 text-slate-500'}`}><MetricIcon type="deploy" /></span>
                          <div className="min-w-0">
                            {deployment.projectId ? <Link to={`/projects/${deployment.projectId}`} className="block truncate font-semibold text-slate-800 hover:text-blue-700">{deployment.repoName}</Link> : <span className="block truncate font-semibold text-slate-800">{deployment.repoName}</span>}
                            <span className="mt-0.5 block font-mono text-[10px] text-slate-400">{deployment.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="text-xs text-slate-600">{deployment.environment}</td>
                      <td>{pipeline ? <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px]">{pipeline.branch}</span> : <span className="text-xs text-slate-400">—</span>}</td>
                      <td><Badge status={deployment.status} /></td>
                      <td className="font-mono text-xs text-slate-600">{deployment.commitHash || '—'}</td>
                      <td className="whitespace-nowrap text-xs text-slate-500">{deployment.deployedAt ? when(deployment.deployedAt) : 'Date unavailable'}</td>
                      <td><div className="flex items-center gap-2">
                        <button onClick={() => setExpanded(expanded === deployment.id ? '' : deployment.id)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">{expanded === deployment.id ? 'Hide' : 'Details'}</button>
                        {deployment.url && <a className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-blue-700" href={deployment.url} target="_blank" rel="noreferrer">Open ↗</a>}
                        {deployment.status === 'active' && deployment.source !== 'external' && <button onClick={() => rollback(deployment)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:border-amber-200 hover:text-amber-700">Rollback</button>}
                      </div></td>
                    </tr>
                    {expanded === deployment.id && <tr><td colSpan="7" className="!bg-slate-50/70">
                      <div className="grid gap-3 py-1 text-xs sm:grid-cols-2 lg:grid-cols-4">
                        <div><p className="text-slate-400">Deployment ID</p><p className="mt-1 break-all font-mono text-slate-700">{deployment.id}</p></div>
                        <div><p className="text-slate-400">Pipeline</p>{deployment.pipelineId ? <Link to={`/logs/${deployment.pipelineId}`} className="mt-1 inline-block font-mono text-blue-700 hover:underline">{deployment.pipelineId} · View logs</Link> : <p className="mt-1 text-slate-700">External deployment record</p>}</div>
                        <div><p className="text-slate-400">Source</p><p className="mt-1 capitalize text-slate-700">{deployment.source || 'Pipeline'}</p></div>
                        <div><p className="text-slate-400">Deployment URL</p>{deployment.url ? <a href={deployment.url} target="_blank" rel="noreferrer" className="mt-1 block truncate text-blue-700 hover:underline">{deployment.url}</a> : <p className="mt-1 text-slate-700">Not recorded</p>}</div>
                      </div>
                    </td></tr>}
                  </Fragment>
                )
              })}
            </Table>
          </div>
        ) : <div className="surface-card grid min-h-56 place-items-center p-8 text-center"><div><span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-slate-500"><MetricIcon type="deploy" /></span><p className="mt-3 font-semibold text-slate-800">No deployments found</p><p className="mt-1 text-sm text-slate-500">Deployment history will appear here after project activity.</p></div></div>
      )}
    </div>
  )
}

function presentLog(line) {
  const stageMatch = line.match(/^\[([^\]]+)\]\s*/)
  const stage = stageMatch?.[1] || 'SYSTEM'
  let message = stageMatch ? line.slice(stageMatch[0].length) : line
  const timeMatch = message.match(/^\[(\d{4}-\d\d-\d\dT[^\]]+)\]\s*/)
  const timestamp = timeMatch ? new Date(timeMatch[1]).toLocaleTimeString() : ''
  if (timeMatch) message = message.slice(timeMatch[0].length)
  const lower = message.toLowerCase()
  const level = /error|failed|failure/.test(lower) ? 'ERROR'
    : /warn|cancel|pending/.test(lower) ? 'WARN'
      : /success|complete|passed/.test(lower) ? 'SUCCESS' : 'INFO'
  return { stage, message, timestamp, level }
}

export function Logs() {
  const { buildId } = useParams()
  const nav = useNavigate()
  const runs = usePoll(api.getPipelines, 10000)
  const id = buildId || runs.data?.[0]?.id
  const [live, setLive] = useState(true)
  const [query, setQuery] = useState('')
  const [stageFilter, setStageFilter] = useState('all')
  const [levelFilter, setLevelFilter] = useState('all')
  const fetchLogs = useCallback(async () => (
    id ? { pipelineId: id, lines: await api.getLogs(id) } : { pipelineId: null, lines: [] }
  ), [id])
  const logs = usePoll(fetchLogs, 3000, live && Boolean(id))
  const currentLogs = logs.data && logs.data.pipelineId === id ? logs.data.lines : []
  const entries = currentLogs.map(presentLog)
  const stages = [...new Set(entries.map((entry) => entry.stage))]
  const lines = entries.filter((entry) =>
    entry.message.toLowerCase().includes(query.toLowerCase()) &&
    (stageFilter === 'all' || entry.stage.toLowerCase() === stageFilter.toLowerCase()) &&
    (levelFilter === 'all' || entry.level === levelFilter)
  )
  const levelStyles = {
    INFO: 'bg-blue-400/10 text-blue-300',
    SUCCESS: 'bg-emerald-400/10 text-emerald-300',
    WARN: 'bg-amber-400/10 text-amber-300',
    ERROR: 'bg-red-400/10 text-red-300',
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Observability" title="Logs & monitoring" description="Search, filter, and inspect output from every pipeline run." />
      <DataState {...runs} />
      {runs.data && runs.data.length === 0 && <div className="surface-card grid min-h-56 place-items-center p-8 text-center"><div><span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-slate-100 font-mono text-slate-600">{'>_'}</span><p className="mt-3 font-semibold text-slate-800">No pipeline logs yet</p><p className="mt-1 text-sm text-slate-500">Start a pipeline to see its output here.</p><Link to="/pipelines" className="mt-4 inline-block text-xs font-semibold text-blue-700">Go to pipelines →</Link></div></div>}
      {runs.data && runs.data.length > 0 && <>
        <div className="surface-card flex flex-col gap-3 p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-2">
            <label className="min-w-0 flex-1 sm:min-w-64"><span className="sr-only">Pipeline run</span>
              <select aria-label="Pipeline run" value={id || ''} onChange={(event) => nav(`/logs/${event.target.value}`)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10">
                {runs.data.map((pipeline) => <option key={pipeline.id} value={pipeline.id}>{pipeline.id} — {pipeline.repoName} ({pipeline.status})</option>)}
              </select>
            </label>
            <label className="relative min-w-48 flex-1"><span className="sr-only">Search log output</span>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
              <input aria-label="Filter log lines" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search output" className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10" />
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <div className="flex flex-wrap gap-2">
              <select aria-label="Filter by stage" value={stageFilter} onChange={(event) => setStageFilter(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"><option value="all">All stages</option>{stages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}</select>
              <select aria-label="Filter by log level" value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"><option value="all">All levels</option><option value="INFO">Info</option><option value="SUCCESS">Success</option><option value="WARN">Warning</option><option value="ERROR">Error</option></select>
              <span className="inline-flex items-center px-1 text-[11px] text-slate-400">{lines.length} entries</span>
            </div>
            <button type="button" role="switch" aria-checked={live} onClick={() => setLive((value) => !value)} className="inline-flex items-center gap-2 text-xs font-medium text-slate-600">
              <span className={`relative h-5 w-9 rounded-full transition ${live ? 'bg-blue-600' : 'bg-slate-300'}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition ${live ? 'left-[18px]' : 'left-0.5'}`} /></span>
              Live refresh
            </button>
          </div>
        </div>
        <DataState {...logs} data={logs.data?.pipelineId === id ? logs.data : null} />
        {logs.data?.pipelineId === id && (
          <section className="overflow-hidden rounded-2xl border border-[#202c3e] bg-[#0b1220] shadow-[0_16px_40px_rgb(15_23_42/.12)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] bg-[#101a2b] px-4 py-3">
              <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#f87171]" /><span className="h-2.5 w-2.5 rounded-full bg-[#fbbf24]" /><span className="h-2.5 w-2.5 rounded-full bg-[#34d399]" /><span className="ml-2 font-mono text-[11px] text-slate-400">{id} / output</span></div>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-500"><span className={`h-1.5 w-1.5 rounded-full ${live ? 'animate-pulse bg-emerald-400' : 'bg-slate-500'}`} />{live ? 'Streaming' : 'Paused'}</span>
            </div>
            <div className="max-h-[560px] min-h-56 overflow-auto p-3 font-mono text-[11px] leading-6 sm:p-5 sm:text-xs">
              {!entries.length ? <p className="py-5 text-center text-slate-500">Waiting for the first log entries…</p> : !lines.length ? <p className="py-5 text-center text-slate-500">No entries match these filters.</p> : lines.map((entry, index) => (
                <div key={`${index}-${entry.message}`} className="grid grid-cols-[52px_58px_78px_minmax(0,1fr)] items-start gap-2 border-b border-white/[0.035] py-1.5 last:border-0 sm:grid-cols-[64px_64px_88px_minmax(0,1fr)] sm:gap-3">
                  <span className="pt-0.5 text-right tabular-nums text-slate-600">{String(index + 1).padStart(2, '0')}</span>
                  <span className="pt-0.5 text-slate-500">{entry.timestamp || '—'}</span>
                  <span className={`w-fit rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wide ${levelStyles[entry.level]}`}>{entry.level}</span>
                  <span className="min-w-0 break-words text-slate-300"><span className="mr-2 text-blue-300/80">[{entry.stage}]</span>{entry.message}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-white/[0.07] px-4 py-2 text-[10px] text-slate-500"><span>{runs.data.find((pipeline) => pipeline.id === id)?.repoName || 'Pipeline output'}</span><span>{lines.length} visible</span></div>
          </section>
        )}
      </>}
    </div>
  )
}
