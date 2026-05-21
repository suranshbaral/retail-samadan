import { useState, useEffect } from 'react'
import { getAlerts, runAudit, getExpectedInventory } from '../api'
import {
  AlertTriangle, CheckCircle, Clock, Zap, RefreshCw,
  Package, TrendingDown, Eye, Check, X, Filter,
  ChevronRight, Activity, Shield, Sparkles
} from 'lucide-react'
import { SkeletonCard } from '../components/Skeleton'

const LOCATION_ID = '15e03030-c420-4ebd-a44a-59f5ef2f7608'

// ─── Severity config ──────────────────────────────────────────────────────────
const SEVERITY = {
  high: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', label: 'HIGH', glow: '0 0 12px rgba(239,68,68,0.3)' },
  medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', label: 'MEDIUM', glow: '0 0 12px rgba(245,158,11,0.25)' },
  low: { color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)', label: 'LOW', glow: '0 0 12px rgba(59,130,246,0.2)' },
}

// ─── Confidence ring ──────────────────────────────────────────────────────────
function ConfidenceRing({ value, size = 48 }) {
  const r = 18
  const circ = 2 * Math.PI * r
  const offset = circ - value * circ
  const color = value >= 0.8 ? '#ef4444' : value >= 0.6 ? '#f59e0b' : '#3b82f6'

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
        <circle cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 24 24)"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, color }}>
        {Math.round(value * 100)}%
      </div>
    </div>
  )
}

