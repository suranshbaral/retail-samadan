import { useState, useEffect, useRef } from 'react'
import { getDashboard, runAudit, getSegmentation, getForecast } from '../api'
import {
  DollarSign, TrendingUp, ShoppingCart, Package,
  RefreshCw, AlertTriangle, Sparkles, ArrowUpRight,
  ArrowDownRight, Activity, Target, Zap, ChevronRight
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts'
import { SkeletonCard, SkeletonChart } from '../components/Skeleton'

const LOCATION_ID = '15e03030-c420-4ebd-a44a-59f5ef2f7608'

// ─── Animated Counter ─────────────────────────────────────────────────────────
function AnimatedNumber({ value, prefix = '', suffix = '', decimals = 0 }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef(null)

  useEffect(() => {
    const target = parseFloat(value) || 0
    const duration = 900
    const steps = 50
    const increment = target / steps
    let current = 0
    let step = 0
    clearInterval(ref.current)
    ref.current = setInterval(() => {
      step++
      current = Math.min(current + increment, target)
      setDisplay(current)
      if (step >= steps) clearInterval(ref.current)
    }, duration / steps)
    return () => clearInterval(ref.current)
  }, [value])

  return (
    <span>{prefix}{display.toFixed(decimals)}{suffix}</span>
  )
}

// ─── Health Score Ring ─────────────────────────────────────────────────────────
function HealthRing({ score = 0, size = 80 }) {
  const radius = 34
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444'
  const label = score >= 70 ? 'Healthy' : score >= 40 ? 'Moderate' : 'At Risk'

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="7" />
        <circle
          cx="40" cy="40" r={radius} fill="none"
          stroke={color} strokeWidth="7"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 40 40)"
          style={{ transition: 'stroke-dashoffset 1.2s ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '16px', fontWeight: 800, color, fontFamily: 'Plus Jakarta Sans', lineHeight: 1 }}>{score}</div>
        <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '1px' }}>{label}</div>
      </div>
    </div>
  )
}

