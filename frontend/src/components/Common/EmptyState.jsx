import { InboxIcon } from 'lucide-react'

export default function EmptyState({ title = 'No data', message = 'Nothing to display yet.', icon: Icon = InboxIcon }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="p-4 rounded-full bg-slate-700/50">
        <Icon size={28} className="text-slate-500" />
      </div>
      <div>
        <p className="text-slate-300 font-medium">{title}</p>
        <p className="text-sm text-slate-500 mt-0.5">{message}</p>
      </div>
    </div>
  )
}
