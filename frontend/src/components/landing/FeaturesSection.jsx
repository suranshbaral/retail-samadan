import { UploadCloud, Boxes, TrendingUp, Radar, Tags, Brain } from 'lucide-react'

const features = [
  {
    icon: UploadCloud,
    title: 'AI CSV Import',
    desc: 'Upload sales, purchases, inventory, or pricebook files. AI maps messy columns automatically.',
  },
  {
    icon: Boxes,
    title: 'Inventory Intelligence',
    desc: 'Track expected inventory using purchases, sales, and manual counts.',
  },
  {
    icon: TrendingUp,
    title: 'Demand Forecasting',
    desc: 'Predict product demand and reorder needs before shelves run low.',
  },
  {
    icon: Radar,
    title: 'Shrinkage Alerts',
    desc: 'Catch suspicious inventory movement and know what to count today.',
  },
  {
    icon: Tags,
    title: 'Product Segmentation',
    desc: 'Classify products as Stars, Cash Cows, Volume Movers, Dogs, or No Sales.',
  },
  {
    icon: Brain,
    title: 'AI Store Insights',
    desc: 'Get simple recommendations instead of staring at raw reports.',
  },
]

export default function FeaturesSection() {
  return (
    <section id="features" className="landing-section">
      <div className="section-heading">
        <span>Features</span>
        <h2>Built for real gas station operations.</h2>
        <p>Not just charts. Actual decisions for inventory, sales, and profit.</p>
      </div>

      <div className="features-grid">
        {features.map((f) => (
          <div className="feature-card" key={f.title}>
            <div className="feature-icon">
              <f.icon size={22} />
            </div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}