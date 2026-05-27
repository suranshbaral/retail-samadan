import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { login } from '../api/auth'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState(null)
  const [mounted, setMounted] = useState(false)
  const { handleLogin } = useAuth()
  const navigate = useNavigate()

  useEffect(() => { setTimeout(() => setMounted(true), 50) }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!username || !password) { setError('Please fill in all fields'); return }
    setLoading(true); setError('')
    try {
      const res = await login(username, password)
      handleLogin(res.data)
      navigate('/')
    } catch (err) {
      setError(err?.response?.data?.error || 'Invalid credentials')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', display: 'flex', fontFamily: '"Inter", sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');

        @keyframes slideIn { from { opacity:0; transform:translateX(-24px); } to { opacity:1; transform:translateX(0); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes gradientShift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes errorShake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }

        .left-panel { animation: slideIn 0.7s cubic-bezier(.16,1,.3,1) forwards; }
        .form-panel { animation: fadeUp 0.7s .1s cubic-bezier(.16,1,.3,1) forwards; opacity:0; }
        .float-card { animation: float 6s ease-in-out infinite; }
        .float-card-2 { animation: float 8s ease-in-out 1s infinite; }
        .error-shake { animation: errorShake 0.4s ease; }

        .input-field {
          width: 100%; padding: 13px 16px;
          background: #fafafa; border: 1.5px solid #e8e8f0;
          border-radius: 12px; font-size: 14.5px; color: #0f0e1a;
          outline: none; transition: all 0.2s ease;
          font-family: 'Inter', sans-serif;
        }
        .input-field:hover { border-color: #c4c4e0; background: #f5f5fd; }
        .input-field.focused { border-color: #6366f1; background: #fff; box-shadow: 0 0 0 4px rgba(99,102,241,0.08); }
        .input-field.error { border-color: #ef4444; background: #fff5f5; }

        .btn-primary {
          width: 100%; padding: 14px;
          background: linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%);
          background-size: 200% 200%;
          border: none; border-radius: 12px;
          color: white; font-size: 15px; font-weight: 600;
          cursor: pointer; position: relative; overflow: hidden;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          font-family: 'Inter', sans-serif;
          animation: gradientShift 4s ease infinite;
        }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(99,102,241,.4); }
        .btn-primary:active { transform: translateY(0); }
        .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
        .btn-primary::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(to right, transparent, rgba(255,255,255,.12), transparent);
          transform: translateX(-100%); transition: transform 0.5s ease;
        }
        .btn-primary:hover::after { transform: translateX(100%); }
      `}</style>

      {/* ── Left panel — gradient visual ─────────────────────────────── */}
      <div className="left-panel" style={{
        width: '46%', position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(145deg, #0f0e1a 0%, #1a1836 40%, #0f172a 100%)',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '48px 52px',
      }}>
        {/* Ambient glows */}
        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '10%', left: '-5%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '40%', right: '20%', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 65%)', pointerEvents: 'none' }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative', zIndex: 1 }}>
          <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #3b82f6, #6366f1, #8b5cf6)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(99,102,241,0.5)' }}>
            <span style={{ fontSize: '16px' }}>⚡</span>
          </div>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: '15px', fontFamily: 'Plus Jakarta Sans', letterSpacing: '-0.2px' }}>Retail Samadhan</div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', marginTop: '-1px' }}>Operations Platform</div>
          </div>
        </div>

        {/* Center content */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontSize: '38px', fontWeight: 700, color: 'white', fontFamily: 'Plus Jakarta Sans', letterSpacing: '-1.2px', lineHeight: 1.1, marginBottom: '16px' }}>
            Your store,<br />
            <span style={{ background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              finally legible.
            </span>
          </h2>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, maxWidth: '320px' }}>
            Inventory clarity, demand forecasts, and staffing decisions — powered by your existing POS data.
          </p>

          {/* Floating stats */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '36px' }}>
            {[
              { val: '2,848+', label: 'SKUs tracked' },
              { val: '23%', label: 'less shrinkage' },
              { val: '$50/mo', label: 'per location' },
            ].map((s, i) => (
              <div key={i} style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', backdropFilter: 'blur(8px)' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'white', fontFamily: 'Plus Jakarta Sans', letterSpacing: '-0.5px' }}>{s.val}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Floating dashboard mini card */}
        <div className="float-card" style={{ position: 'absolute', bottom: '80px', right: '-20px', width: '200px', padding: '14px 16px', background: 'rgba(15,14,26,0.9)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '12px', backdropFilter: 'blur(16px)', zIndex: 1 }}>
          <div style={{ fontSize: '9.5px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Today's Revenue</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'white', fontFamily: 'Plus Jakarta Sans', letterSpacing: '-0.5px' }}>$20,789</div>
          <div style={{ fontSize: '11px', color: '#10b981', marginTop: '3px' }}>↑ 8.4% vs yesterday</div>
        </div>

        <div style={{ position: 'relative', zIndex: 1, fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>
          © 2026 Retail Samadhan
        </div>
      </div>

      {/* ── Right panel — form ────────────────────────────────────────── */}
      <div className="form-panel" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px', background: '#ffffff' }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>

          <div style={{ marginBottom: '36px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#0f0e1a', fontFamily: 'Plus Jakarta Sans', letterSpacing: '-0.8px', marginBottom: '6px' }}>
              Welcome back
            </h1>
            <p style={{ fontSize: '15px', color: '#7a7a9a', fontWeight: 400 }}>
              Sign in to your store dashboard
            </p>
          </div>

          {error && (
            <div className="error-shake" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 14px', background: '#fff5f5', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', marginBottom: '18px' }}>
              <span style={{ fontSize: '14px' }}>⚠️</span>
              <span style={{ fontSize: '13px', color: '#ef4444', fontWeight: 500 }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Username */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#3d3c52', marginBottom: '6px', letterSpacing: '0.01em' }}>Username</label>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                onFocus={() => setFocused('username')}
                onBlur={() => setFocused(null)}
                placeholder="Enter your username"
                autoFocus
                className={`input-field${focused === 'username' ? ' focused' : ''}${error && !username ? ' error' : ''}`}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: '22px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#3d3c52', marginBottom: '6px' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  placeholder="Enter your password"
                  className={`input-field${focused === 'password' ? ' focused' : ''}${error && !password ? ' error' : ''}`}
                  style={{ paddingRight: '44px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9496b0', fontSize: '16px', padding: 0, transition: 'color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#6366f1'}
                  onMouseLeave={e => e.currentTarget.style.color = '#9496b0'}
                >
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '99px', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                  Signing in...
                </span>
              ) : 'Sign in →'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '22px', fontSize: '14px', color: '#9496b0' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: '#6366f1', fontWeight: 600, textDecoration: 'none', transition: 'color 0.15s' }}
              onMouseEnter={e => e.target.style.color = '#8b5cf6'}
              onMouseLeave={e => e.target.style.color = '#6366f1'}
            >
              Create one
            </Link>
          </div>

          {/* Trust badges */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #f0effe' }}>
            {['🔒 Secure', '⚡ Fast', '🎯 Accurate'].map((b, i) => (
              <span key={i} style={{ fontSize: '12px', color: '#b0b0c8', fontWeight: 500 }}>{b}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}