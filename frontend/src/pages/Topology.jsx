import { useState } from 'react'
import Layout from '../components/Layout/Layout'
import Header from '../components/Layout/Header'
import LoadingSpinner from '../components/Common/LoadingSpinner'
import { useApi } from '../hooks/useApi'
import { fetchTopology } from '../services/api'
import { Server, Container, Network, ArrowRight } from 'lucide-react'
import clsx from 'clsx'

const STATUS_RING = {
  Ready:            'ring-green-500/50 bg-green-500/10',
  NotReady:         'ring-red-500/50 bg-red-500/10',
  Running:          'ring-green-500/40 bg-green-500/8',
  Pending:          'ring-amber-500/40 bg-amber-500/8',
  CrashLoopBackOff: 'ring-red-500/40 bg-red-500/8',
  OOMKilled:        'ring-red-500/40 bg-red-500/8',
  default:          'ring-slate-600 bg-slate-700/40',
}

function NodeCard({ node }) {
  const ring = STATUS_RING[node.status] || STATUS_RING.default
  return (
    <div className={clsx('rounded-xl border border-slate-700 ring-1 p-3 space-y-2 w-40', ring)}>
      <div className="flex items-center gap-2">
        <Server size={13} className="text-blue-400 shrink-0" />
        <p className="text-xs font-medium text-slate-200 truncate">{node.name}</p>
      </div>
      <div className="text-[10px] text-slate-500 space-y-0.5">
        <div className="flex justify-between">
          <span>CPU</span>
          <span className={node.cpu_utilization > 80 ? 'text-red-400' : 'text-slate-400'}>{node.cpu_utilization}%</span>
        </div>
        <div className="flex justify-between">
          <span>Mem</span>
          <span className={node.memory_utilization > 80 ? 'text-red-400' : 'text-slate-400'}>{node.memory_utilization}%</span>
        </div>
        <div className="flex justify-between">
          <span>Pods</span>
          <span className="text-slate-400">{node.pod_count}</span>
        </div>
      </div>
      <div className={clsx('text-[10px] font-medium text-center px-2 py-0.5 rounded-full',
        node.status === 'Ready' ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'
      )}>
        {node.status}
      </div>
    </div>
  )
}

function PodCard({ pod }) {
  const ring = STATUS_RING[pod.status] || STATUS_RING.default
  return (
    <div className={clsx('rounded-lg border border-slate-700/60 ring-1 px-2.5 py-2 w-36', ring)}>
      <div className="flex items-center gap-1.5 mb-1">
        <Container size={11} className="text-purple-400 shrink-0" />
        <p className="text-[10px] font-medium text-slate-200 truncate">{pod.app}</p>
      </div>
      <p className="text-[9px] font-mono text-slate-600 truncate">{pod.namespace}</p>
      <div className={clsx('mt-1.5 text-[9px] font-medium',
        pod.status === 'Running' ? 'text-green-400' : pod.status === 'Pending' ? 'text-amber-400' : 'text-red-400'
      )}>
        {pod.status}
      </div>
      {pod.restarts > 0 && (
        <div className="text-[9px] text-amber-400/80 mt-0.5">↺ {pod.restarts}</div>
      )}
    </div>
  )
}

function ServiceCard({ svc }) {
  return (
    <div className="rounded-lg border border-slate-700/60 ring-1 ring-blue-500/20 bg-blue-500/5 px-2.5 py-2 w-40">
      <div className="flex items-center gap-1.5 mb-1">
        <Network size={11} className="text-cyan-400 shrink-0" />
        <p className="text-[10px] font-medium text-slate-200 truncate">{svc.name}</p>
      </div>
      <p className="text-[9px] text-slate-500">{svc.type}</p>
      <p className="text-[9px] font-mono text-slate-600 mt-0.5">:{svc.port}</p>
    </div>
  )
}

