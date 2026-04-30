import axios from 'axios'

// ── API base URL ──────────────────────────────────────────────────────────────
//
// Priority order:
//   1. VITE_API_URL build-time env var  (set in frontend/.env before `npm run build`)
//      e.g.  VITE_API_URL=http://10.0.1.50:8000/api
//   2. window.__API_URL__ runtime inject (nginx can serve a /config.js snippet)
//   3. '/api'  — the nginx proxy path (default for docker-compose deployments)
//
const API_BASE =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && window.__API_URL__) ||
  '/api'

const http = axios.create({
  baseURL: API_BASE,
  timeout: 30_000,          // 30 s hard timeout per request
  withCredentials: false,
})

// Attach JWT on every request
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('ocipulse_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Global error handler
http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ocipulse_token')
      localStorage.removeItem('ocipulse_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login = (username, password) =>
  http.post('/auth/login', { username, password }).then((r) => r.data)

// Raw health check (no auth header, no axios — avoids interceptors on failure)
export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return { reachable: false, status: res.status }
    const data = await res.json()
    return { reachable: true, mock_mode: data.mock_mode, version: data.version }
  } catch {
    return { reachable: false }
  }
}

// ── Dashboard / Metrics ───────────────────────────────────────────────────────
export const fetchDashboard  = () => http.get('/metrics/dashboard').then((r) => r.data)
export const fetchTimeseries = (hours = 24) => http.get('/metrics/timeseries', { params: { hours } }).then((r) => r.data)
export const fetchTopology   = () => http.get('/metrics/topology').then((r) => r.data)

// ── Compute ───────────────────────────────────────────────────────────────────
export const fetchInstances      = (env, compartment) => http.get('/compute/instances', { params: { environment: env || undefined, compartment: compartment || undefined } }).then((r) => r.data)
export const fetchComputeSummary = () => http.get('/compute/summary').then((r) => r.data)
export const fetchCompartments   = () => http.get('/compute/compartments').then((r) => r.data)

// ── Kubernetes ────────────────────────────────────────────────────────────────
export const fetchNodes      = () => http.get('/kubernetes/nodes').then((r) => r.data)
export const fetchPods       = (ns, env) => http.get('/kubernetes/pods', { params: { namespace: ns || undefined, environment: env || undefined } }).then((r) => r.data)
export const fetchNamespaces = () => http.get('/kubernetes/namespaces').then((r) => r.data)
export const fetchK8sSummary = () => http.get('/kubernetes/summary').then((r) => r.data)
export const fetchEvents     = () => http.get('/kubernetes/events').then((r) => r.data)
export const fetchPodLogs   = (namespace, podName, container, lines = 200) =>
  http.get(`/kubernetes/pods/${namespace}/${podName}/logs`, { params: { container: container || undefined, lines } }).then((r) => r.data)

// ── Databases ─────────────────────────────────────────────────────────────────
export const fetchDatabases  = (env) => http.get('/database/systems', { params: { environment: env || undefined } }).then((r) => r.data)
export const fetchDBSummary  = () => http.get('/database/summary').then((r) => r.data)

// ── Logs ──────────────────────────────────────────────────────────────────────
export const fetchLogs       = (params = {}) => http.get('/logs/', { params }).then((r) => r.data)
export const fetchLogSummary = () => http.get('/logs/summary').then((r) => r.data)
export const fetchLogServices= () => http.get('/logs/services').then((r) => r.data)

// ── Alerts ────────────────────────────────────────────────────────────────────
export const fetchAlerts     = () => http.get('/alerts/').then((r) => r.data)
export const fetchAlertRules = () => http.get('/alerts/rules').then((r) => r.data)
export const updateAlertRule = (id, data) => http.put(`/alerts/rules/${id}`, data).then((r) => r.data)
export const testAlertRule   = (id) => http.post(`/alerts/rules/${id}/test`).then((r) => r.data)

export default http
