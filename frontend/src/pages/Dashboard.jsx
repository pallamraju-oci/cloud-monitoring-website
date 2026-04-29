import { useState } from 'react'
import Layout from '../components/Layout/Layout'
import Header from '../components/Layout/Header'
import StatCard from '../components/Common/StatCard'
import LoadingSpinner from '../components/Common/LoadingSpinner'
import ErrorBanner from '../components/Common/ErrorBanner'
import MetricAreaChart from '../components/Charts/MetricAreaChart'
import DonutChart from '../components/Charts/DonutChart'
import StatusBadge from '../components/Common/StatusBadge'
import { useApi } from '../hooks/useApi'
import { fetchDashboard, fetchTimeseries, fetchAlerts } from '../services/api'
import {
  Server, Container, Database, Bell, Activity,
  AlertTriangle, CheckCircle, TrendingUp,
} from 'lucide-react'
import { REFRESH_INTERVALS, CHART_COLORS } from '../utils/constants'
import { relativeTime, healthScoreColor } from '../utils/helpers'
import { REFRESH_INTERVALS as RI } from '../utils/constants'

export default function Dashboard() {
  const [env, setEnv] = useState(undefined)

  const { data: summary, loading: sl, error: se, refetch: rsum, lastUpdated } = useApi(
    fetchDashboard, [], { interval: REFRESH_INTERVALS.dashboard }
  )
  const { data: ts, loading: tl, refetch: rts } = useApi(
    fetchTimeseries, [], { interval: REFRESH_INTERVALS.metrics }
  )
  const { data: alertData, refetch: ral } = useApi(
    fetchAlerts, [], { interval: REFRESH_INTERVALS.alerts }
  )

  const loading = sl || tl
  const handleRefresh = () => { rsum(); rts(); ral() }

  const podData = summary ? [
    { name: 'Running', value: summary.kubernetes.running_pods, color: '#22c55e' },
    { name: 'Failed',  value: summary.kubernetes.failed_pods,  color: '#ef4444' },
    { name: 'Pending', value: summary.kubernetes.pending_pods, color: '#f59e0b' },
  ] : []

  const activeAlerts = alertData?.alerts?.filter(a => a.status === 'active') ?? []

  return (
    <Layout>
      <Header
        title="Dashboard"
        subtitle="Real-time infrastructure overview"
        onEnvChange={setEnv}
        onRefresh={handleRefresh}
        loading={loading}
        lastUpdated={lastUpdated}
      />

      <div className="p-6 space-y-6 animate-fade-in">
        <ErrorBanner message={se} />

        {loading && !summary ? (
          <LoadingSpinner text="Loading dashboard…" />
        ) : summary ? (
          <>
            {/* Health score banner */}
            <div className="card flex items-center justify-between bg-gradient-to-r from-slate-800 to-slate-800/50 border-slate-700">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full border-4 border-slate-700 flex items-center justify-center bg-slate-900">
                  <span className={`text-lg font-bold ${healthScoreColor(summary.health_score)}`}>
                    {summary.health_score}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">Overall Health Score</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {summary.health_score >= 80 ? 'All systems operational' : summary.health_score >= 50 ? 'Some issues detected' : 'Critical issues require attention'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-center">
                <div>
                  <p className="text-2xl font-bold text-green-400">{summary.kubernetes.running_pods}</p>
                  <p className="text-xs text-slate-500">pods running</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-400">{summary.alerts.critical}</p>
                  <p className="text-xs text-slate-500">critical alerts</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-400">{summary.logs.errors_last_hour}</p>
                  <p className="text-xs text-slate-500">errors/hr</p>
                </div>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Compute Instances"
                value={`${summary.compute.running}/${summary.compute.total}`}
                subtitle={`${summary.compute.stopped} stopped`}
                icon={Server}
                color="blue"
              />
              <StatCard
                title="Kubernetes Pods"
                value={`${summary.kubernetes.running_pods}/${summary.kubernetes.total_pods}`}
                subtitle={`${summary.kubernetes.failed_pods} failed · ${summary.kubernetes.pending_pods} pending`}
                icon={Container}
                color={summary.kubernetes.failed_pods > 0 ? 'red' : 'green'}
              />
              <StatCard
                title="Databases"
                value={`${summary.databases.available}/${summary.databases.total}`}
                subtitle={`${summary.databases.stopped} stopped`}
                icon={Database}
                color="purple"
              />
              <StatCard
                title="Active Alerts"
                value={summary.alerts.active}
                subtitle={`${summary.alerts.critical} critical · ${summary.alerts.warning} warning`}
                icon={Bell}
                color={summary.alerts.critical > 0 ? 'red' : summary.alerts.warning > 0 ? 'yellow' : 'green'}
              />
            </div>

            {/* Secondary KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Avg CPU"    value={`${summary.compute.avg_cpu}%`}    icon={Activity}       color={summary.compute.avg_cpu > 80 ? 'red' : 'cyan'} />
              <StatCard title="Avg Memory" value={`${summary.compute.avg_memory}%`} icon={TrendingUp}     color={summary.compute.avg_memory > 85 ? 'red' : 'purple'} />
              <StatCard title="Nodes Ready" value={`${summary.kubernetes.ready_nodes}/${summary.kubernetes.total_nodes}`} icon={CheckCircle} color="green" />
              <StatCard title="Log Errors" value={summary.logs.errors_last_hour}    icon={AlertTriangle}  color={summary.logs.errors_last_hour > 5 ? 'red' : 'yellow'} subtitle="last hour" />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* CPU & Memory chart */}
              <div className="lg:col-span-2 card">
                <p className="text-sm font-semibold text-slate-200 mb-4">CPU & Memory Utilization (24h)</p>
                {ts ? (
                  <MetricAreaChart
                    data={ts}
                    series={[
                      { key: 'cpu',    label: 'CPU',    color: CHART_COLORS.cpu    },
                      { key: 'memory', label: 'Memory', color: CHART_COLORS.memory },
                    ]}
                    height={220}
                    tickInterval={24}
                  />
                ) : <LoadingSpinner size="sm" />}
              </div>

              {/* Pod status donut */}
              <div className="card flex flex-col">
                <p className="text-sm font-semibold text-slate-200 mb-4">Pod Status Distribution</p>
                <DonutChart data={podData} height={150} />
                <div className="mt-4 space-y-2">
                  {podData.map((d) => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                        <span className="text-slate-400">{d.name}</span>
                      </div>
                      <span className="text-slate-200 font-medium">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Network chart */}
            <div className="card">
              <p className="text-sm font-semibold text-slate-200 mb-4">Network I/O — MB/s (24h)</p>
              {ts ? (
                <MetricAreaChart
                  data={ts}
                  series={[
                    { key: 'network_in',  label: 'Network In',  color: CHART_COLORS.network_in  },
                    { key: 'network_out', label: 'Network Out', color: CHART_COLORS.network_out },
                  ]}
                  height={160}
                  tickInterval={24}
                />
              ) : <LoadingSpinner size="sm" />}
            </div>

            {/* Recent alerts */}
            {activeAlerts.length > 0 && (
              <div className="card">
                <p className="text-sm font-semibold text-slate-200 mb-4">Active Alerts</p>
                <div className="space-y-2">
                  {activeAlerts.slice(0, 5).map((alert) => (
                    <div key={alert.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-700/40 border border-slate-700/60">
                      <span className={alert.severity === 'critical' ? 'dot-red animate-pulse' : alert.severity === 'warning' ? 'dot-yellow' : 'dot-blue'} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-200 truncate">{alert.message}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{alert.resource} · {relativeTime(alert.triggered_at)}</p>
                      </div>
                      <StatusBadge status={alert.severity} showDot={false} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </Layout>
  )
}
