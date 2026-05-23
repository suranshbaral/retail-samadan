import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { register } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import { Zap, AlertCircle } from 'lucide-react'

// ← moved outside
function Field({ label, name, type = 'text', placeholder, value, onChange }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ fontSize: '11px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>{label}</div>
      <input
        type={type} name={name} value={value}
        onChange={onChange} placeholder={placeholder}
        style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '9px', fontSize: '13.5px', color: '#f1f5f9', outline: 'none', boxSizing: 'border-box' }}
        onFocus={e => e.target.style.borderColor = 'rgba(59,130,246,0.4)'}
        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
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
  const { handleLogin } = useAuth()
  const navigate = useNavigate()

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.password !== form.confirm_password) { setError('Passwords do not match'); return }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    setError('')
    try {
      const res = await register(form)
      handleLogin(res.data)
      navigate('/')
    } catch (err) {
      setError(err?.response?.data?.error || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0d0f14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 0 30px rgba(37,99,235,0.4)' }}>
            <Zap size={22} color="white" strokeWidth={2.5} />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#f1f5f9', fontFamily: 'Plus Jakarta Sans' }}>Create your account</div>
          <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>Set up Retail Samadhan for your store</div>
        </div>

        <div style={{ background: '#13151c', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '32px' }}>
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', marginBottom: '16px' }}>
              <AlertCircle size={14} color="#ef4444" />
              <span style={{ fontSize: '12.5px', color: '#ef4444' }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Account</div>
            <Field label="Username" name="username" value={form.username} onChange={handleChange} placeholder="yourname" />
            <Field label="Email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@example.com" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Field label="Password" name="password" type="password" value={form.password} onChange={handleChange} placeholder="Min 8 chars" />
              <Field label="Confirm Password" name="confirm_password" type="password" value={form.confirm_password} onChange={handleChange} placeholder="Repeat password" />
            </div>

            <div style={{ fontSize: '11px', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '16px 0 12px' }}>Store Info</div>
            <Field label="Business Name" name="business_name" value={form.business_name} onChange={handleChange} placeholder="Westside Convenience Store" />
            <Field label="Store Address" name="store_address" value={form.store_address} onChange={handleChange} placeholder="4545 W 29th St" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px', gap: '12px' }}>
              <Field label="City" name="city" value={form.city} onChange={handleChange} placeholder="Greeley" />
              <Field label="State" name="state" value={form.state} onChange={handleChange} placeholder="CO" />
              <Field label="ZIP" name="zip_code" value={form.zip_code} onChange={handleChange} placeholder="80634" />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '11px', background: loading ? 'rgba(37,99,235,0.5)' : 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'none', borderRadius: '9px', color: 'white', fontSize: '14px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.35)', marginTop: '8px' }}
            >
              {loading ? 'Creating account...' : 'Create Account →'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#475569' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  )
}