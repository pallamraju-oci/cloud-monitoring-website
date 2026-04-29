import { useState, useEffect, useRef } from 'react'
import { checkHealth } from '../../services/api'
import { WifiOff, AlertTriangle, CheckCircle2, RefreshCw, X } from 'lucide-react'

const POLL_MS        = 8_000   // check every 8 s
const FAIL_THRESHOLD = 2       // show banner after N consecutive failures

export default function ConnectionBanner() {
  const [state, setState]       = useState('checking')  // checking | ok | mock | error
  const [detail, setDetail]     = useState('')
  const [version, setVersion]   = useState('')
  const [dismissed, setDismiss] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const failRef = useRef(0)

  const check = async (manual = false) => {
    if (manual) setRetrying(true)
    const result = await checkHealth()
    if (manual) setRetrying(false)

    if (result.reachable) {
      failRef.current = 0
      setVersion(result.version || '')
      setState(result.mock_mode ? 'mock' : 'ok')
      setDetail('')
      if (manual) setDismiss(false)   // re-show after manual retry
    } else {
      failRef.current += 1
      if (failRef.current >= FAIL_THRESHOLD) {
        setState('error')
        setDetail(result.status ? `HTTP ${result.status}` : 'Network error — backend unreachable')
        setDismiss(false)
      }
    }
  }

  useEffect(() => {
    check()
    const t = setInterval(check, POLL_MS)
    return () => clearInterval(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── OK — no banner
  if (state === 'ok' || state === 'checking') return null
  if (dismissed) return null

  // ── MOCK DATA banner
  if (state === 'mock') {
    return (
      <div className="flex items-center gap-3 px-4 py-2 bg-amber-500/15 border-b border-amber-500/30 text-amber-300 text-xs">
        <AlertTriangle size={13} className="shrink-0" />
        <span className="flex-1">
          <strong>Mock data mode</strong> — showing simulated data. Set{' '}
          <code className="font-mono bg-amber-500/20 px-1 rounded">USE_MOCK_DATA=false</code>{' '}
          in your <code className="font-mono bg-amber-500/20 px-1 rounded">.env</code>{' '}
          and restart the backend to connect to real OCI.
        </span>
        <button onClick={() => setDismiss(true)} className="ml-2 text-amber-400/60 hover:text-amber-300">
          <X size={13} />
        </button>
      </div>
    )
  }

  // ── ERROR banner
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-red-500/15 border-b border-red-500/30 text-red-300 text-xs">
      <WifiOff size={14} className="shrink-0 animate-pulse" />
      <div className="flex-1 min-w-0">
        <span className="font-semibold">Backend unreachable</span>
        {detail && <span className="ml-2 text-red-400/70 font-mono">{detail}</span>}
        <span className="ml-2 text-red-400/60">
          — data on screen may be stale. Check that the backend container is running:
        </span>
        <code className="ml-1 font-mono bg-red-500/20 px-1 rounded">docker-compose logs backend</code>
      </div>
      <button
        onClick={() => check(true)}
        disabled={retrying}
        className="flex items-center gap-1 shrink-0 px-2 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 transition-colors"
      >
        <RefreshCw size={11} className={retrying ? 'animate-spin' : ''} />
        Retry
      </button>
    </div>
  )
}
