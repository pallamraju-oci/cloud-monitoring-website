import { useState, useEffect } from 'react'
import Layout from '../components/Layout/Layout'
import Header from '../components/Layout/Header'
import StatCard from '../components/Common/StatCard'
import StatusBadge from '../components/Common/StatusBadge'
import LoadingSpinner from '../components/Common/LoadingSpinner'
import EmptyState from '../components/Common/EmptyState'
import { useApi } from '../hooks/useApi'
import { fetchK8sSummary, fetchNodes, fetchPods, fetchEvents, fetchPodLogs } from '../services/api'
import { Container, Search, AlertTriangle, RefreshCw, X, Terminal, RotateCw } from 'lucide-react'
import clsx from 'clsx'

function UtilBar({ value, className }) {
  const color = value > 80 ? 'bg-red-500' : value > 60 ? 'bg-amber-500' : 'bg-blue-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={clsx('h-full rounded-full transition-all', color)} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <span className={clsx('text-xs w-10 text-right tabular-nums', value > 80 ? 'text-red-400' : value > 60 ? 'text-amber-400' : 'text-slate-400')}>
        {value.toFixed(0)}%
      </span>
    </div>
  )
}

export default function Kubernetes() {
  const [search, setSearch]   = useState('')
  const [namespace, setNs]    = useState('')
  const [tab, setTab]         = useState('pods')
  const [env, setEnv]         = useState(undefined)

  const [selectedPod, setSelectedPod] = useState(null)
  const [podLogs, setPodLogs]         = useState('')
  const [logsLoading, setLogsLoading] = useState(false)

  useEffect(() => {
    if (!selectedPod) return
    setLogsLoading(true)
    setPodLogs('')
    fetchPodLogs(selectedPod.namespace, selectedPod.name)
      .then(data => setPodLogs(data.logs || '(no logs)'))
      .catch(err => setPodLogs(`Error: ${err.message}`))
      .finally(() => setLogsLoading(false))
  }, [selectedPod])

  const refreshLogs = () => {
    if (!selectedPod) return
    setLogsLoading(true)
    fetchPodLogs(selectedPod.namespace, selectedPod.name)
      .then(data => setPodLogs(data.logs || '(no logs)'))
      .catch(err => setPodLogs(`Error: ${err.message}`))
      .finally(() => setLogsLoading(false))
  }

  const { data: summary } = useApi(fetchK8sSummary, [])
  const { data: nodesData } = useApi(fetchNodes, [])
  const { data: podsData, loading, refetch, lastUpdated } = useApi(
    () => fetchPods(namespace || undefined, env),
    [namespace, env],
  )
  const { data: eventsData } = useApi(fetchEvents, [])

  const nodes = nodesData?.nodes ?? []
  const pods  = (podsData?.pods ?? []).filter(p =>
    !search || p.name.includes(search) || p.app?.includes(search) || p.namespace.includes(search)
  )
  const events = eventsData?.events ?? []

  return (
    <Layout>
      <Header
        title="Kubernetes"
        subtitle="Cluster nodes, pods, and events"
        onEnvChange={setEnv}
        onRefresh={refetch}
        loading={loading}
        lastUpdated={lastUpdated}
      />

      <div className="p-6 space-y-6 animate-fade-in">
        {/* Summary */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <StatCard title="Total Pods"   value={summary.total_pods}   color="blue"   />
            <StatCard title="Running"      value={summary.running_pods}  color="green"  />
            <StatCard title="Failed"       value={summary.failed_pods}   color="red"    />
            <StatCard title="Pending"      value={summary.pending_pods}  color="yellow" />
            <StatCard title="Nodes"        value={`${summary.ready_nodes}/${summary.total_nodes}`} color="blue" />
            <StatCard title="Namespaces"   value={summary.namespaces}    color="purple" />
            <StatCard title="Node Health"  value={`${Math.round((summary.ready_nodes / summary.total_nodes) * 100)}%`} color={summary.ready_nodes === summary.total_nodes ? 'green' : 'red'} />
          </div>
        )}

        {/* Nodes */}
        <div className="card">
          <p className="text-sm font-semibold text-slate-200 mb-4">Nodes ({nodes.length})</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {nodes.map((node) => (
              <div key={node.name} className="card-sm space-y-2 hover:border-slate-600 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-mono font-medium text-slate-200 truncate">{node.name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{node.role}</p>
                  </div>
                  <StatusBadge status={node.status} showDot />
                </div>
                <div className="space-y-1.5">
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                      <span>CPU</span><span>{node.cpu_utilization}%</span>
                    </div>
                    <UtilBar value={node.cpu_utilization} />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                      <span>Memory</span><span>{node.memory_utilization}%</span>
                    </div>
                    <UtilBar value={node.memory_utilization} />
                  </div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-700/60">
                  <span>Pods: {node.pod_count}/{node.max_pods}</span>
                  <span className="font-mono">{node.kubelet_version}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div>
          <div className="flex items-center gap-1 mb-4 border-b border-slate-700">
            {['pods', 'events'].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={clsx(
                  'px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px',
                  tab === t ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-300'
                )}
              >
                {t}
              </button>
            ))}

            {tab === 'pods' && (
              <div className="ml-auto flex items-center gap-2 pb-2">
                <select className="select py-1.5 text-xs w-36"
                  value={namespace} onChange={e => setNs(e.target.value)}>
                  <option value="">All namespaces</option>
                  {['default','prod','stage','dev','kube-system'].map(ns => (
                    <option key={ns} value={ns}>{ns}</option>
                  ))}
                </select>
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input className="input pl-8 py-1.5 text-xs w-52"
                    placeholder="Search pods…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          {tab === 'pods' ? (
            loading ? <LoadingSpinner text="Loading pods…" /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-500 uppercase tracking-wide border-b border-slate-700">
                      <th className="text-left py-2 px-3 font-medium">Pod</th>
                      <th className="text-left py-2 px-3 font-medium">Namespace</th>
                      <th className="text-left py-2 px-3 font-medium">Status</th>
                      <th className="text-left py-2 px-3 font-medium">Node</th>
                      <th className="text-right py-2 px-3 font-medium">CPU</th>
                      <th className="text-right py-2 px-3 font-medium">Memory</th>
                      <th className="text-right py-2 px-3 font-medium">Restarts</th>
                      <th className="text-left py-2 px-3 font-medium">Age</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pods.length === 0 ? (
                      <tr><td colSpan={8}><EmptyState title="No pods found" message="Try adjusting your filters." icon={Container} /></td></tr>
                    ) : pods.map((pod) => (
                      <tr key={pod.name} className="table-row cursor-pointer" onClick={() => setSelectedPod(pod)} title="Click to view logs">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <Terminal size={12} className="text-slate-500 shrink-0" />
                            <div>
                              <p className="font-mono text-xs text-slate-200 truncate max-w-[200px]">{pod.name}</p>
                              <p className="text-[10px] text-slate-500">{pod.app}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3"><span className="badge-slate">{pod.namespace}</span></td>
                        <td className="py-2.5 px-3"><StatusBadge status={pod.status} /></td>
                        <td className="py-2.5 px-3 text-xs font-mono text-slate-400">{pod.node}</td>
                        <td className="py-2.5 px-3 text-right">
                          <span className={clsx('text-xs tabular-nums', pod.cpu_usage > 80 ? 'text-red-400' : 'text-slate-300')}>
                            {pod.cpu_usage}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-xs text-slate-300 tabular-nums">{pod.memory_usage} Mi</td>
                        <td className="py-2.5 px-3 text-right">
                          <span className={clsx('text-xs font-mono', pod.restarts > 5 ? 'text-red-400' : pod.restarts > 0 ? 'text-amber-400' : 'text-slate-500')}>
                            {pod.restarts}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-xs text-slate-500">{pod.age}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <div className="space-y-2">
              {events.map((ev, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-700/30 border border-slate-700/50">
                  <span className={ev.type === 'Warning' ? 'dot-yellow mt-1.5 shrink-0' : 'dot-blue mt-1.5 shrink-0'} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-slate-300">{ev.reason}</span>
                      <span className="badge-slate">{ev.namespace}</span>
                      <span className="text-[10px] text-slate-500 ml-auto">×{ev.count}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{ev.message}</p>
                    <p className="text-[10px] font-mono text-slate-600 mt-0.5 truncate">{ev.object}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Pod Logs Drawer */}
      {selectedPod && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/60" onClick={() => setSelectedPod(null)}>
          <div className="w-full max-w-3xl bg-slate-900 border-l border-slate-700 flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-slate-700 shrink-0">
              <div className="flex items-center gap-2.5">
                <Terminal size={16} className="text-blue-400" />
                <div>
                  <p className="text-sm font-mono font-semibold text-slate-200">{selectedPod.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    <span className="badge-slate mr-1">{selectedPod.namespace}</span>
                    <StatusBadge status={selectedPod.status} />
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={refreshLogs}
                  disabled={logsLoading}
                  className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white disabled:opacity-50"
                  title="Refresh logs"
                >
                  <RotateCw size={14} className={logsLoading ? 'animate-spin' : ''} />
                </button>
                <button
                  onClick={() => setSelectedPod(null)}
                  className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-slate-950">
              {logsLoading ? (
                <p className="text-slate-500 text-xs font-mono animate-pulse">Fetching logs…</p>
              ) : (
                <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap break-all leading-5">
                  {podLogs || '(no logs available)'}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
