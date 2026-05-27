import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { register } from '../api/auth'
import { useAuth } from '../context/AuthContext'

function Field({ label, name, type = 'text', placeholder, value, onChange, autoFocus }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ marginBottom: '13px' }}>
      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#3d3c52', marginBottom: '5px', letterSpacing: '0.01em' }}>{label}</label>
      <input
        type={type} name={name} value={value}
        onChange={onChange} placeholder={placeholder}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%', padding: '11px 14px',
          background: focused ? '#fff' : '#fafafa',
          border: `1.5px solid ${focused ? '#6366f1' : '#e8e8f0'}`,
          borderRadius: '10px', fontSize: '13.5px', color: '#0f0e1a',
          outline: 'none', boxSizing: 'border-box',
          boxShadow: focused ? '0 0 0 4px rgba(99,102,241,0.08)' : 'none',
          transition: 'all 0.2s ease',
          fontFamily: '"Inter", sans-serif',
        }}
      />
    </div>
  )
}

export default function Register() {
  const [form, setForm] = useState({
    username: '', email: '', password: '', confirm_password: '',
    business_name: '', store_address: '', city: '', state: 'CO', zip_code: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [mounted, setMounted] = useState(false)
  const { handleLogin } = useAuth()
  const navigate = useNavigate()

  useEffect(() => { setTimeout(() => setMounted(true), 50) }, [])

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleNext(e) {
    e.preventDefault()
    if (!form.username || !form.email || !form.password) { setError('Please fill in all fields'); return }
    if (form.password !== form.confirm_password) { setError('Passwords do not match'); return }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return }
    setError('')
    setStep(2)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await register(form)
      handleLogin(res.data)
      navigate('/')
    } catch (err) {
      setError(err?.response?.data?.error || 'Registration failed')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', display: 'flex', fontFamily: '"Inter", sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(-24px)} to{opacity:1;transform:translateX(0)} }
        @keyframes gradientShift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes stepIn { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }

        .left-panel { animation: slideIn 0.7s cubic-bezier(.16,1,.3,1) forwards; }
        .form-wrap { animation: fadeUp 0.7s .1s cubic-bezier(.16,1,.3,1) forwards; opacity:0; }
        .step-content { animation: stepIn 0.35s cubic-bezier(.16,1,.3,1) forwards; }

        .btn-primary {
          width:100%; padding:13px;
          background: linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%);
          background-size:200% 200%;
          border:none; border-radius:11px;
          color:white; font-size:14.5px; font-weight:600;
          cursor:pointer; transition:transform .2s ease, box-shadow .2s ease;
          font-family:'Inter',sans-serif;
          animation: gradientShift 4s ease infinite;
        }
        .btn-primary:hover { transform:translateY(-2px); box-shadow:0 8px 28px rgba(99,102,241,.4); }
        .btn-primary:disabled { opacity:.7; cursor:not-allowed; transform:none; }

        .btn-back {
          width:100%; padding:13px;
          background:transparent; border:1.5px solid #e8e8f0;
          border-radius:11px; color:#7a7a9a; font-size:14.5px; font-weight:500;
          cursor:pointer; transition:all .2s ease; font-family:'Inter',sans-serif;
          margin-bottom:10px;
        }
        .btn-back:hover { border-color:#c4c4e0; color:#3d3c52; }
      `}</style>

      {/* ── Left panel ───────────────────────────────────────────────── */}
      <div className="left-panel" style={{
        width: '42%', position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(145deg, #0f0e1a 0%, #1a1836 40%, #0f172a 100%)',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '48px 52px',
      }}>
        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '10%', left: '-5%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 65%)', pointerEvents: 'none' }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative', zIndex: 1 }}>
          <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #3b82f6, #6366f1, #8b5cf6)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(99,102,241,0.5)' }}>
            <span style={{ fontSize: '16px' }}>⚡</span>
          </div>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: '15px', fontFamily: 'Plus Jakarta Sans' }}>Retail Samadhan</div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>Operations Platform</div>
          </div>
        </div>

        {/* Steps indicator */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontSize: '34px', fontWeight: 700, color: 'white', fontFamily: 'Plus Jakarta Sans', letterSpacing: '-1px', lineHeight: 1.1, marginBottom: '24px' }}>
            Set up your<br />
            <span style={{ background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              store intelligence.
            </span>
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { n: '01', label: 'Create your account', done: step >= 1 },
              { n: '02', label: 'Tell us about your store', done: step >= 2 },
              { n: '03', label: 'Start your free trial', done: false },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '99px', background: s.done ? 'linear-gradient(135deg,#3b82f6,#6366f1)' : 'rgba(255,255,255,0.08)', border: s.done ? 'none' : '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.3s ease' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: s.done ? 'white' : 'rgba(255,255,255,0.3)' }}>{s.done && i < step - 1 ? '✓' : s.n}</span>
                </div>
                <span style={{ fontSize: '13.5px', fontWeight: 500, color: s.done ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.3)', transition: 'color 0.3s ease' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 1, fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>
          © 2026 Retail Samadhan
        </div>
      </div>

      {/* ── Right panel — form ────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px', background: '#ffffff', overflowY: 'auto' }}>
        <div className="form-wrap" style={{ width: '100%', maxWidth: '400px' }}>

          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#6366f1' }}>Step {step} of 2</div>
              <div style={{ flex: 1, height: '3px', background: '#f0effe', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: step === 1 ? '50%' : '100%', background: 'linear-gradient(90deg,#3b82f6,#8b5cf6)', borderRadius: '99px', transition: 'width 0.4s ease' }} />
              </div>
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#0f0e1a', fontFamily: 'Plus Jakarta Sans', letterSpacing: '-0.6px', marginBottom: '4px' }}>
              {step === 1 ? 'Create your account' : 'Your store details'}
            </h1>
            <p style={{ fontSize: '14px', color: '#9496b0' }}>
              {step === 1 ? '14-day free trial, no credit card required.' : 'We\'ll use this to set up your pricebook.'}
            </p>
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 13px', background: '#fff5f5', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '9px', marginBottom: '16px' }}>
              <span style={{ fontSize: '13px' }}>⚠️</span>
              <span style={{ fontSize: '12.5px', color: '#ef4444', fontWeight: 500 }}>{error}</span>
            </div>
          )}

          {step === 1 && (
            <form className="step-content" onSubmit={handleNext}>
              <Field label="Username" name="username" value={form.username} onChange={handleChange} placeholder="yourname" autoFocus />
              <Field label="Email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@example.com" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <Field label="Password" name="password" type="password" value={form.password} onChange={handleChange} placeholder="Min 8 chars" />
                <Field label="Confirm" name="confirm_password" type="password" value={form.confirm_password} onChange={handleChange} placeholder="Repeat" />
              </div>
              <div style={{ marginTop: '6px' }}>
                <button type="submit" className="btn-primary">Continue →</button>
              </div>
            </form>
          )}

          {step === 2 && (
            <form className="step-content" onSubmit={handleSubmit}>
              <Field label="Business Name" name="business_name" value={form.business_name} onChange={handleChange} placeholder="Westside Convenience Store" autoFocus />
              <Field label="Store Address" name="store_address" value={form.store_address} onChange={handleChange} placeholder="4545 W 29th St" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 72px 90px', gap: '8px' }}>
                <Field label="City" name="city" value={form.city} onChange={handleChange} placeholder="Greeley" />
                <Field label="State" name="state" value={form.state} onChange={handleChange} placeholder="CO" />
                <Field label="ZIP" name="zip_code" value={form.zip_code} onChange={handleChange} placeholder="80634" />
              </div>
              <div style={{ marginTop: '6px' }}>
                <button type="button" className="btn-back" onClick={() => setStep(1)}>← Back</button>
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <span style={{ width: '15px', height: '15px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '99px', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                      Creating account...
                    </span>
                  ) : 'Create Account →'}
                </button>
              </div>
            </form>
          )}

          <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13.5px', color: '#9496b0' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  )
}