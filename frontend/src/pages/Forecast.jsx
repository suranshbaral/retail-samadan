import { useState, useEffect } from 'react'
import { getForecast } from '../api'
import {
  TrendingUp, TrendingDown, Zap, RefreshCw,
  Package, AlertCircle, ChevronDown, ChevronUp,
  Sparkles, Target, Clock, ArrowUpRight, ArrowDownRight
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'
import { SkeletonCard, SkeletonChart } from '../components/Skeleton'

const LOCATION_ID = '15e03030-c420-4ebd-a44a-59f5ef2f7608'

// ─── Custom tooltip ───────────────────────────────────────────────────────────
function ForecastTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'rgba(15,17,26,0.95)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '10px 14px' }}>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginBottom: '6px' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '99px', background: p.color }} />
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>{p.name}:</span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'white' }}>{Number(p.value).toFixed(1)}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Confidence badge ─────────────────────────────────────────────────────────
function ConfidenceBadge({ level }) {
  const styles = {
    high: { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', color: '#10b981', label: '↑ High Confidence' },
    medium: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', color: '#f59e0b', label: '~ Medium Confidence' },
    low: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', color: '#ef4444', label: '↓ Low Confidence' },
  }
  const s = styles[level] || styles.low
  return (
    <div style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '5px', background: s.bg, border: `1px solid ${s.border}`, color: s.color, letterSpacing: '0.04em' }}>
      {s.label}
    </div>
  )
}

