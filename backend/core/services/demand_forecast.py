import numpy as np
from datetime import timedelta

from django.utils import timezone
from django.db.models import Sum
from django.db.models.functions import TruncDay

from core.models import SaleLineItem, Product, Location, PricebookItem


def get_daily_sales_series(product: Product, location: Location, days: int = 90) -> list:
    """
    Get daily sales quantity as a time series.
    Returns list of (date, quantity) tuples.
    """
    since = timezone.now() - timedelta(days=days)

    daily = (
        SaleLineItem.objects
        .filter(
            product=product,
            transaction__location=location,
            transaction__sold_at__gte=since,
        )
        .annotate(day=TruncDay('transaction__sold_at'))
        .values('day')
        .annotate(qty=Sum('quantity'))
        .order_by('day')
    )

    return [(d['day'], float(d['qty'])) for d in daily]


def moving_average_forecast(series: list, window: int = 7, forecast_days: int = 7) -> dict:
    """
    Simple moving average forecast.
    Good enough for MVP — replace with LSTM later.

    Takes a daily sales series and predicts next N days.
    """
    if not series:
        return {
            'method': 'moving_average',
            'window_days': window,
            'avg_daily_sales': 0,
            'trend_pct': 0,
            'std_deviation': 0,
            'confidence': 'low',
            'forecast': [],
            'total_forecast_qty': 0,
            'note': 'No sales history available',
        }

    quantities = [qty for _, qty in series]

    recent = quantities[-window:] if len(quantities) >= window else quantities
    avg_daily = float(np.mean(recent))
    std_daily = float(np.std(recent)) if len(recent) > 1 else 0

    if len(quantities) >= 14:
        first_half = float(np.mean(quantities[:len(quantities) // 2]))
        second_half = float(np.mean(quantities[len(quantities) // 2:]))
        trend = (second_half - first_half) / (first_half + 0.0001)
    else:
        trend = 0

    forecast = []
    last_date = series[-1][0] if series else timezone.now()

    for i in range(1, forecast_days + 1):
        forecast_date = last_date + timedelta(days=i)
        predicted = avg_daily * (1 + trend * (i / forecast_days))
        predicted = max(0, predicted)

        forecast.append({
            'date': forecast_date.strftime('%Y-%m-%d'),
            'predicted_qty': round(predicted, 2),
            'lower_bound': round(max(0, predicted - std_daily), 2),
            'upper_bound': round(predicted + std_daily, 2),
        })

    if len(quantities) >= 30:
        confidence = 'high'
    elif len(quantities) >= 14:
        confidence = 'medium'
    else:
        confidence = 'low'

    return {
        'method': 'moving_average',
        'window_days': window,
        'avg_daily_sales': round(avg_daily, 2),
        'trend_pct': round(trend * 100, 2),
        'std_deviation': round(std_daily, 2),
        'confidence': confidence,
        'forecast': forecast,
        'total_forecast_qty': round(sum(f['predicted_qty'] for f in forecast), 2),
    }


def forecast_reorder_point(product: Product, location: Location) -> dict:
    """
    Reorder point = avg daily sales × lead time days + safety stock
    """
    series = get_daily_sales_series(product, location, days=30)
    forecast = moving_average_forecast(series, window=7, forecast_days=14)

    avg_daily = forecast.get('avg_daily_sales', 0)
    std_daily = forecast.get('std_deviation', 0)

    lead_time_days = 3
    safety_stock = std_daily * lead_time_days

    reorder_point = (avg_daily * lead_time_days) + safety_stock
    reorder_qty = avg_daily * 7

    return {
        'product_name': product.name,
        'upc': product.upc,
        'avg_daily_sales': avg_daily,
        'lead_time_days': lead_time_days,
        'reorder_point': round(reorder_point, 2),
        'suggested_order_qty': round(reorder_qty, 2),
        'forecast_14_days': forecast.get('total_forecast_qty', 0),
        'confidence': forecast.get('confidence', 'low'),
    }


def run_demand_forecast_all(location: Location) -> list:
    """
    Run demand forecast for all active products at a location.
    Category lives on PricebookItem, not Product.
    """
    pricebook_items = (
        PricebookItem.objects
        .filter(
            location=location,
            is_active=True,
        )
        .select_related('product', 'category')
    )

    results = []

    for item in pricebook_items:
        product = item.product

        series = get_daily_sales_series(product, location, days=30)
        forecast = moving_average_forecast(series, window=7, forecast_days=7)
        reorder = forecast_reorder_point(product, location)

        results.append({
            'product_name': product.name,
            'upc': product.upc,
            'category': item.category.name if item.category else None,
            'sell_price': float(item.sell_price),
            'cost_price': float(item.cost_price),
            'margin': item.margin,
            'sales_history_days': len(series),
            'avg_daily_sales': forecast.get('avg_daily_sales', 0),
            'trend_pct': forecast.get('trend_pct', 0),
            'confidence': forecast.get('confidence', 'low'),
            'next_7_days_forecast': forecast.get('total_forecast_qty', 0),
            'reorder_point': reorder.get('reorder_point', 0),
            'suggested_order_qty': reorder.get('suggested_order_qty', 0),
            'forecast_detail': forecast.get('forecast', []),
        })

    results.sort(
        key=lambda x: x['avg_daily_sales'] * x['sell_price'],
        reverse=True
    )

    return results