// ─── Custom Tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'rgba(15,17,26,0.92)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '10px 14px' }}>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontWeight: 700, color: 'white', fontSize: '15px' }}>${Number(payload[0].value).toFixed(2)}</div>
    </div>
  )
}

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ data, color = '#2563eb' }) {
  if (!data || data.length < 2) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const w = 64, h = 28
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * h
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Calculate Health Score ────────────────────────────────────────────────────
function calcHealthScore(summary, alerts, segData) {
  let score = 60
  if (!summary) return score
  const margin = parseFloat(summary.margin_pct || 0)
  if (margin > 40) score += 15
  else if (margin > 20) score += 5
  else score -= 10
  if (alerts.length === 0) score += 10
  else score -= alerts.length * 8
  if (segData?.summary?.stars > 0) score += 5
  if (segData?.summary?.no_sales > 5) score -= 5
  return Math.max(10, Math.min(99, score))
}

// ─── Generate AI Summary ───────────────────────────────────────────────────────
function genSummary(summary, alerts, forecast, segData) {
  if (!summary) return 'Loading store intelligence...'
  const rev = parseFloat(summary.total_revenue || 0)
  const margin = parseFloat(summary.margin_pct || 0)
  const topForecast = forecast?.forecasts?.find(f => f.avg_daily_sales > 0)

  let parts = []
  if (rev > 0) parts.push(`Revenue at $${rev.toFixed(2)} with ${margin}% margin`)
  if (alerts.length > 0) parts.push(`${alerts.length} inventory anomal${alerts.length > 1 ? 'ies' : 'y'} need attention`)
  else parts.push('inventory health is stable')
  if (topForecast) parts.push(`${topForecast.product_name} forecasted at ${topForecast.next_7_days_forecast} units next week`)

  return parts.join(' · ')
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [segData, setSegData] = useState(null)
  const [forecast, setForecast] = useState(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)
  const [mounted, setMounted] = useState(false)

  async function load(d = days) {
    setLoading(true)
    try {
      const [dashRes, auditRes, segRes, foreRes] = await Promise.all([
        getDashboard(LOCATION_ID, d),
        runAudit(LOCATION_ID),
        getSegmentation(LOCATION_ID, d),
        getForecast(LOCATION_ID),
      ])
      setData(dashRes.data)
      setAlerts(auditRes.data.alerts || [])
      setSegData(segRes.data)
      setForecast(foreRes.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setTimeout(() => setMounted(true), 100)
    }
  }

  useEffect(() => { load() }, [days])

  const summary = data?.summary || {}
  const healthScore = calcHealthScore(summary, alerts, segData)
  const aiSummary = genSummary(summary, alerts, forecast, segData)

  const dailySales = (data?.daily_sales || []).map(d => ({
    date: new Date(d.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    revenue: parseFloat(d.revenue),
  }))

  const sparkData = dailySales.slice(-10).map(d => d.revenue)

  const topProducts = (data?.top_products || [])
    .filter(p => p.product__name)
    .slice(0, 5)
    .map(p => ({
      name: p.product__name,
      revenue: parseFloat(p.revenue),
      units: parseFloat(p.units),
      profit: parseFloat(p.profit || 0),
    }))

  const forecastProducts = (forecast?.forecasts || [])
    .filter(f => f.avg_daily_sales > 0)
    .slice(0, 4)

  const now = new Date()
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.4s ease' }}>

      {/* ── Hero Strip ─────────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f1117 0%, #111827 50%, #0f172a 100%)',
        borderRadius: '20px',
        padding: '28px 32px',
        marginBottom: '24px',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* ambient glow */}
        <div style={{ position: 'absolute', top: '-40px', right: '120px', width: '300px', height: '200px', background: 'radial-gradient(ellipse, rgba(37,99,235,0.15), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-20px', left: '200px', width: '200px', height: '150px', background: 'radial-gradient(ellipse, rgba(124,58,237,0.1), transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
          {/* Left */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '99px', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Live · Greeley Station
              </span>
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'white', letterSpacing: '-0.5px', fontFamily: 'Plus Jakarta Sans', marginBottom: '8px' }}>
              {greeting} 👋
            </h1>
            <p style={{ fontSize: '13.5px', color: '#6b7280', lineHeight: 1.6, maxWidth: '520px', fontWeight: 400 }}>
              {aiSummary}
            </p>

            {/* Date filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '18px' }}>
              {[7, 30, 90].map(d => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  style={{
                    padding: '6px 14px', fontSize: '12px', fontWeight: 600,
                    border: '1px solid',
                    borderColor: days === d ? '#2563eb' : 'rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: days === d ? 'rgba(37,99,235,0.2)' : 'transparent',
                    color: days === d ? '#60a5fa' : '#6b7280',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {d}d
                </button>
              ))}
              <button
                onClick={() => load()}
                style={{ padding: '6px 12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#6b7280', fontWeight: 500 }}
              >
                <RefreshCw size={12} />
                Refresh
              </button>
            </div>
          </div>

          {/* Health Score */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            {loading ? (
              <div className="skeleton" style={{ width: '80px', height: '80px', borderRadius: '99px' }} />
            ) : (
              <HealthRing score={healthScore} />
            )}
            <div style={{ fontSize: '11px', color: '#4b5563', fontWeight: 500, textAlign: 'center' }}>
              Business Health
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Row ────────────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} height={120} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
          {[
            {
              label: 'Total Revenue', icon: DollarSign, accent: '#2563eb', bg: '#eff6ff',
              value: parseFloat(summary.total_revenue || 0).toFixed(2), prefix: '$',
              sub: `Last ${days} days`, trend: 8,
            },
            {
              label: 'Gross Profit', icon: TrendingUp, accent: '#059669', bg: '#ecfdf5',
              value: parseFloat(summary.gross_profit || 0).toFixed(2), prefix: '$',
              sub: `${summary.margin_pct || 0}% margin`, trend: summary.margin_pct > 40 ? 5 : -2,
            },
            {
              label: 'Transactions', icon: ShoppingCart, accent: '#7c3aed', bg: '#f5f3ff',
              value: summary.total_transactions || 0, prefix: '',
              sub: `Last ${days} days`, trend: 3,
            },
            {
              label: 'Units Sold', icon: Package, accent: '#d97706', bg: '#fffbeb',
              value: parseFloat(summary.total_units_sold || 0).toFixed(0), prefix: '',
              sub: `Last ${days} days`, trend: 12,
            },
          ].map((kpi, i) => (
            <div
              key={i}
              className="card"
              style={{
                padding: '20px 22px',
                transition: 'all 0.2s ease',
                cursor: 'default',
                animationDelay: `${i * 0.06}s`,
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,0.08)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {kpi.label}
                </div>
                <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: kpi.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <kpi.icon size={15} color={kpi.accent} strokeWidth={2} />
                </div>
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-1px', fontFamily: 'Plus Jakarta Sans', lineHeight: 1 }}>
                <AnimatedNumber value={parseFloat(kpi.value)} prefix={kpi.prefix} decimals={kpi.prefix === '$' ? 2 : 0} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{kpi.sub}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: 700, color: kpi.trend > 0 ? '#059669' : '#dc2626' }}>
                  {kpi.trend > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {Math.abs(kpi.trend)}%
                </div>
              </div>
              {/* sparkline */}
              {sparkData.length > 1 && (
                <div style={{ marginTop: '10px', opacity: 0.6 }}>
                  <Sparkline data={sparkData} color={kpi.accent} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Wide Revenue Chart ─────────────────────────────────────────────── */}
      {loading ? <SkeletonChart height={280} /> : (
        <div className="card" style={{ padding: '28px 32px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans' }}>
                Revenue Momentum
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>
                Daily revenue trend — last {days} days
              </div>
            </div>
            {dailySales.length > 0 && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--accent-blue)', fontFamily: 'Plus Jakarta Sans', letterSpacing: '-0.5px' }}>
                  ${parseFloat(summary.total_revenue || 0).toFixed(2)}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>total period revenue</div>
              </div>
            )}
          </div>
          {dailySales.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={dailySales} margin={{ left: 0, right: 0, top: 5, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={0.2} />
                    <stop offset="60%" stopColor="#2563eb" stopOpacity={0.05} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} width={48} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotoneX"
                  dataKey="revenue"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  fill="url(#revGrad)"
                  dot={false}
                  activeDot={{ r: 5, fill: '#2563eb', strokeWidth: 2, stroke: 'white' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', color: 'var(--text-muted)' }}>
              <Activity size={32} strokeWidth={1} />
              <div style={{ fontSize: '13px' }}>No sales data yet — import a CSV to see revenue momentum</div>
            </div>
          )}
        </div>
      )}

      {/* ── Intelligence Row ───────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.9fr', gap: '16px', marginBottom: '24px' }}>
          {[...Array(3)].map((_, i) => <SkeletonChart key={i} height={300} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.9fr', gap: '16px', marginBottom: '24px' }}>

          {/* Product Intelligence */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans' }}>Product Intelligence</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Top performers by revenue</div>
              </div>
              <Target size={16} color="var(--text-muted)" />
            </div>
            {topProducts.length > 0 ? (
              <div>
                {topProducts.map((p, i) => {
                  const maxRev = topProducts[0].revenue
                  const pct = (p.revenue / maxRev) * 100
                  return (
                    <div key={i} style={{ marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-blue)' }}>${p.revenue.toFixed(2)}</div>
                      </div>
                      <div style={{ height: '5px', background: 'var(--border-light)', borderRadius: '99px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: i === 0 ? 'linear-gradient(90deg, #2563eb, #3b82f6)' : 'linear-gradient(90deg, #93c5fd, #bfdbfe)', borderRadius: '99px', transition: 'width 0.8s ease' }} />
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>{p.units} units</div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>No product data yet</div>
            )}
          </div>

          {/* Demand Forecast */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans' }}>Demand Forecast</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Next 7 days prediction</div>
              </div>
              <Zap size={16} color="var(--text-muted)" />
            </div>
            {forecastProducts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {forecastProducts.map((f, i) => (
                  <div key={i} style={{ padding: '12px', background: 'var(--bg-primary)', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{f.product_name}</div>
                      <div style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '5px', background: f.confidence === 'high' ? '#ecfdf5' : '#fffbeb', color: f.confidence === 'high' ? '#059669' : '#d97706' }}>
                        {f.confidence}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                      <span style={{ fontSize: '22px', fontWeight: 800, color: 'var(--accent-blue)', fontFamily: 'Plus Jakarta Sans', letterSpacing: '-0.5px' }}>
                        {f.next_7_days_forecast}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>units forecasted</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Reorder at {f.reorder_point} units · Order {f.suggested_order_qty} units
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                Import more sales data for forecasting
              </div>
            )}
          </div>

          {/* Right column — Alerts + Segments stacked */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Alerts */}
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans' }}>Alerts</div>
                {alerts.length > 0 && (
                  <div style={{ width: '20px', height: '20px', borderRadius: '99px', background: 'var(--accent-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, color: 'white' }}>
                    {alerts.length}
                  </div>
                )}
              </div>
              {alerts.length > 0 ? alerts.slice(0, 3).map((a, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '8px 0', borderBottom: i < alerts.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                  <AlertTriangle size={13} color="var(--accent-red)" style={{ marginTop: '1px', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>{a.product}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Expected {a.expected_quantity} units · {Math.round(a.confidence * 100)}% confidence</div>
                  </div>
                </div>
              )) : (
                <div style={{ fontSize: '12px', color: 'var(--accent-green)', fontWeight: 500, padding: '4px 0' }}>
                  ✅ All clear
                </div>
              )}
            </div>

            {/* Segments */}
            <div className="card" style={{ padding: '20px', flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans', marginBottom: '12px' }}>Segments</div>
              {segData && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { label: '⭐ Stars', count: segData.summary?.stars || 0, color: '#2563eb', bg: '#eff6ff' },
                    { label: '💰 Cash Cows', count: segData.summary?.cash_cows || 0, color: '#059669', bg: '#ecfdf5' },
                    { label: '📦 Volume', count: segData.summary?.volume_movers || 0, color: '#d97706', bg: '#fffbeb' },
                    { label: '💤 No Sales', count: segData.summary?.no_sales || 0, color: '#94a3b8', bg: '#f8fafc' },
                  ].map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', background: s.bg, borderRadius: '8px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>{s.label}</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: s.color, fontFamily: 'Plus Jakarta Sans' }}>{s.count}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── AI Insights Strip ──────────────────────────────────────────────── */}
      {!loading && data && (
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <div style={{ width: '26px', height: '26px', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={13} color="white" />
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans' }}>
              AI Observations
            </div>
            <div style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '99px', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
              Live analysis
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {[
              {
                type: 'info',
                title: 'Revenue Overview',
                msg: `$${parseFloat(summary.total_revenue || 0).toFixed(2)} generated with ${summary.margin_pct || 0}% gross margin over ${days} days.`,
                color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe',
              },
              {
                type: alerts.length > 0 ? 'critical' : 'positive',
                title: alerts.length > 0 ? 'Inventory Anomalies' : 'Inventory Health',
                msg: alerts.length > 0
                  ? `${alerts.map(a => a.product).join(' and ')} showing unusual stock depletion vs sales velocity.`
                  : 'No anomalies detected. Inventory levels are within expected ranges.',
                color: alerts.length > 0 ? '#dc2626' : '#059669',
                bg: alerts.length > 0 ? '#fef2f2' : '#ecfdf5',
                border: alerts.length > 0 ? '#fecaca' : '#bbf7d0',
              },
              {
                type: 'insight',
                title: 'Segment Intelligence',
                msg: segData?.summary
                  ? `${segData.summary.stars} star products, ${segData.summary.no_sales} dead SKUs. Focus on restocking top performers.`
                  : 'Import sales data to unlock segmentation insights.',
                color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe',
              },
            ].map((obs, i) => (
              <div key={i} style={{ background: obs.bg, border: `1px solid ${obs.border}`, borderRadius: '10px', padding: '14px 16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: obs.color, marginBottom: '4px' }}>{obs.title}</div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.55 }}>{obs.msg}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}