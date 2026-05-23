import '../styles/landing.css'
import LandingNavbar from '../components/landing/LandingNavbar'
import HeroSection from '../components/landing/HeroSection'
import FeaturesSection from '../components/landing/FeaturesSection'
import PricingSection from '../components/landing/PricingSection'
import TestimonialsSection from '../components/landing/TestimonialsSection'
import CTASection from '../components/landing/CTASection'
import LandingFooter from '../components/landing/LandingFooter'

export default function LandingPage() {
  return (
    <div className="landing-page">
      <LandingNavbar />
      <HeroSection />
      <FeaturesSection />
      <PricingSection />
      <TestimonialsSection />
      <CTASection />
      <LandingFooter />
    </div>
  )
}