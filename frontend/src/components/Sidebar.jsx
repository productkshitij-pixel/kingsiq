import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard,
  BarChart2,
  Megaphone,
  Users,
  LogOut,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

const Sidebar = ({ collapsed, setCollapsed }) => {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const navItems = [
    { to: '/dashboard',   label: 'Dashboard',       Icon: LayoutDashboard },
    { to: '/module1',     label: 'Social Media',     Icon: BarChart2 },
    { to: '/module2',     label: 'Social Listening', Icon: BookOpen },
    { to: '/module3',     label: 'Ad Intelligence',  Icon: Megaphone },
    { to: '/competitors', label: 'Competitors',      Icon: Users },
  ]

  return (
    <aside
      className={`fixed left-0 top-0 h-screen flex flex-col z-40 transition-all duration-300 ease-in-out ${
        collapsed ? 'w-[68px]' : 'w-64'
      }`}
      style={{ backgroundColor: '#002D72' }}
    >
      {/* Logo */}
      <div
        className={`flex items-center flex-shrink-0 ${collapsed ? 'px-4 py-5 justify-center' : 'px-6 py-5'}`}
        style={{ borderBottom: '1px solid rgba(201,162,39,0.25)' }}
      >
        {collapsed ? (
          <span
            className="text-xl font-bold font-display"
            style={{ color: '#C9A227' }}
          >
            K
          </span>
        ) : (
          <div>
            <h1
              className="text-xl font-bold tracking-tight font-display"
              style={{ color: '#C9A227' }}
            >
              KingsIQ
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(201,162,39,0.6)' }}>
              Kings' Education Dubai
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {navItems.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `flex items-center rounded-lg text-sm font-medium transition-all duration-150 group ${
                collapsed ? 'px-0 py-3 justify-center' : 'gap-3 px-4 py-3'
              } ${isActive ? 'active-nav-item' : 'inactive-nav-item'}`
            }
            style={({ isActive }) =>
              isActive
                ? { backgroundColor: '#C9A227', color: '#002D72' }
                : {}
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={18}
                  strokeWidth={1.8}
                  className="flex-shrink-0"
                  style={{ color: isActive ? '#002D72' : 'rgba(201,162,39,0.75)' }}
                />
                {!collapsed && (
                  <span style={{ color: isActive ? '#002D72' : 'rgba(255,255,255,0.85)' }}>
                    {label}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User + sign out */}
      <div
        className={`flex-shrink-0 ${collapsed ? 'px-2 py-4' : 'px-4 py-4'}`}
        style={{ borderTop: '1px solid rgba(201,162,39,0.25)' }}
      >
        {!collapsed && (
          <div className="mb-3 px-2">
            <p className="text-xs truncate font-medium" style={{ color: 'rgba(201,162,39,0.9)' }}>
              {profile?.full_name || profile?.email || 'User'}
            </p>
            <p className="text-xs capitalize mt-0.5" style={{ color: 'rgba(201,162,39,0.5)' }}>
              {profile?.role || 'marketing'}
            </p>
          </div>
        )}
        <button
          onClick={handleSignOut}
          title={collapsed ? 'Sign Out' : undefined}
          className={`w-full flex items-center text-sm rounded-lg transition-colors py-2 ${
            collapsed ? 'justify-center px-0' : 'gap-2 px-2'
          }`}
          style={{ color: 'rgba(201,162,39,0.55)' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#C9A227'; e.currentTarget.style.backgroundColor = 'rgba(201,162,39,0.12)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(201,162,39,0.55)'; e.currentTarget.style.backgroundColor = 'transparent' }}
        >
          <LogOut size={16} strokeWidth={1.8} className="flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>

      {/* Collapse toggle button */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="absolute -right-3 top-7 w-6 h-6 rounded-full flex items-center justify-center shadow-md transition-colors"
        style={{ backgroundColor: '#002D72', border: '1.5px solid #C9A227', color: '#C9A227' }}
        onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#C9A227'; e.currentTarget.style.color = '#002D72' }}
        onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#002D72'; e.currentTarget.style.color = '#C9A227' }}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed
          ? <ChevronRight size={13} strokeWidth={2.5} />
          : <ChevronLeft  size={13} strokeWidth={2.5} />}
      </button>
    </aside>
  )
}

export default Sidebar
