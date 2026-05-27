"""
K-Means Product Segmentation Engine
--------------------------------------
Proprietary clustering pipeline for retail SKU classification.
Feature engineering, cluster labeling methodology, and optimal-K
selection approach are confidential to Retail Samadhan.

Production model replaces quadrant-based baseline segmentation
when sufficient transaction data is available per location.

Interfaces: kmeans_segment_products() — drop-in replacement for
            core/services/segmentation.py
"""
import numpy as np
from django.utils import timezone
from datetime import timedelta

try:
    from sklearn.cluster import KMeans
    from sklearn.preprocessing import StandardScaler
    from sklearn.metrics import silhouette_score
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False


# ─── Segment labels — mapped from cluster centroids ───────────────────────────
SEGMENT_LABELS = {
    'high_revenue_high_velocity': {
        'name': 'Star',
        'emoji': '⭐',
        'action': 'Keep well stocked. These drive your business.',
        'color': '#2563eb',
    },
    'high_revenue_low_velocity': {
        'name': 'Cash Cow',
        'emoji': '💰',
        'action': 'Protect margins. High value, low volume.',
        'color': '#10b981',
    },
    'low_revenue_high_velocity': {
        'name': 'Volume Mover',
        'emoji': '📦',
        'action': 'Check margins. Fast moving but low revenue.',
        'color': '#f59e0b',
    },
    'low_revenue_low_velocity': {
        'name': 'Dog',
        'emoji': '🐢',
        'action': 'Consider dropping or repositioning.',
        'color': '#ef4444',
    },
}


# ─── Feature engineering ──────────────────────────────────────────────────────
def extract_product_features(location, days: int = 30) -> list:
    """
    Extract features for each product at a location.
    
    Features used for clustering:
        - total_revenue: Revenue in period
        - total_qty: Units sold in period  
        - avg_daily_revenue: Revenue smoothed by days
        - avg_daily_qty: Velocity smoothed by days
        - margin_pct: Gross margin percentage
        - days_with_sales: How consistently the product sells
        - revenue_trend: Revenue growth rate (last 15 vs first 15 days)
    
    More features = better cluster separation. Add more as data grows.
    """
    from django.db.models import Sum, Count, Avg
    from django.db.models.functions import TruncDay
    from core.models import SaleLineItem, PricebookItem

    since = timezone.now() - timedelta(days=days)

    sales = (
        SaleLineItem.objects
        .filter(
            transaction__location=location,
            transaction__sold_at__gte=since,
        )
        .values('product__id', 'product__name', 'product__upc')
        .annotate(
            total_revenue=Sum('total_amount'),
            total_qty=Sum('quantity'),
            total_cost=Sum('cost_price'),
            transaction_count=Count('transaction', distinct=True),
        )
    )

    pricebook = {
        str(item.product_id): item
        for item in PricebookItem.objects.filter(
            location=location, is_active=True
        ).select_related('product')
    }

    features = []
    for s in sales:
        revenue = float(s['total_revenue'] or 0)
        qty = float(s['total_qty'] or 0)
        cost = float(s['total_cost'] or 0)
        margin = ((revenue - cost) / revenue * 100) if revenue > 0 else 0
        pb = pricebook.get(str(s['product__id']))

        features.append({
            'product_id': str(s['product__id']),
            'product_name': s['product__name'],
            'upc': s['product__upc'],
            'sell_price': float(pb.sell_price) if pb else 0,

            # Features for clustering
            'total_revenue': revenue,
            'total_qty': qty,
            'avg_daily_revenue': revenue / days,
            'avg_daily_qty': qty / days,
            'margin_pct': margin,
            'transaction_count': s['transaction_count'],
            'revenue_per_unit': revenue / qty if qty > 0 else 0,
        })

    return features


# ─── Optimal K detection ──────────────────────────────────────────────────────
def find_optimal_k(feature_matrix: np.ndarray, k_range: range = range(2, 8)) -> int:
    """
    Find optimal number of clusters using silhouette score.
    
    Silhouette score measures how well each point fits its cluster
    vs neighboring clusters. Score range: [-1, 1], higher is better.
    
    In practice, gas station products tend to cluster into 4-6 natural groups.
    We search k=2 to k=7 and pick the best silhouette score.
    """
    if len(feature_matrix) < 8:
        return 4  # Not enough products to evaluate — default to 4

    best_k, best_score = 4, -1

    for k in k_range:
        if k >= len(feature_matrix):
            break
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = kmeans.fit_predict(feature_matrix)
        score = silhouette_score(feature_matrix, labels)
        if score > best_score:
            best_score = score
            best_k = k

    return best_k


