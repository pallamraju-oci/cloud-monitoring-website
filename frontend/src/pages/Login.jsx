import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Zap } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

export default function Login() {
  const { login, loading, error, token, clearError } = useAuthStore()
  const navigate = useNavigate()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin123')
  const [showPw, setShowPw] = useState(false)

  useEffect(() => { if (token) navigate('/') }, [token, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const ok = await login(username, password)
    if (ok) navigate('/')
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 mb-4">
            <OciPulseLogo />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">OciPulse</h1>
          <p className="text-sm text-slate-400 mt-1">OCI Observability Platform</p>
        </div>

        {/* Card */}
        <div className="card border-slate-700 shadow-2xl shadow-black/50">
          <h2 className="text-base font-semibold text-slate-200 mb-5">Sign in to your account</h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 text-sm flex items-center gap-2">
              <span className="dot-red" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Username</label>
              <input
                className="input"
                value={username}
                onChange={(e) => { setUsername(e.target.value); clearError() }}
                placeholder="admin"
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
              <div className="relative">
                <input
                  className="input pr-10"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearError() }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 mt-2"
            >
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in…</>
              ) : (
                <><Zap size={15} />Sign In</>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-slate-600 mt-5 border-t border-slate-700 pt-4">
            Default credentials: <span className="text-slate-400 font-mono">admin / admin123</span>
          </p>
        </div>

        <p className="text-center text-xs text-slate-600 mt-4">
          OciPulse v1.0.0 — Lightweight OCI Monitoring
        </p>
      </div>
    </div>
  )
}

function OciPulseLogo() {
  return (
    <svg width="32" height="32" viewBox="0 0 30 30" fill="none">
      <path d="M22 13.5c0-2.485-2.015-4.5-4.5-4.5a4.498 4.498 0 00-4.15 2.772A3 3 0 008 14.5 3 3 0 0011 17.5h10.5A2.5 2.5 0 0024 15a2.5 2.5 0 00-2-2.45" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9 14.5h1.5l1.5-2 2 4 1.5-3 1 1.5H19" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
