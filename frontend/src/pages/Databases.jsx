import { useState } from 'react'
import Layout from '../components/Layout/Layout'
import Header from '../components/Layout/Header'
import StatCard from '../components/Common/StatCard'
import StatusBadge from '../components/Common/StatusBadge'
import LoadingSpinner from '../components/Common/LoadingSpinner'
import { useApi } from '../hooks/useApi'
import { fetchDatabases, fetchDBSummary } from '../services/api'
import { Database } from 'lucide-react'
import { REFRESH_INTERVALS } from '../utils/constants'
import { relativeTime } from '../utils/helpers'
import clsx from 'clsx'

function StorageBar({ value }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={clsx('h-full rounded-full', value > 80 ? 'bg-red-500' : value > 60 ? 'bg-amber-500' : 'bg-blue-500')}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <span className="text-xs text-slate-400 w-10">{value}%</span>
    </div>
  )
}

export default function Databases() {
  const [env, setEnv] = useState(undefined)

  const { data: summary } = useApi(fetchDBSummary, [])
  const { data, loading, refetch } = useApi(
    () => fetchDatabases(env), [env], { interval: REFRESH_INTERVALS.dashboard }
  )
  const dbs = data?.databases ?? []

  return (
    <Layout>
      <Header
        title="Databases"
        subtitle="OCI DB systems and Autonomous Databases"
        onEnvChange={setEnv}
        onRefresh={refetch}
        loading={loading}
      />

      <div className="p-6 space-y-6 animate-fade-in">
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard title="Total DBs"     value={summary.total}             color="blue"   icon={Database} />
            <StatCard title="Available"     value={summary.available}         color="green"  icon={Database} />
            <StatCard title="Stopped"       value={summary.stopped}           color="slate"  icon={Database} />
            <StatCard title="Avg CPU"       value={`${summary.avg_cpu}%`}     color={summary.avg_cpu > 80 ? 'red' : 'cyan'} />
          </div>
        )}

        {/* DB Cards */}
        {loading ? <LoadingSpinner text="Loading databases…" /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {dbs.map((db) => (
              <div key={db.id} className="card space-y-4 hover:border-slate-600 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Database size={14} className="text-purple-400 shrink-0" />
                      <p className="text-sm font-semibold text-slate-200 truncate">{db.display_name}</p>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{db.db_version}</p>
                  </div>
                  <StatusBadge status={db.lifecycle_state} />
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-slate-500">Shape</p>
                    <p className="text-slate-300 font-mono mt-0.5">{db.shape}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Environment</p>
                    <p className="text-slate-300 capitalize mt-0.5">{db.environment}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">CPU Cores</p>
                    <p className="text-slate-300 mt-0.5">{db.cpu_core_count} cores</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Storage</p>
                    <p className="text-slate-300 mt-0.5">{db.data_storage_size_in_gbs} GB</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>CPU Utilization</span>
                      <span className={db.cpu_utilization > 80 ? 'text-red-400' : 'text-slate-400'}>{db.cpu_utilization}%</span>
                    </div>
                    <StorageBar value={db.cpu_utilization} />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Storage Used</span>
                      <span className={db.storage_used_percent > 80 ? 'text-red-400' : 'text-slate-400'}>{db.storage_used_percent}%</span>
                    </div>
                    <StorageBar value={db.storage_used_percent} />
                  </div>
                </div>

                <div className="flex justify-between text-xs border-t border-slate-700/60 pt-3">
                  <div>
                    <span className="text-slate-500">Connections: </span>
                    <span className="text-slate-300">{db.connections}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Port: </span>
                    <span className="font-mono text-slate-300">{db.port}</span>
                  </div>
                  <div className="text-slate-500">Created {relativeTime(db.time_created)}</div>
                </div>

                {db.backup_enabled && (
                  <div className="flex items-center gap-1.5 text-[10px] text-green-400/80">
                    <span className="dot-green scale-75" /> Backup enabled
                    {db.is_auto_scaling_enabled && <><span className="text-slate-600 mx-1">·</span><span className="text-blue-400/80">Auto-scaling on</span></>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
