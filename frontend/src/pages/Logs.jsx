import { useState } from 'react'
import Layout from '../components/Layout/Layout'
import Header from '../components/Layout/Header'
import StatCard from '../components/Common/StatCard'
import LoadingSpinner from '../components/Common/LoadingSpinner'
import EmptyState from '../components/Common/EmptyState'
import { useApi } from '../hooks/useApi'
import { fetchLogs, fetchLogSummary, fetchLogServices } from '../services/api'
import { ScrollText, Search, ChevronRight, AlertTriangle, Info, AlertCircle } from 'lucide-react'
import { REFRESH_INTERVALS } from '../utils/constants'
import { relativeTime } from '../utils/helpers'
import clsx from 'clsx'

const LEVEL_STYLES = {
  ERROR:   { badge: 'badge-red',    icon: AlertCircle,   text: 'text-red-400',    bg: 'bg-red-500/5'    },
  WARNING: { badge: 'badge-yellow', icon: AlertTriangle, text: 'text-amber-400',  bg: 'bg-amber-500/5'  },
  INFO:    { badge: 'badge-blue',   icon: Info,          text: 'text-blue-400',   bg: 'bg-blue-500/5'   },
}

function LogEntry({ log, expanded, onToggle }) {
  const style = LEVEL_STYLES[log.level] || LEVEL_STYLES.INFO
  const Icon  = style.icon
  return (
    <div
      className={clsx('border-b border-slate-800 hover:bg-slate-800/40 cursor-pointer transition-colors', expanded && style.bg)}
      onClick={onToggle}
    >
      <div className="flex items-center gap-3 px-4 py-2.5">
        <Icon size={13} className={clsx('shrink-0', style.text)} />
        <span className="text-[10px] font-mono text-slate-600 w-20 shrink-0">
          {new Date(log.timestamp).toTimeString().slice(0, 8)}
        </span>
        <span className={clsx('text-[10px] font-mono w-16 shrink-0', style.text)}>{log.level}</span>
        <span className="text-xs text-blue-400/80 w-32 shrink-0 truncate font-medium">{log.service}</span>
        <span className="badge-slate text-[10px] shrink-0">{log.environment}</span>
        <span className="flex-1 text-xs text-slate-300 truncate">{log.message}</span>
        <ChevronRight size={12} className={clsx('text-slate-600 shrink-0 transition-transform', expanded && 'rotate-90')} />
      </div>
      {expanded && (
        <div className="px-4 pb-3 space-y-1.5 text-xs text-slate-400 font-mono">
          <div><span className="text-slate-600">pod:     </span><span className="text-slate-300">{log.pod}</span></div>
          <div><span className="text-slate-600">ns:      </span><span className="text-slate-300">{log.namespace}</span></div>
          <div><span className="text-slate-600">trace:   </span><span className="text-slate-500">{log.trace_id}</span></div>
          <div><span className="text-slate-600">time:    </span><span className="text-slate-300">{log.timestamp}</span></div>
          <div className="pt-1"><span className="text-slate-600">message: </span><span className="text-slate-300 break-all">{log.message}</span></div>
        </div>
      )}
    </div>
  )
}

