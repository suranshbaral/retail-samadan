import { Link } from 'react-router-dom'
import { Sparkles, Upload, BarChart3, ShieldAlert } from 'lucide-react'

export default function HeroSection() {
  return (
    <section className="hero-section">
      <div className="hero-badge">
        <Sparkles size={15} />
        AI-powered retail intelligence for gas stations
      </div>

      <h1>
        Turn messy POS data into clear retail decisions.
      </h1>

      <p>
        Retail Samadan helps gas stations upload CSVs, map columns with AI,
        track inventory, forecast demand, detect shrinkage, and understand what
        products are actually driving profit.
      </p>

      <div className="hero-actions">
        <Link to="/signup" className="hero-primary">Start Free Demo</Link>
        <Link to="/login" className="hero-secondary">View Dashboard</Link>
      </div>

      <div className="hero-preview">
        <div className="preview-card large">
          <div className="preview-header">
            <Upload size={18} />
            AI Import Center
          </div>
          <div className="mapping-row"><span>UPC Code</span><strong>upc</strong></div>
          <div className="mapping-row"><span>Retail Price</span><strong>sell_price</strong></div>
          <div className="mapping-row"><span>Vendor</span><strong>supplier</strong></div>
        </div>

        <div className="preview-card">
          <BarChart3 size={22} />
          <h4>$94.47</h4>
          <p>7-day forecast revenue</p>
        </div>

        <div className="preview-card">
          <ShieldAlert size={22} />
          <h4>2 Alerts</h4>
          <p>Inventory anomalies detected</p>
        </div>
      </div>
    </section>
  )
}