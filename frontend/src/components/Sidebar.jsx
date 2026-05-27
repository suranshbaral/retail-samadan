import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Upload,
  Package,
  Bell,
  TrendingUp,
  PieChart,
  Settings,
  Store,
  Users,
  Menu,
  X,
  LogOut,
  Sparkles
} from 'lucide-react'

import { useAuth } from '../context/AuthContext'
import { logout } from '../api/auth'

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
  const [collapsed, setCollapsed] = useState(false)
  const { user, business, location, handleLogout } = useAuth()
  const navigate = useNavigate()

  async function doLogout() {
    const refresh = localStorage.getItem('refresh_token')

    try {
      await logout(refresh)
    } catch {}

    handleLogout()
    navigate('/login')
  }

  const width = collapsed ? '76px' : '250px'

  return (
    <aside
      style={{
        width,
        minHeight: '100vh',
        background: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        padding: '18px 12px',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 50,
        borderRight: '1px solid #E5E7EB',
        boxShadow: '8px 0 30px rgba(15,23,42,0.04)',
        transition: 'width 0.25s ease',
      }}
    >
      {/* Top */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          marginBottom: '24px',
        }}
      >
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                background: 'linear-gradient(135deg, #3B82F6, #6366F1, #8B5CF6)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 10px 24px rgba(59,130,246,0.25)',
              }}
            >
              <Sparkles size={17} color="white" strokeWidth={2.4} />
            </div>

            <div>
              <div
                style={{
                  color: '#0F172A',
                  fontWeight: 800,
                  fontSize: '15px',
                  letterSpacing: '-0.4px',
                }}
              >
                Retail Samadhan
              </div>

              <div
                style={{
                  color: '#64748B',
                  fontSize: '11px',
                  fontWeight: 500,
                  marginTop: '1px',
                }}
              >
                Retail Intelligence
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '11px',
            border: '1px solid #E5E7EB',
            background: '#F8FAFC',
            color: '#64748B',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {collapsed ? <Menu size={18} /> : <X size={17} />}
        </button>
      </div>

      {/* Store */}
      {!collapsed && (
        <div
          style={{
            background: 'linear-gradient(135deg, #EFF6FF, #F5F3FF)',
            border: '1px solid #DBEAFE',
            borderRadius: '16px',
            padding: '13px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '22px',
          }}
        >
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '11px',
              background: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 16px rgba(15,23,42,0.06)',
            }}
          >
            <Store size={16} color="#3B82F6" />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                color: '#0F172A',
                fontSize: '13px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {location?.name || 'Greeley Station'}
            </div>

            <div
              style={{
                color: '#64748B',
                fontSize: '11px',
                marginTop: '2px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {business?.name || 'Gas Station'}
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex: 1 }}>
        {!collapsed && (
          <div
            style={{
              fontSize: '10px',
              fontWeight: 800,
              color: '#94A3B8',
              letterSpacing: '0.12em',
              padding: '0 8px 10px',
              textTransform: 'uppercase',
            }}
          >
            Navigation
          </div>
        )}

        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            title={collapsed ? label : ''}
            style={({ isActive }) => ({
              height: '42px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: collapsed ? 0 : '11px',
              padding: collapsed ? '0' : '0 12px',
              borderRadius: '13px',
              marginBottom: '6px',
              textDecoration: 'none',
              fontSize: '13.5px',
              fontWeight: 650,
              color: isActive ? '#2563EB' : '#64748B',
              background: isActive
                ? 'linear-gradient(135deg, #EFF6FF, #EEF2FF)'
                : 'transparent',
              border: isActive ? '1px solid #DBEAFE' : '1px solid transparent',
              boxShadow: isActive ? '0 8px 20px rgba(37,99,235,0.08)' : 'none',
              transition: 'all 0.18s ease',
            })}
          >
            <Icon size={17} />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div
        style={{
          borderTop: '1px solid #E5E7EB',
          paddingTop: '14px',
        }}
      >
        {!collapsed && (
          <div
            style={{
              padding: '12px',
              borderRadius: '15px',
              background: '#F8FAFC',
              border: '1px solid #E5E7EB',
              marginBottom: '10px',
            }}
          >
            <div
              style={{
                fontSize: '13px',
                fontWeight: 800,
                color: '#0F172A',
              }}
            >
              {user?.username || 'Admin'}
            </div>

            <div
              style={{
                fontSize: '11px',
                color: '#64748B',
                marginTop: '3px',
              }}
            >
              {location?.name || business?.name || 'Retail Samadhan'}
            </div>
          </div>
        )}

        <button
          onClick={doLogout}
          title={collapsed ? 'Sign Out' : ''}
          style={{
            width: '100%',
            height: '42px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: collapsed ? 0 : '10px',
            padding: collapsed ? 0 : '0 12px',
            borderRadius: '13px',
            background: 'transparent',
            border: '1px solid transparent',
            cursor: 'pointer',
            color: '#64748B',
            fontSize: '13.5px',
            fontWeight: 650,
            textAlign: 'left',
          }}
        >
          <LogOut size={17} />
          {!collapsed && 'Sign Out'}
        </button>
      </div>
    </aside>
  )
}