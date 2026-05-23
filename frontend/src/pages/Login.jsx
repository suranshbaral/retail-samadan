import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { login } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import { Zap, Eye, EyeOff, AlertCircle } from 'lucide-react'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { handleLogin } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!username || !password) { setError('Please fill in all fields'); return }
    setLoading(true)
    setError('')
    try {
      const res = await login(username, password)
      handleLogin(res.data)
      navigate('/')
    } catch (err) {
      setError(err?.response?.data?.error || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0d0f14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 0 30px rgba(37,99,235,0.4)' }}>
            <Zap size={22} color="white" strokeWidth={2.5} />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#f1f5f9', fontFamily: 'Plus Jakarta Sans', letterSpacing: '-0.3px' }}>
            Retail Samadhan
          </div>
          <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>
            AI Retail Intelligence
          </div>
        </div>

        {/* Card */}
        <div style={{ background: '#13151c', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '32px' }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#f1f5f9', fontFamily: 'Plus Jakarta Sans', marginBottom: '6px' }}>
            Welcome back
          </div>
          <div style={{ fontSize: '13px', color: '#475569', marginBottom: '24px' }}>
            Sign in to your store dashboard
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', marginBottom: '16px' }}>
              <AlertCircle size={14} color="#ef4444" />
              <span style={{ fontSize: '12.5px', color: '#ef4444' }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Username</div>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoFocus
                style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '9px', fontSize: '13.5px', color: '#f1f5f9', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                onFocus={e => e.target.style.borderColor = 'rgba(59,130,246,0.4)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Password</div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  style={{ width: '100%', padding: '10px 40px 10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '9px', fontSize: '13.5px', color: '#f1f5f9', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                  onFocus={e => e.target.style.borderColor = 'rgba(59,130,246,0.4)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 0 }}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '11px', background: loading ? 'rgba(37,99,235,0.5)' : 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'none', borderRadius: '9px', color: 'white', fontSize: '14px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.35)', transition: 'all 0.2s ease' }}
            >
              {loading ? 'Signing in...' : 'Sign In →'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#475569' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>Create one</Link>
          </div>
        </div>
      </div>
    </div>
  )
}