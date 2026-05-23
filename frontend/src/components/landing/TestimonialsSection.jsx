const testimonials = [
  {
    quote: 'Before this, I was guessing what to order. Now I can see what actually moves and what is sitting.',
    name: 'Gas Station Owner',
    role: 'Independent operator',
  },
  {
    quote: 'The AI import is the best part. I do not want to clean spreadsheets manually every week.',
    name: 'Store Manager',
    role: 'Convenience retail',
  },
  {
    quote: 'Inventory alerts and forecast numbers make this feel more useful than a normal dashboard.',
    name: 'Multi-store Operator',
    role: 'Fuel + convenience',
  },
]

export default function TestimonialsSection() {
  return (
    <section id="testimonials" className="landing-section testimonials-section">
      <div className="section-heading">
        <span>Testimonials</span>
        <h2>Designed around real retail pain.</h2>
        <p>Built for owners who want answers, not spreadsheets.</p>
      </div>

      <div className="testimonials-grid">
        {testimonials.map((t) => (
          <div className="testimonial-card" key={t.name}>
            <p>“{t.quote}”</p>
            <div>
              <strong>{t.name}</strong>
              <span>{t.role}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}