// ─── Alert card ───────────────────────────────────────────────────────────────
function AlertCard({ alert, onResolve, index }) {
  const s = SEVERITY[alert.severity] || SEVERITY.medium
  const [resolving, setResolving] = useState(false)

  async function handleResolve() {
    setResolving(true)
    setTimeout(() => onResolve(alert), 600)
  }

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${s.border}`,
        borderRadius: '14px',
        padding: '20px 22px',
        display: 'flex',
        gap: '16px',
        alignItems: 'flex-start',
        opacity: resolving ? 0.4 : 1,
        transform: resolving ? 'scale(0.98)' : 'translateY(0)',
        transition: 'all 0.3s ease',
        animationDelay: `${index * 0.06}s`,
      }}
      className="fade-up"
    >
      {/* Confidence ring */}
      <ConfidenceRing value={alert.confidence} />

      {/* Content */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans' }}>
            {alert.product}
          </div>
          <div style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '5px', background: s.bg, color: s.color, border: `1px solid ${s.border}`, letterSpacing: '0.06em' }}>
            {s.label}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#374151' }}>
            <Clock size={10} />
            {new Date(alert.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        {/* AI narrative */}
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '12px' }}>
          <span style={{ color: s.color, fontWeight: 600 }}>Inventory anomaly detected — </span>
          {alert.product} stock is unusually low compared to recent sales velocity.
          Expected <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{alert.expected_quantity}</span> units
          based on purchase history minus sales.
          {alert.confidence >= 0.8 && ' High confidence — immediate count recommended.'}
          {alert.confidence >= 0.6 && alert.confidence < 0.8 && ' Medium confidence — schedule count within 24 hours.'}
          {alert.confidence < 0.6 && ' Low confidence — monitor before acting.'}
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '14px' }}>
          {[
            { label: 'Expected Qty', value: alert.expected_quantity, color: s.color },
            { label: 'AI Confidence', value: `${Math.round(alert.confidence * 100)}%`, color: s.color },
            { label: 'Action', value: 'Count Today', color: '#94a3b8' },
          ].map((stat, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ fontSize: '10px', color: '#374151', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{stat.label}</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={handleResolve}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', color: '#10b981', fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s ease' }}
          >
            <Check size={12} />
            Mark Resolved
          </button>
          <button
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: '8px', color: '#475569', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
          >
            <Eye size={12} />
            View Product
          </button>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#374151' }}>
            <Sparkles size={11} color="#3b82f6" />
            AI Generated
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div style={{ padding: '80px 20px', textAlign: 'center' }}>
      <div style={{ position: 'relative', width: '80px', height: '80px', margin: '0 auto 24px' }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '99px', background: 'radial-gradient(circle, rgba(16,185,129,0.15), transparent 70%)' }} />
        <div style={{ position: 'absolute', inset: '12px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '99px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Shield size={24} color="#10b981" />
        </div>
      </div>
      <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans', marginBottom: '8px' }}>
        All Clear
      </div>
      <div style={{ fontSize: '13px', color: '#374151', maxWidth: '300px', margin: '0 auto', lineHeight: 1.6 }}>
        No shrinkage alerts detected. Your inventory is within expected ranges.
      </div>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '16px', padding: '8px 16px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '99px' }}>
        <div style={{ width: '6px', height: '6px', borderRadius: '99px', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#10b981' }}>AI monitoring active</span>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Alerts() {
  const [alerts, setAlerts] = useState([])
  const [resolved, setResolved] = useState([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [filter, setFilter] = useState('active')
  const [engineResult, setEngineResult] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const res = await getAlerts(LOCATION_ID)
      setAlerts(res.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function runEngine() {
    setRunning(true)
    try {
      const res = await runAudit(LOCATION_ID)
      setAlerts(res.data.alerts || [])
      setEngineResult(res.data.engine_result)
    } catch (e) {
      console.error(e)
    } finally {
      setRunning(false)
    }
  }

  useEffect(() => { load() }, [])

  function handleResolve(alert) {
    setAlerts(prev => prev.filter(a => a.product !== alert.product))
    setResolved(prev => [...prev, { ...alert, resolved_at: new Date() }])
  }

  const highAlerts = alerts.filter(a => a.severity === 'high')
  const medAlerts = alerts.filter(a => a.severity === 'medium')
  const lowAlerts = alerts.filter(a => a.severity === 'low')

  const displayed = filter === 'active' ? alerts : filter === 'resolved' ? resolved : alerts

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div style={{ width: '30px', height: '30px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={14} color="#ef4444" />
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans', letterSpacing: '-0.3px' }}>
              Alerts
            </h1>
            {alerts.length > 0 && (
              <div style={{ width: '22px', height: '22px', borderRadius: '99px', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: 'white', boxShadow: '0 0 10px rgba(239,68,68,0.4)' }}>
                {alerts.length}
              </div>
            )}
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginLeft: '40px' }}>
            AI-detected inventory anomalies that need your attention
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={runEngine}
            disabled={running}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: running ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '9px', color: '#60a5fa', fontSize: '12.5px', fontWeight: 700, cursor: running ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease' }}
          >
            <Zap size={13} style={{ animation: running ? 'spin 1s linear infinite' : 'none' }} />
            {running ? 'Running AI...' : 'Run AI Audit'}
          </button>
          <button
            onClick={load}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: '9px', color: 'var(--text-muted)', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer' }}
          >
            <RefreshCw size={13} />
            Refresh
          </button>
        </div>
      </div>

      {/* Engine result banner */}
      {engineResult && (
        <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }} className="fade-in">
          <Activity size={14} color="#3b82f6" />
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>
            AI scanned <span style={{ color: '#f1f5f9', fontWeight: 700 }}>{engineResult.products_checked}</span> products ·
            Created <span style={{ color: '#f1f5f9', fontWeight: 700 }}>{engineResult.alerts_created}</span> new alerts ·
            <span style={{ color: '#475569' }}> {engineResult.alerts_skipped} skipped (already active)</span>
          </span>
        </div>
      )}

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        {[
          { label: 'Total Active', value: alerts.length, color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: AlertTriangle },
          { label: 'High Severity', value: highAlerts.length, color: '#ef4444', bg: 'rgba(239,68,68,0.08)', icon: TrendingDown },
          { label: 'Medium', value: medAlerts.length, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', icon: Activity },
          { label: 'Resolved Today', value: resolved.length, color: '#10b981', bg: 'rgba(16,185,129,0.08)', icon: CheckCircle },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <s.icon size={13} color={s.color} />
              </div>
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: s.color, fontFamily: 'Plus Jakarta Sans', letterSpacing: '-0.5px' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        {[
          { id: 'active', label: `Active (${alerts.length})` },
          { id: 'resolved', label: `Resolved (${resolved.length})` },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{ padding: '7px 16px', fontSize: '12.5px', fontWeight: 600, border: '1px solid', borderColor: filter === f.id ? 'rgba(59,130,246,0.3)' : 'var(--border)', borderRadius: '8px', cursor: 'pointer', background: filter === f.id ? 'rgba(59,130,246,0.1)' : 'transparent', color: filter === f.id ? '#60a5fa' : '#475569', transition: 'all 0.15s ease' }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Alert cards */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[...Array(3)].map((_, i) => <SkeletonCard key={i} height={160} />)}
        </div>
      ) : displayed.length === 0 ? (
        <EmptyState />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {displayed.map((alert, i) => (
            <AlertCard key={i} alert={alert} onResolve={handleResolve} index={i} />
          ))}
        </div>
      )}

      {/* Resolved section */}
      {resolved.length > 0 && filter === 'resolved' && (
        <div style={{ marginTop: '24px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
            Resolved this session
          </div>
          {resolved.map((alert, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.1)', borderRadius: '10px', marginBottom: '8px', opacity: 0.7 }}>
              <CheckCircle size={14} color="#10b981" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{alert.product}</div>
                <div style={{ fontSize: '11px', color: '#374151' }}>Resolved · {alert.resolved_at?.toLocaleTimeString()}</div>
              </div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#10b981', padding: '3px 8px', background: 'rgba(16,185,129,0.1)', borderRadius: '5px' }}>RESOLVED</div>
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}