// ─── Forecast card ────────────────────────────────────────────────────────────
function ForecastCard({ item, index }) {
  const [expanded, setExpanded] = useState(false)

  const chartData = (item.forecast_detail || []).map(f => ({
    date: f.date.slice(5), // MM-DD
    predicted: f.predicted_qty,
    upper: f.upper_bound,
    lower: f.lower_bound,
  }))

  const trend = item.trend_pct
  const trendColor = trend > 0 ? '#10b981' : trend < 0 ? '#ef4444' : '#475569'
  const TrendIcon = trend > 0 ? ArrowUpRight : trend < 0 ? ArrowDownRight : null

  return (
    <div
      className="card fade-up"
      style={{ padding: '0', overflow: 'hidden', animationDelay: `${index * 0.06}s` }}
    >
      {/* Card header */}
      <div style={{ padding: '20px 22px', borderBottom: expanded ? '1px solid var(--border)' : 'none' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans' }}>
                {item.product_name}
              </div>
              <ConfidenceBadge level={item.confidence} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '11px', color: '#374151', fontFamily: 'monospace' }}>{item.upc}</span>
              {item.category && (
                <span style={{ fontSize: '11px', color: '#374151', padding: '1px 6px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px' }}>
                  {item.category}
                </span>
              )}
            </div>
          </div>

          {/* Trend indicator */}
          {TrendIcon && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', background: trend > 0 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${trend > 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: '8px' }}>
              <TrendIcon size={13} color={trendColor} />
              <span style={{ fontSize: '12px', fontWeight: 700, color: trendColor }}>{Math.abs(trend)}% trend</span>
            </div>
          )}
        </div>

        {/* Metrics row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
          {[
            { label: 'Avg Daily Sales', value: item.avg_daily_sales, suffix: ' units', color: '#3b82f6' },
            { label: '7-Day Forecast', value: item.next_7_days_forecast, suffix: ' units', color: '#8b5cf6' },
            { label: 'Reorder Point', value: item.reorder_point, suffix: ' units', color: '#f59e0b' },
            { label: 'Suggested Order', value: item.suggested_order_qty, suffix: ' units', color: '#10b981' },
            { label: 'Margin', value: item.margin, suffix: '%', color: item.margin > 40 ? '#10b981' : item.margin > 20 ? '#f59e0b' : '#ef4444' },
          ].map((m, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '9px', padding: '10px 12px' }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{m.label}</div>
              <div style={{ fontSize: '17px', fontWeight: 800, color: m.color, fontFamily: 'Plus Jakarta Sans', letterSpacing: '-0.3px' }}>
                {m.value}{m.suffix}
              </div>
            </div>
          ))}
        </div>

        {/* Reorder alert */}
        {item.avg_daily_sales > 0 && item.reorder_point > 0 && (
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.12)', borderRadius: '8px' }}>
            <Sparkles size={12} color="#3b82f6" />
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              AI recommends ordering <span style={{ color: '#60a5fa', fontWeight: 700 }}>{item.suggested_order_qty} units</span> when stock hits <span style={{ color: '#60a5fa', fontWeight: 700 }}>{item.reorder_point}</span> — covers ~7 days of demand
            </span>
          </div>
        )}
      </div>

      {/* Expand chart */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ padding: '10px 22px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#374151', fontSize: '12px', fontWeight: 600, borderTop: expanded ? 'none' : '1px solid var(--border)' }}
      >
        {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        {expanded ? 'Hide' : 'Show'} 7-day forecast chart
      </div>

      {/* Chart */}
      {expanded && chartData.length > 0 && (
        <div style={{ padding: '0 22px 22px' }}>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id={`band-${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#374151' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#374151' }} axisLine={false} tickLine={false} width={30} />
              <Tooltip content={<ForecastTooltip />} />
              {/* Confidence band */}
              <Area type="monotone" dataKey="upper" stroke="none" fill={`url(#band-${index})`} name="Upper" />
              <Area type="monotone" dataKey="lower" stroke="none" fill="var(--bg-card)" name="Lower" />
              {/* Predicted line */}
              <Area type="monotone" dataKey="predicted" stroke="#3b82f6" strokeWidth={2.5} fill={`url(#grad-${index})`} dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#3b82f6', strokeWidth: 2, stroke: 'rgba(59,130,246,0.3)' }} name="Predicted" />
              {/* Reorder line */}
              {item.reorder_point > 0 && (
                <ReferenceLine y={item.reorder_point} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: 'Reorder', position: 'right', fontSize: 9, fill: '#f59e0b' }} />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

// ─── Summary hero ─────────────────────────────────────────────────────────────
function ForecastHero({ data }) {
  const forecasts = data?.forecasts || []
  const withData = forecasts.filter(f => f.avg_daily_sales > 0)
  const totalForecastRev = data?.total_forecast_revenue_7d || 0
  const topProduct = withData[0]
  const highConf = withData.filter(f => f.confidence === 'high').length

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0f1117, #111827)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '18px',
      padding: '28px 32px',
      marginBottom: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: '-30px', right: '80px', width: '250px', height: '180px', background: 'radial-gradient(ellipse, rgba(139,92,246,0.12), transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-20px', left: '150px', width: '200px', height: '150px', background: 'radial-gradient(ellipse, rgba(59,130,246,0.1), transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '24px', position: 'relative', zIndex: 1 }}>
        {[
          { label: 'Products Analyzed', value: data?.products_analyzed || 0, sub: 'In your pricebook', color: '#3b82f6', icon: Package },
          { label: 'With Sales Data', value: withData.length, sub: 'Have forecast models', color: '#8b5cf6', icon: TrendingUp },
          { label: 'Forecast Revenue', value: `$${totalForecastRev.toFixed(2)}`, sub: 'Next 7 days projected', color: '#10b981', icon: Target },
          { label: 'High Confidence', value: highConf, sub: 'Reliable predictions', color: '#f59e0b', icon: Zap },
        ].map((s, i) => (
          <div key={i}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <s.icon size={13} color={s.color} />
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</span>
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: s.color, fontFamily: 'Plus Jakarta Sans', letterSpacing: '-0.5px', lineHeight: 1, marginBottom: '4px' }}>
              {s.value}
            </div>
            <div style={{ fontSize: '11px', color: '#374151' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {topProduct && (
        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '10px', position: 'relative', zIndex: 1 }}>
          <Sparkles size={13} color="#8b5cf6" />
          <span style={{ fontSize: '12.5px', color: '#475569' }}>
            Top forecast: <span style={{ color: '#f1f5f9', fontWeight: 700 }}>{topProduct.product_name}</span> —
            predicted <span style={{ color: '#8b5cf6', fontWeight: 700 }}>{topProduct.next_7_days_forecast} units</span> next week at
            <span style={{ color: '#10b981', fontWeight: 700 }}> {topProduct.avg_daily_sales}/day</span> avg velocity
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Forecast() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState('forecast')

  async function load() {
    setLoading(true)
    try {
      const res = await getForecast(LOCATION_ID)
      setData(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const forecasts = data?.forecasts || []

  const filtered = forecasts
    .filter(f => {
      if (filter === 'active') return f.avg_daily_sales > 0
      if (filter === 'reorder') return f.avg_daily_sales > 0 && f.reorder_point > 0
      if (filter === 'no_data') return f.avg_daily_sales === 0
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'forecast') return b.next_7_days_forecast - a.next_7_days_forecast
      if (sortBy === 'velocity') return b.avg_daily_sales - a.avg_daily_sales
      if (sortBy === 'margin') return b.margin - a.margin
      return 0
    })

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div style={{ width: '30px', height: '30px', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={14} color="#8b5cf6" />
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans', letterSpacing: '-0.3px' }}>
              Demand Forecast
            </h1>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginLeft: '40px' }}>
            AI-powered demand predictions with reorder recommendations
          </p>
        </div>
        <button
          onClick={load}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: '9px', color: 'var(--text-muted)', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer' }}
        >
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      {/* Hero */}
      {loading ? <SkeletonChart height={180} /> : <ForecastHero data={data} />}

      {/* Filters + sort */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '9px', overflow: 'hidden' }}>
          {[
            { id: 'all', label: `All (${forecasts.length})` },
            { id: 'active', label: `Active (${forecasts.filter(f => f.avg_daily_sales > 0).length})` },
            { id: 'reorder', label: `Needs Reorder (${forecasts.filter(f => f.reorder_point > 0).length})` },
            { id: 'no_data', label: `No Data (${forecasts.filter(f => f.avg_daily_sales === 0).length})` },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{ padding: '8px 14px', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer', background: filter === f.id ? 'rgba(139,92,246,0.15)' : 'transparent', color: filter === f.id ? '#a78bfa' : '#475569', transition: 'all 0.15s ease' }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11.5px', color: '#374151', fontWeight: 500 }}>Sort by:</span>
          {[
            { id: 'forecast', label: 'Forecast' },
            { id: 'velocity', label: 'Velocity' },
            { id: 'margin', label: 'Margin' },
          ].map(s => (
            <button
              key={s.id}
              onClick={() => setSortBy(s.id)}
              style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 600, border: '1px solid', borderColor: sortBy === s.id ? 'rgba(139,92,246,0.3)' : 'var(--border)', borderRadius: '7px', cursor: 'pointer', background: sortBy === s.id ? 'rgba(139,92,246,0.1)' : 'transparent', color: sortBy === s.id ? '#a78bfa' : '#475569', transition: 'all 0.15s ease' }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Forecast cards */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} height={140} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center' }}>
          <TrendingUp size={36} color="#1f2937" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>No forecast data</div>
          <div style={{ fontSize: '12px', color: '#1f2937' }}>Import sales data to generate demand forecasts</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.map((item, i) => (
            <ForecastCard key={item.upc} item={item} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}