# ─── Cluster labeling ─────────────────────────────────────────────────────────
def label_clusters(kmeans_model, scaler, k: int) -> dict:
    """
    Map cluster IDs to human-readable segment names.
    
    Uses centroid positions in original (unscaled) space to
    determine which cluster is "high revenue + high velocity" etc.
    
    Returns: {cluster_id: segment_label}
    """
    # Inverse transform centroids to original scale
    centroids = scaler.inverse_transform(kmeans_model.cluster_centers_)

    # Centroid columns: [total_revenue, total_qty, margin_pct, ...]
    revenue_col = 0
    qty_col = 1

    median_revenue = np.median(centroids[:, revenue_col])
    median_qty = np.median(centroids[:, qty_col])

    labels = {}
    for cluster_id, centroid in enumerate(centroids):
        high_rev = centroid[revenue_col] >= median_revenue
        high_qty = centroid[qty_col] >= median_qty

        if high_rev and high_qty:
            labels[cluster_id] = 'high_revenue_high_velocity'
        elif high_rev and not high_qty:
            labels[cluster_id] = 'high_revenue_low_velocity'
        elif not high_rev and high_qty:
            labels[cluster_id] = 'low_revenue_high_velocity'
        else:
            labels[cluster_id] = 'low_revenue_low_velocity'

    return labels


# ─── Main segmentation function ───────────────────────────────────────────────
def kmeans_segment_products(location, days: int = 30) -> dict:
    """
    Main entry point. Segments all products using K-means clustering.
    
    Falls back to quadrant segmentation if:
    - scikit-learn not installed
    - Fewer than 10 products have sales data
    
    Args:
        location: Location model instance
        days: Analysis window in days
    
    Returns:
        dict with segments, cluster info, and fallback indicator
    """
    if not SKLEARN_AVAILABLE:
        from core.services.segmentation import segment_products
        result = segment_products(location, days)
        result['method'] = 'quadrant_fallback'
        result['reason'] = 'scikit-learn not installed'
        return result

    product_features = extract_product_features(location, days)

    if len(product_features) < 10:
        from core.services.segmentation import segment_products
        result = segment_products(location, days)
        result['method'] = 'quadrant_fallback'
        result['reason'] = f'Only {len(product_features)} products with sales — need 10+'
        return result

    # Build feature matrix
    feature_cols = ['total_revenue', 'total_qty', 'margin_pct', 'avg_daily_qty', 'revenue_per_unit']
    matrix = np.array([[p[col] for col in feature_cols] for p in product_features])

    # Normalize features
    scaler = StandardScaler()
    matrix_scaled = scaler.fit_transform(matrix)

    # Find optimal K
    optimal_k = find_optimal_k(matrix_scaled)

    # Fit K-means
    kmeans = KMeans(n_clusters=optimal_k, random_state=42, n_init=10)
    cluster_ids = kmeans.fit_predict(matrix_scaled)

    # Label clusters
    cluster_labels = label_clusters(kmeans, scaler, optimal_k)

    # Compute silhouette score
    sil_score = silhouette_score(matrix_scaled, cluster_ids) if optimal_k > 1 else 0

    # Group products by segment
    segments = {key: [] for key in SEGMENT_LABELS}

    for i, product in enumerate(product_features):
        cluster_id = int(cluster_ids[i])
        segment_key = cluster_labels.get(cluster_id, 'low_revenue_low_velocity')
        segment_info = SEGMENT_LABELS[segment_key]

        segments[segment_key].append({
            **product,
            'cluster_id': cluster_id,
            'segment': segment_info['name'],
            'emoji': segment_info['emoji'],
            'action': segment_info['action'],
            'color': segment_info['color'],
        })

    # Sort each segment by revenue
    for key in segments:
        segments[key].sort(key=lambda x: x['total_revenue'], reverse=True)

    return {
        'method': 'kmeans',
        'optimal_k': optimal_k,
        'silhouette_score': round(float(sil_score), 3),
        'products_analyzed': len(product_features),
        'period_days': days,
        'stars': segments['high_revenue_high_velocity'],
        'cash_cows': segments['high_revenue_low_velocity'],
        'volume_movers': segments['low_revenue_high_velocity'],
        'dogs': segments['low_revenue_low_velocity'],
        'summary': {
            'stars': len(segments['high_revenue_high_velocity']),
            'cash_cows': len(segments['high_revenue_low_velocity']),
            'volume_movers': len(segments['low_revenue_high_velocity']),
            'dogs': len(segments['low_revenue_low_velocity']),
        },
        'cluster_info': {
            'n_clusters': optimal_k,
            'silhouette_score': round(float(sil_score), 3),
            'feature_columns': feature_cols,
        }
    }