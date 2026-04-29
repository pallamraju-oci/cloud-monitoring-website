import { AlertTriangle } from 'lucide-react'

export default function ErrorBanner({ message }) {
  if (!message) return null
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm">
      <AlertTriangle size={16} className="shrink-0" />
      <span>{message}</span>
    </div>
  )
}
