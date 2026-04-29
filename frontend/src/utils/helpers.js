import { STATUS_COLORS } from './constants'

export function statusColor(status) {
  return STATUS_COLORS[status] || 'slate'
}

export function statusDotClass(status) {
  const c = statusColor(status)
  return `dot-${c}`
}

export function statusBadgeClass(status) {
  const c = statusColor(status)
  return `badge-${c}`
}

export function formatBytes(mb) {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`
  return `${Math.round(mb)} MB`
}

export function formatPercent(v) {
  return `${Number(v).toFixed(1)}%`
}

export function relativeTime(isoString) {
  if (!isoString) return '—'
  const diff = Date.now() - new Date(isoString).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60)  return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export function healthScoreColor(score) {
  if (score >= 80) return 'text-green-400'
  if (score >= 50) return 'text-amber-400'
  return 'text-red-400'
}

export function clamp(v, min = 0, max = 100) {
  return Math.min(max, Math.max(min, v))
}

export function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = item[key]
    ;(acc[k] = acc[k] || []).push(item)
    return acc
  }, {})
}
