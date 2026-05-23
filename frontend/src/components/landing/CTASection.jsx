import { Link } from 'react-router-dom'

export default function CTASection() {
  return (
    <section className="cta-section">
      <h2>Ready to turn your store data into decisions?</h2>
      <p>
        Upload your pricebook, sales, and purchase data. Retail Samadan will help you understand inventory, demand, and profit.
      </p>

      <div className="hero-actions">
        <Link to="/signup" className="hero-primary">Start Free Demo</Link>
        <Link to="/login" className="hero-secondary">Login</Link>
      </div>
    </section>
  )
}