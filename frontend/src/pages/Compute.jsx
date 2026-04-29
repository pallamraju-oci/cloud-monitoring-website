import { useState } from 'react'
import Layout from '../components/Layout/Layout'
import Header from '../components/Layout/Header'
import StatCard from '../components/Common/StatCard'
import StatusBadge from '../components/Common/StatusBadge'
import LoadingSpinner from '../components/Common/LoadingSpinner'
import EmptyState from '../components/Common/EmptyState'
import { useApi } from '../hooks/useApi'
import { fetchInstances, fetchComputeSummary, fetchCompartments } from '../services/api'
import { Server, Search, Cpu, Layers } from 'lucide-react'
import { REFRESH_INTERVALS } from '../utils/constants'
import { relativeTime } from '../utils/helpers'
import clsx from 'clsx'

function UtilCell({ value }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={clsx('h-full rounded-full', value > 80 ? 'bg-red-500' : value > 60 ? 'bg-amber-500' : 'bg-blue-500')}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <span className={clsx('text-xs tabular-nums w-10', value > 80 ? 'text-red-400' : value > 60 ? 'text-amber-400' : 'text-slate-400')}>
        {value.toFixed(1)}%
      </span>
    </div>
  )
}

export default function Compute() {
  const [env, setEnv]             = useState(undefined)
  const [compartment, setComp]    = useState('')
  const [search, setSearch]       = useState('')

  const { data: compsData } = useApi(fetchCompartments, [])
  const compartments = compsData?.compartments ?? []

  const { data: summary } = useApi(
    () => fetchComputeSummary(), [], { interval: REFRESH_INTERVALS.dashboard }
  )
  const { data, loading, refetch, lastUpdated } = useApi(
    () => fetchInstances(env, compartment || undefined),
    [env, compartment],
    { interval: REFRESH_INTERVALS.dashboard }
  )

  const instances = (data?.instances ?? []).filter(i =>
    !search || i.display_name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Layout>
      <Header
        title="Compute Instances"
        subtitle="OCI VM instance health and metrics"
        onEnvChange={setEnv}
        onRefresh={refetch}
        loading={loading}
        lastUpdated={lastUpdated}
      />

      <div className="p-6 space-y-6 animate-fade-in">
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <StatCard title="Total"        value={summary.total}        color="blue"   icon={Server} />
            <StatCard title="Running"      value={summary.running}      color="green"  icon={Server} />
            <StatCard title="Stopped"      value={summary.stopped}      color="slate"  icon={Server} />
            <StatCard title="Avg CPU"      value={`${summary.avg_cpu}%`}    color={summary.avg_cpu > 80 ? 'red' : 'cyan'} icon={Cpu} />
            <StatCard title="Avg Memory"   value={`${summary.avg_memory}%`} color={summary.avg_memory > 85 ? 'red' : 'purple'} />
            <StatCard title="Compartments" value={compartments.length || 1} color="blue" icon={Layers} subtitle={compartments.map(c => c.label).join(', ') || 'default'} />
          </div>
        )}

        <div className="card">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <p className="text-sm font-semibold text-slate-200">Instances ({instances.length})</p>
            <div className="flex items-center gap-2 flex-wrap">
              {compartments.length > 1 && (
                <select className="select py-1.5 text-xs w-44" value={compartment} onChange={e => setComp(e.target.value)}>
                  <option value="">All compartments</option>
                  {compartments.map(c => (
                    <option key={c.id} value={c.label}>{c.label}</option>
                  ))}
                </select>
              )}
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  className="input pl-8 py-1.5 text-xs w-56"
                  placeholder="Search instances…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          {loading ? (
            <LoadingSpinner text="Loading instances…" />
          ) : instances.length === 0 ? (
            <EmptyState title="No instances found" icon={Server} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 uppercase tracking-wide border-b border-slate-700">
                    <th className="text-left py-2 px-3 font-medium">Instance</th>
                    <th className="text-left py-2 px-3 font-medium">Status</th>
                    <th className="text-left py-2 px-3 font-medium">Compartment</th>
                    <th className="text-left py-2 px-3 font-medium">Env</th>
                    <th className="text-left py-2 px-3 font-medium">Shape</th>
                    <th className="text-left py-2 px-3 font-medium">AD</th>
                    <th className="text-left py-2 px-3 font-medium">CPU util</th>
                    <th className="text-left py-2 px-3 font-medium">Mem util</th>
                    <th className="text-left py-2 px-3 font-medium">Private IP</th>
                    <th className="text-left py-2 px-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {instances.map((inst) => (
                    <tr key={inst.id} className="table-row">
                      <td className="py-2.5 px-3">
                        <div>
                          <p className="font-medium text-slate-200 text-xs">{inst.display_name}</p>
                          <p className="text-[10px] font-mono text-slate-600 mt-0.5 truncate max-w-[180px]">{inst.id}</p>
                        </div>
                      </td>
                      <td className="py-2.5 px-3"><StatusBadge status={inst.lifecycle_state} /></td>
                      <td className="py-2.5 px-3">
                        {inst.compartment
                          ? <span className="badge-blue">{inst.compartment}</span>
                          : <span className="text-slate-600 text-xs">—</span>}
                      </td>
                      <td className="py-2.5 px-3"><span className="badge-slate capitalize">{inst.environment}</span></td>
                      <td className="py-2.5 px-3 text-xs text-slate-400 font-mono">{inst.shape}</td>
                      <td className="py-2.5 px-3 text-xs text-slate-500">{inst.availability_domain}</td>
                      <td className="py-2.5 px-3"><UtilCell value={inst.cpu_utilization} /></td>
                      <td className="py-2.5 px-3"><UtilCell value={inst.memory_utilization} /></td>
                      <td className="py-2.5 px-3 text-xs font-mono text-slate-400">{inst.private_ip}</td>
                      <td className="py-2.5 px-3 text-xs text-slate-500">{relativeTime(inst.time_created)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
