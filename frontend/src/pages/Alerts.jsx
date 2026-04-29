import { useState } from 'react'
import Layout from '../components/Layout/Layout'
import Header from '../components/Layout/Header'
import StatCard from '../components/Common/StatCard'
import StatusBadge from '../components/Common/StatusBadge'
import LoadingSpinner from '../components/Common/LoadingSpinner'
import { useApi } from '../hooks/useApi'
import { fetchAlerts, fetchAlertRules, updateAlertRule, testAlertRule } from '../services/api'
import { Bell, Shield, Settings, Send, CheckCircle2, XCircle } from 'lucide-react'
import { REFRESH_INTERVALS } from '../utils/constants'
import { relativeTime } from '../utils/helpers'
import clsx from 'clsx'

const SEVERITY_BADGE = {
  critical: 'badge-red',
  warning:  'badge-yellow',
  info:     'badge-blue',
}

function AlertRuleRow({ rule, onUpdate, onTest }) {
  const [threshold, setThreshold] = useState(rule.threshold)
  const [editing, setEditing]     = useState(false)
  const [testing, setTesting]     = useState(false)

  const handleSave = async () => {
    await onUpdate(rule.id, { threshold: Number(threshold) })
    setEditing(false)
  }

  const handleTest = async () => {
    setTesting(true)
    await onTest(rule.id)
    setTimeout(() => setTesting(false), 2000)
  }

  return (
    <tr className="table-row">
      <td className="py-3 px-4">
        <div>
          <p className="text-sm font-medium text-slate-200">{rule.name}</p>
          <p className="text-xs text-slate-500 font-mono mt-0.5">{rule.metric}</p>
        </div>
      </td>
      <td className="py-3 px-4 text-xs text-slate-400 font-mono">{rule.operator}</td>
      <td className="py-3 px-4">
        {editing ? (
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              className="input py-1 w-20 text-xs"
              value={threshold}
              onChange={e => setThreshold(e.target.value)}
            />
            <button onClick={handleSave} className="btn-primary py-1 px-2 text-xs">Save</button>
            <button onClick={() => { setEditing(false); setThreshold(rule.threshold) }} className="btn-secondary py-1 px-2 text-xs">Cancel</button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-sm text-slate-200 hover:text-blue-400 transition-colors font-mono"
          >
            {rule.threshold}%
          </button>
        )}
      </td>
      <td className="py-3 px-4"><span className={SEVERITY_BADGE[rule.severity]}>{rule.severity}</span></td>
      <td className="py-3 px-4">
        <button
          onClick={() => onUpdate(rule.id, { enabled: !rule.enabled })}
          className={clsx(
            'w-10 h-5 rounded-full transition-colors relative',
            rule.enabled ? 'bg-blue-600' : 'bg-slate-700'
          )}
        >
          <span className={clsx(
            'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all',
            rule.enabled ? 'left-5' : 'left-0.5'
          )} />
        </button>
      </td>
      <td className="py-3 px-4">
        {rule.notify_email ? <CheckCircle2 size={14} className="text-green-400" /> : <XCircle size={14} className="text-slate-600" />}
      </td>
      <td className="py-3 px-4">
        <button
          onClick={handleTest}
          disabled={testing}
          className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          <Send size={11} />
          {testing ? 'Sent!' : 'Test'}
        </button>
      </td>
    </tr>
  )
}

export default function Alerts() {
  const { data: alertData, loading: al, refetch: ral, lastUpdated } = useApi(fetchAlerts, [], { interval: REFRESH_INTERVALS.alerts })
  const { data: rulesData, loading: rl, refetch: rrl } = useApi(fetchAlertRules, [])

  const alerts  = alertData?.alerts ?? []
  const rules   = rulesData?.rules ?? []
  const active  = alerts.filter(a => a.status === 'active')
  const resolved = alerts.filter(a => a.status === 'resolved')

  const handleUpdate = async (id, patch) => {
    await updateAlertRule(id, patch)
    rrl()
  }
  const handleTest = async (id) => { await testAlertRule(id) }

  return (
    <Layout>
      <Header title="Alerts" subtitle="Active alerts and notification rules" onRefresh={() => { ral(); rrl() }} loading={al || rl} lastUpdated={lastUpdated} />

      <div className="p-6 space-y-6 animate-fade-in">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard title="Active Alerts"   value={alertData?.active ?? 0}   color="red"    icon={Bell} />
          <StatCard title="Resolved"        value={alertData?.resolved ?? 0} color="green"  icon={CheckCircle2} />
          <StatCard title="Alert Rules"     value={rules.length}             color="blue"   icon={Shield} />
          <StatCard title="Rules Enabled"   value={rules.filter(r => r.enabled).length} color="cyan" icon={Settings} />
        </div>

        {/* Active alerts */}
        <div className="card">
          <p className="text-sm font-semibold text-slate-200 mb-4">Active Alerts ({active.length})</p>
          {active.length === 0 ? (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
              <CheckCircle2 size={16} />
              All clear — no active alerts
            </div>
          ) : (
            <div className="space-y-2">
              {active.map((alert) => (
                <div
                  key={alert.id}
                  className={clsx(
                    'p-4 rounded-xl border',
                    alert.severity === 'critical'
                      ? 'bg-red-500/8 border-red-500/25'
                      : alert.severity === 'warning'
                      ? 'bg-amber-500/8 border-amber-500/25'
                      : 'bg-blue-500/8 border-blue-500/25'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className={clsx(
                        'mt-1 shrink-0',
                        alert.severity === 'critical' ? 'dot-red animate-pulse' : alert.severity === 'warning' ? 'dot-yellow' : 'dot-blue'
                      )} />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-slate-200">{alert.type}</span>
                          <span className={SEVERITY_BADGE[alert.severity]}>{alert.severity}</span>
                          <span className="badge-slate">{alert.environment}</span>
                        </div>
                        <p className="text-sm text-slate-300 mt-1">{alert.message}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Resource: <span className="text-slate-400">{alert.resource}</span>
                          {' · '}Triggered {relativeTime(alert.triggered_at)}
                          {alert.notification_sent && <span className="text-green-500/70 ml-2">· Notified ✓</span>}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alert rules */}
        <div className="card">
          <p className="text-sm font-semibold text-slate-200 mb-4">Alert Rules</p>
          {rl ? <LoadingSpinner size="sm" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 uppercase tracking-wide border-b border-slate-700">
                    <th className="text-left py-2 px-4 font-medium">Rule</th>
                    <th className="text-left py-2 px-4 font-medium">Operator</th>
                    <th className="text-left py-2 px-4 font-medium">Threshold</th>
                    <th className="text-left py-2 px-4 font-medium">Severity</th>
                    <th className="text-left py-2 px-4 font-medium">Enabled</th>
                    <th className="text-left py-2 px-4 font-medium">Email</th>
                    <th className="text-left py-2 px-4 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map(rule => (
                    <AlertRuleRow key={rule.id} rule={rule} onUpdate={handleUpdate} onTest={handleTest} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Resolved alerts */}
        {resolved.length > 0 && (
          <div className="card">
            <p className="text-sm font-semibold text-slate-200 mb-4">Recently Resolved ({resolved.length})</p>
            <div className="space-y-2">
              {resolved.map((alert) => (
                <div key={alert.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-700/20 border border-slate-700/40 opacity-70">
                  <CheckCircle2 size={13} className="text-green-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-400 truncate">{alert.message}</p>
                    <p className="text-[10px] text-slate-600 mt-0.5">{alert.resource} · resolved {relativeTime(alert.resolved_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
