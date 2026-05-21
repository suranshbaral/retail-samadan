import numpy as np
from django.db.models import Sum, Count, Avg, Max
from django.utils import timezone
from datetime import timedelta

from core.models import SaleLineItem, SaleTransaction, Location, PricebookItem


def get_product_sales_matrix(location: Location, days: int = 30) -> dict:
    """
    Build a product performance matrix for segmentation.
    Returns products segmented by revenue and velocity.
    """
    since = timezone.now() - timedelta(days=days)

    sales = (
        SaleLineItem.objects
        .filter(
            transaction__location=location,
            transaction__sold_at__gte=since,
        )
        .values('product__id', 'product__name', 'product__upc')
        .annotate(
            total_qty=Sum('quantity'),
            total_revenue=Sum('total_amount'),
            total_cost=Sum('cost_price'),
            transaction_count=Count('transaction', distinct=True),
        )
    )

    return list(sales)


def segment_products(location: Location, days: int = 30) -> dict:
    """
    Segment products into quadrants:
    
    HIGH revenue + HIGH velocity = STARS (promote these)
    HIGH revenue + LOW velocity  = CASH COWS (protect margins)
    LOW revenue  + HIGH velocity = VOLUME MOVERS (check margins)
    LOW revenue  + LOW velocity  = DOGS (consider dropping)
    
    This is your core insight for gas station owners.
    """
    sales_data = get_product_sales_matrix(location, days)

    if not sales_data:
        return {
            'stars': [],
            'cash_cows': [],
            'volume_movers': [],
            'dogs': [],
            'no_sales': [],
        }

    # Get all pricebook items for context
    pricebook = {
        str(item.product_id): item
        for item in PricebookItem.objects.filter(
            location=location,
            is_active=True
        ).select_related('product')
    }

    # Calculate medians for segmentation thresholds
    revenues = [float(s['total_revenue'] or 0) for s in sales_data]
    velocities = [float(s['total_qty'] or 0) for s in sales_data]

    median_revenue = float(np.median(revenues)) if revenues else 0
    median_velocity = float(np.median(velocities)) if velocities else 0

    stars = []
    cash_cows = []
    volume_movers = []
    dogs = []

    for s in sales_data:
        revenue = float(s['total_revenue'] or 0)
        qty = float(s['total_qty'] or 0)
        cost = float(s['total_cost'] or 0)
        gross_profit = revenue - cost
        margin = round((gross_profit / revenue * 100), 2) if revenue > 0 else 0

        pb = pricebook.get(str(s['product__id']))

        item = {
            'product_name': s['product__name'],
            'upc': s['product__upc'],
            'total_revenue': round(revenue, 2),
            'total_qty': round(qty, 2),
            'gross_profit': round(gross_profit, 2),
            'margin_pct': margin,
            'transaction_count': s['transaction_count'],
            'sell_price': float(pb.sell_price) if pb else 0,
            'cost_price': float(pb.cost_price) if pb else 0,
        }

        high_revenue = revenue >= median_revenue
        high_velocity = qty >= median_velocity

        if high_revenue and high_velocity:
            item['segment'] = 'star'
            item['action'] = 'Keep well stocked — this is your best performer'
            stars.append(item)
        elif high_revenue and not high_velocity:
            item['segment'] = 'cash_cow'
            item['action'] = 'Protect margins — high value, low volume'
            cash_cows.append(item)
        elif not high_revenue and high_velocity:
            item['segment'] = 'volume_mover'
            item['action'] = 'Check margins — selling fast but low revenue'
            volume_movers.append(item)
        else:
            item['segment'] = 'dog'
            item['action'] = 'Consider dropping or repositioning'
            dogs.append(item)

    # Products with no sales at all
    sold_product_ids = {str(s['product__id']) for s in sales_data}
    no_sales = [
        {
            'product_name': pb.product.name,
            'upc': pb.product.upc,
            'segment': 'no_sales',
            'action': 'No sales in period — review or remove',
            'sell_price': float(pb.sell_price),
            'cost_price': float(pb.cost_price),
            'margin_pct': pb.margin,
        }
        for pid, pb in pricebook.items()
        if pid not in sold_product_ids
    ]

    return {
        'period_days': days,
        'thresholds': {
            'median_revenue': round(median_revenue, 2),
            'median_velocity': round(median_velocity, 2),
        },
        'stars': sorted(stars, key=lambda x: x['total_revenue'], reverse=True),
        'cash_cows': sorted(cash_cows, key=lambda x: x['total_revenue'], reverse=True),
        'volume_movers': sorted(volume_movers, key=lambda x: x['total_qty'], reverse=True),
        'dogs': sorted(dogs, key=lambda x: x['total_revenue']),
        'no_sales': no_sales,
        'summary': {
            'stars': len(stars),
            'cash_cows': len(cash_cows),
            'volume_movers': len(volume_movers),
            'dogs': len(dogs),
            'no_sales': len(no_sales),
        }
    }