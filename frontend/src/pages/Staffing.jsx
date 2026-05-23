import { useState, useEffect, useRef } from 'react'
import { getStaffingInsights, getEmployees, getShifts, createShift, deleteShift, createEmployee } from '../api'
import {
  Users, TrendingUp, DollarSign, Calendar,
  Plus, Trash2, Printer, Sparkles, Clock,
  ChevronLeft, ChevronRight, Check, X, Zap
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useAuth } from '../context/AuthContext'
import { SkeletonChart, SkeletonCard } from '../components/Skeleton'




const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_LABELS = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' }
const DAY_FULL = { monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday' }

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899']

// ─── Get monday of current week ───────────────────────────────────────────────
function getMonday(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatWeekStart(date) {
  return date.toISOString().split('T')[0]
}

function formatWeekRange(monday) {
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)
  return `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
}

// ─── Custom bar tooltip ───────────────────────────────────────────────────────
function BarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'rgba(15,17,26,0.95)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '10px 14px' }}>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>${Number(payload[0].value).toFixed(2)}</div>
      {payload[1] && <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{payload[1].value} transactions</div>}
    </div>
  )
}

// ─── Add employee modal ───────────────────────────────────────────────────────
function AddEmployeeModal({ onAdd, onClose }) {
  const [name, setName] = useState('')
  const [role, setRole] = useState('cashier')

  function handleSubmit() {
    if (!name.trim()) return
    onAdd({ name: name.trim(), role })
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#13151c', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '28px', width: '360px' }}>
        <div style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9', fontFamily: 'Plus Jakarta Sans', marginBottom: '20px' }}>Add Employee</div>

        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Name</div>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Employee name"
            autoFocus
            style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '13px', color: '#f1f5f9', outline: 'none' }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Role</div>
          <select
            value={role}
            onChange={e => setRole(e.target.value)}
            style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '13px', color: '#f1f5f9', outline: 'none', cursor: 'pointer' }}
          >
            <option value="cashier">Cashier</option>
            <option value="manager">Manager</option>
            <option value="stock">Stock Associate</option>
            <option value="supervisor">Supervisor</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '9px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#475569', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSubmit} style={{ flex: 1, padding: '9px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'none', borderRadius: '8px', color: 'white', fontSize: '13px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.3)' }}>
            Add Employee
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Add shift modal ──────────────────────────────────────────────────────────
function AddShiftModal({ day, employees, onAdd, onClose }) {
  const [employeeId, setEmployeeId] = useState(employees[0]?.id || '')
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('16:00')
  const [notes, setNotes] = useState('')

  function handleSubmit() {
    if (!employeeId) return
    onAdd({ employee: employeeId, day, start_time: startTime, end_time: endTime, notes })
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#13151c', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '28px', width: '380px' }}>
        <div style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9', fontFamily: 'Plus Jakarta Sans', marginBottom: '6px' }}>Add Shift</div>
        <div style={{ fontSize: '12px', color: '#475569', marginBottom: '20px' }}>{DAY_FULL[day]}</div>

        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Employee</div>
          <select
            value={employeeId}
            onChange={e => setEmployeeId(e.target.value)}
            style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '13px', color: '#f1f5f9', outline: 'none', cursor: 'pointer' }}
          >
            {employees.map(e => (
              <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Start Time</div>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '13px', color: '#f1f5f9', outline: 'none' }} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>End Time</div>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '13px', color: '#f1f5f9', outline: 'none' }} />
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Notes (optional)</div>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Opening shift"
            style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '13px', color: '#f1f5f9', outline: 'none' }} />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '9px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#475569', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSubmit} style={{ flex: 1, padding: '9px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'none', borderRadius: '8px', color: 'white', fontSize: '13px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.3)' }}>Add Shift</button>
        </div>
      </div>
    </div>
  )
}

// ─── Printable schedule ───────────────────────────────────────────────────────
function PrintSchedule({ shifts, employees, weekStart, recommendations }) {
  const printRef = useRef()

  function handlePrint() {
    const content = printRef.current.innerHTML
    const win = window.open('', '_blank')
    win.document.write(`
      <html>
        <head>
          <title>Shift Schedule — ${formatWeekRange(weekStart)}</title>
          <style>
            body { font-family: -apple-system, sans-serif; padding: 32px; color: #0d0f14; }
            h1 { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
            .subtitle { font-size: 13px; color: #6b7280; margin-bottom: 28px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            th { background: #f8f9fb; padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280; border-bottom: 2px solid #e5e7eb; }
            td { padding: 10px 14px; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
            .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; background: #eff6ff; color: #2563eb; }
            .ai-section { background: #f8f9fb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
            .ai-section h2 { font-size: 14px; font-weight: 700; margin-bottom: 10px; }
            .day-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-size: 12px; }
            .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `)
    win.document.close()
    win.print()
  }

  // Build printable content
  const shiftsByDay = {}
  DAYS.forEach(d => { shiftsByDay[d] = [] })
  shifts.forEach(s => {
    if (shiftsByDay[s.day]) shiftsByDay[s.day].push(s)
  })

  return (
    <>
      <button
        onClick={handlePrint}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: '9px', color: 'var(--text-muted)', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer' }}
      >
        <Printer size={13} />
        Print Schedule
      </button>

      {/* Hidden print content */}
      <div ref={printRef} style={{ display: 'none' }}>
        <h1>Retail Samadhan — Shift Schedule</h1>
        <div className="subtitle">{formatWeekRange(weekStart)}</div>

        {recommendations && (
          <div className="ai-section">
            <h2>⚡ AI Staffing Recommendations</h2>
            {recommendations.recommendations?.map((r, i) => (
              <div key={i} className="day-row">
                <span><strong>{r.day_label}</strong> — {r.reason}</span>
                <span><strong>{r.recommended_staff} staff recommended</strong></span>
              </div>
            ))}
            <div style={{ marginTop: '10px', fontSize: '12px', color: '#059669', fontWeight: 600 }}>
              {recommendations.summary}
            </div>
          </div>
        )}

        <table>
          <thead>
            <tr>
              <th>Day</th>
              <th>Employee</th>
              <th>Role</th>
              <th>Start</th>
              <th>End</th>
              <th>Hours</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {DAYS.map(day => (
              shiftsByDay[day].length > 0
                ? shiftsByDay[day].map((s, i) => {
                    const emp = employees.find(e => e.id === s.employee)
                    const start = s.start_time?.slice(0, 5)
                    const end = s.end_time?.slice(0, 5)
                    const hours = start && end
                      ? ((parseInt(end) - parseInt(start)) || 8)
                      : 8
                    return (
                      <tr key={s.id}>
                        {i === 0 && <td rowSpan={shiftsByDay[day].length}><strong>{DAY_FULL[day]}</strong></td>}
                        <td>{s.employee_name || emp?.name || '—'}</td>
                        <td><span className="badge">{emp?.role || 'Staff'}</span></td>
                        <td>{start}</td>
                        <td>{end}</td>
                        <td>{typeof hours === 'number' ? hours : 8}h</td>
                        <td>{s.notes || '—'}</td>
                      </tr>
                    )
                  })
                : <tr key={day}><td><strong>{DAY_FULL[day]}</strong></td><td colSpan={6} style={{ color: '#9ca3af' }}>No shifts scheduled</td></tr>
            ))}
          </tbody>
        </table>

        <div className="footer">Generated by Retail Samadhan · {new Date().toLocaleDateString()}</div>
      </div>
    </>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Staffing() {
  const [insights, setInsights] = useState(null)
  const [employees, setEmployees] = useState([])
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [weekStart, setWeekStart] = useState(getMonday())
  const [showAddEmployee, setShowAddEmployee] = useState(false)
  const [addShiftDay, setAddShiftDay] = useState(null)
  const [activeTab, setActiveTab] = useState('planner')
  const { location, business } = useAuth()
  const LOCATION_ID = location?.id
  const BUSINESS_ID = business?.id

  async function load() {
    if (!LOCATION_ID) return

    setLoading(true)
    try {
      const [insRes, empRes, shiftRes] = await Promise.all([
        getStaffingInsights(LOCATION_ID),
        getEmployees(''),
        getShifts(LOCATION_ID, formatWeekStart(weekStart)),
      ])
      setInsights(insRes.data)
      setEmployees(empRes.data?.results || empRes.data || [])
      setShifts(shiftRes.data?.results || shiftRes.data || [])
    } catch (e) {
      console.error(e.response?.data || e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [weekStart, LOCATION_ID])

 async function handleAddEmployee(data) {
    if (!BUSINESS_ID) {
      console.error('Missing business id')
      return
    }

    try {
      const res = await createEmployee({
        name: data.name,
        role: data.role,
        business: BUSINESS_ID,
      })

      setEmployees(prev => [...prev, res.data])
    } catch (e) {
      console.error(e.response?.data || e)
    }
  }
  async function handleAddShift(data) {
    if (!LOCATION_ID) {
      console.error('Missing location id')
      return
    }

    try {
      const res = await createShift({
        ...data,
        location: LOCATION_ID,
        week_start: formatWeekStart(weekStart),
      })
      setShifts(prev => [...prev, res.data])
    } catch (e) {
      console.error(e.response?.data || e)
    }
  }

  async function handleDeleteShift(id) {
    try {
      await deleteShift(id)
      setShifts(prev => prev.filter(s => s.id !== id))
    } catch (e) { console.error(e) }
  }

  function prevWeek() {
    const d = new Date(weekStart)
    d.setDate(d.getDate() - 7)
    setWeekStart(d)
  }

  function nextWeek() {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + 7)
    setWeekStart(d)
  }

  const recommendations = insights?.staffing_recommendation
  const salesByDay = insights?.sales_by_day || []
  const salesByHour = insights?.sales_by_hour || []

  // shifts grouped by day
  const shiftsByDay = {}
  DAYS.forEach(d => { shiftsByDay[d] = [] })
  shifts.forEach(s => { if (shiftsByDay[s.day]) shiftsByDay[s.day].push(s) })

  // employee color map
  const empColors = {}
  employees.forEach((e, i) => { empColors[e.id] = COLORS[i % COLORS.length] })

  return (
    <div>
      {/* Modals */}
      {showAddEmployee && <AddEmployeeModal onAdd={handleAddEmployee} onClose={() => setShowAddEmployee(false)} />}
      {addShiftDay && employees.length > 0 && (
        <AddShiftModal day={addShiftDay} employees={employees} onAdd={handleAddShift} onClose={() => setAddShiftDay(null)} />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div style={{ width: '30px', height: '30px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={14} color="#10b981" />
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans', letterSpacing: '-0.3px' }}>
              Shift Planner
            </h1>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginLeft: '40px' }}>
            AI-optimized staffing based on your sales patterns
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <PrintSchedule shifts={shifts} employees={employees} weekStart={weekStart} recommendations={recommendations} />
          <button
            onClick={() => setShowAddEmployee(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'none', borderRadius: '9px', color: 'white', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.25)' }}
          >
            <Plus size={13} />
            Add Employee
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {[
          { id: 'planner', label: '📅 Shift Planner' },
          { id: 'insights', label: '⚡ AI Insights' },
          { id: 'heatmap', label: '🔥 Sales Heatmap' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{ padding: '8px 18px', fontSize: '12.5px', fontWeight: 600, border: '1px solid', borderColor: activeTab === t.id ? 'rgba(16,185,129,0.3)' : 'var(--border)', borderRadius: '9px', cursor: 'pointer', background: activeTab === t.id ? 'rgba(16,185,129,0.1)' : 'transparent', color: activeTab === t.id ? '#10b981' : '#475569', transition: 'all 0.15s ease' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Planner tab ──────────────────────────────────────────────────────── */}
      {activeTab === 'planner' && (
        <div>
          {/* Week navigator */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button onClick={prevWeek} style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronLeft size={15} />
              </button>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans' }}>
                {formatWeekRange(weekStart)}
              </div>
              <button onClick={nextWeek} style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronRight size={15} />
              </button>
            </div>

            {/* Employee legend */}
            <div style={{ display: 'flex', gap: '10px' }}>
              {employees.slice(0, 5).map(e => (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '99px', background: empColors[e.id] }} />
                  <span style={{ fontSize: '11.5px', color: '#475569', fontWeight: 500 }}>{e.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Weekly grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px', marginBottom: '24px' }}>
            {DAYS.map((day, di) => {
              const rec = recommendations?.recommendations?.find(r => r.day === day)
              const dayShifts = shiftsByDay[day] || []
              const isToday = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() === day

              return (
                <div
                  key={day}
                  style={{
                    background: isToday ? 'rgba(59,130,246,0.05)' : 'var(--bg-card)',
                    border: `1px solid ${isToday ? 'rgba(59,130,246,0.2)' : 'var(--border)'}`,
                    borderRadius: '14px',
                    overflow: 'hidden',
                    minHeight: '200px',
                  }}
                >
                  {/* Day header */}
                  <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', background: isToday ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: isToday ? '#3b82f6' : 'var(--text-primary)' }}>
                          {DAY_LABELS[day]}
                        </div>
                        {rec && (
                          <div style={{ fontSize: '9px', fontWeight: 700, color: rec.color, marginTop: '1px' }}>
                            {rec.recommended_staff} staff rec.
                          </div>
                        )}
                      </div>
                      {rec && (
                        <div style={{ width: '6px', height: '6px', borderRadius: '99px', background: rec.color, boxShadow: `0 0 6px ${rec.color}` }} />
                      )}
                    </div>
                  </div>

                  {/* Shifts */}
                  <div style={{ padding: '8px' }}>
                    {dayShifts.map(shift => (
                      <div
                        key={shift.id}
                        style={{ padding: '7px 9px', borderRadius: '7px', marginBottom: '5px', background: `${empColors[shift.employee]}18`, border: `1px solid ${empColors[shift.employee]}30`, position: 'relative' }}
                      >
                        <div style={{ fontSize: '11px', fontWeight: 700, color: empColors[shift.employee] || '#3b82f6' }}>
                          {shift.employee_name}
                        </div>
                        <div style={{ fontSize: '10px', color: '#475569', marginTop: '1px' }}>
                          {shift.start_time?.slice(0, 5)} – {shift.end_time?.slice(0, 5)}
                        </div>
                        {shift.notes && (
                          <div style={{ fontSize: '9px', color: '#374151', marginTop: '1px' }}>{shift.notes}</div>
                        )}
                        <button
                          onClick={() => handleDeleteShift(shift.id)}
                          style={{ position: 'absolute', top: '4px', right: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#374151', padding: '2px', borderRadius: '4px', opacity: 0, transition: 'opacity 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.opacity = 1}
                          onMouseLeave={e => e.currentTarget.style.opacity = 0}
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    ))}

                    {/* Add shift button */}
                    <button
                      onClick={() => employees.length > 0 ? setAddShiftDay(day) : setShowAddEmployee(true)}
                      style={{ width: '100%', padding: '6px', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '7px', background: 'transparent', color: '#2d3748', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', transition: 'all 0.15s ease' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)'; e.currentTarget.style.color = '#3b82f6' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#2d3748' }}
                    >
                      <Plus size={10} />
                      Add shift
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Employee list */}
          {employees.length > 0 && (
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans', marginBottom: '14px' }}>
                Employees ({employees.length})
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                {employees.map((e, i) => (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '9px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '99px', background: empColors[e.id], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: 'white', flexShrink: 0 }}>
                      {e.name[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>{e.name}</div>
                      <div style={{ fontSize: '11px', color: '#374151', textTransform: 'capitalize' }}>{e.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {employees.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px' }}>
              <Users size={32} color="#1f2937" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>No employees yet</div>
              <div style={{ fontSize: '12px', color: '#1f2937', marginBottom: '16px' }}>Add your team members to start building the schedule</div>
              <button onClick={() => setShowAddEmployee(true)} style={{ padding: '8px 20px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'none', borderRadius: '8px', color: 'white', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                Add First Employee
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── AI Insights tab ───────────────────────────────────────────────────── */}
      {activeTab === 'insights' && (
        <div>
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
              {[...Array(4)].map((_, i) => <SkeletonCard key={i} height={120} />)}
            </div>
          ) : !recommendations?.recommendations?.length ? (
            <div style={{ padding: '60px', textAlign: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px' }}>
              <Zap size={32} color="#1f2937" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>Not enough sales data</div>
              <div style={{ fontSize: '12px', color: '#1f2937', marginTop: '4px' }}>Import sales data to get AI staffing recommendations</div>
            </div>
          ) : (
            <div>
              {/* AI summary banner */}
              <div style={{ background: 'linear-gradient(135deg, #0f1117, #111827)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '24px 28px', marginBottom: '20px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-20px', right: '60px', width: '200px', height: '150px', background: 'radial-gradient(ellipse, rgba(16,185,129,0.1), transparent 70%)', pointerEvents: 'none' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <Sparkles size={16} color="#10b981" />
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', fontFamily: 'Plus Jakarta Sans' }}>AI Staffing Intelligence</span>
                </div>
                <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6, marginBottom: '12px' }}>
                  {recommendations.summary}
                </div>
                <div style={{ display: 'flex', gap: '20px' }}>
                  <div>
                    <div style={{ fontSize: '10px', color: '#374151', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Staff Days/Week</div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#10b981', fontFamily: 'Plus Jakarta Sans' }}>{recommendations.total_staff_days}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: '#374151', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Potential Savings</div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#10b981', fontFamily: 'Plus Jakarta Sans' }}>${recommendations.potential_weekly_savings}</div>
                  </div>
                </div>
              </div>

              {/* Day recommendations */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px' }}>
                {recommendations.recommendations.map((rec, i) => (
                  <div
                    key={rec.day}
                    className="card fade-up"
                    style={{ padding: '16px', textAlign: 'center', animationDelay: `${i * 0.05}s`, border: `1px solid ${rec.color}25` }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>{rec.day_label}</div>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: rec.color, fontFamily: 'Plus Jakarta Sans', letterSpacing: '-0.5px', marginBottom: '4px' }}>
                      {rec.recommended_staff}
                    </div>
                    <div style={{ fontSize: '9px', fontWeight: 700, color: rec.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                      staff
                    </div>
                    <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', marginBottom: '8px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${rec.pct_of_peak}%`, background: rec.color, borderRadius: '99px' }} />
                    </div>
                    <div style={{ fontSize: '10px', color: '#374151', lineHeight: 1.4 }}>{rec.label}</div>
                    <div style={{ fontSize: '10px', color: '#1f2937', marginTop: '4px' }}>${rec.total_revenue.toFixed(0)} avg</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Heatmap tab ───────────────────────────────────────────────────────── */}
      {activeTab === 'heatmap' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Sales by day chart */}
          {loading ? <SkeletonChart height={280} /> : (
            <div className="card" style={{ padding: '24px' }}>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans' }}>Revenue by Day of Week</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Last 90 days average — use this to plan staffing</div>
              </div>
              {salesByDay.some(d => d.total_revenue > 0) ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={salesByDay.map(d => ({ ...d, day: DAY_LABELS[d.day] || d.day }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#475569' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                    <Tooltip content={<BarTooltip />} />
                    <Bar dataKey="total_revenue" radius={[6, 6, 0, 0]} maxBarSize={50}>
                      {salesByDay.map((d, i) => {
                        const rec = recommendations?.recommendations?.find(r => r.day === d.day)
                        return <Cell key={i} fill={rec?.color || '#3b82f6'} opacity={0.85} />
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151', fontSize: '13px' }}>
                  Import sales data to see day-of-week patterns
                </div>
              )}
            </div>
          )}

          {/* Sales by hour chart */}
          {loading ? <SkeletonChart height={260} /> : (
            <div className="card" style={{ padding: '24px' }}>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans' }}>Peak Hours</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Revenue by hour — identify rush periods for scheduling</div>
              </div>
              {salesByHour.some(h => h.total_revenue > 0) ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={salesByHour}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#475569' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                    <Tooltip content={<BarTooltip />} />
                    <Bar dataKey="total_revenue" radius={[4, 4, 0, 0]} maxBarSize={30}>
                      {salesByHour.map((h, i) => (
                        <Cell key={i} fill={h.total_revenue > 0 ? '#8b5cf6' : '#1f2937'} opacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151', fontSize: '13px' }}>
                  Import sales data with timestamps to see peak hours
                </div>
              )}

              {/* Legend */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#ef4444' }} />
                  <span style={{ fontSize: '11px', color: '#374151' }}>Busy — 2 staff</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#f59e0b' }} />
                  <span style={{ fontSize: '11px', color: '#374151' }}>Moderate — 2 staff</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#10b981' }} />
                  <span style={{ fontSize: '11px', color: '#374151' }}>Slow — 1 staff</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}