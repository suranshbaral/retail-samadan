import Sidebar from './Sidebar'
import { Outlet } from 'react-router-dom'

export default function Layout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{
        marginLeft: '220px',
        flex: 1,
        padding: '32px 36px',
        minHeight: '100vh',
        background: 'var(--bg-primary)',
      }}>
        <Outlet />
      </main>
    </div>
  )
}