from decimal import Decimal
from django.utils import timezone
from django.db.models import Avg, StdDev, Sum
from datetime import timedelta

from core.models import (
    Product, Location, SaleLineItem,
    ShrinkageAlert, PricebookItem
)
from .inventory_engine import calculate_expected_inventory


def calculate_daily_avg_sales(product: Product, location: Location, days: int = 30) -> float:
    """Average daily sales velocity for a product."""
    from django.db.models import Sum
    since = timezone.now() - timedelta(days=days)
    
    total_sold = SaleLineItem.objects.filter(
        product=product,
        transaction__location=location,
        transaction__sold_at__gte=since,
    ).aggregate(total=Sum('quantity'))['total'] or 0

    return float(total_sold) / days


def detect_abnormal_drop(product: Product, location: Location) -> dict:
    """
    Detect if inventory is dropping faster than expected.
    
    Simple but effective logic:
    - Compare last 7 days sales velocity vs last 30 days average
    - If last 7 days is 2x higher than normal → flag it
    - If expected inventory goes negative → flag it
    """
    # Expected inventory
    inv = calculate_expected_inventory(product, location)
    expected = inv['expected_quantity']

    # Sales velocity — last 7 days vs last 30 days
    velocity_30d = calculate_daily_avg_sales(product, location, days=30)
    velocity_7d = calculate_daily_avg_sales(product, location, days=7)

    issues = []
    confidence = 0.0
    severity = 'low'

    # Check 1 — negative expected inventory (selling more than purchased)
    if expected < 0:
        issues.append('Selling more than purchased — possible theft or receiving error')
        confidence = max(confidence, 0.9)
        severity = 'high'

    # Check 2 — sudden sales spike (2x normal velocity)
    if velocity_30d > 0 and velocity_7d > (velocity_30d * 2):
        issues.append(f'Sales velocity spiked: {velocity_7d:.1f}/day vs normal {velocity_30d:.1f}/day')
        confidence = max(confidence, 0.7)
        severity = 'medium' if severity == 'low' else severity

    # Check 3 — expected inventory critically low
    pricebook = PricebookItem.objects.filter(
        location=location, product=product
    ).first()

    if pricebook and expected < velocity_30d * 3:
        issues.append(f'Only {expected:.0f} units expected — less than 3 days of stock')
        confidence = max(confidence, 0.6)
        severity = 'medium' if severity == 'low' else severity

    return {
        'has_issue': len(issues) > 0,
        'issues': issues,
        'confidence': confidence,
        'severity': severity,
        'expected_quantity': expected,
        'velocity_30d': velocity_30d,
        'velocity_7d': velocity_7d,
    }


def run_alert_engine(location: Location) -> dict:
    """
    Run full alert engine for a location.
    Creates ShrinkageAlert records for any anomalies found.
    """
    pricebook_items = PricebookItem.objects.filter(
        location=location,
        is_active=True,
    ).select_related('product')

    alerts_created = 0
    alerts_skipped = 0
    products_checked = 0

    for item in pricebook_items:
        product = item.product
        products_checked += 1

        result = detect_abnormal_drop(product, location)

        if result['has_issue']:
            # Don't create duplicate unresolved alerts
            existing = ShrinkageAlert.objects.filter(
                location=location,
                product=product,
                is_resolved=False,
            ).exists()

            if not existing:
                ShrinkageAlert.objects.create(
                    location=location,
                    product=product,
                    expected_quantity=result['expected_quantity'],
                    actual_quantity=None,  # not counted yet
                    variance=result['expected_quantity'],
                    confidence_score=result['confidence'],
                    severity=result['severity'],
                )
                alerts_created += 1
            else:
                alerts_skipped += 1

    return {
        'products_checked': products_checked,
        'alerts_created': alerts_created,
        'alerts_skipped': alerts_skipped,
    }