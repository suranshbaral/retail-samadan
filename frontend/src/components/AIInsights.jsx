import { useState, useEffect } from 'react'
import { Sparkles, TrendingUp, TrendingDown, AlertTriangle, Package, DollarSign } from 'lucide-react'

function generateInsights(dashData, alerts, segData) {
  const insights = []

  if (!dashData) return insights

  const summary = dashData.summary || {}
  const topProducts = dashData.top_products || []
  const slowMovers = dashData.slow_movers || []

  // Revenue insight
  if (summary.total_revenue > 0) {
    insights.push({
      type: 'positive',
      icon: DollarSign,
      title: 'Revenue Overview',
      message: `Your store generated $${parseFloat(summary.total_revenue).toFixed(2)} in the last 30 days with a ${summary.margin_pct}% gross margin.`,
    })
  }

  // Top product insight
  if (topProducts.length > 0) {
    const top = topProducts[0]
    if (top.product__name) {
      insights.push({
        type: 'positive',
        icon: TrendingUp,
        title: 'Top Performer',
        message: `${top.product__name} is your best seller — $${parseFloat(top.revenue).toFixed(2)} revenue with ${parseFloat(top.units).toFixed(0)} units moved.`,
      })
    }
  }

  // Shrinkage alerts
  if (alerts.length > 0) {
    alerts.forEach(alert => {
      insights.push({
        type: 'critical',
        icon: AlertTriangle,
        title: 'Inventory Anomaly Detected',
        message: `${alert.product} stock is unusually low compared to recent sales velocity. Expected ${alert.expected_quantity} units — count this item today.`,
      })
    })
  }

  // Slow movers
  if (slowMovers.length > 0) {
    const slow = slowMovers[0]
    if (slow.product__name) {
      insights.push({
        type: 'warning',
        icon: TrendingDown,
        title: 'Slow Mover Alert',
        message: `${slow.product__name} has only sold ${parseFloat(slow.units).toFixed(0)} units this month. Consider repositioning or running a promotion.`,
      })
    }
  }

  // Segmentation insights
  if (segData) {
    if (segData.no_sales?.length > 0) {
      insights.push({
        type: 'warning',
        icon: Package,
        title: 'Dead Stock Detected',
        message: `${segData.no_sales.length} products have zero sales in the last 30 days. Review shelf space allocation.`,
      })
    }
    if (segData.stars?.length > 0) {
      insights.push({
        type: 'positive',
        icon: Sparkles,
        title: 'Star Products',
        message: `You have ${segData.stars.length} star products driving most of your revenue. Keep them well stocked at all times.`,
      })
    }
  }

  return insights.slice(0, 5)
}

const typeStyles = {
  positive: { bg: '#f0fdf4', border: '#bbf7d0', dot: '#10b981', label: 'Insight' },
  warning: { bg: '#fffbeb', border: '#fde68a', dot: '#f59e0b', label: 'Warning' },
  critical: { bg: '#fef2f2', border: '#fecaca', dot: '#ef4444', label: 'Alert' },
}

export default function AIInsights({ dashData, alerts, segData }) {
  const [insights, setInsights] = useState([])
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (dashData) {
      const generated = generateInsights(dashData, alerts, segData)
      setInsights(generated)
      setTimeout(() => setVisible(true), 100)
    }
  }, [dashData, alerts, segData])

  if (!insights.length) return null

  return (
    <div className="card fade-up" style={{ padding: '24px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
        <div style={{ width: '28px', height: '28px', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sparkles size={14} color="white" />
        </div>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans' }}>
            AI Insights
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Powered by Retail Samadhan Intelligence
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {insights.map((insight, i) => {
          const s = typeStyles[insight.type]
          const Icon = insight.icon
          return (
            <div
              key={i}
              style={{
                background: s.bg,
                border: `1px solid ${s.border}`,
                borderRadius: '10px',
                padding: '12px 14px',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(8px)',
                transition: `all 0.3s ease ${i * 0.08}s`,
              }}
            >
              <div style={{ width: '8px', height: '8px', borderRadius: '99px', background: s.dot, marginTop: '5px', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>
                  {insight.title}
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {insight.message}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}