import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useEffect, useState } from 'react'

function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    const num = parseFloat(target) || 0
    if (num === 0) { setValue(0); return }
    const steps = 40
    const increment = num / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= num) { setValue(num); clearInterval(timer) }
      else setValue(current)
    }, duration / steps)
    return () => clearInterval(timer)
  }, [target, duration])
  return value
}

export default function KPICard({ label, value, sub, accent = 'blue', icon: Icon, trend, prefix = '', suffix = '', animate = true }) {
  const numericValue = parseFloat(String(value).replace(/[^0-9.]/g, '')) || 0
  const animated = useCountUp(animate ? numericValue : 0)

  const colors = {
    blue: { bg: 'linear-gradient(135deg, #eff6ff, #dbeafe)', icon: '#2563eb', iconBg: '#dbeafe', text: '#1d4ed8' },
    green: { bg: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', icon: '#059669', iconBg: '#d1fae5', text: '#047857' },
    red: { bg: 'linear-gradient(135deg, #fef2f2, #fee2e2)', icon: '#dc2626', iconBg: '#fee2e2', text: '#b91c1c' },
    amber: { bg: 'linear-gradient(135deg, #fffbeb, #fef3c7)', icon: '#d97706', iconBg: '#fef3c7', text: '#b45309' },
    purple: { bg: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', icon: '#7c3aed', iconBg: '#ede9fe', text: '#6d28d9' },
  }
  const c = colors[accent] || colors.blue

  const displayValue = animate
    ? `${prefix}${numericValue >= 1000 ? animated.toFixed(0) : animated.toFixed(numericValue % 1 !== 0 ? 2 : 0)}${suffix}`
    : `${prefix}${value}${suffix}`

  return (
    <div className="kpi-card fade-up" style={{ animationDelay: '0.05s' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {label}
        </div>
        {Icon && (
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: c.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={16} color={c.icon} strokeWidth={2} />
          </div>
        )}
      </div>

      <div style={{ fontSize: '30px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-1.5px', lineHeight: 1, fontFamily: 'Plus Jakarta Sans', animation: 'countUp 0.5s ease forwards' }}>
        {displayValue}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px' }}>
        {trend !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '12px', fontWeight: 600, color: trend > 0 ? 'var(--accent-green)' : trend < 0 ? 'var(--accent-red)' : 'var(--text-muted)' }}>
            {trend > 0 ? <TrendingUp size={12} /> : trend < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
            {Math.abs(trend)}%
          </div>
        )}
        {sub && <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 400 }}>{sub}</div>}
      </div>
    </div>
  )
}