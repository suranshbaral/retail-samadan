import { Check } from 'lucide-react'
import { Link } from 'react-router-dom'

const plans = [
  {
    name: 'Starter',
    price: '$149',
    sub: 'per month',
    desc: 'For one independent gas station.',
    stores: '1 gas station',
    features: [
      'AI CSV import',
      'Inventory dashboard',
      'Demand forecasting',
      'Shrinkage alerts',
      'Product segmentation',
    ],
  },
  {
    name: 'Growth',
    price: '$399',
    sub: 'per month',
    desc: 'For growing operators with multiple locations.',
    stores: 'Up to 3 gas stations',
    popular: true,
    features: [
      'Everything in Starter',
      'Multi-location dashboard',
      'Supplier insights',
      'Labor intelligence ready',
      'Priority onboarding',
    ],
  },
  {
    name: 'Enterprise',
    price: '$999+',
    sub: 'per month',
    desc: 'For chains and serious operators.',
    stores: 'Unlimited gas stations',
    features: [
      'Everything in Growth',
      'Unlimited locations',
      'Custom integrations',
      'Advanced reporting',
      'Dedicated support',
    ],
  },
]

export default function PricingSection() {
  return (
    <section id="pricing" className="landing-section pricing-section">
      <div className="section-heading">
        <span>Pricing</span>
        <h2>Simple pricing for serious operators.</h2>
        <p>Start with one store. Scale when the system proves value.</p>
      </div>

      <div className="pricing-grid">
        {plans.map((plan) => (
          <div className={`pricing-card ${plan.popular ? 'popular' : ''}`} key={plan.name}>
            {plan.popular && <div className="popular-badge">Most Popular</div>}
            <h3>{plan.name}</h3>
            <p className="plan-desc">{plan.desc}</p>

            <div className="plan-price">
              {plan.price}
              <span>{plan.sub}</span>
            </div>

            <div className="plan-stores">{plan.stores}</div>

            <ul>
              {plan.features.map((f) => (
                <li key={f}>
                  <Check size={15} />
                  {f}
                </li>
              ))}
            </ul>

            <Link to="/signup" className={plan.popular ? 'pricing-btn primary' : 'pricing-btn'}>
              Choose Plan
            </Link>
          </div>
        ))}
      </div>
    </section>
  )
}