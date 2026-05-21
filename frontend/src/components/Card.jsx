export default function Card({ children, style = {} }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: 'var(--shadow-sm)',
      border: '1px solid var(--border-light)',
      ...style,
    }}>
      {children}
    </div>
  )
}