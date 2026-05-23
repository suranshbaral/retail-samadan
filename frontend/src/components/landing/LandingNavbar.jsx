import { Link } from 'react-router-dom'

export default function LandingNavbar() {
  return (
    <nav className="landing-nav">
      <Link to="/" className="landing-logo">
        <span>Retail</span> Samadan
      </Link>

      <div className="landing-nav-links">
        <a href="#features">Features</a>
        <a href="#pricing">Pricing</a>
        <a href="#testimonials">Testimonials</a>
      </div>

      <div className="landing-nav-actions">
        <Link to="/login" className="nav-login">Login</Link>
        <Link to="/signup" className="nav-cta">Get Started</Link>
      </div>
    </nav>
  )
}