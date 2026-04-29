import { useState, useEffect, useCallback, useRef } from 'react'

const MAX_RETRIES  = 2          // per interval tick
const RETRY_DELAY  = 2_000      // ms between retries

async function withRetry(fn, retries = MAX_RETRIES) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      if (attempt === retries) throw err
      await new Promise((r) => setTimeout(r, RETRY_DELAY * (attempt + 1)))
    }
  }
}

export function useApi(fetchFn, deps = [], options = {}) {
  const { interval = null, immediate = true } = options

  const [data, setData]                   = useState(null)
  const [loading, setLoading]             = useState(immediate)
  const [error, setError]                 = useState(null)
  const [lastUpdated, setLastUpdated]     = useState(null)
  const [failCount, setFailCount]         = useState(0)

  const mountedRef   = useRef(true)
  // Always store the latest fetchFn without triggering useCallback recreation
  const fetchFnRef   = useRef(fetchFn)
  fetchFnRef.current = fetchFn

  // Stable execute — always calls the latest fetchFn via ref
  const execute = useCallback(async () => {
    if (!mountedRef.current) return
    setLoading(true)
    setError(null)
    try {
      const result = await withRetry(() => fetchFnRef.current())
      if (mountedRef.current) {
        setData(result)
        setLastUpdated(new Date())
        setFailCount(0)
      }
    } catch (e) {
      if (mountedRef.current) {
        const msg = e.response?.data?.detail || e.message || 'Request failed'
        setError(msg)
        setFailCount((n) => n + 1)
        // Don't wipe `data` — keep the last known-good value visible
      }
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-run whenever external deps (env filter, namespace, etc.) change
  useEffect(() => {
    mountedRef.current = true
    if (immediate) execute()
    const timer = interval ? setInterval(execute, interval) : undefined
    return () => {
      mountedRef.current = false
      if (timer) clearInterval(timer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, interval, immediate])

  return { data, loading, error, refetch: execute, lastUpdated, failCount }
}
