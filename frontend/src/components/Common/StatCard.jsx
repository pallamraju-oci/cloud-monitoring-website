import clsx from 'clsx'

export default function StatCard({ title, value, subtitle, icon: Icon, color = 'blue', trend, onClick }) {
  const colorMap = {
    blue:   { bg: 'bg-blue-500/10',   text: 'text-blue-400',   border: 'border-blue-500/20' },
    green:  { bg: 'bg-green-500/10',  text: 'text-green-400',  border: 'border-green-500/20' },
    yellow: { bg: 'bg-amber-500/10',  text: 'text-amber-400',  border: 'border-amber-500/20' },
    red:    { bg: 'bg-red-500/10',    text: 'text-red-400',    border: 'border-red-500/20' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
    cyan:   { bg: 'bg-cyan-500/10',   text: 'text-cyan-400',   border: 'border-cyan-500/20' },
  }
  const c = colorMap[color] || colorMap.blue

  return (
    <div
      className={clsx(
        'card flex flex-col gap-3 transition-all duration-200',
        onClick && 'cursor-pointer hover:border-slate-600 hover:shadow-lg hover:shadow-black/20'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</p>
          <p className="mt-1 text-2xl font-bold text-slate-100">{value ?? '—'}</p>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={clsx('p-2.5 rounded-lg border', c.bg, c.border)}>
            <Icon size={20} className={c.text} />
          </div>
        )}
      </div>
      {trend !== undefined && (
        <div className="flex items-center gap-1 text-xs">
          <span className={trend >= 0 ? 'text-green-400' : 'text-red-400'}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
          <span className="text-slate-500">vs last hour</span>
        </div>
      )}
    </div>
  )
}
