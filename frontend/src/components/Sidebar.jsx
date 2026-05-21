import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Upload, Package, Bell,
  TrendingUp, PieChart, Settings, Zap, Store
} from 'lucide-react'
import { Users } from 'lucide-react'

const nav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/upload', icon: Upload, label: 'Import Center' },
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/alerts', icon: Bell, label: 'Alerts' },
  { to: '/forecast', icon: TrendingUp, label: 'Forecast' },
  { to: '/segmentation', icon: PieChart, label: 'Segmentation' },
  { to: '/staffing', icon: Users, label: 'Shift Planner' },
]

export default function Sidebar() {
  return (
    <aside style={{
      width: '230px',
      minHeight: '100vh',
      background: 'var(--bg-sidebar)',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 0',
      position: 'fixed',
      top: 0, left: 0,
      zIndex: 50,
      borderRight: '1px solid rgba(255,255,255,0.05)',
    }}>

      {/* Logo */}
      <div style={{ padding: '8px 20px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px', height: '34px',
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(37,99,235,0.4)',
          }}>
            <Zap size={16} color="white" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: '15px', fontFamily: 'Plus Jakarta Sans', letterSpacing: '-0.3px' }}>
              Retail Samadhan
            </div>
            <div style={{ color: '#475569', fontSize: '11px', fontWeight: 500, marginTop: '-1px' }}>
              AI Retail Intelligence
            </div>
          </div>
        </div>
      </div>

      {/* Store selector */}
      <div style={{ padding: '0 14px 20px' }}>
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '10px',
          padding: '10px 12px',
          display: 'flex', alignItems: 'center', gap: '8px',
          cursor: 'pointer',
        }}>
          <Store size={14} color="#6b7280" />
          <div style={{ flex: 1 }}>
            <div style={{ color: 'white', fontSize: '12.5px', fontWeight: 600 }}>Greeley Station</div>
            <div style={{ color: '#4b5563', fontSize: '11px', marginTop: '-1px' }}>Gas Station</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0 12px' }}>
        <div style={{ fontSize: '10px', fontWeight: 600, color: '#374151', letterSpacing: '0.1em', padding: '0 8px 10px', textTransform: 'uppercase' }}>
          Navigation
        </div>
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '9px 12px',
              borderRadius: '9px',
              marginBottom: '2px',
              textDecoration: 'none',
              fontSize: '13.5px',
              fontWeight: 500,
              color: isActive ? 'white' : '#6b7280',
              background: isActive ? 'var(--bg-sidebar-active)' : 'transparent',
              transition: 'all 0.15s ease',
              borderLeft: isActive ? '2px solid var(--accent-blue)' : '2px solid transparent',
            })}
            onMouseEnter={e => {
              if (!e.currentTarget.classList.contains('active')) {
                e.currentTarget.style.background = 'var(--bg-sidebar-hover)'
                e.currentTarget.style.color = '#d1d5db'
              }
            }}
            onMouseLeave={e => {
              if (!e.currentTarget.getAttribute('aria-current')) {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = '#6b7280'
              }
            }}
          >
            <Icon size={15} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div style={{ padding: '16px 12px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <NavLink
          to="/settings"
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '9px', textDecoration: 'none', color: '#4b5563', fontSize: '13px', fontWeight: 500 }}
        >
          <Settings size={15} />
          Settings
        </NavLink>
      </div>
    </aside>
  )
}