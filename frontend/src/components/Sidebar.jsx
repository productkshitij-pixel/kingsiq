import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard,
  Smartphone,
  Radio,
  Megaphone,
  Building2,
  Users,
  ChevronLeft,
  LogOut,
  ShieldCheck,
} from 'lucide-react'

const NAVY = '#002D72'
const GOLD = '#C9A227'

const navItems = [
  { to: '/dashboard',   label: 'Dashboard',       Icon: LayoutDashboard },
  { to: '/module1',     label: 'Social Media',     Icon: Smartphone      },
  { to: '/module2',     label: 'Social Listening', Icon: Radio           },
  { to: '/module3',     label: 'Ad Intelligence',  Icon: Megaphone       },
  { to: '/competitors', label: 'Competitors',       Icon: Building2       },
]

const Sidebar = ({ collapsed, setCollapsed }) => {
  const { profile, signOut, isSuperAdmin } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const displayName = profile?.full_name || profile?.email?.split('@')[0] || 'User'

  return (
    <aside
      className="fixed top-0 left-0 h-screen z-30 flex flex-col transition-all duration-300 ease-in-out"
      style={{
        width: collapsed ? 68 : 256,
        background: NAVY,
        boxShadow: '2px 0 12px rgba(0,0,0,0.18)',
      }}
    >
      {/* ── Logo ── */}
      <div
        className="flex items-center gap-3 px-4 border-b border-blue-900"
        style={{ minHeight: 64 }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0"
          style={{ background: GOLD, color: NAVY }}
        >
          K
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-bold text-base leading-tight" style={{ color: GOLD }}>
              KingsIQ
            </p>
            <p className="text-xs text-blue-300 truncate">Kings' Education Dubai</p>
          </div>
        )}
      </div>

      {/* ── Nav links ── */}
      <nav className="flex-1 py-3 space-y-0.5 px-2 overflow-y-auto">
        {navItems.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive ? '' : 'text-blue-200 hover:text-white hover:bg-white/10'
              }`
            }
            style={({ isActive }) =>
              isActive ? { background: 'rgba(201,162,39,0.18)', color: GOLD } : {}
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={18} className="flex-shrink-0" style={{ color: isActive ? GOLD : undefined }} />
                {!collapsed && <span className="truncate">{label}</span>}
              </>
            )}
          </NavLink>
        ))}

        {/* User Management — super admin only */}
        {isSuperAdmin && (
          <NavLink
            to="/user-management"
            title={collapsed ? 'User Management' : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive ? '' : 'text-blue-200 hover:text-white hover:bg-white/10'
              }`
            }
            style={({ isActive }) =>
              isActive ? { background: 'rgba(201,162,39,0.18)', color: GOLD } : {}
            }
          >
            {({ isActive }) => (
              <>
                <Users size={18} className="flex-shrink-0" style={{ color: isActive ? GOLD : undefined }} />
                {!collapsed && <span className="truncate">User Management</span>}
              </>
            )}
          </NavLink>
        )}
      </nav>

      {/* ── User footer ── */}
      <div className="border-t border-blue-900 px-3 py-3 space-y-2">
        {!collapsed && (
          <div className="flex items-center gap-2 px-1">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: GOLD, color: NAVY }}
            >
              {displayName[0]?.toUpperCase()}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-blue-200 text-xs font-medium truncate">{displayName}</p>
              {isSuperAdmin ? (
                <div className="flex items-center gap-1 mt-0.5">
                  <ShieldCheck size={10} style={{ color: GOLD }} />
                  <span className="text-xs font-semibold" style={{ color: GOLD }}>Super Admin</span>
                </div>
              ) : (
                <p className="text-blue-400 text-xs">Admin</p>
              )}
            </div>
          </div>
        )}

        <button
          onClick={handleSignOut}
          title="Sign Out"
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-blue-300 hover:text-white hover:bg-white/10 transition-colors text-sm"
        >
          <LogOut size={15} className="flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>

      {/* ── Collapse toggle button ── */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-[52px] w-6 h-6 rounded-full flex items-center justify-center shadow-md border border-blue-800 hover:bg-blue-700 transition-colors"
        style={{ background: NAVY }}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <ChevronLeft
          size={13}
          className="text-blue-300 transition-transform duration-300"
          style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>
    </aside>
  )
}

export default Sidebar