function IncidentTimeline() {
  const events = [
    { time: '14:32', type: 'critical', msg: 'payment-service OOMKilled in prod' },
    { time: '14:28', type: 'warning',  msg: 'api-gateway CPU hit 87%' },
    { time: '13:45', type: 'resolved', msg: 'auth-service pod restarted — now Running' },
    { time: '12:10', type: 'info',     msg: 'api-gateway deployed v2.4.1' },
    { time: '11:55', type: 'warning',  msg: 'postgres slow query > 5s detected' },
    { time: '10:00', type: 'resolved', msg: 'Disk usage alert resolved' },
  ]
  const colors = { critical: 'bg-red-500', warning: 'bg-amber-500', resolved: 'bg-green-500', info: 'bg-blue-500' }
  const texts  = { critical: 'text-red-400', warning: 'text-amber-400', resolved: 'text-green-400', info: 'text-blue-400' }

  return (
    <div className="card">
      <p className="text-sm font-semibold text-slate-200 mb-4">Incident Timeline</p>
      <div className="relative pl-5">
        <div className="absolute left-2 top-0 bottom-0 w-px bg-slate-700" />
        <div className="space-y-4">
          {events.map((ev, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className={clsx('absolute left-0.5 w-3 h-3 rounded-full mt-0.5 ring-2 ring-slate-900', colors[ev.type])} style={{ top: `${i * 56 + 2}px` }} />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-600">{ev.time}</span>
                  <span className={clsx('text-[10px] font-medium capitalize', texts[ev.type])}>{ev.type}</span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">{ev.msg}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Topology() {
  const { data, loading, refetch } = useApi(fetchTopology, [])

  const nodes    = data?.nodes ?? []
  const pods     = (data?.pods ?? []).slice(0, 12)
  const services = data?.services ?? []

  return (
    <Layout>
      <Header title="Topology" subtitle="Node → Pod → Service dependency view" onRefresh={refetch} loading={loading} />

      <div className="p-6 space-y-6 animate-fade-in">
        {loading ? <LoadingSpinner text="Building topology…" /> : (
          <>
            {/* Topology view */}
            <div className="card">
              <p className="text-sm font-semibold text-slate-200 mb-6">Infrastructure Topology</p>

              <div className="flex items-start gap-4 overflow-x-auto pb-4">
                {/* Nodes column */}
                <div className="flex flex-col gap-2 shrink-0">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium flex items-center gap-1.5 mb-1">
                    <Server size={11} /> Nodes
                  </p>
                  {nodes.map((node) => <NodeCard key={node.name} node={node} />)}
                </div>

                {/* Arrow */}
                <div className="flex items-center self-center mt-8">
                  <div className="flex flex-col items-center gap-1 text-slate-600">
                    <ArrowRight size={16} />
                  </div>
                </div>

                {/* Pods column */}
                <div className="shrink-0">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium flex items-center gap-1.5 mb-3">
                    <Container size={11} /> Pods ({data?.pods?.length ?? 0})
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {pods.map((pod) => <PodCard key={pod.name} pod={pod} />)}
                    {(data?.pods?.length ?? 0) > 12 && (
                      <div className="col-span-2 text-center text-xs text-slate-600 py-2">
                        + {(data?.pods?.length ?? 0) - 12} more pods
                      </div>
                    )}
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex items-center self-center mt-8">
                  <div className="flex flex-col items-center gap-1 text-slate-600">
                    <ArrowRight size={16} />
                  </div>
                </div>

                {/* Services column */}
                <div className="shrink-0">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium flex items-center gap-1.5 mb-3">
                    <Network size={11} /> Services
                  </p>
                  <div className="flex flex-col gap-2">
                    {services.map((svc) => <ServiceCard key={svc.name} svc={svc} />)}
                  </div>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 text-xs text-slate-500">
              <div className="flex items-center gap-1.5"><span className="dot-green" /> Healthy / Running</div>
              <div className="flex items-center gap-1.5"><span className="dot-yellow" /> Pending / Warning</div>
              <div className="flex items-center gap-1.5"><span className="dot-red" /> Failed / Critical</div>
              <div className="flex items-center gap-1.5"><span className="inline-block w-2 h-2 rounded-full bg-blue-400" /> Service</div>
            </div>

            {/* Incident timeline */}
            <IncidentTimeline />
          </>
        )}
      </div>
    </Layout>
  )
}
