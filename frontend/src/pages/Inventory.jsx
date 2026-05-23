import { useState, useEffect } from 'react'
import { getExpectedInventory, runAudit } from '../api'
import {
  Package, AlertTriangle, CheckCircle, TrendingDown,
  TrendingUp, Search, Filter, RefreshCw, ArrowUpRight,
  ArrowDownRight, Minus, BarChart2, Zap
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { SkeletonRow } from '../components/Skeleton'


// ─── Health indicator ─────────────────────────────────────────────────────────
function HealthDot({ expected, reorderPoint = 0 }) {
  if (expected < 0) return <div style={{ width: '8px', height: '8px', borderRadius: '99px', background: '#ef4444', boxShadow: '0 0 6px rgba(239,68,68,0.6)' }} />
  if (expected === 0) return <div style={{ width: '8px', height: '8px', borderRadius: '99px', background: '#475569' }} />
  if (expected <= reorderPoint) return <div style={{ width: '8px', height: '8px', borderRadius: '99px', background: '#f59e0b', boxShadow: '0 0 6px rgba(245,158,11,0.5)' }} />
  return <div style={{ width: '8px', height: '8px', borderRadius: '99px', background: '#10b981', boxShadow: '0 0 6px rgba(16,185,129,0.5)' }} />
}

// ─── Stock bar ────────────────────────────────────────────────────────────────
function StockBar({ expected, maxExpected }) {
  const pct = maxExpected > 0 ? Math.max(0, Math.min(100, (expected / maxExpected) * 100)) : 0
  const color = expected < 0 ? '#ef4444' : expected === 0 ? '#374151' : pct < 20 ? '#f59e0b' : '#3b82f6'

  return (
    <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden', width: '80px' }}>
      <div style={{ height: '100%', width: `${Math.abs(pct)}%`, background: color, borderRadius: '99px', transition: 'width 0.6s ease' }} />
    </div>
  )
}

// ─── Summary cards ────────────────────────────────────────────────────────────
function SummaryCard({ label, value, sub, color, bg, icon: Icon }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px 22px', transition: 'all 0.2s ease' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
        <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={15} color={color} />
        </div>
      </div>
      <div style={{ fontSize: '28px', fontWeight: 800, color, fontFamily: 'Plus Jakarta Sans', letterSpacing: '-1px', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '6px' }}>{sub}</div>}
    </div>
  )
}

