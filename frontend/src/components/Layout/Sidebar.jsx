import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Server, Container, Database, ScrollText,
  Bell, Network, LogOut, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import clsx from 'clsx'

const NAV = [
  { to: '/',          label: 'Dashboard',   icon: LayoutDashboard },
  { to: '/kubernetes',label: 'Kubernetes',  icon: Container       },
  { to: '/compute',   label: 'Compute',     icon: Server          },
  { to: '/databases', label: 'Databases',   icon: Database        },
  { to: '/logs',      label: 'Logs',        icon: ScrollText      },
  { to: '/alerts',    label: 'Alerts',      icon: Bell            },
  { to: '/topology',  label: 'Topology',    icon: Network         },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <aside
      className={clsx(
        'flex flex-col h-screen bg-slate-900 border-r border-slate-800 transition-all duration-300 shrink-0',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      {/* Logo */}
      <div className={clsx('flex items-center gap-3 px-4 py-5 border-b border-slate-800', collapsed && 'justify-center px-0')}>
        <LogoMark />
        {!collapsed && (
          <div className="leading-tight">
            <span className="text-base font-bold text-slate-100">OciPulse</span>
            <p className="text-[10px] text-slate-500 font-medium tracking-widest uppercase">OCI Monitor</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group',
                isActive
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800',
                collapsed && 'justify-center px-0'
              )
            }
            title={collapsed ? label : undefined}
          >
            <Icon size={17} className="shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-800 p-2 space-y-1">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors text-xs"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <ChevronRight size={14} /> : <><ChevronLeft size={14} /><span>Collapse</span></>}
        </button>

        {!collapsed && user && (
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="w-7 h-7 rounded-full bg-blue-600/30 border border-blue-500/30 flex items-center justify-center text-xs font-bold text-blue-400">
              {user.username[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-300 truncate">{user.username}</p>
              <p className="text-[10px] text-slate-500 capitalize">{user.role}</p>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className={clsx(
            'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors text-xs',
            collapsed && 'justify-center'
          )}
          title="Logout"
        >
          <LogOut size={14} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  )
}

function LogoMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="30" height="30" rx="8" fill="#1e40af" fillOpacity="0.3" />
      <path d="M22 13.5c0-2.485-2.015-4.5-4.5-4.5a4.498 4.498 0 00-4.15 2.772A3 3 0 008 14.5 3 3 0 0011 17.5h10.5A2.5 2.5 0 0024 15a2.5 2.5 0 00-2-2.45" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9 14.5h1.5l1.5-2 2 4 1.5-3 1 1.5H19" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
