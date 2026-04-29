import { useState, useEffect } from 'react'
import { RefreshCw, Filter, Clock, Wifi } from 'lucide-react'
import { format, formatDistanceToNowStrict } from 'date-fns'

export default function Header({ title, subtitle, onEnvChange, onRefresh, loading = false, lastUpdated = null }) {
  const [env, setEnv]   = useState('')
  const [time, setTime] = useState(new Date())
  const [age, setAge]   = useState('')

  // Clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // "Updated X ago" label — refreshes every second so it ticks down visibly
  useEffect(() => {
    if (!lastUpdated) return
    const update = () =>
      setAge(formatDistanceToNowStrict(lastUpdated, { addSuffix: false }))
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [lastUpdated])

  const handleEnv = (e) => {
    setEnv(e.target.value)
    onEnvChange?.(e.target.value || undefined)
  }

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-20">
      <div>
        <h1 className="text-lg font-semibold text-slate-100">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Live indicator */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs">
          {loading ? (
            <span className="flex items-center gap-1.5 text-blue-400">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Fetching…
            </span>
          ) : lastUpdated ? (
            <span className="flex items-center gap-1.5 text-green-400/80">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse-slow" />
              Updated {age} ago
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-slate-600">
              <Wifi size={11} />
              Connecting…
            </span>
          )}
        </div>

        {/* Clock */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 font-mono border-l border-slate-700 pl-3">
          <Clock size={11} />
          {format(time, 'HH:mm:ss')}
        </div>

        {/* Environment filter */}
        <div className="flex items-center gap-1.5">
          <Filter size={12} className="text-slate-500" />
          <select className="select py-1.5 text-xs w-32" value={env} onChange={handleEnv}>
            <option value="">All Envs</option>
            <option value="prod">Production</option>
            <option value="stage">Staging</option>
            <option value="dev">Development</option>
          </select>
        </div>

        {/* Manual refresh */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="btn-secondary py-1.5 px-3 flex items-center gap-1.5"
            title="Refresh now"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline text-xs">Refresh</span>
          </button>
        )}
      </div>
    </header>
  )
}
