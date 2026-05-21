export function SkeletonCard({ height = 120 }) {
  return (
    <div className="card" style={{ padding: '24px', height }}>
      <div className="skeleton" style={{ height: '12px', width: '40%', marginBottom: '16px' }} />
      <div className="skeleton" style={{ height: '32px', width: '60%', marginBottom: '12px' }} />
      <div className="skeleton" style={{ height: '12px', width: '30%' }} />
    </div>
  )
}

export function SkeletonChart({ height = 260 }) {
  return (
    <div className="card" style={{ padding: '24px', height }}>
      <div className="skeleton" style={{ height: '14px', width: '35%', marginBottom: '8px' }} />
      <div className="skeleton" style={{ height: '12px', width: '50%', marginBottom: '24px' }} />
      <div className="skeleton" style={{ height: height - 100, borderRadius: '10px' }} />
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-light)' }}>
      <div>
        <div className="skeleton" style={{ height: '13px', width: '120px', marginBottom: '6px' }} />
        <div className="skeleton" style={{ height: '11px', width: '80px' }} />
      </div>
      <div className="skeleton" style={{ height: '24px', width: '60px', borderRadius: '6px' }} />
    </div>
  )
}