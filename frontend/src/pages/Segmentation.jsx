import { useState, useEffect } from 'react'
import { getSegmentation } from '../api'
import {
  PieChart, TrendingUp, TrendingDown, Package,
  RefreshCw, Sparkles, Star, DollarSign,
  BarChart2, AlertCircle, ArrowUpRight, ArrowDownRight
} from 'lucide-react'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { SkeletonCard, SkeletonChart } from '../components/Skeleton'

const LOCATION_ID = '15e03030-c420-4ebd-a44a-59f5ef2f7608'

// ─── Segment configs ──────────────────────────────────────────────────────────
const SEGMENTS = {
  star: {
    label: 'Stars',
    emoji: '⭐',
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.08)',
    border: 'rgba(59,130,246,0.2)',
    glow: 'rgba(59,130,246,0.15)',
    desc: 'High revenue + high velocity',
    action: 'Keep well stocked — these drive your business',
    icon: Star,
  },
  cash_cow: {
    label: 'Cash Cows',
    emoji: '💰',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.08)',
    border: 'rgba(16,185,129,0.2)',
    glow: 'rgba(16,185,129,0.15)',
    desc: 'High revenue + low velocity',
    action: 'Protect margins — premium items worth keeping',
    icon: DollarSign,
  },
  volume_mover: {
    label: 'Volume Movers',
    emoji: '📦',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.2)',
    glow: 'rgba(245,158,11,0.15)',
    desc: 'Low revenue + high velocity',
    action: 'Check margins — selling fast but low value',
    icon: Package,
  },
  dog: {
    label: 'Dogs',
    emoji: '🐢',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.2)',
    glow: 'rgba(239,68,68,0.15)',
    desc: 'Low revenue + low velocity',
    action: 'Consider dropping or repositioning',
    icon: TrendingDown,
  },
  no_sales: {
    label: 'No Sales',
    emoji: '💤',
    color: '#475569',
    bg: 'rgba(71,85,105,0.08)',
    border: 'rgba(71,85,105,0.2)',
    glow: 'rgba(71,85,105,0.1)',
    desc: 'Zero sales in period',
    action: 'Review shelf space — dead inventory',
    icon: AlertCircle,
  },
}

// ─── Custom scatter tooltip ───────────────────────────────────────────────────
function ScatterTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div style={{ background: 'rgba(15,17,26,0.95)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px 14px', minWidth: '160px' }}>
      <div style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginBottom: '6px' }}>{d.product_name}</div>
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Revenue: <span style={{ color: '#10b981', fontWeight: 700 }}>${d.total_revenue?.toFixed(2)}</span></div>
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Units: <span style={{ color: '#3b82f6', fontWeight: 700 }}>{d.total_qty?.toFixed(0)}</span></div>
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Margin: <span style={{ color: '#f59e0b', fontWeight: 700 }}>{d.margin_pct}%</span></div>
    </div>
  )
}

// ─── Product row ──────────────────────────────────────────────────────────────
function ProductRow({ product, segment, index }) {
  const s = SEGMENTS[segment]
  return (
    <div
      style={{
        display: 'grid', gridTemplateColumns: '1fr 90px 90px 80px 100px',
        gap: '12px', padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.03)',
        transition: 'background 0.15s ease',
        animationDelay: `${index * 0.04}s`,
      }}
      className="fade-up"
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{product.product_name}</div>
        <div style={{ fontSize: '11px', color: '#374151', marginTop: '1px', fontFamily: 'monospace' }}>{product.upc}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#10b981' }}>${product.total_revenue?.toFixed(2) || '—'}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>{product.total_qty?.toFixed(0) || '0'}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: product.margin_pct > 40 ? 'rgba(16,185,129,0.1)' : product.margin_pct > 20 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)', color: product.margin_pct > 40 ? '#10b981' : product.margin_pct > 20 ? '#f59e0b' : '#ef4444' }}>
          {product.margin_pct}%
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '5px', background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
          {s.emoji} {s.label}
        </span>
      </div>
    </div>
  )
}

