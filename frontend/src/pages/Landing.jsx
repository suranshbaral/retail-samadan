import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

// ─── Intersection reveal ──────────────────────────────────────────────────────
function useReveal(threshold = 0.1) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect() }
    }, { threshold })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return [ref, visible]
}

function Reveal({ children, delay = 0, y = 18 }) {
  const [ref, visible] = useReveal()
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : `translateY(${y}px)`,
      transition: `opacity 0.72s ${delay}s cubic-bezier(0.16,1,0.3,1), transform 0.72s ${delay}s cubic-bezier(0.16,1,0.3,1)`,
    }}>
      {children}
    </div>
  )
}

// ─── Counter ──────────────────────────────────────────────────────────────────
function Counter({ target, prefix = '', suffix = '' }) {
  const [val, setVal] = useState(0)
  const done = useRef(false)
  const [ref, visible] = useReveal(0.5)
  useEffect(() => {
    if (!visible || done.current) return
    done.current = true
    let c = 0; const inc = target / 52
    const t = setInterval(() => {
      c = Math.min(c + inc, target); setVal(Math.round(c))
      if (c >= target) clearInterval(t)
    }, 20)
    return () => clearInterval(t)
  }, [visible, target])
  return <span ref={ref}>{prefix}{val}{suffix}</span>
}

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Spark({ data, color = '#b07d3a', w = 64, h = 22 }) {
  const max = Math.max(...data), min = Math.min(...data), r = max - min || 1
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / r) * (h - 2) - 1}`).join(' ')
  return (
    <svg width={w} height={h} style={{ overflow: 'visible', display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
    </svg>
  )
}

export default function Landing() {
  const [scrollY, setScrollY] = useState(0)
  useEffect(() => {
    const fn = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const rev1 = [58, 63, 60, 71, 68, 75, 79, 74, 88, 85, 92, 97]
  const rev2 = [29, 31, 30, 33, 32, 35, 33, 37, 35, 39, 38, 41]

  return (
    <div style={{ background: '#f5f2eb', color: '#1c1b17', fontFamily: '"DM Sans", sans-serif', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,300;1,9..144,400;1,9..144,500&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { -webkit-font-smoothing: antialiased; }

        :root {
          --cream-0: #f5f2eb;
          --cream-1: #ede9e0;
          --cream-2: #e4dfd4;
          --cream-3: #d8d2c4;
          --ink-0: #1c1b17;
          --ink-1: #3d3c36;
          --ink-2: #6b6960;
          --ink-3: #9b9890;
          --ink-4: #c4c1b8;
          --gold: #b07d3a;
          --gold-hover: #c48d4a;
          --gold-pale: rgba(176,125,58,0.08);
          --gold-border: rgba(176,125,58,0.2);
          --success: #1a7a52;
          --danger: #b83a2a;
          --shadow-card: 0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.05);
          --shadow-lift: 0 4px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06);
        }

        .serif { font-family: 'Fraunces', Georgia, serif; }

        @keyframes heroIn { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }

        .h0 { animation: heroIn 0.9s cubic-bezier(.16,1,.3,1) forwards; }
        .h1 { animation: heroIn 0.9s .1s cubic-bezier(.16,1,.3,1) forwards; opacity:0; }
        .h2 { animation: heroIn 0.9s .2s cubic-bezier(.16,1,.3,1) forwards; opacity:0; }
        .h3 { animation: heroIn 0.9s .32s cubic-bezier(.16,1,.3,1) forwards; opacity:0; }
        .h4 { animation: heroIn 1s .46s cubic-bezier(.16,1,.3,1) forwards; opacity:0; }

        .dot-blink { animation: blink 2.6s ease-in-out infinite; }

        .nav-a {
          font-size: 13.5px; font-weight: 500; color: var(--ink-2);
          text-decoration: none; position: relative; padding-bottom: 2px;
          transition: color .2s ease;
        }
        .nav-a::after {
          content:''; position:absolute; bottom:0; left:0;
          width:0; height:1px; background:var(--gold);
          transition: width .3s cubic-bezier(.16,1,.3,1);
        }
        .nav-a:hover { color: var(--ink-0); }
        .nav-a:hover::after { width:100%; }

        .btn-gold {
          display:inline-block; padding:12px 26px;
          background:var(--gold); border-radius:8px;
          color:#fff; font-size:14px; font-weight:600;
          text-decoration:none; letter-spacing:.01em;
          transition: background .18s ease, transform .18s ease, box-shadow .18s ease;
          border:none; cursor:pointer; font-family:'DM Sans',sans-serif;
        }
        .btn-gold:hover { background:var(--gold-hover); transform:translateY(-1px); box-shadow:0 6px 20px rgba(176,125,58,.28); }

        .btn-outline {
          display:inline-block; padding:12px 22px;
          background:transparent; border:1px solid var(--cream-3);
          border-radius:8px; color:var(--ink-2); font-size:14px; font-weight:500;
          text-decoration:none; transition: border-color .2s, color .2s, transform .2s;
          font-family:'DM Sans',sans-serif;
        }
        .btn-outline:hover { border-color:var(--ink-3); color:var(--ink-0); transform:translateY(-1px); }

        .pill {
          display:inline-flex; align-items:center; gap:6px;
          padding:4px 11px; background:var(--gold-pale);
          border:1px solid var(--gold-border); border-radius:4px;
        }

        .feature-cell {
          padding:36px 32px;
          border-right:1px solid var(--cream-2);
          border-bottom:1px solid var(--cream-2);
          transition: background .2s ease;
          cursor:default;
        }
        .feature-cell:hover { background: rgba(176,125,58,.04); }
        .feature-cell:nth-child(3n) { border-right:none; }
        .feature-cell:nth-last-child(-n+3) { border-bottom:none; }

        .tcard {
          padding:28px 30px;
          background:rgba(255,255,255,.5);
          border:1px solid var(--cream-2);
          border-radius:14px;
          backdrop-filter: blur(8px);
          transition: transform .25s ease, box-shadow .25s ease;
          cursor:default;
        }
        .tcard:hover { transform:translateY(-2px); box-shadow: var(--shadow-lift); }

        .pcol {
          padding:32px 28px;
          border-radius:16px;
          border:1px solid var(--cream-2);
          background:white;
          transition: transform .25s ease, box-shadow .25s ease;
        }
        .pcol:hover { transform:translateY(-2px); box-shadow: var(--shadow-lift); }
        .pcol.featured {
          border-color: var(--gold-border);
          background: linear-gradient(160deg,rgba(176,125,58,.06),rgba(176,125,58,.02));
          box-shadow: 0 2px 20px rgba(176,125,58,.1);
        }

        .dash-row { display:flex; align-items:center; justify-content:space-between; padding:9px 0; border-bottom:1px solid var(--cream-1); }
        .dash-row:last-child { border-bottom:none; }

        .footer-link { font-size:12.5px; color:var(--ink-3); text-decoration:none; transition:color .2s; }
        .footer-link:hover { color:var(--ink-1); }
      `}</style>

      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 999,
        height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 56px',
        background: scrollY > 20 ? 'rgba(245,242,235,.85)' : 'transparent',
        backdropFilter: scrollY > 20 ? 'blur(24px)' : 'none',
        borderBottom: `1px solid ${scrollY > 20 ? 'rgba(0,0,0,.06)' : 'transparent'}`,
        transition: 'background .4s ease, border-color .4s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <div style={{ width: '26px', height: '26px', background: 'linear-gradient(140deg,#b07d3a,#7a5420)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#fff' }}>◈</div>
          <span className="serif" style={{ fontSize: '15px', fontWeight: 500, color: 'var(--ink-0)', letterSpacing: '-.1px' }}>Retail Samadhan</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
          {[['#story', 'How it works'], ['#features', 'Features'], ['#pricing', 'Pricing']].map(([href, label]) => (
            <a key={href} href={href} className="nav-a">{label}</a>
          ))}
          <div style={{ width: '1px', height: '14px', background: 'var(--cream-3)' }} />
          <Link to="/login" className="nav-a">Sign in</Link>
          <Link to="/register" className="btn-gold" style={{ padding: '8px 18px', fontSize: '13px' }}>Get started</Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', padding: '100px 56px 80px', position: 'relative', overflow: 'hidden' }}>

        {/* Subtle warm texture dot */}
        <div style={{ position: 'absolute', top: '20%', right: '8%', width: '480px', height: '480px', background: 'radial-gradient(ellipse, rgba(176,125,58,.07) 0%, transparent 68%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '15%', left: '5%', width: '320px', height: '320px', background: 'radial-gradient(ellipse, rgba(176,125,58,.04) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: '1160px', margin: '0 auto', width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center' }}>

          {/* Left — copy */}
          <div>
            <div className="h0 pill" style={{ marginBottom: '28px' }}>
              <div className="dot-blink" style={{ width: '5px', height: '5px', borderRadius: '99px', background: 'var(--gold)', flexShrink: 0 }} />
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--gold)', letterSpacing: '.07em', textTransform: 'uppercase' }}>Retail Operations Platform</span>
            </div>

            <h1 className="h1 serif" style={{ fontSize: 'clamp(50px,5.5vw,72px)', fontWeight: 500, letterSpacing: '-2.5px', lineHeight: 1.02, color: 'var(--ink-0)', marginBottom: '10px' }}>
              Your store,
            </h1>
            <h1 className="h2 serif" style={{ fontSize: 'clamp(50px,5.5vw,72px)', fontWeight: 300, letterSpacing: '-2.5px', lineHeight: 1.02, color: 'var(--ink-2)', fontStyle: 'italic', marginBottom: '28px' }}>
              finally legible.
            </h1>

            <p className="h3" style={{ fontSize: '17px', color: 'var(--ink-2)', lineHeight: 1.72, maxWidth: '400px', marginBottom: '36px', fontWeight: 400 }}>
              Upload your POS export. See which products are shrinking, what to reorder before the weekend, and whether you actually need two people on Tuesday.
            </p>

            <div className="h4" style={{ display: 'flex', gap: '10px', marginBottom: '52px' }}>
              <Link to="/register" className="btn-gold">Start free trial</Link>
              <Link to="/login" className="btn-outline">Sign in</Link>
            </div>

            {/* Stats rail */}
            <div className="h4" style={{ display: 'flex', gap: '0', borderTop: '1px solid var(--cream-2)', paddingTop: '28px' }}>
              {[
                { n: 2848, s: '+', label: 'SKUs per location' },
                { n: 23, s: '%', label: 'avg shrinkage reduction' },
                { p: '$', n: 50, s: '/mo', label: 'per location' },
              ].map((s, i) => (
                <div key={i} style={{ flex: 1, paddingRight: '24px', borderRight: i < 2 ? '1px solid var(--cream-2)' : 'none', marginRight: i < 2 ? '24px' : 0 }}>
                  <div className="serif" style={{ fontSize: '30px', fontWeight: 500, color: 'var(--ink-0)', letterSpacing: '-1px', lineHeight: 1, marginBottom: '4px' }}>
                    <Counter target={s.n} prefix={s.p || ''} suffix={s.s} />
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--ink-3)', fontWeight: 500 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — operational dashboard preview */}
          <div className="h4" style={{ position: 'relative' }}>
            <div style={{ background: 'white', border: '1px solid var(--cream-2)', borderRadius: '16px', padding: '22px', boxShadow: 'var(--shadow-lift)' }}>

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '14px', borderBottom: '1px solid var(--cream-1)', marginBottom: '16px' }}>
                <div>
                  <div className="serif" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink-0)' }}>Westside Convenience — Store #01</div>
                  <div style={{ fontSize: '10px', color: 'var(--ink-3)', marginTop: '2px', fontFamily: 'monospace' }}>4545 W 29th St, Greeley CO · May 21, 2026 04:33</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 9px', background: 'rgba(26,122,82,.08)', border: '1px solid rgba(26,122,82,.15)', borderRadius: '5px' }}>
                  <div className="dot-blink" style={{ width: '5px', height: '5px', borderRadius: '99px', background: '#1a7a52' }} />
                  <span style={{ fontSize: '10px', fontWeight: 600, color: '#1a7a52', letterSpacing: '.04em' }}>LIVE</span>
                </div>
              </div>

              {/* KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                {[
                  { label: 'Store Revenue', val: '$20,789', sub: 'Fuel + merch · May 20 close', trend: '+8.4%', spark: rev1, c: 'var(--gold)' },
                  { label: 'Non-Fuel Margin', val: '34.2%', sub: 'vs 31.8% last month', trend: '+2.4pp', spark: rev2, c: '#1a7a52' },
                ].map((k, i) => (
                  <div key={i} style={{ padding: '12px 14px', background: 'var(--cream-0)', border: '1px solid var(--cream-1)', borderRadius: '9px' }}>
                    <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.09em', marginBottom: '6px' }}>{k.label}</div>
                    <div className="serif" style={{ fontSize: '20px', fontWeight: 500, color: 'var(--ink-0)', letterSpacing: '-.4px', marginBottom: '6px' }}>{k.val}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <span style={{ fontSize: '10.5px', color: '#1a7a52', fontWeight: 600 }}>{k.trend}</span>
                        <div style={{ fontSize: '9.5px', color: 'var(--ink-4)', marginTop: '1px' }}>{k.sub}</div>
                      </div>
                      <Spark data={k.spark} color={k.c} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Dept breakdown */}
              <div style={{ padding: '12px 14px', background: 'var(--cream-0)', border: '1px solid var(--cream-1)', borderRadius: '9px', marginBottom: '12px' }}>
                <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.09em', marginBottom: '10px' }}>Dept Revenue</div>
                {[
                  { dept: 'Lottery / Lotto', rev: '$2,056', pct: 32.7 },
                  { dept: 'Cigarettes', rev: '$1,184', pct: 18.8 },
                  { dept: 'Energy Drink', rev: '$636', pct: 10.1 },
                  { dept: 'Grocery', rev: '$748', pct: 11.9 },
                ].map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: i < 3 ? '6px' : 0 }}>
                    <div style={{ fontSize: '11px', color: 'var(--ink-2)', width: '100px', flexShrink: 0 }}>{d.dept}</div>
                    <div style={{ flex: 1, height: '3px', background: 'var(--cream-2)', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${d.pct}%`, background: 'var(--gold)', borderRadius: '99px' }} />
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--ink-2)', minWidth: '36px', textAlign: 'right' }}>{d.rev}</div>
                  </div>
                ))}
              </div>

              {/* Inventory alerts */}
              <div>
                <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.09em', marginBottom: '8px' }}>Inventory Alerts</div>
                {[
                  { name: 'Marlboro Red Box · 028200003840', note: 'Sold 14 · received 6 · count today', c: '#b83a2a' },
                  { name: 'Monster Energy 16oz · 070847811273', note: 'Velocity +38% above 7-day avg', c: 'var(--gold)' },
                ].map((a, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '8px 10px', background: i === 0 ? 'rgba(184,58,42,.04)' : 'var(--gold-pale)', border: `1px solid ${i === 0 ? 'rgba(184,58,42,.12)' : 'var(--gold-border)'}`, borderRadius: '7px', marginBottom: i === 0 ? '5px' : 0 }}>
                    <div style={{ width: '4px', height: '4px', borderRadius: '99px', background: a.c, marginTop: '5px', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '10.5px', fontWeight: 500, color: 'var(--ink-0)', fontFamily: 'monospace' }}>{a.name}</div>
                      <div style={{ fontSize: '10px', color: 'var(--ink-3)', marginTop: '1px' }}>{a.note}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating badge */}
            <div style={{ position: 'absolute', bottom: '-14px', right: '-18px', padding: '12px 16px', background: 'white', border: '1px solid var(--gold-border)', borderRadius: '10px', boxShadow: 'var(--shadow-lift)' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '3px' }}>7-Day Forecast</div>
              <div className="serif" style={{ fontSize: '21px', fontWeight: 500, color: 'var(--gold)', letterSpacing: '-.4px' }}>+12.4%</div>
              <div style={{ fontSize: '10px', color: 'var(--ink-3)', marginTop: '1px' }}>Red Bull 12oz · Order by Friday</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Compatibility strip ──────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid var(--cream-2)', borderBottom: '1px solid var(--cream-2)', padding: '22px 56px', background: 'var(--cream-1)' }}>
        <Reveal>
          <div style={{ maxWidth: '1160px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="serif" style={{ fontSize: '13px', fontWeight: 300, color: 'var(--ink-3)', fontStyle: 'italic' }}>Works with your existing setup</span>
            <div style={{ display: 'flex', gap: '32px' }}>
              {['Verifone', 'Gilbarco', 'Apex POS', 'McLane EDI', 'Sam\'s Club', 'Square', 'Any CSV'].map(p => (
                <span key={p} style={{ fontSize: '12px', color: 'var(--ink-4)', fontWeight: 500 }}>{p}</span>
              ))}
            </div>
          </div>
        </Reveal>
      </div>

      {/* ── Story — before/after ─────────────────────────────────────────── */}
      <section id="story" style={{ padding: '112px 56px', background: 'var(--cream-0)' }}>
        <div style={{ maxWidth: '1160px', margin: '0 auto' }}>
          <Reveal>
            <div style={{ maxWidth: '600px', marginBottom: '72px' }}>
              <div style={{ width: '28px', height: '1px', background: 'var(--gold)', marginBottom: '18px', opacity: .7 }} />
              <h2 className="serif" style={{ fontSize: 'clamp(34px,3.8vw,50px)', fontWeight: 500, letterSpacing: '-1.8px', lineHeight: 1.08, color: 'var(--ink-0)', marginBottom: '18px' }}>
                Most operators find out<br />
                <em style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--ink-2)' }}>what went wrong at month-end.</em>
              </h2>
              <p style={{ fontSize: '16px', color: 'var(--ink-2)', lineHeight: 1.72, maxWidth: '480px' }}>
                Shrinkage found during inventory counts. Stockouts that could have been predicted. Overstaffed slow days. The data was always there — it just wasn't readable.
              </p>
            </div>
          </Reveal>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1px', background: 'var(--cream-2)', border: '1px solid var(--cream-2)', borderRadius: '14px', overflow: 'hidden' }}>
            {[
              { before: 'Shrinkage caught during monthly count', after: 'Flagged same day. Count scheduled before loss grows.' },
              { before: 'Ran out of Red Bull on a Friday', after: 'Reorder triggered 4 days before the stockout.' },
              { before: 'Two staff every day by habit', after: 'One staff Mon–Tue. $160/week back in your pocket.' },
              { before: 'Margins estimated from gut feel', after: 'Real margin per SKU, per vendor, every day.' },
            ].map((item, i) => (
              <Reveal key={i} delay={i * .07}>
                <div style={{ background: 'var(--cream-0)', padding: '28px 26px', height: '100%' }}>
                  <div style={{ fontSize: '12.5px', color: 'var(--ink-4)', textDecoration: 'line-through', lineHeight: 1.5, marginBottom: '14px' }}>{item.before}</div>
                  <div style={{ width: '18px', height: '1px', background: 'var(--gold)', marginBottom: '12px', opacity: .6 }} />
                  <div style={{ fontSize: '13.5px', color: 'var(--ink-1)', lineHeight: 1.6, fontWeight: 500 }}>{item.after}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features — 3 workflow pillars ───────────────────────────────── */}
      <section id="features" style={{ padding: '112px 56px', background: 'var(--cream-1)' }}>
        <div style={{ maxWidth: '1160px', margin: '0 auto' }}>
          <Reveal>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', alignItems: 'end', marginBottom: '64px' }}>
              <h2 className="serif" style={{ fontSize: 'clamp(32px,3.6vw,46px)', fontWeight: 500, letterSpacing: '-1.6px', lineHeight: 1.1, color: 'var(--ink-0)' }}>
                Three things that change how you run the store.
              </h2>
              <p style={{ fontSize: '15.5px', color: 'var(--ink-2)', lineHeight: 1.72 }}>
                Import your data once. Know what changed today. Decide what to do next. That's the entire workflow — and it runs on whatever POS export you already have.
              </p>
            </div>
          </Reveal>

          {/* Big pillar — Import */}
          <Reveal delay={.05}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', background: 'white', border: '1px solid var(--cream-2)', borderRadius: '14px', overflow: 'hidden', marginBottom: '10px', boxShadow: 'var(--shadow-card)' }}>
              <div style={{ padding: '40px 40px', borderRight: '1px solid var(--cream-1)' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '16px' }}>01 · Import</div>
                <div className="serif" style={{ fontSize: '26px', fontWeight: 500, color: 'var(--ink-0)', letterSpacing: '-.6px', lineHeight: 1.2, marginBottom: '14px' }}>
                  Any POS export.<br />Mapped automatically.
                </div>
                <p style={{ fontSize: '14px', color: 'var(--ink-2)', lineHeight: 1.68 }}>
                  Upload a CSV from Apex, Verifone, Square, or a plain Excel sheet. The system reads your columns, understands your format, and maps everything — no manual configuration, no IT setup.
                </p>
              </div>
              {/* Mini import preview */}
              <div style={{ padding: '28px 28px', background: 'var(--cream-0)' }}>
                <div style={{ fontSize: '9.5px', fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.09em', marginBottom: '12px', fontFamily: 'monospace' }}>PBGrid_20260522.csv · 2,848 rows</div>
                {[
                  { src: 'Description', dst: 'product_name', conf: 99 },
                  { src: 'UPC', dst: 'upc', conf: 100 },
                  { src: 'Price', dst: 'sell_price', conf: 97 },
                  { src: 'Cost', dst: 'cost_price', conf: 94 },
                  { src: 'Margin', dst: 'margin_pct', conf: 98 },
                  { src: 'LastSalesDate', dst: 'last_sale_date', conf: 89 },
                ].map((r, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 20px 1fr 54px', gap: '4px', alignItems: 'center', padding: '5px 0', borderBottom: i < 5 ? '1px solid var(--cream-1)' : 'none' }}>
                    <div style={{ fontSize: '11px', color: 'var(--ink-2)', fontFamily: 'monospace' }}>{r.src}</div>
                    <div style={{ fontSize: '10px', color: 'var(--ink-4)', textAlign: 'center' }}>→</div>
                    <div style={{ fontSize: '11px', color: '#3556D4', fontFamily: 'monospace' }}>{r.dst}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ flex: 1, height: '2px', background: 'var(--cream-2)', borderRadius: '99px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${r.conf}%`, background: r.conf >= 95 ? '#1a7a52' : 'var(--gold)', borderRadius: '99px' }} />
                      </div>
                      <span style={{ fontSize: '9.5px', fontWeight: 700, color: r.conf >= 95 ? '#1a7a52' : 'var(--gold)' }}>{r.conf}%</span>
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: '10px', padding: '8px 10px', background: 'rgba(26,122,82,.06)', border: '1px solid rgba(26,122,82,.14)', borderRadius: '6px', fontSize: '11px', color: 'var(--ink-2)' }}>
                  2,848 products mapped · 3.1 seconds · 0 corrections needed
                </div>
              </div>
            </div>
          </Reveal>

          {/* Two smaller pillars */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[
              {
                n: '02 · Detect',
                title: 'Know what changed today.',
                body: 'Cross-references purchases against movement to surface stock discrepancies. Flags which items to count before month-end — not after.',
                rows: [
                  { name: 'Marlboro Red Box', qty: -7, s: 'critical' },
                  { name: 'Monster Energy 16oz', qty: -3, s: 'critical' },
                  { name: 'Newport Box', qty: 2, s: 'low' },
                  { name: 'Coca Cola 20oz', qty: 142, s: 'ok' },
                ],
              },
              {
                n: '03 · Decide',
                title: 'Know what to do next.',
                body: 'Demand forecasts, reorder timelines, and staffing recommendations based on your actual sales patterns. Not generic advice — your store.',
                rows: [
                  { name: 'Red Bull 12oz', action: 'Order 48 units · due Friday', c: 'var(--gold)' },
                  { name: 'Monster 16oz', action: 'Reorder point hit · McLane', c: 'var(--gold)' },
                  { name: 'Monday staffing', action: '1 staff sufficient · save $80', c: '#1a7a52' },
                  { name: 'Friday staffing', action: '2 staff · peak day confirmed', c: 'var(--ink-2)' },
                ],
              },
            ].map((p, pi) => (
              <Reveal key={pi} delay={pi * .08}>
                <div style={{ background: 'white', border: '1px solid var(--cream-2)', borderRadius: '14px', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
                  <div style={{ padding: '28px 28px 20px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '12px' }}>{p.n}</div>
                    <div className="serif" style={{ fontSize: '20px', fontWeight: 500, color: 'var(--ink-0)', letterSpacing: '-.4px', lineHeight: 1.2, marginBottom: '10px' }}>{p.title}</div>
                    <p style={{ fontSize: '13.5px', color: 'var(--ink-2)', lineHeight: 1.65 }}>{p.body}</p>
                  </div>
                  <div style={{ padding: '0 28px 24px' }}>
                    {p.rows.map((r, i) => (
                      <div key={i} className="dash-row">
                        <div style={{ fontSize: '12px', color: 'var(--ink-1)', fontWeight: 500 }}>{r.name}</div>
                        {'qty' in r ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className="serif" style={{ fontSize: '13px', fontWeight: 500, color: r.s === 'critical' ? 'var(--danger)' : r.s === 'low' ? 'var(--gold)' : '#1a7a52' }}>
                              {r.qty > 0 ? '+' : ''}{r.qty}
                            </span>
                            {r.s !== 'ok' && <span style={{ fontSize: '8.5px', fontWeight: 700, padding: '1px 5px', borderRadius: '3px', background: r.s === 'critical' ? 'rgba(184,58,42,.08)' : 'var(--gold-pale)', color: r.s === 'critical' ? 'var(--danger)' : 'var(--gold)', textTransform: 'uppercase' }}>{r.s}</span>}
                          </div>
                        ) : (
                          <div style={{ fontSize: '11px', color: r.c, fontWeight: 500 }}>{r.action}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials — warm cream, editorial ─────────────────────────── */}
      <section id="testimonials" style={{ padding: '112px 56px', background: 'var(--cream-0)' }}>
        <div style={{ maxWidth: '1160px', margin: '0 auto' }}>
          <Reveal>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '80px', alignItems: 'start', marginBottom: '56px' }}>
              <div>
                <div style={{ width: '28px', height: '1px', background: 'var(--gold)', marginBottom: '18px', opacity: .7 }} />
                <h2 className="serif" style={{ fontSize: 'clamp(30px,3.2vw,42px)', fontWeight: 500, letterSpacing: '-1.5px', lineHeight: 1.1, color: 'var(--ink-0)' }}>
                  From the<br />operators<br />
                  <em style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--ink-2)' }}>using it.</em>
                </h2>
              </div>
              <p style={{ fontSize: '16px', color: 'var(--ink-2)', lineHeight: 1.75, paddingTop: '8px', maxWidth: '480px' }}>
                Independent convenience and gas station operators across Colorado. Real operations, real numbers.
              </p>
            </div>
          </Reveal>

          {/* Featured quote */}
          <Reveal delay={.05}>
            <div style={{ padding: '40px 44px', background: 'white', border: '1px solid var(--cream-2)', borderRadius: '16px', marginBottom: '10px', boxShadow: 'var(--shadow-card)', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '36px', right: '44px', display: 'flex', gap: '3px' }}>
                {[...Array(5)].map((_,i) => <span key={i} style={{ color: 'var(--gold)', fontSize: '12px' }}>★</span>)}
              </div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '.09em', marginBottom: '18px' }}>Featured operator</div>
              <blockquote className="serif" style={{ fontSize: 'clamp(17px,2vw,24px)', fontWeight: 400, fontStyle: 'italic', color: 'var(--ink-1)', lineHeight: 1.55, letterSpacing: '-.3px', maxWidth: '740px', marginBottom: '24px' }}>
                "We used to find out about shrinkage during the monthly count. Now we get flagged the same day. Caught $800 in cigarette discrepancies in the first two weeks alone."
              </blockquote>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '99px', background: 'var(--gold-pale)', border: '1px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gold)' }}>M</span>
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink-0)' }}>Marcus T.</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--ink-3)', marginTop: '1px' }}>Owner · Shell Station · Denver, CO · 3 locations</div>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Three smaller */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
            {[
              { q: 'The staffing recommendations alone pay for the software. Monday and Tuesday only need one person. That\'s $160 a week back.', name: 'Sandra K.', title: 'BP Convenience · Fort Collins', init: 'S' },
              { q: '2,400 products mapped automatically in three minutes. Didn\'t change a single column. That alone would have taken me a full day.', name: 'Raj P.', title: 'Circle K Franchise · Aurora', init: 'R' },
              { q: 'I finally know which products are making money and which are just taking up shelf space. Changed how I think about ordering.', name: 'Carlos M.', title: 'Speedy Stop · Colorado Springs', init: 'C' },
            ].map((t, i) => (
              <Reveal key={i} delay={i * .07}>
                <div className="tcard">
                  <div style={{ display: 'flex', gap: '3px', marginBottom: '14px' }}>
                    {[...Array(5)].map((_,j) => <span key={j} style={{ color: 'var(--gold)', fontSize: '11px' }}>★</span>)}
                  </div>
                  <p style={{ fontSize: '13.5px', color: 'var(--ink-2)', lineHeight: 1.68, fontStyle: 'italic', marginBottom: '18px' }}>"{t.q}"</p>
                  <div style={{ paddingTop: '14px', borderTop: '1px solid var(--cream-2)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '99px', background: 'var(--gold-pale)', border: '1px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--gold)' }}>{t.init}</span>
                    </div>
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--ink-0)' }}>{t.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--ink-3)', marginTop: '1px' }}>{t.title}</div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: '112px 56px', background: 'var(--cream-1)' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <Reveal>
            <div style={{ marginBottom: '56px' }}>
              <div style={{ width: '28px', height: '1px', background: 'var(--gold)', marginBottom: '18px', opacity: .7 }} />
              <h2 className="serif" style={{ fontSize: 'clamp(32px,3.8vw,50px)', fontWeight: 500, letterSpacing: '-1.8px', lineHeight: 1.06, color: 'var(--ink-0)', marginBottom: '14px' }}>
                Pays for itself in the first week.
              </h2>
              <p style={{ fontSize: '16px', color: 'var(--ink-2)', maxWidth: '460px', lineHeight: 1.7 }}>
                One avoided stockout and one saved labor shift cover the subscription. Shrinkage reduction is on top of that.
              </p>
            </div>
          </Reveal>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr 1fr', gap: '10px', alignItems: 'start' }}>
            {[
              {
                name: 'Starter', price: 49,
                note: 'Single location. Full inventory intelligence from day one.',
                features: ['1 location · up to 3,000 SKUs', 'Pricebook + purchase import', 'Shrinkage alerts', 'Demand forecast', 'Email support'],
                featured: false,
              },
              {
                name: 'Operator', price: 99,
                note: 'The complete suite for operators serious about margins.',
                features: ['Up to 3 locations · unlimited SKUs', 'Full demand forecasting', 'Product segmentation', 'Shift planner + labor optimization', 'Purchase order tracking', 'Priority support'],
                featured: true,
              },
              {
                name: 'Multi-Store', price: 199,
                note: 'Multi-location groups and franchise operators.',
                features: ['Unlimited locations', 'Custom model training', 'API access', 'White-label option', 'Dedicated onboarding'],
                featured: false,
              },
            ].map((p, i) => (
              <Reveal key={i} delay={i * .08}>
                <div className={`pcol${p.featured ? ' featured' : ''}`} style={{ position: 'relative' }}>
                  {p.featured && (
                    <div style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', padding: '3px 12px', background: 'var(--gold)', borderRadius: '99px', fontSize: '9.5px', fontWeight: 700, color: 'white', letterSpacing: '.07em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      Most chosen
                    </div>
                  )}
                  <div style={{ fontSize: '11px', fontWeight: 700, color: p.featured ? 'var(--gold)' : 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.09em', marginBottom: '10px' }}>{p.name}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', marginBottom: '8px' }}>
                    <span className="serif" style={{ fontSize: p.featured ? '48px' : '42px', fontWeight: 500, color: 'var(--ink-0)', letterSpacing: '-2px', lineHeight: 1 }}>${p.price}</span>
                    <span style={{ fontSize: '13px', color: 'var(--ink-3)' }}>/mo</span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: '20px' }}>{p.note}</div>
                  <div style={{ height: '1px', background: 'var(--cream-2)', marginBottom: '18px' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginBottom: '24px' }}>
                    {p.features.map((f, j) => (
                      <div key={j} style={{ display: 'flex', gap: '8px' }}>
                        <span style={{ color: p.featured ? 'var(--gold)' : 'var(--ink-4)', fontSize: '11px', marginTop: '2px', flexShrink: 0 }}>✓</span>
                        <span style={{ fontSize: '13px', color: 'var(--ink-2)', lineHeight: 1.5 }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <Link to="/register" style={{
                    display: 'block', textAlign: 'center', padding: '11px',
                    background: p.featured ? 'var(--gold)' : 'transparent',
                    border: p.featured ? 'none' : '1px solid var(--cream-3)',
                    borderRadius: '8px', color: p.featured ? 'white' : 'var(--ink-2)',
                    fontSize: '13.5px', fontWeight: p.featured ? 600 : 400,
                    textDecoration: 'none', transition: 'all .18s ease',
                  }}>
                    Start free trial
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={.2}>
            <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: 'var(--ink-4)' }}>
              14-day free trial · No credit card required · Cancel anytime
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section style={{ padding: '120px 56px', background: 'var(--cream-0)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '500px', height: '300px', background: 'radial-gradient(ellipse,rgba(176,125,58,.07) 0%,transparent 70%)', pointerEvents: 'none' }} />
        <Reveal>
          <div style={{ maxWidth: '560px', margin: '0 auto', textAlign: 'center', position: 'relative' }}>
            <div style={{ width: '28px', height: '1px', background: 'var(--gold)', margin: '0 auto 22px', opacity: .7 }} />
            <h2 className="serif" style={{ fontSize: 'clamp(34px,4vw,52px)', fontWeight: 500, letterSpacing: '-2px', lineHeight: 1.05, color: 'var(--ink-0)', marginBottom: '16px' }}>
              Your store's data is already<br />
              <em style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--gold)' }}>telling a story.</em>
            </h2>
            <p style={{ fontSize: '16px', color: 'var(--ink-2)', lineHeight: 1.72, marginBottom: '34px' }}>
              Upload your pricebook and see your first insights in under five minutes.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <Link to="/register" className="btn-gold" style={{ fontSize: '15px', padding: '14px 36px' }}>Start free trial</Link>
              <Link to="/login" className="btn-outline" style={{ fontSize: '15px', padding: '14px 24px' }}>Sign in →</Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer style={{ background: 'var(--cream-1)', borderTop: '1px solid var(--cream-2)', padding: '64px 56px 36px' }}>
        <div style={{ maxWidth: '1160px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '56px', marginBottom: '56px' }}>

            {/* Brand */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <div style={{ width: '24px', height: '24px', background: 'linear-gradient(140deg,#b07d3a,#7a5420)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#fff' }}>◈</div>
                <span className="serif" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink-0)' }}>Retail Samadhan</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--ink-3)', lineHeight: 1.68, maxWidth: '260px', marginBottom: '18px' }}>
                Operational intelligence for gas stations and convenience stores. Built for independent operators.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '5px', height: '5px', borderRadius: '99px', background: '#1a7a52' }} />
                <span style={{ fontSize: '11.5px', color: 'var(--ink-4)' }}>Greeley, Colorado · Est. 2026</span>
              </div>
            </div>

            {/* Product */}
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '14px' }}>Product</div>
              {['Dashboard', 'Import Center', 'Inventory', 'Alerts', 'Demand Forecast', 'Segmentation', 'Shift Planner'].map(l => (
                <div key={l} style={{ marginBottom: '9px' }}>
                  <Link to="/register" className="footer-link">{l}</Link>
                </div>
              ))}
            </div>

            {/* For */}
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '14px' }}>For Operators</div>
              {['Gas Stations', 'Convenience Stores', 'Liquor Stores', 'Multi-Location Groups', 'Franchise Operators', 'Independent Owners'].map(l => (
                <div key={l} style={{ marginBottom: '9px' }}>
                  <span style={{ fontSize: '12.5px', color: 'var(--ink-3)' }}>{l}</span>
                </div>
              ))}
            </div>

            {/* Integrations */}
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '14px' }}>Integrations</div>
              {['Verifone Commander', 'Gilbarco Passport', 'Apex POS', 'McLane EDI', 'Sam\'s Club', 'Square', 'Any CSV format'].map(l => (
                <div key={l} style={{ marginBottom: '9px' }}>
                  <span style={{ fontSize: '12.5px', color: 'var(--ink-3)' }}>{l}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--cream-2)', paddingTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '12px', color: 'var(--ink-4)' }}>© 2026 Retail Samadhan · All rights reserved</div>
            <div style={{ display: 'flex', gap: '20px' }}>
              {['Privacy', 'Terms', 'Contact'].map(l => (
                <span key={l} style={{ fontSize: '12px', color: 'var(--ink-4)', cursor: 'pointer' }}>{l}</span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <Link to="/login" className="footer-link">Sign in</Link>
              <Link to="/register" style={{ fontSize: '12.5px', color: 'var(--gold)', textDecoration: 'none', fontWeight: 600 }}>Get started →</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}