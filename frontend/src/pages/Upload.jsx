import { useState, useRef, useCallback } from 'react'
import { uploadCSV, detectMapping, confirmMapping } from '../api'
import {
  Upload as UploadIcon, FileText, CheckCircle, AlertCircle,
  Sparkles, ArrowRight, RefreshCw, Eye, ChevronDown,
  ChevronUp, Zap, Database, TrendingUp, Package,
  ShoppingCart, X, Check, Info, Download
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'


// ─── Import type configs ──────────────────────────────────────────────────────
const IMPORT_TYPES = [
  {
    id: 'pricebook',
    label: 'Pricebook',
    icon: Database,
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.1)',
    border: 'rgba(59,130,246,0.2)',
    desc: 'Products, prices, costs, suppliers',
    fields: ['upc', 'product_name', 'sell_price', 'cost_price', 'category', 'supplier'],
    required: ['upc', 'product_name'],
  },
  {
    id: 'sales',
    label: 'Sales',
    icon: ShoppingCart,
    color: '#10b981',
    bg: 'rgba(16,185,129,0.1)',
    border: 'rgba(16,185,129,0.2)',
    desc: 'Transaction history, quantities sold',
    fields: ['date', 'upc', 'product_name', 'quantity', 'unit_price', 'total_amount'],
    required: ['date', 'quantity'],
  },
  {
    id: 'purchases',
    label: 'Purchases',
    icon: Package,
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.1)',
    border: 'rgba(139,92,246,0.2)',
    desc: 'Invoices, received stock, supplier orders',
    fields: ['date', 'upc', 'product_name', 'quantity_ordered', 'quantity_received', 'unit_cost', 'supplier'],
    required: ['date', 'upc'],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: TrendingUp,
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.1)',
    border: 'rgba(245,158,11,0.2)',
    desc: 'Physical counts, stock levels',
    fields: ['upc', 'product_name', 'quantity', 'date', 'counted_by'],
    required: ['upc', 'quantity'],
  },
]

// ─── Step indicator ───────────────────────────────────────────────────────────
const STEPS = ['Upload', 'Analyze', 'Review', 'Confirm', 'Done']