export default function Inventory() {
  const [inventory, setInventory] = useState([])
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState('expected')
  const [sortDir, setSortDir] = useState('asc')
  const { location } = useAuth()
  const LOCATION_ID = location?.id

  async function load() {
    setLoading(true)
    try {
      const [invRes, auditRes] = await Promise.all([
        getExpectedInventory(LOCATION_ID),
        runAudit(LOCATION_ID),
      ])
      setInventory(invRes.data.inventory || [])
      setAlerts(auditRes.data.alerts || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Filter + search + sort
  const alertedUpcs = new Set(alerts.map(a => a.upc))

  const filtered = inventory
    .filter(item => {
      const matchSearch = !search ||
        item.product_name?.toLowerCase().includes(search.toLowerCase()) ||
        item.upc?.includes(search)
      const matchFilter =
        filter === 'all' ? true :
        filter === 'critical' ? item.expected_quantity < 0 :
        filter === 'low' ? item.expected_quantity >= 0 && item.expected_quantity < 5 :
        filter === 'healthy' ? item.expected_quantity >= 5 :
        filter === 'alerts' ? alertedUpcs.has(item.upc) : true
      return matchSearch && matchFilter
    })
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      if (sortBy === 'expected') return (a.expected_quantity - b.expected_quantity) * dir
      if (sortBy === 'name') return a.product_name?.localeCompare(b.product_name) * dir
      if (sortBy === 'margin') return (a.margin - b.margin) * dir
      if (sortBy === 'sold') return (a.total_sold - b.total_sold) * dir
      return 0
    })

  const maxExpected = Math.max(...inventory.map(i => i.expected_quantity), 1)

  // Summary stats
  const critical = inventory.filter(i => i.expected_quantity < 0).length
  const low = inventory.filter(i => i.expected_quantity >= 0 && i.expected_quantity < 5).length
  const healthy = inventory.filter(i => i.expected_quantity >= 5).length
  const totalSold = inventory.reduce((sum, i) => sum + i.total_sold, 0)

  function toggleSort(col) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
  }

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <Minus size={10} color="#374151" />
    return sortDir === 'asc' ? <ArrowUpRight size={10} color="#3b82f6" /> : <ArrowDownRight size={10} color="#3b82f6" />
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div style={{ width: '30px', height: '30px', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={14} color="#8b5cf6" />
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans', letterSpacing: '-0.3px' }}>
              Inventory
            </h1>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginLeft: '40px' }}>
            Expected stock levels based on purchases minus sales
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

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        <SummaryCard label="Critical" value={critical} sub="Selling more than purchased" color="#ef4444" bg="rgba(239,68,68,0.1)" icon={AlertTriangle} />
        <SummaryCard label="Low Stock" value={low} sub="Less than 5 units expected" color="#f59e0b" bg="rgba(245,158,11,0.1)" icon={TrendingDown} />
        <SummaryCard label="Healthy" value={healthy} sub="Adequate stock levels" color="#10b981" bg="rgba(16,185,129,0.1)" icon={CheckCircle} />
        <SummaryCard label="Units Sold" value={totalSold.toFixed(0)} sub="Total across all products" color="#3b82f6" bg="rgba(59,130,246,0.1)" icon={BarChart2} />
      </div>

      {/* Alert strip */}
      {alerts.length > 0 && (
        <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '12px', padding: '14px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <AlertTriangle size={15} color="#ef4444" />
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#ef4444' }}>{alerts.length} shrinkage alert{alerts.length > 1 ? 's' : ''} active — </span>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>{alerts.map(a => a.product).join(', ')} need to be counted today</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#ef4444', fontWeight: 600, background: 'rgba(239,68,68,0.1)', padding: '4px 10px', borderRadius: '99px' }}>
            <Zap size={10} />
            AI Detected
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>

        {/* Table toolbar */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, maxWidth: '280px' }}>
            <Search size={13} color="#374151" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or UPC..."
              style={{ width: '100%', padding: '8px 10px 8px 30px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12.5px', color: 'var(--text-primary)', outline: 'none' }}
            />
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
            {[
              { id: 'all', label: 'All' },
              { id: 'critical', label: '🔴 Critical' },
              { id: 'low', label: '🟡 Low' },
              { id: 'healthy', label: '🟢 Healthy' },
              { id: 'alerts', label: '⚡ Alerts' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                style={{ padding: '7px 14px', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer', background: filter === f.id ? 'rgba(59,130,246,0.15)' : 'transparent', color: filter === f.id ? '#60a5fa' : '#475569', transition: 'all 0.15s ease' }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div style={{ marginLeft: 'auto', fontSize: '12px', color: '#374151', fontWeight: 500 }}>
            {filtered.length} products
          </div>
        </div>

        {/* Column headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr 120px 100px 100px 80px 120px 100px', gap: '12px', padding: '10px 20px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
          {[
            { label: '', col: null },
            { label: 'Product', col: 'name' },
            { label: 'UPC', col: null },
            { label: 'Purchased', col: null },
            { label: 'Sold', col: 'sold' },
            { label: 'Expected', col: 'expected' },
            { label: 'Stock Level', col: null },
            { label: 'Margin', col: 'margin' },
          ].map((h, i) => (
            <div
              key={i}
              onClick={() => h.col && toggleSort(h.col)}
              style={{ fontSize: '10px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em', cursor: h.col ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              {h.label}
              {h.col && <SortIcon col={h.col} />}
            </div>
          ))}
        </div>

        {/* Rows */}
        {loading ? (
          <div style={{ padding: '0 20px' }}>
            {[...Array(8)].map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <Package size={36} color="#1f2937" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>No products found</div>
            <div style={{ fontSize: '12px', color: '#1f2937' }}>Try adjusting your search or filter</div>
          </div>
        ) : (
          filtered.map((item, i) => {
            const isAlert = alertedUpcs.has(item.upc)
            const isCritical = item.expected_quantity < 0
            const isLow = item.expected_quantity >= 0 && item.expected_quantity < 5

            return (
              <div
                key={item.product_id}
                style={{
                  display: 'grid', gridTemplateColumns: '24px 1fr 120px 100px 100px 80px 120px 100px',
                  gap: '12px', padding: '13px 20px',
                  borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                  background: isAlert ? 'rgba(239,68,68,0.03)' : isCritical ? 'rgba(239,68,68,0.02)' : 'transparent',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                onMouseLeave={e => e.currentTarget.style.background = isAlert ? 'rgba(239,68,68,0.03)' : 'transparent'}
              >
                {/* Health dot */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <HealthDot expected={item.expected_quantity} />
                </div>

                {/* Product name */}
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {item.product_name}
                    {isAlert && (
                      <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                        COUNT TODAY
                      </span>
                    )}
                  </div>
                  {item.category && (
                    <div style={{ fontSize: '11px', color: '#374151', marginTop: '1px' }}>{item.category}</div>
                  )}
                </div>

                {/* UPC */}
                <div style={{ fontSize: '11.5px', color: '#374151', fontFamily: 'monospace', display: 'flex', alignItems: 'center' }}>
                  {item.upc}
                </div>

                {/* Purchased */}
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center' }}>
                  {item.total_purchased.toFixed(0)}
                </div>

                {/* Sold */}
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center' }}>
                  {item.total_sold.toFixed(0)}
                </div>

                {/* Expected */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{
                    fontSize: '13px', fontWeight: 700,
                    color: isCritical ? '#ef4444' : isLow ? '#f59e0b' : '#10b981',
                  }}>
                    {item.expected_quantity.toFixed(0)}
                  </span>
                </div>

                {/* Stock bar */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <StockBar expected={item.expected_quantity} maxExpected={maxExpected} />
                </div>

                {/* Margin */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: item.margin > 40 ? 'rgba(16,185,129,0.1)' : item.margin > 20 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)', color: item.margin > 40 ? '#10b981' : item.margin > 20 ? '#f59e0b' : '#ef4444' }}>
                    {item.margin}%
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '14px', padding: '0 4px' }}>
        {[
          { color: '#10b981', label: 'Healthy stock' },
          { color: '#f59e0b', label: 'Low stock' },
          { color: '#ef4444', label: 'Critical — selling more than purchased' },
          { color: '#475569', label: 'No movement' },
        ].map((l, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '99px', background: l.color }} />
            <span style={{ fontSize: '11px', color: '#374151' }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}