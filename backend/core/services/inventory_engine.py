from decimal import Decimal
from core.models import Product, PricebookItem, SaleLineItem, PurchaseOrderItem, Location


def calculate_expected_inventory(product: Product, location: Location) -> dict:
    """
    Expected inventory = total purchased - total sold
    
    This is the backbone of the alert system.
    """
    # Total units purchased (from purchase orders)
    from django.db.models import Sum
    
    purchased = PurchaseOrderItem.objects.filter(
        product=product,
        purchase_order__location=location,
        purchase_order__status__in=['received', 'partial']
    ).aggregate(total=Sum('quantity_received'))['total'] or Decimal('0')

    # Total units sold
    sold = SaleLineItem.objects.filter(
        product=product,
        transaction__location=location,
    ).aggregate(total=Sum('quantity'))['total'] or Decimal('0')

    expected = purchased - sold

    return {
        'product_id': str(product.id),
        'product_name': product.name,
        'upc': product.upc,
        'total_purchased': float(purchased),
        'total_sold': float(sold),
        'expected_quantity': float(expected),
    }


def calculate_all_expected_inventory(location: Location) -> list:
    """
    Run expected inventory for all active products at a location.
    """
    pricebook_items = PricebookItem.objects.filter(
        location=location,
        is_active=True,
    ).select_related('product')

    results = []
    for item in pricebook_items:
        result = calculate_expected_inventory(item.product, location)
        result['cost_price'] = float(item.cost_price)
        result['sell_price'] = float(item.sell_price)
        result['margin'] = item.margin
        results.append(result)

    return results