function StepIndicator({ current }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '40px' }}>
      {STEPS.map((step, i) => (
        <div key={step} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '99px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: 700,
              background: i < current ? '#10b981' : i === current ? '#3b82f6' : 'rgba(255,255,255,0.06)',
              color: i <= current ? 'white' : '#475569',
              border: i === current ? '2px solid rgba(59,130,246,0.4)' : '2px solid transparent',
              boxShadow: i === current ? '0 0 16px rgba(59,130,246,0.3)' : 'none',
              transition: 'all 0.3s ease',
            }}>
              {i < current ? <Check size={14} /> : i + 1}
            </div>
            <div style={{ fontSize: '10px', fontWeight: 600, color: i === current ? '#3b82f6' : '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {step}
            </div>
          </div>
          {i < STEPS.length - 1 && (
            <div style={{ width: '60px', height: '1px', background: i < current ? '#10b981' : 'rgba(255,255,255,0.08)', margin: '0 8px', marginBottom: '20px', transition: 'background 0.4s ease' }} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Confidence bar ───────────────────────────────────────────────────────────
function ConfidenceBar({ value }) {
  const color = value >= 0.9 ? '#10b981' : value >= 0.7 ? '#f59e0b' : '#ef4444'
  const label = value >= 0.9 ? 'High' : value >= 0.7 ? 'Medium' : 'Low'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value * 100}%`, background: color, borderRadius: '99px', transition: 'width 0.6s ease' }} />
      </div>
      <div style={{ fontSize: '10px', fontWeight: 700, color, minWidth: '36px' }}>{label}</div>
    </div>
  )
}

// ─── Processing animation ─────────────────────────────────────────────────────
function ProcessingState({ fileName, rowCount }) {
  const logs = [
    { msg: 'Reading CSV structure...', done: true },
    { msg: 'Detecting column patterns...', done: true },
    { msg: 'Analyzing sample data rows...', done: true },
    { msg: 'Running AI column mapping...', done: false },
    { msg: 'Validating field types...', done: false },
    { msg: 'Preparing mapping review...', done: false },
  ]

  return (
    <div style={{ textAlign: 'center' }}>
      {/* Animated orb */}
      <div style={{ position: 'relative', width: '100px', height: '100px', margin: '0 auto 32px' }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '99px',
          background: 'radial-gradient(circle, rgba(59,130,246,0.3), transparent 70%)',
          animation: 'pulse 2s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', inset: '8px', borderRadius: '99px',
          background: 'radial-gradient(circle, rgba(59,130,246,0.5), rgba(139,92,246,0.3) 70%)',
          animation: 'pulse 2s ease-in-out infinite 0.3s',
        }} />
        <div style={{
          position: 'absolute', inset: '20px', borderRadius: '99px',
          background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 30px rgba(59,130,246,0.4)',
        }}>
          <Sparkles size={24} color="white" />
        </div>
      </div>

      <div style={{ fontSize: '20px', fontWeight: 800, color: '#f1f5f9', fontFamily: 'Plus Jakarta Sans', marginBottom: '8px' }}>
        AI is analyzing your data
      </div>
      <div style={{ fontSize: '13px', color: '#475569', marginBottom: '32px' }}>
        {fileName} · {rowCount} rows detected
      </div>

      {/* Processing logs */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px', textAlign: 'left', maxWidth: '420px', margin: '0 auto' }}>
        {logs.map((log, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', opacity: log.done ? 1 : 0.4 }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '99px', background: log.done ? '#10b981' : '#3b82f6', flexShrink: 0, boxShadow: log.done ? '0 0 6px #10b981' : 'none' }} />
            <div style={{ fontSize: '12.5px', color: log.done ? '#94a3b8' : '#475569', fontFamily: 'monospace' }}>
              {log.msg}
            </div>
            {log.done && <Check size={12} color="#10b981" style={{ marginLeft: 'auto' }} />}
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0 0', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '8px' }}>
          <div style={{ display: 'flex', gap: '3px' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ width: '6px', height: '6px', borderRadius: '99px', background: '#3b82f6', animation: `bounce 1s ease-in-out ${i * 0.15}s infinite` }} />
            ))}
          </div>
          <div style={{ fontSize: '12px', color: '#3b82f6', fontFamily: 'monospace' }}>Processing...</div>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.08); opacity: 0.7; } }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
      `}</style>
    </div>
  )
}

// ─── Mapping review ───────────────────────────────────────────────────────────
function MappingReview({ columns, mapping, confidence, sampleData, importType, onMappingChange, onConfirm, onBack }) {
  const [expanded, setExpanded] = useState(false)
  const [localMapping, setLocalMapping] = useState(mapping || {})
  const typeConfig = IMPORT_TYPES.find(t => t.id === importType)

  const missingRequired = (typeConfig?.required || []).filter(req =>
    !Object.values(localMapping).includes(req)
  )

  function handleChange(csvCol, newField) {
    const updated = { ...localMapping, [csvCol]: newField === 'null' ? null : newField }
    setLocalMapping(updated)
    onMappingChange(updated)
  }

  const allFields = typeConfig?.fields || []

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#f1f5f9', fontFamily: 'Plus Jakarta Sans' }}>
            AI Mapping Complete
          </h2>
          <p style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>
            Review and adjust column mapping before importing
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '99px' }}>
          <Sparkles size={13} color="#10b981" />
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#10b981' }}>AI Confidence Ready</span>
        </div>
      </div>

      {/* Missing required fields warning */}
      {missingRequired.length > 0 && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <AlertCircle size={15} color="#ef4444" style={{ marginTop: '1px', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#ef4444', marginBottom: '2px' }}>Missing required fields</div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              {missingRequired.join(', ')} — please map these fields before importing
            </div>
          </div>
        </div>
      )}

      {/* Mapping table */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', overflow: 'hidden', marginBottom: '20px' }}>
        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 1fr 140px', gap: '12px', padding: '12px 20px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {['CSV Column', '', 'Maps To', 'Confidence'].map((h, i) => (
            <div key={i} style={{ fontSize: '10px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</div>
          ))}
        </div>

        {/* Mapping rows */}
        {columns.map((col, i) => {
          const mapped = localMapping[col]
          const conf = confidence?.[col] || 0
          const isMapped = mapped && mapped !== 'null'
          const isRequired = typeConfig?.required?.includes(mapped)

          return (
            <div
              key={col}
              style={{
                display: 'grid', gridTemplateColumns: '1fr 40px 1fr 140px',
                gap: '12px', padding: '12px 20px',
                borderBottom: i < columns.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                transition: 'background 0.15s ease',
              }}
            >
              {/* CSV column name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '99px', background: isMapped ? '#10b981' : '#ef4444', flexShrink: 0 }} />
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8', fontFamily: 'monospace' }}>{col}</div>
              </div>

              {/* Arrow */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowRight size={13} color={isMapped ? '#3b82f6' : '#2d3748'} />
              </div>

              {/* Mapped field selector */}
              <div>
                <select
                  value={mapped || 'null'}
                  onChange={e => handleChange(col, e.target.value)}
                  style={{
                    width: '100%', padding: '6px 10px',
                    background: isMapped ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${isMapped ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: '7px', fontSize: '12.5px', fontWeight: 500,
                    color: isMapped ? '#60a5fa' : '#475569',
                    cursor: 'pointer', outline: 'none',
                  }}
                >
                  <option value="null">— Skip this column —</option>
                  {allFields.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              {/* Confidence */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <ConfidenceBar value={conf} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Sample data preview */}
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#475569', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', marginBottom: '10px' }}
        >
          <Eye size={13} />
          Preview sample data
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {expanded && sampleData?.length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', overflow: 'auto', maxHeight: '200px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                  {Object.keys(sampleData[0]).map(k => (
                    <th key={k} style={{ padding: '8px 12px', textAlign: 'left', color: '#475569', fontWeight: 600, whiteSpace: 'nowrap', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sampleData.map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((v, j) => (
                      <td key={j} style={{ padding: '7px 12px', color: '#94a3b8', fontFamily: 'monospace', borderBottom: '1px solid rgba(255,255,255,0.03)', whiteSpace: 'nowrap' }}>
                        {String(v).slice(0, 30)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          onClick={onBack}
          style={{ padding: '10px 20px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '9px', color: '#475569', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
        >
          ← Back
        </button>
        <button
          onClick={() => onConfirm(localMapping)}
          disabled={missingRequired.length > 0}
          style={{
            padding: '10px 28px', borderRadius: '9px', fontSize: '13px', fontWeight: 700, cursor: missingRequired.length > 0 ? 'not-allowed' : 'pointer',
            background: missingRequired.length > 0 ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            color: missingRequired.length > 0 ? '#475569' : 'white', border: 'none',
            boxShadow: missingRequired.length > 0 ? 'none' : '0 4px 14px rgba(37,99,235,0.4)',
            transition: 'all 0.2s ease',
          }}
        >
          Confirm & Import →
        </button>
      </div>
    </div>
  )
}

// ─── Success state ────────────────────────────────────────────────────────────
function SuccessState({ result, importType, onReset }) {
  const typeConfig = IMPORT_TYPES.find(t => t.id === importType)

  const stats = importType === 'pricebook'
    ? [
        { label: 'Products Created', value: result?.result?.created_products || 0, color: '#10b981' },
        { label: 'Products Updated', value: result?.result?.updated_products || 0, color: '#3b82f6' },
        { label: 'Rows Processed', value: result?.result?.total_processed || 0, color: '#8b5cf6' },
        { label: 'Errors', value: result?.result?.errors?.length || 0, color: result?.result?.errors?.length > 0 ? '#ef4444' : '#10b981' },
      ]
    : [
        { label: 'Rows Imported', value: result?.rows_processed || 0, color: '#10b981' },
        { label: 'Status', value: result?.status || 'done', color: '#3b82f6' },
      ]

  return (
    <div style={{ textAlign: 'center' }}>
      {/* Success icon */}
      <div style={{ position: 'relative', width: '90px', height: '90px', margin: '0 auto 28px' }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '99px', background: 'radial-gradient(circle, rgba(16,185,129,0.2), transparent 70%)', animation: 'pulse 2s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', inset: '12px', borderRadius: '99px', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(16,185,129,0.4)' }}>
          <CheckCircle size={28} color="white" />
        </div>
      </div>

      <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#f1f5f9', fontFamily: 'Plus Jakarta Sans', marginBottom: '8px' }}>
        Import Complete
      </h2>
      <p style={{ fontSize: '13px', color: '#475569', marginBottom: '32px' }}>
        Your {typeConfig?.label} data has been processed and is ready.
      </p>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stats.length}, 1fr)`, gap: '12px', marginBottom: '28px', maxWidth: '480px', margin: '0 auto 28px' }}>
        {stats.map((s, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color: s.color, fontFamily: 'Plus Jakarta Sans', letterSpacing: '-0.5px' }}>{s.value}</div>
            <div style={{ fontSize: '11px', color: '#475569', fontWeight: 600, marginTop: '4px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Errors if any */}
      {result?.result?.errors?.length > 0 && (
        <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '10px', padding: '14px 16px', maxWidth: '480px', margin: '0 auto 24px', textAlign: 'left' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#ef4444', marginBottom: '8px' }}>
            {result.result.errors.length} rows had errors
          </div>
          {result.result.errors.slice(0, 3).map((e, i) => (
            <div key={i} style={{ fontSize: '11.5px', color: '#94a3b8', fontFamily: 'monospace', marginBottom: '3px' }}>
              Row {e.row}: {e.error}
            </div>
          ))}
        </div>
      )}

      {/* AI observation */}
      <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '12px', padding: '16px 20px', maxWidth: '480px', margin: '0 auto 28px', textAlign: 'left', display: 'flex', gap: '12px' }}>
        <div style={{ width: '28px', height: '28px', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Sparkles size={13} color="white" />
        </div>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#60a5fa', marginBottom: '4px' }}>AI Observation</div>
          <div style={{ fontSize: '12.5px', color: '#94a3b8', lineHeight: 1.55 }}>
            {importType === 'pricebook' && 'Pricebook imported successfully. Head to Dashboard to see margin analysis and product intelligence.'}
            {importType === 'sales' && 'Sales data imported. Your demand forecast and segmentation models will update automatically.'}
            {importType === 'purchases' && 'Purchase orders recorded. Expected inventory calculations have been updated — check Alerts for any anomalies.'}
            {importType === 'inventory' && 'Inventory snapshot saved. Shrinkage alerts will be recalculated based on new counts.'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
  <button
    onClick={onReset}
    style={{
      padding: '10px 24px',
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '9px',
      color: '#94a3b8',
      fontSize: '13px',
      fontWeight: 600,
      cursor: 'pointer'
    }}
  >
    Import Another
  </button>

  <a
    href="/"
    style={{
      padding: '10px 24px',
      background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
      borderRadius: '9px',
      color: 'white',
      fontSize: '13px',
      fontWeight: 700,
      cursor: 'pointer',
      textDecoration: 'none',
      boxShadow: '0 4px 14px rgba(37,99,235,0.4)'
    }}
  >
    View Dashboard →
  </a>
</div>
    </div>
  )
}

// ─── Main Upload page ─────────────────────────────────────────────────────────
export default function Upload() {
  const [step, setStep] = useState(0)
  const [importType, setImportType] = useState(null)
  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [batchId, setBatchId] = useState(null)
  const [mappingData, setMappingData] = useState(null)
  const [confirmedMapping, setConfirmedMapping] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const fileRef = useRef()
  const { location } = useAuth()
    const LOCATION_ID = location?.id


  function reset() {
    setStep(0); setImportType(null); setFile(null)
    setDragging(false); setBatchId(null); setMappingData(null)
    setConfirmedMapping(null); setResult(null); setError(null)
  }

  const onDrop = useCallback(async (e) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer?.files?.[0] || e.target?.files?.[0]
    if (!dropped || !importType) return
    setFile(dropped)
    await handleUpload(dropped)
  }, [importType])

  async function handleUpload(f) {
    setStep(1)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', f)
      formData.append('location_id', LOCATION_ID)
      formData.append('import_type', importType)
      const uploadRes = await uploadCSV(formData)
      const bid = uploadRes.data.batch_id
      setBatchId(bid)

      // Detect mapping
      const mapRes = await detectMapping(bid)
      setMappingData(mapRes.data)
      setStep(2)
    } catch (e) {
      setError(e?.response?.data?.error || 'Upload failed')
      setStep(0)
    }
  }

  async function handleConfirm(mapping) {
    setStep(3)
    try {
      const res = await confirmMapping(batchId, mapping)
      setResult(res.data)
      setStep(4)
    } catch (e) {
      setError(e?.response?.data?.error || 'Import failed')
      setStep(2)
    }
  }

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: '36px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={15} color="white" />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#f1f5f9', fontFamily: 'Plus Jakarta Sans', letterSpacing: '-0.3px' }}>
            Import Center
          </h1>
        </div>
        <p style={{ fontSize: '13px', color: '#475569', marginLeft: '42px' }}>
          AI-powered data ingestion — upload any CSV, we'll figure out the rest
        </p>
      </div>

      {/* Step indicator */}
      <StepIndicator current={step} />

      {/* Main content area */}
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>

        {/* Error */}
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <AlertCircle size={14} color="#ef4444" />
            <span style={{ fontSize: '13px', color: '#ef4444' }}>{error}</span>
            <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}><X size={14} /></button>
          </div>
        )}

        {/* ── Step 0: Choose type + upload ─────────────────────────────────── */}
        {step === 0 && (
          <div>
            {/* Import type selector */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
                What are you importing?
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                {IMPORT_TYPES.map(type => (
                  <button
                    key={type.id}
                    onClick={() => setImportType(type.id)}
                    style={{
                      padding: '14px 12px', borderRadius: '12px', cursor: 'pointer', textAlign: 'left',
                      background: importType === type.id ? type.bg : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${importType === type.id ? type.border : 'rgba(255,255,255,0.07)'}`,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: importType === type.id ? type.bg : 'rgba(255,255,255,0.06)', border: `1px solid ${type.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                      <type.icon size={14} color={type.color} />
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: importType === type.id ? type.color : '#94a3b8', marginBottom: '3px' }}>{type.label}</div>
                    <div style={{ fontSize: '11px', color: '#475569', lineHeight: 1.4 }}>{type.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Upload zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => importType && fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragging ? '#3b82f6' : importType ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: '16px',
                padding: '48px 32px',
                textAlign: 'center',
                cursor: importType ? 'pointer' : 'not-allowed',
                background: dragging ? 'rgba(59,130,246,0.06)' : 'rgba(255,255,255,0.02)',
                transition: 'all 0.2s ease',
                opacity: importType ? 1 : 0.5,
              }}
            >
              <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => { setFile(e.target.files[0]); handleUpload(e.target.files[0]) }} />

              <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: dragging ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <UploadIcon size={22} color={dragging ? '#3b82f6' : '#475569'} />
              </div>

              <div style={{ fontSize: '16px', fontWeight: 700, color: dragging ? '#60a5fa' : '#94a3b8', fontFamily: 'Plus Jakarta Sans', marginBottom: '6px' }}>
                {dragging ? 'Drop it!' : importType ? 'Drop your CSV here' : 'Select an import type first'}
              </div>
              <div style={{ fontSize: '12.5px', color: '#374151' }}>
                {importType ? 'or click to browse · CSV files only' : 'Choose pricebook, sales, purchases, or inventory above'}
              </div>

              {importType && (
                <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <Sparkles size={12} color="#3b82f6" />
                  <span style={{ fontSize: '11.5px', color: '#3b82f6', fontWeight: 500 }}>
                    AI will automatically detect and map your columns
                  </span>
                </div>
              )}
            </div>

            {/* Sample download */}
            {importType && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '14px' }}>
                <Download size={12} color="#374151" />
                <span style={{ fontSize: '12px', color: '#374151' }}>
                  Not sure about the format? Download a{' '}
                  <span style={{ color: '#3b82f6', cursor: 'pointer', fontWeight: 600 }}>sample {importType} CSV</span>
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── Step 1: Processing ───────────────────────────────────────────── */}
        {step === 1 && (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <ProcessingState fileName={file?.name || 'file.csv'} rowCount={mappingData?.total_rows || '...'} />
          </div>
        )}

        {/* ── Step 2: Mapping review ───────────────────────────────────────── */}
        {step === 2 && mappingData && (
          <MappingReview
            columns={mappingData.columns_detected || []}
            mapping={mappingData.suggested_mapping?.mapping || {}}
            confidence={mappingData.suggested_mapping?.confidence || {}}
            sampleData={mappingData.sample_data || []}
            importType={importType}
            onMappingChange={setConfirmedMapping}
            onConfirm={handleConfirm}
            onBack={reset}
          />
        )}

        {/* ── Step 3: Confirming ───────────────────────────────────────────── */}
        {step === 3 && (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <div style={{ position: 'relative', width: '80px', height: '80px', margin: '0 auto 24px' }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: '99px', border: '3px solid rgba(59,130,246,0.2)' }} />
              <div style={{ position: 'absolute', inset: 0, borderRadius: '99px', border: '3px solid #3b82f6', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
              <div style={{ position: 'absolute', inset: '16px', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', borderRadius: '99px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Database size={18} color="white" />
              </div>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#f1f5f9', fontFamily: 'Plus Jakarta Sans', marginBottom: '8px' }}>
              Writing to database...
            </div>
            <div style={{ fontSize: '13px', color: '#475569' }}>Creating products, matching UPCs, updating pricebook</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* ── Step 4: Success ──────────────────────────────────────────────── */}
        {step === 4 && (
          <div style={{ padding: '20px 0' }}>
            <SuccessState result={result} importType={importType} onReset={reset} />
          </div>
        )}
      </div>
    </div>
  )
}