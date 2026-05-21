import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import Inventory from './pages/Inventory'
import Alerts from './pages/Alerts'
import Forecast from './pages/Forecast'
import Segmentation from './pages/Segmentation'
import Staffing from './pages/Staffing'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="upload" element={<Upload />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="forecast" element={<Forecast />} />
          <Route path="segmentation" element={<Segmentation />} />
          <Route path="staffing" element={<Staffing />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}