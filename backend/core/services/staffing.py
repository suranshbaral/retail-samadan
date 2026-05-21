from django.db.models import Sum, Count
from django.db.models.functions import TruncHour, ExtractWeekDay, ExtractHour
from datetime import timedelta
from django.utils import timezone

from core.models import SaleTransaction, SaleLineItem, Location


DAY_NAMES = {
    1: 'sunday', 2: 'monday', 3: 'tuesday', 4: 'wednesday',
    5: 'thursday', 6: 'friday', 7: 'saturday'
}

HOUR_LABELS = {
    6: '6am', 7: '7am', 8: '8am', 9: '9am', 10: '10am',
    11: '11am', 12: '12pm', 13: '1pm', 14: '2pm', 15: '3pm',
    16: '4pm', 17: '5pm', 18: '6pm', 19: '7pm', 20: '8pm',
    21: '9pm', 22: '10pm', 23: '11pm',
}


def get_sales_by_day(location: Location, days: int = 90) -> list:
    """Sales revenue grouped by day of week."""
    since = timezone.now() - timedelta(days=days)

    results = (
        SaleTransaction.objects
        .filter(location=location, sold_at__gte=since)
        .annotate(weekday=ExtractWeekDay('sold_at'))
        .values('weekday')
        .annotate(
            total_revenue=Sum('total_amount'),
            transaction_count=Count('id'),
        )
        .order_by('weekday')
    )

    day_map = {}
    for r in results:
        day_name = DAY_NAMES.get(r['weekday'], 'unknown')
        day_map[day_name] = {
            'day': day_name,
            'total_revenue': float(r['total_revenue'] or 0),
            'transaction_count': r['transaction_count'],
        }

    days_order = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    return [day_map.get(d, {'day': d, 'total_revenue': 0, 'transaction_count': 0}) for d in days_order]


def get_sales_by_hour(location: Location, days: int = 30) -> list:
    """Sales revenue grouped by hour of day."""
    since = timezone.now() - timedelta(days=days)

    results = (
        SaleTransaction.objects
        .filter(location=location, sold_at__gte=since)
        .annotate(hour=ExtractHour('sold_at'))
        .values('hour')
        .annotate(
            total_revenue=Sum('total_amount'),
            transaction_count=Count('id'),
        )
        .order_by('hour')
    )

    hour_map = {r['hour']: {'hour': r['hour'], 'label': HOUR_LABELS.get(r['hour'], f"{r['hour']}:00"), 'total_revenue': float(r['total_revenue'] or 0), 'transaction_count': r['transaction_count']} for r in results}

    return [hour_map.get(h, {'hour': h, 'label': HOUR_LABELS.get(h, f"{h}:00"), 'total_revenue': 0, 'transaction_count': 0}) for h in range(6, 24)]


def get_staffing_recommendation(location: Location) -> dict:
    """
    AI staffing recommendation based on sales patterns.
    Simple rule based — replace with ML later.
    """
    day_sales = get_sales_by_day(location)

    if not any(d['total_revenue'] > 0 for d in day_sales):
        return {
            'recommendation': 'Not enough sales data for staffing recommendations',
            'days': [],
        }

    revenues = [d['total_revenue'] for d in day_sales]
    max_rev = max(revenues) or 1
    avg_rev = sum(revenues) / len(revenues) or 1

    recommendations = []
    for day in day_sales:
        rev = day['total_revenue']
        pct = rev / max_rev

        if pct >= 0.75:
            staff = 2
            label = 'Busy day'
            color = '#ef4444'
            reason = f'${rev:.0f} avg revenue — your busiest period'
        elif pct >= 0.4:
            staff = 2
            label = 'Moderate'
            color = '#f59e0b'
            reason = f'${rev:.0f} avg revenue — steady traffic'
        else:
            staff = 1
            label = 'Slow day'
            color = '#10b981'
            reason = f'${rev:.0f} avg revenue — one employee sufficient'

        recommendations.append({
            'day': day['day'],
            'day_label': day['day'].capitalize(),
            'total_revenue': rev,
            'transaction_count': day['transaction_count'],
            'recommended_staff': staff,
            'label': label,
            'color': color,
            'reason': reason,
            'pct_of_peak': round(pct * 100),
        })

    total_staff_days = sum(r['recommended_staff'] for r in recommendations)
    max_staff_days = 14  # 2 per day × 7 days
    potential_savings = (max_staff_days - total_staff_days) * 80  # assume $80/shift saved

    return {
        'recommendations': recommendations,
        'total_staff_days': total_staff_days,
        'potential_weekly_savings': potential_savings,
        'summary': f"AI recommends {total_staff_days} staff-days this week — saving ~${potential_savings} vs full staffing",
    }