export default function Logs() {
  const [search, setSearch]   = useState('')
  const [level, setLevel]     = useState('')
  const [service, setService] = useState('')
  const [env, setEnv]         = useState('')
  const [expanded, setExpanded] = useState(null)

  const { data: summaryData } = useApi(fetchLogSummary, [], { interval: REFRESH_INTERVALS.logs })
  const { data: svcData }     = useApi(fetchLogServices, [], { interval: REFRESH_INTERVALS.logs })
  const { data, loading, refetch, lastUpdated } = useApi(
    () => fetchLogs({ level: level || undefined, service: service || undefined, environment: env || undefined, search: search || undefined, limit: 200 }),
    [level, service, env, search],
    { interval: REFRESH_INTERVALS.logs }
  )

  const summary = summaryData
  const logs    = data?.logs ?? []
  const services = svcData?.services ?? []

  const handleEnvChange = (e) => setEnv(e)

  return (
    <Layout>
      <Header
        title="Logs"
        subtitle="Aggregated service and pod logs"
        onEnvChange={handleEnvChange}
        onRefresh={refetch}
        loading={loading}
        lastUpdated={lastUpdated}
      />

      <div className="p-6 space-y-6 animate-fade-in">
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard title="Total Logs" value={summary.total}   color="blue"   icon={ScrollText} />
            <StatCard title="Errors"     value={summary.error}   color="red"    icon={AlertCircle}  />
            <StatCard title="Warnings"   value={summary.warning} color="yellow" icon={AlertTriangle} />
            <StatCard title="Info"       value={summary.info}    color="blue"   icon={Info} />
          </div>
        )}

        {/* Service health */}
        {services.length > 0 && (
          <div className="card">
            <p className="text-sm font-semibold text-slate-200 mb-3">Log Health by Service</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {services.slice(0, 8).map((svc) => (
                <div
                  key={svc.name}
                  className={clsx(
                    'p-2.5 rounded-lg border cursor-pointer transition-all',
                    service === svc.name
                      ? 'border-blue-500/50 bg-blue-500/10'
                      : 'border-slate-700/60 bg-slate-700/20 hover:border-slate-600'
                  )}
                  onClick={() => setService(service === svc.name ? '' : svc.name)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-300 truncate">{svc.name}</span>
                    <span className={clsx(
                      'dot-sm shrink-0 ml-1',
                      svc.health === 'critical' ? 'dot-red' : svc.health === 'warning' ? 'dot-yellow' : 'dot-green'
                    )} />
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    {svc.error > 0 && <span className="text-red-400">{svc.error}E</span>}
                    {svc.warning > 0 && <span className="text-amber-400">{svc.warning}W</span>}
                    <span className="text-slate-500">{svc.info}I</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="card">
          <div className="flex items-center gap-3 flex-wrap mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                className="input pl-8 text-xs"
                placeholder="Search messages, pods, services…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select className="select text-xs py-2 w-36" value={level} onChange={e => setLevel(e.target.value)}>
              <option value="">All Levels</option>
              <option value="ERROR">Error</option>
              <option value="WARNING">Warning</option>
              <option value="INFO">Info</option>
            </select>
            <select className="select text-xs py-2 w-40" value={env} onChange={e => setEnv(e.target.value)}>
              <option value="">All Envs</option>
              <option value="prod">Production</option>
              <option value="stage">Staging</option>
              <option value="dev">Development</option>
            </select>
            {(search || level || service || env) && (
              <button
                className="btn-secondary text-xs py-1.5"
                onClick={() => { setSearch(''); setLevel(''); setService(''); setEnv('') }}
              >
                Clear filters
              </button>
            )}
            <span className="text-xs text-slate-500 ml-auto">{logs.length} entries</span>
          </div>

          {/* Log table header */}
          <div className="flex items-center gap-3 px-4 py-1.5 border-b border-slate-700 text-[10px] text-slate-600 uppercase tracking-wide">
            <span className="w-4 shrink-0" />
            <span className="w-20 shrink-0">Time</span>
            <span className="w-16 shrink-0">Level</span>
            <span className="w-32 shrink-0">Service</span>
            <span className="w-16 shrink-0">Env</span>
            <span className="flex-1">Message</span>
          </div>

          {/* Logs */}
          <div className="max-h-[520px] overflow-y-auto">
            {loading ? (
              <LoadingSpinner text="Loading logs…" />
            ) : logs.length === 0 ? (
              <EmptyState title="No logs found" message="Try adjusting your filters." icon={ScrollText} />
            ) : (
              logs.map((log) => (
                <LogEntry
                  key={log.id}
                  log={log}
                  expanded={expanded === log.id}
                  onToggle={() => setExpanded(expanded === log.id ? null : log.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