// ─── Segment section ──────────────────────────────────────────────────────────
function SegmentSection({ segKey, products }) {
  const [collapsed, setCollapsed] = useState(false)
  if (!products?.length) return null
  const s = SEGMENTS[segKey]
  const Icon = s.icon

  const totalRevenue = products.reduce((sum, p) => sum + (p.total_revenue || 0), 0)
  const avgMargin = products.reduce((sum, p) => sum + (p.margin_pct || 0), 0) / products.length

  return (
    <div style={{ background: 'var(--bg-card)', border: `1px solid ${s.border}`, borderRadius: '14px', overflow: 'hidden', marginBottom: '12px' }}>
      {/* Section header */}
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', background: s.bg }}
      >
        <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: `rgba(${s.color === '#3b82f6' ? '59,130,246' : s.color === '#10b981' ? '16,185,129' : s.color === '#f59e0b' ? '245,158,11' : s.color === '#ef4444' ? '239,68,68' : '71,85,105'},0.15)`, border: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={15} color={s.color} />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans' }}>
              {s.emoji} {s.label}
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', background: s.color, color: 'white' }}>
              {products.length}
            </span>
          </div>
          <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '1px' }}>{s.action}</div>
        </div>

        {/* Quick stats */}
        <div style={{ display: 'flex', gap: '20px', marginRight: '12px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: '#374151', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Revenue</div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#10b981', fontFamily: 'Plus Jakarta Sans' }}>${totalRevenue.toFixed(2)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: '#374151', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Avg Margin</div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: s.color, fontFamily: 'Plus Jakarta Sans' }}>{avgMargin.toFixed(1)}%</div>
          </div>
        </div>

        <div style={{ color: '#374151', fontSize: '12px' }}>{collapsed ? '▶' : '▼'}</div>
      </div>

      {/* Products table */}
      {!collapsed && (
        <div>
          {/* Table headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px 80px 100px', gap: '12px', padding: '8px 16px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            {['Product', 'Revenue', 'Units', 'Margin', 'Segment'].map((h, i) => (
              <div key={i} style={{ fontSize: '10px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</div>
            ))}
          </div>
          {products.map((p, i) => (
            <ProductRow key={i} product={p} segment={segKey} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Matrix chart ─────────────────────────────────────────────────────────────
function SegmentMatrix({ data }) {
  const allProducts = [
    ...(data.stars || []).map(p => ({ ...p, segment: 'star' })),
    ...(data.cash_cows || []).map(p => ({ ...p, segment: 'cash_cow' })),
    ...(data.volume_movers || []).map(p => ({ ...p, segment: 'volume_mover' })),
    ...(data.dogs || []).map(p => ({ ...p, segment: 'dog' })),
  ].map(p => ({
    ...p,
    x: p.total_qty || 0,
    y: p.total_revenue || 0,
  }))

  if (!allProducts.length) return null

  return (
    <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans' }}>
            Revenue vs Velocity Matrix
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Each dot is a product — position shows performance quadrant
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {['star', 'cash_cow', 'volume_mover', 'dog'].map(seg => (
            <div key={seg} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '99px', background: SEGMENTS[seg].color }} />
              <span style={{ fontSize: '11px', color: '#374151' }}>{SEGMENTS[seg].label}</span>
            </div>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="x" type="number" name="Units Sold" tick={{ fontSize: 11, fill: '#374151' }} axisLine={false} tickLine={false} label={{ value: 'Units Sold →', position: 'insideBottom', offset: -10, fontSize: 11, fill: '#374151' }} />
          <YAxis dataKey="y" type="number" name="Revenue" tick={{ fontSize: 11, fill: '#374151' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} label={{ value: 'Revenue →', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#374151' }} />
          <Tooltip content={<ScatterTooltip />} />
          <Scatter data={allProducts} shape="circle">
            {allProducts.map((p, i) => (
              <Cell key={i} fill={SEGMENTS[p.segment]?.color || '#475569'} opacity={0.8} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Hero summary ─────────────────────────────────────────────────────────────
function SegmentHero({ data, days }) {
  const summary = data?.summary || {}
  const thresholds = data?.thresholds || {}

  const starRevenue = (data?.stars || []).reduce((s, p) => s + (p.total_revenue || 0), 0)
  const totalRevenue = ['stars', 'cash_cows', 'volume_movers', 'dogs'].reduce((sum, key) =>
    sum + (data?.[key] || []).reduce((s, p) => s + (p.total_revenue || 0), 0), 0)

  const starPct = totalRevenue > 0 ? ((starRevenue / totalRevenue) * 100).toFixed(0) : 0

  return (
    <div style={{ background: 'linear-gradient(135deg, #0f1117, #111827)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '18px', padding: '28px 32px', marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '-30px', right: '100px', width: '250px', height: '180px', background: 'radial-gradient(ellipse, rgba(59,130,246,0.1), transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '24px', position: 'relative', zIndex: 1 }}>
        {[
          { label: 'Stars', value: summary.stars || 0, color: '#3b82f6', sub: 'Top performers', emoji: '⭐' },
          { label: 'Cash Cows', value: summary.cash_cows || 0, color: '#10b981', sub: 'High value items', emoji: '💰' },
          { label: 'Volume Movers', value: summary.volume_movers || 0, color: '#f59e0b', sub: 'Fast moving', emoji: '📦' },
          { label: 'Dogs', value: summary.dogs || 0, color: '#ef4444', sub: 'Underperformers', emoji: '🐢' },
          { label: 'No Sales', value: summary.no_sales || 0, color: '#475569', sub: 'Dead inventory', emoji: '💤' },
        ].map((s, i) => (
          <div key={i}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>{s.label}</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: s.color, fontFamily: 'Plus Jakarta Sans', letterSpacing: '-0.5px', lineHeight: 1, marginBottom: '3px' }}>
              {s.emoji} {s.value}
            </div>
            <div style={{ fontSize: '11px', color: '#374151' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '10px', position: 'relative', zIndex: 1 }}>
        <Sparkles size={13} color="#3b82f6" />
        <span style={{ fontSize: '12.5px', color: '#475569' }}>
          Star products generate <span style={{ color: '#f1f5f9', fontWeight: 700 }}>{starPct}% of total revenue</span> ·
          Median revenue threshold: <span style={{ color: '#3b82f6', fontWeight: 700 }}>${thresholds.median_revenue}</span> ·
          Median velocity: <span style={{ color: '#3b82f6', fontWeight: 700 }}>{thresholds.median_velocity} units</span>
        </span>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Segmentation() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)
  const [view, setView] = useState('segments')

  async function load(d = days) {
    setLoading(true)
    try {
      const res = await getSegmentation(LOCATION_ID, d)
      setData(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [days])

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div style={{ width: '30px', height: '30px', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PieChart size={14} color="#3b82f6" />
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans', letterSpacing: '-0.3px' }}>
              Segmentation
            </h1>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginLeft: '40px' }}>
            Product performance classification — stars, cash cows, volume movers, dogs
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {/* Days filter */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '9px', overflow: 'hidden' }}>
            {[7, 30, 90].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                style={{ padding: '7px 14px', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer', background: days === d ? 'rgba(59,130,246,0.15)' : 'transparent', color: days === d ? '#60a5fa' : '#475569', transition: 'all 0.15s ease' }}
              >
                {d}d
              </button>
            ))}
          </div>
          <button
            onClick={() => load()}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: '9px', color: 'var(--text-muted)', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer' }}
          >
            <RefreshCw size={13} />
            Refresh
          </button>
        </div>
      </div>

      {/* Hero */}
      {loading ? <SkeletonChart height={160} /> : <SegmentHero data={data} days={days} />}

      {/* View toggle */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {[
          { id: 'segments', label: '📊 By Segment' },
          { id: 'matrix', label: '🎯 Matrix View' },
        ].map(v => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            style={{ padding: '8px 16px', fontSize: '12.5px', fontWeight: 600, border: '1px solid', borderColor: view === v.id ? 'rgba(59,130,246,0.3)' : 'var(--border)', borderRadius: '9px', cursor: 'pointer', background: view === v.id ? 'rgba(59,130,246,0.1)' : 'transparent', color: view === v.id ? '#60a5fa' : '#475569', transition: 'all 0.15s ease' }}
          >
            {v.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} height={120} />)}
        </div>
      ) : !data ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#374151' }}>No data available</div>
      ) : view === 'matrix' ? (
        <SegmentMatrix data={data} />
      ) : (
        <div>
         {[
            { dataKey: 'stars', segKey: 'star' },
            { dataKey: 'cash_cows', segKey: 'cash_cow' },
            { dataKey: 'volume_movers', segKey: 'volume_mover' },
            { dataKey: 'dogs', segKey: 'dog' },
            { dataKey: 'no_sales', segKey: 'no_sales' },
          ].map(({ dataKey, segKey }) => (
          <SegmentSection
            key={segKey}
            segKey={segKey}
            products={data[dataKey] || []}
          />
          ))}
        </div>
      )}
    </div>
  )
}