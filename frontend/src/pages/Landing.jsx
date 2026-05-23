import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

// ─── Animated counter ─────────────────────────────────────────────────────────
function Counter({ target, prefix = '', suffix = '' }) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    const steps = 50
    const inc = target / steps
    let cur = 0
    const t = setInterval(() => {
      cur = Math.min(cur + inc, target)
      setVal(Math.round(cur))
      if (cur >= target) clearInterval(t)
    }, 30)
    return () => clearInterval(t)
  }, [target])
  return <>{prefix}{val}{suffix}</>
}

// ─── Minimal sparkline ────────────────────────────────────────────────────────
function Spark({ data, color }) {
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 80},${28 - ((v - min) / range) * 24}`).join(' ')
  return (
    <svg width="80" height="28" style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
    </svg>
  )
}

export default function Landing() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const rev = [61, 58, 72, 68, 79, 74, 83, 88, 85, 92, 89, 97]
  const mgn = [29, 31, 30, 33, 31, 34, 33, 36, 35, 38, 37, 40]

  return (
    <div style={{ background: '#07090e', minHeight: '100vh', color: '#e2e8f0', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --amber: #c2853a;
          --amber-soft: #d4956a;
          --amber-dim: rgba(194,133,58,0.12);
          --amber-border: rgba(194,133,58,0.22);
          --surface: rgba(255,255,255,0.03);
          --border: rgba(255,255,255,0.07);
          --border-soft: rgba(255,255,255,0.04);
          --text-primary: #e8edf4;
          --text-secondary: #7a8899;
          --text-dim: #3d4a5c;
        }

        body { font-family: 'DM Sans', sans-serif; -webkit-font-smoothing: antialiased; }

        .serif { font-family: 'Fraunces', Georgia, serif; }

        @keyframes rise { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes drift { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }

        .r0 { animation: rise 0.8s ease forwards; }
        .r1 { animation: rise 0.8s 0.12s ease forwards; opacity: 0; }
        .r2 { animation: rise 0.8s 0.24s ease forwards; opacity: 0; }
        .r3 { animation: rise 0.8s 0.36s ease forwards; opacity: 0; }
        .r4 { animation: fade 1s 0.5s ease forwards; opacity: 0; }
        .drift { animation: drift 7s ease-in-out infinite; }

        .nav-a { color: var(--text-secondary); text-decoration: none; font-size: 13.5px; font-weight: 500; letter-spacing: 0.01em; transition: color 0.2s; }
        .nav-a:hover { color: var(--text-primary); }

        .feature-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 28px; transition: border-color 0.25s, transform 0.25s; cursor: default; }
        .feature-card:hover { border-color: var(--amber-border); transform: translateY(-3px); }

        .pricing-card { background: var(--surface); border: 1px solid var(--border); border-radius: 20px; padding: 36px; transition: border-color 0.25s, transform 0.25s; }
        .pricing-card:hover { border-color: rgba(255,255,255,0.12); transform: translateY(-3px); }
        .pricing-card.featured { background: linear-gradient(160deg, rgba(194,133,58,0.09), rgba(194,133,58,0.03)); border-color: var(--amber-border); }

        .cta-btn { display: inline-block; padding: 13px 28px; background: var(--amber); border-radius: 10px; color: #0a0c10; font-size: 14px; font-weight: 600; text-decoration: none; letter-spacing: 0.01em; transition: all 0.2s; }
        .cta-btn:hover { background: var(--amber-soft); transform: translateY(-1px); }

        .ghost-btn { display: inline-block; padding: 13px 24px; background: transparent; border: 1px solid var(--border); border-radius: 10px; color: var(--text-secondary); font-size: 14px; font-weight: 500; text-decoration: none; transition: all 0.2s; }
        .ghost-btn:hover { border-color: rgba(255,255,255,0.15); color: var(--text-primary); }

        .dash-surface { background: rgba(10,12,18,0.9); border: 1px solid var(--border); border-radius: 16px; backdrop-filter: blur(16px); }
      `}</style>

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        padding: '0 48px', height: '60px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scrolled ? 'rgba(7,9,14,0.82)' : 'transparent',
        backdropFilter: scrolled ? 'blur(24px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--border-soft)' : 'none',
        transition: 'all 0.4s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <div style={{ width: '28px', height: '28px', background: 'linear-gradient(135deg, #c2853a, #a36828)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '13px' }}>◈</span>
          </div>
          <span style={{ fontSize: '15px', fontWeight: 600, color: '#e2e8f0', letterSpacing: '-0.2px', fontFamily: 'Fraunces, serif' }}>Retail Samadhan</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
          <a href="#platform" className="nav-a">Platform</a>
          <a href="#features" className="nav-a">Features</a>
          <a href="#pricing" className="nav-a">Pricing</a>
          <div style={{ width: '1px', height: '16px', background: 'var(--border)' }} />
          <Link to="/login" className="nav-a">Sign in</Link>
          <Link to="/register" style={{ padding: '7px 18px', background: 'var(--amber)', borderRadius: '8px', color: '#0a0c10', fontSize: '13.5px', fontWeight: 600, textDecoration: 'none', letterSpacing: '0.01em', transition: 'background 0.2s' }}>
            Get started
          </Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', padding: '120px 48px 80px', position: 'relative' }}>

        {/* Ambient light — single, restrained */}
        <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)', width: '700px', height: '500px', background: 'radial-gradient(ellipse, rgba(194,133,58,0.055) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0 }} />

        {/* Subtle grid */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(var(--border-soft) 1px, transparent 1px), linear-gradient(90deg, var(--border-soft) 1px, transparent 1px)', backgroundSize: '80px 80px', pointerEvents: 'none', maskImage: 'radial-gradient(ellipse 70% 70% at 50% 40%, black 30%, transparent 100%)', zIndex: 0 }} />

        <div style={{ maxWidth: '1160px', margin: '0 auto', width: '100%', display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: '100px', alignItems: 'center', position: 'relative', zIndex: 1 }}>

          {/* Copy */}
          <div>
            <div className="r0" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '5px 12px', background: 'var(--amber-dim)', border: '1px solid var(--amber-border)', borderRadius: '6px', marginBottom: '32px' }}>
              <div style={{ width: '5px', height: '5px', borderRadius: '99px', background: 'var(--amber)' }} />
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--amber)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Operational Intelligence</span>
            </div>

            <h1 className="r1 serif" style={{ fontSize: '60px', fontWeight: 700, letterSpacing: '-2.5px', lineHeight: 1.02, marginBottom: '24px', color: '#f0f4f9' }}>
              Your store,<br />
              finally <em style={{ fontStyle: 'italic', color: 'var(--amber-soft)' }}>legible.</em>
            </h1>

            <p className="r2" style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: 1.75, maxWidth: '420px', marginBottom: '40px', fontWeight: 400 }}>
              Retail Samadhan turns the raw data sitting in your POS into clear decisions — shrinkage alerts, demand forecasts, staffing guidance, and margin intelligence that pays for itself.
            </p>

            <div className="r3" style={{ display: 'flex', gap: '10px', marginBottom: '56px' }}>
              <Link to="/register" className="cta-btn">Start free trial</Link>
              <Link to="/login" className="ghost-btn">Sign in</Link>
            </div>

            <div className="r4" style={{ display: 'flex', gap: '40px', paddingTop: '32px', borderTop: '1px solid var(--border-soft)' }}>
              {[
                { n: 2848, s: '+', label: 'SKUs supported' },
                { n: 23, s: '%', label: 'Avg shrinkage reduction' },
                { n: 50, p: '$', label: 'Per location / month' },
              ].map((s, i) => (
                <div key={i}>
                  <div className="serif" style={{ fontSize: '30px', fontWeight: 600, color: '#f0f4f9', letterSpacing: '-1px' }}>
                    <Counter target={s.n} prefix={s.p || ''} suffix={s.s || ''} />
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '3px', fontWeight: 500 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Dashboard preview */}
          <div className="drift r4" style={{ position: 'relative' }}>
            <div className="dash-surface" style={{ padding: '22px', boxShadow: '0 32px 72px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.03)' }}>

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', paddingBottom: '16px', borderBottom: '1px solid var(--border-soft)' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Fraunces, serif' }}>Westside Convenience</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '1px' }}>Greeley, CO · May 2026</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '6px' }}>
                  <div style={{ width: '5px', height: '5px', borderRadius: '99px', background: '#10b981' }} />
                  <span style={{ fontSize: '10px', fontWeight: 600, color: '#10b981', letterSpacing: '0.04em' }}>Live</span>
                </div>
              </div>

              {/* KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                {[
                  { label: 'Daily Revenue', val: '$20,789', trend: '+8.4%', spark: rev, c: 'var(--amber)' },
                  { label: 'Gross Margin', val: '34.2%', trend: '+2.1%', spark: mgn, c: '#10b981' },
                ].map((k, i) => (
                  <div key={i} style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-soft)', borderRadius: '10px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>{k.label}</div>
                    <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Fraunces, serif', letterSpacing: '-0.5px', marginBottom: '8px' }}>{k.val}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 500 }}>{k.trend}</span>
                      <Spark data={k.spark} color={k.c} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Inventory alerts */}
              <div style={{ marginBottom: '4px' }}>
                <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Inventory Alerts</div>
                {[
                  { name: 'Marlboro Red Box', note: 'Selling faster than received — count today', sev: 'high' },
                  { name: 'Monster Energy 16oz', note: 'Stock depletion anomaly detected', sev: 'medium' },
                ].map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 12px', background: i === 0 ? 'rgba(239,68,68,0.04)' : 'rgba(194,133,58,0.04)', border: `1px solid ${i === 0 ? 'rgba(239,68,68,0.12)' : 'rgba(194,133,58,0.12)'}`, borderRadius: '9px', marginBottom: '7px' }}>
                    <div style={{ width: '5px', height: '5px', borderRadius: '99px', background: i === 0 ? '#ef4444' : 'var(--amber)', marginTop: '4px', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{a.name}</div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '1px' }}>{a.note}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating forecast badge */}
            <div style={{ position: 'absolute', bottom: '-18px', right: '-24px', padding: '14px 18px', background: 'rgba(10,12,18,0.96)', border: '1px solid var(--amber-border)', borderRadius: '12px', backdropFilter: 'blur(16px)', boxShadow: '0 16px 32px rgba(0,0,0,0.4)' }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>7-Day Forecast</div>
              <div className="serif" style={{ fontSize: '24px', fontWeight: 600, color: 'var(--amber-soft)', letterSpacing: '-0.5px' }}>+12.4%</div>
              <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '1px' }}>demand increase projected</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Divider strip ─────────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid var(--border-soft)', borderBottom: '1px solid var(--border-soft)', padding: '24px 48px' }}>
        <div style={{ maxWidth: '1160px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '32px' }}>
          {[
            ['Gas stations', 'Convenience stores', 'Liquor shops'],
            ['Pricebook import', 'Sales analysis', 'Purchase tracking'],
            ['Shrinkage detection', 'Demand forecasting', 'Margin intelligence'],
            ['Any POS system', 'Any CSV format', 'No setup required'],
          ].map((col, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {col.map((item, j) => (
                <div key={j} style={{ fontSize: '12.5px', color: j === 0 ? 'var(--text-secondary)' : 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <span style={{ color: 'var(--amber)', opacity: 0.6 }}>—</span>
                  {item}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Platform section ──────────────────────────────────────────────── */}
      <section id="platform" style={{ padding: '100px 48px' }}>
        <div style={{ maxWidth: '1160px', margin: '0 auto' }}>
          <div style={{ maxWidth: '560px', marginBottom: '64px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>The Platform</div>
            <h2 className="serif" style={{ fontSize: '42px', fontWeight: 600, letterSpacing: '-1.5px', lineHeight: 1.08, color: '#f0f4f9', marginBottom: '18px' }}>
              Built for how operators actually run stores
            </h2>
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              Upload your existing POS data. Our engine handles the rest — mapping columns, detecting patterns, surfacing insights, and flagging problems before they cost you money.
            </p>
          </div>

          {/* Import preview — full width */}
          <div className="dash-surface" style={{ padding: '28px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '5px' }}>
                {['#ef4444','#f59e0b','#10b981'].map((c,i) => <div key={i} style={{ width: '8px', height: '8px', borderRadius: '99px', background: c }} />)}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-dim)', marginLeft: '4px' }}>Import Center — Apex Pricebook · 2,848 products</div>
            </div>
            {/* Column mapping table */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 36px 1fr 130px', gap: '0' }}>
              <div style={{ display: 'contents' }}>
                {['Source Column', '', 'Maps To', 'Confidence'].map((h, i) => (
                  <div key={i} style={{ padding: '8px 14px', fontSize: '10px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-soft)' }}>{h}</div>
                ))}
              </div>
              {[
                { src: 'Description', dst: 'product_name', conf: 99 },
                { src: 'UPC', dst: 'upc', conf: 100 },
                { src: 'Price', dst: 'sell_price', conf: 97 },
                { src: 'Cost', dst: 'cost_price', conf: 95 },
                { src: 'Margin', dst: 'margin_pct', conf: 98 },
                { src: 'LastSalesDate', dst: 'last_sale_date', conf: 89 },
              ].map((r, i) => (
                <div key={i} style={{ display: 'contents' }}>
                  <div style={{ padding: '11px 14px', fontSize: '12.5px', color: 'var(--text-secondary)', fontFamily: 'monospace', borderBottom: '1px solid var(--border-soft)' }}>{r.src}</div>
                  <div style={{ padding: '11px 0', fontSize: '12px', color: 'var(--text-dim)', textAlign: 'center', borderBottom: '1px solid var(--border-soft)' }}>→</div>
                  <div style={{ padding: '11px 14px', fontSize: '12.5px', color: '#93c5fd', fontFamily: 'monospace', borderBottom: '1px solid var(--border-soft)' }}>{r.dst}</div>
                  <div style={{ padding: '11px 14px', borderBottom: '1px solid var(--border-soft)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${r.conf}%`, background: r.conf > 92 ? '#10b981' : 'var(--amber)', borderRadius: '99px' }} />
                    </div>
                    <span style={{ fontSize: '10.5px', fontWeight: 600, color: r.conf > 92 ? '#10b981' : 'var(--amber)', minWidth: '30px' }}>{r.conf}%</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '14px', padding: '11px 14px', background: 'var(--amber-dim)', border: '1px solid var(--amber-border)', borderRadius: '8px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              Mapped <strong style={{ color: '#e2e8f0' }}>2,848 products</strong> in 3.2 seconds. 6 fields auto-detected, 0 required manual review.
            </div>
          </div>

          {/* Two column preview */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Inventory */}
            <div className="dash-surface" style={{ padding: '24px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Fraunces, serif', marginBottom: '4px' }}>Inventory Health</div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '18px' }}>Expected stock vs actual movement</div>
              {[
                { name: 'Marlboro Red Box', qty: -7, status: 'critical' },
                { name: 'Monster 16oz', qty: -3, status: 'critical' },
                { name: 'Red Bull 12oz', qty: 18, status: 'healthy' },
                { name: 'Coca Cola 20oz', qty: 142, status: 'healthy' },
                { name: 'Newport Box', qty: 2, status: 'low' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: i < 4 ? '1px solid var(--border-soft)' : 'none' }}>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>{item.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: item.status === 'critical' ? '#ef4444' : item.status === 'low' ? 'var(--amber)' : '#10b981', fontFamily: 'Fraunces, serif' }}>
                      {item.qty > 0 ? '+' : ''}{item.qty}
                    </span>
                    <div style={{ fontSize: '9px', fontWeight: 600, padding: '2px 7px', borderRadius: '4px', background: item.status === 'critical' ? 'rgba(239,68,68,0.1)' : item.status === 'low' ? 'var(--amber-dim)' : 'rgba(16,185,129,0.08)', color: item.status === 'critical' ? '#ef4444' : item.status === 'low' ? 'var(--amber)' : '#10b981', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {item.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Staffing */}
            <div className="dash-surface" style={{ padding: '24px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Fraunces, serif', marginBottom: '4px' }}>Staffing Recommendations</div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '18px' }}>Based on 90-day sales patterns</div>
              {[
                { day: 'Monday', staff: 1, rev: '$4,200', busy: false },
                { day: 'Wednesday', staff: 2, rev: '$6,100', busy: false },
                { day: 'Friday', staff: 2, rev: '$9,400', busy: true },
                { day: 'Saturday', staff: 2, rev: '$11,200', busy: true },
                { day: 'Sunday', staff: 1, rev: '$3,900', busy: false },
              ].map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '9px 0', borderBottom: i < 4 ? '1px solid var(--border-soft)' : 'none' }}>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', width: '80px' }}>{d.day}</div>
                  <div style={{ flex: 1, height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: d.busy ? '90%' : d.staff === 2 ? '60%' : '30%', background: d.busy ? '#ef4444' : d.staff === 2 ? 'var(--amber)' : '#10b981', borderRadius: '99px' }} />
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', minWidth: '16px', textAlign: 'right' }}>{d.staff}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', minWidth: '52px', textAlign: 'right' }}>{d.rev}</div>
                </div>
              ))}
              <div style={{ marginTop: '14px', fontSize: '12px', color: 'var(--text-dim)', padding: '10px 12px', background: 'var(--amber-dim)', border: '1px solid var(--amber-border)', borderRadius: '8px' }}>
                Estimated weekly labor savings — <strong style={{ color: 'var(--amber-soft)' }}>$160</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section id="features" style={{ padding: '80px 48px', borderTop: '1px solid var(--border-soft)' }}>
        <div style={{ maxWidth: '1160px', margin: '0 auto' }}>
          <div style={{ maxWidth: '500px', marginBottom: '56px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>Capabilities</div>
            <h2 className="serif" style={{ fontSize: '40px', fontWeight: 600, letterSpacing: '-1.5px', lineHeight: 1.1, color: '#f0f4f9' }}>
              Everything your operation needs. Nothing it doesn't.
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {[
              { icon: '⬡', title: 'Universal Import', desc: 'Upload any POS export — Verifone, Gilbarco, Apex, Square. Column mapping is automatic. First import takes under 5 minutes.' },
              { icon: '⬡', title: 'Shrinkage Detection', desc: 'Cross-references purchases against sales to surface stock discrepancies. Flags items to count today, not at month-end.' },
              { icon: '⬡', title: 'Demand Forecasting', desc: 'Moving average models with trend detection. Know what to reorder and when, before shelves go empty.' },
              { icon: '⬡', title: 'Product Intelligence', desc: 'Classifies every SKU by revenue and velocity. Surfaces your stars, protects your margins, identifies dead inventory.' },
              { icon: '⬡', title: 'Labor Optimization', desc: 'Analyzes sales by day and hour. Recommends exactly when one staff member is enough — and when it isn\'t.' },
              { icon: '⬡', title: 'Margin Visibility', desc: 'Real cost and margin per product, per category, per period. No spreadsheets. No guesswork.' },
            ].map((f, i) => (
              <div key={i} className="feature-card">
                <div style={{ fontSize: '18px', color: 'var(--amber)', marginBottom: '14px', opacity: 0.7 }}>{f.icon}</div>
                <div className="serif" style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px', letterSpacing: '-0.2px' }}>{f.title}</div>
                <div style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.65 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: '100px 48px', borderTop: '1px solid var(--border-soft)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>Investment</div>
            <h2 className="serif" style={{ fontSize: '42px', fontWeight: 600, letterSpacing: '-1.5px', lineHeight: 1.08, color: '#f0f4f9', marginBottom: '16px' }}>
              Straightforward pricing.<br />Measurable returns.
            </h2>
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto', lineHeight: 1.7 }}>
              The platform typically recovers its cost within the first week through labor savings and shrinkage reduction alone.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
            {[
              {
                name: 'Starter', price: 49,
                desc: 'For single-location operators getting started with data-driven operations.',
                features: ['1 location · up to 3,000 SKUs', 'Pricebook & sales import', 'Shrinkage alerts', 'Basic demand forecast', 'Email support'],
                featured: false,
              },
              {
                name: 'Operator', price: 99,
                desc: 'For serious operators who want the full intelligence suite.',
                features: ['Up to 3 locations · unlimited SKUs', 'Full LSTM demand forecasting', 'Product segmentation', 'Shift planner + labor optimization', 'Purchase order tracking', 'Priority support'],
                featured: true,
              },
              {
                name: 'Enterprise', price: 199,
                desc: 'For multi-store groups and operators with custom requirements.',
                features: ['Unlimited locations', 'Custom ML model training', 'API access', 'White-label option', 'Dedicated onboarding', 'SLA guarantee'],
                featured: false,
              },
            ].map((p, i) => (
              <div key={i} className={`pricing-card${p.featured ? ' featured' : ''}`} style={{ position: 'relative' }}>
                {p.featured && (
                  <div style={{ position: 'absolute', top: '-11px', left: '50%', transform: 'translateX(-50%)', padding: '3px 14px', background: 'var(--amber)', borderRadius: '99px', fontSize: '10px', fontWeight: 700, color: '#0a0c10', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    Most chosen
                  </div>
                )}
                <div style={{ marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{p.name}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '10px' }}>
                  <span className="serif" style={{ fontSize: '44px', fontWeight: 600, color: '#f0f4f9', letterSpacing: '-1.5px' }}>${p.price}</span>
                  <span style={{ fontSize: '13px', color: 'var(--text-dim)' }}>/month</span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>{p.desc}</div>
                <div style={{ height: '1px', background: 'var(--border-soft)', marginBottom: '20px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginBottom: '28px' }}>
                  {p.features.map((f, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: '9px' }}>
                      <span style={{ color: p.featured ? 'var(--amber)' : 'var(--text-dim)', marginTop: '1px', fontSize: '12px' }}>✓</span>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{f}</span>
                    </div>
                  ))}
                </div>
                <Link to="/register" style={{
                  display: 'block', textAlign: 'center', padding: '11px',
                  background: p.featured ? 'var(--amber)' : 'transparent',
                  border: p.featured ? 'none' : '1px solid var(--border)',
                  borderRadius: '9px', color: p.featured ? '#0a0c10' : 'var(--text-secondary)',
                  fontSize: '13.5px', fontWeight: p.featured ? 700 : 500,
                  textDecoration: 'none', transition: 'all 0.2s',
                }}>
                  Start free trial
                </Link>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '28px', fontSize: '13px', color: 'var(--text-dim)' }}>
            14-day free trial on all plans · No credit card required · Cancel anytime
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section style={{ padding: '100px 48px', borderTop: '1px solid var(--border-soft)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '500px', height: '300px', background: 'radial-gradient(ellipse, rgba(194,133,58,0.06), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <h2 className="serif" style={{ fontSize: '48px', fontWeight: 600, letterSpacing: '-2px', lineHeight: 1.05, color: '#f0f4f9', marginBottom: '20px' }}>
            Your store's data is<br />
            <em style={{ fontStyle: 'italic', color: 'var(--amber-soft)' }}>already telling a story.</em>
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '36px', maxWidth: '420px', margin: '0 auto 36px' }}>
            Upload your pricebook and get your first insights in under five minutes. No configuration, no onboarding call, no setup fees.
          </p>
          <Link to="/register" className="cta-btn" style={{ fontSize: '15px', padding: '14px 36px' }}>
            Start free trial →
          </Link>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid var(--border-soft)', padding: '32px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '24px', height: '24px', background: 'linear-gradient(135deg, #c2853a, #a36828)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>◈</div>
          <span className="serif" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Retail Samadhan</span>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>© 2026 · Built for independent operators</div>
        <div style={{ display: 'flex', gap: '20px' }}>
          <Link to="/login" style={{ fontSize: '12.5px', color: 'var(--text-dim)', textDecoration: 'none' }}>Sign in</Link>
          <Link to="/register" style={{ fontSize: '12.5px', color: 'var(--text-dim)', textDecoration: 'none' }}>Get started</Link>
        </div>
      </footer>
    </div>
  )
}