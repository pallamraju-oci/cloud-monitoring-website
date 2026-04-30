export const API_BASE = '/api'

export const ENVIRONMENTS = ['prod', 'stage', 'dev']

export const REFRESH_INTERVALS = {
  dashboard: 60_000,   // 60 s — KPI cards
  metrics:   30_000,   // 30 s — charts
  logs:      60_000,   // 60 s — log stream
  alerts:    60_000,   // 60 s — alert list
}

export const STATUS_COLORS = {
  // Compute / DB states
  RUNNING:   'green',
  AVAILABLE: 'green',
  STOPPED:   'slate',
  STOPPING:  'yellow',
  STARTING:  'blue',
  FAILED:    'red',
  // Pod states
  Running:          'green',
  Pending:          'yellow',
  Completed:        'blue',
  CrashLoopBackOff: 'red',
  OOMKilled:        'red',
  Error:            'red',
  // Node states
  Ready:    'green',
  NotReady: 'red',
  // Log levels
  INFO:    'blue',
  WARNING: 'yellow',
  ERROR:   'red',
  // Alert severity
  critical: 'red',
  warning:  'yellow',
  info:     'blue',
}

export const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 }

export const CHART_COLORS = {
  cpu:        '#3b82f6',
  memory:     '#a855f7',
  network_in: '#22c55e',
  network_out:'#f59e0b',
  disk_read:  '#06b6d4',
  disk_write: '#ef4444',
}
