import json
from decimal import Decimal, InvalidOperation
from datetime import datetime

import anthropic
import pytz
from django.conf import settings
from django.utils import timezone

from core.models import (
    Category,
    Product,
    Supplier,
    PricebookItem,
    Location,
    SaleTransaction,
    SaleLineItem,
)

from core.models import PurchaseOrder, PurchaseOrderItem

client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)


FIELD_DEFINITIONS = {
    'sales': {
        'date': 'Date or datetime of the sale (required)',
        'upc': 'UPC or barcode of the product',
        'product_name': 'Name or description of the product',
        'quantity': 'Quantity sold',
        'unit_price': 'Price per unit',
        'total_amount': 'Total sale amount',
        'transaction_ref': 'Transaction ID or reference number',
        'tax': 'Tax amount',
    },
    'purchases': {
        'date': 'Date of the purchase or invoice (required)',
        'upc': 'UPC or barcode of the product',
        'product_name': 'Name or description of the product',
        'quantity_ordered': 'Quantity ordered',
        'quantity_received': 'Quantity actually received',
        'unit_cost': 'Cost per unit',
        'total_cost': 'Total cost of the order',
        'supplier': 'Supplier or vendor name',
        'order_ref': 'Invoice or order reference number',
    },
    'pricebook': {
        'upc': 'UPC or barcode of the product (required)',
        'product_name': 'Name or description of the product (required)',
        'cost_price': 'Cost price / what you pay',
        'sell_price': 'Sell price / retail price',
        'category': 'Product category',
        'supplier': 'Supplier or vendor name',
        'tax_rate': 'Tax rate percentage',
        'unit': 'Unit of measure (each, case, carton)',
        'case_pack': 'Number of units per case',
    },
    'inventory': {
        'upc': 'UPC or barcode of the product (required)',
        'product_name': 'Name or description of the product',
        'quantity': 'Current quantity on hand (required)',
        'date': 'Date of the count',
        'counted_by': 'Who counted it',
    },
}


def to_decimal(val):
    try:
        if val is None:
            return Decimal('0')
        return Decimal(str(val).replace('$', '').replace(',', '').strip())
    except (InvalidOperation, ValueError):
        return Decimal('0')


def detect_column_mapping(columns: list, sample_rows: list, import_type: str) -> dict:
    fields = FIELD_DEFINITIONS.get(import_type, {})

    prompt = f"""You are a data mapping assistant for a retail management system.

I have a CSV file of type: {import_type.upper()}

CSV Columns detected:
{json.dumps(columns, indent=2)}

Sample data (first 3 rows):
{json.dumps(sample_rows[:3], indent=2)}

I need to map these CSV columns to our system fields:
{json.dumps(fields, indent=2)}

Rules:
- Map each CSV column to the most likely system field
- A CSV column can only map to ONE system field
- Not all CSV columns need to be mapped
- Use null if a column doesn't match anything useful
- Be smart about common POS export formats (Gilbarco, Verifone, NCR, Square, Clover, generic Excel)
- Look at both column names AND sample data to make the best guess

Respond ONLY with a JSON object in this exact format, no explanation:
{{
    "mapping": {{
        "csv_column_name": "system_field_or_null"
    }},
    "confidence": {{
        "csv_column_name": 0.0_to_1.0
    }},
    "unmapped": ["columns that dont match anything"],
    "missing_required": ["required system fields not found in CSV"],
    "notes": "any important warnings"
}}"""

    message = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}]
    )

    response_text = message.content[0].text.strip()

    if response_text.startswith('```'):
        response_text = response_text.split('```')[1]
        if response_text.startswith('json'):
            response_text = response_text[4:]

    return json.loads(response_text)


def apply_mapping(raw_rows: list, mapping: dict, import_type: str) -> list:
    mapped_rows = []

    for row in raw_rows:
        mapped = {}

        for csv_col, system_field in mapping.items():
            if system_field and system_field != 'null':
                value = row.get(csv_col, '')

                if value is not None and str(value).strip() != '':
                    mapped[system_field] = str(value).strip()

        mapped_rows.append(mapped)

    return mapped_rows


def insert_pricebook_rows(mapped_rows: list, location: Location) -> dict:
    created_products = 0
    updated_products = 0
    created_pricebook_items = 0
    updated_pricebook_items = 0
    errors = []

    for i, row in enumerate(mapped_rows):
        try:
            upc = str(row.get('upc', '')).strip()
            name = str(row.get('product_name', '')).strip()

            if not upc or not name:
                errors.append({'row': i + 1, 'error': 'Missing UPC or product name'})
                continue

            category = None
            cat_name = str(row.get('category', '')).strip()

            if cat_name:
                category, _ = Category.objects.get_or_create(name=cat_name)

            product, product_created = Product.objects.update_or_create(
                upc=upc,
                defaults={
                    'name': name,
                }
            )

            if product_created:
                created_products += 1
            else:
                updated_products += 1

            supplier = None
            sup_name = str(row.get('supplier', '')).strip()

            if sup_name:
                supplier, _ = Supplier.objects.get_or_create(
                    business=location.business,
                    name=sup_name
                )

            sell_price_value = (
                row.get('sell_price')
                or row.get('selling_price')
                or row.get('retail_price')
                or 0
            )

            pricebook_item, pricebook_created = PricebookItem.objects.update_or_create(
                location=location,
                product=product,
                defaults={
                    'supplier': supplier,
                    'category': category,
                    'cost_price': to_decimal(row.get('cost_price', 0)),
                    'sell_price': to_decimal(sell_price_value),
                    'tax_rate': to_decimal(row.get('tax_rate', 0)),
                    'is_active': True,
                }
            )

            if pricebook_created:
                created_pricebook_items += 1
            else:
                updated_pricebook_items += 1

        except Exception as e:
            errors.append({'row': i + 1, 'error': str(e)})

    return {
        'created_products': created_products,
        'updated_products': updated_products,
        'created_pricebook_items': created_pricebook_items,
        'updated_pricebook_items': updated_pricebook_items,
        'total_processed': len(mapped_rows),
        'errors': errors,
    }


def parse_date(val):
    formats = [
        '%Y-%m-%d %H:%M:%S',
        '%Y-%m-%dT%H:%M:%S',
        '%m/%d/%Y %H:%M:%S',
        '%m/%d/%Y %H:%M',
        '%m/%d/%Y',
        '%Y-%m-%d',
        '%m-%d-%Y',
    ]

    for fmt in formats:
        try:
            return datetime.strptime(str(val).strip(), fmt)
        except ValueError:
            continue

    raise ValueError(f"Cannot parse date: {val}")


def insert_sales_rows(mapped_rows: list, location) -> dict:
    created = 0
    errors = []

    for i, row in enumerate(mapped_rows):
        try:
            date_val = str(row.get('date', '')).strip()

            if not date_val:
                errors.append({'row': i + 1, 'error': 'Missing date'})
                continue

            sold_at = parse_date(date_val)

            if timezone.is_naive(sold_at):
                sold_at = timezone.make_aware(sold_at)

            qty = to_decimal(row.get('quantity', 1))
            unit_price = to_decimal(row.get('unit_price', 0))
            total = to_decimal(row.get('total_amount', 0)) or (qty * unit_price)

            upc = str(row.get('upc', '')).strip()
            product_name = str(row.get('product_name', '')).strip()

            product = None
            pricebook_item = None

            if upc:
                product = Product.objects.filter(upc=upc).first()

            if not product and product_name:
                product = Product.objects.filter(name__iexact=product_name).first()

            if product:
                pricebook_item = PricebookItem.objects.filter(
                    location=location,
                    product=product
                ).first()

            transaction = SaleTransaction.objects.create(
                location=location,
                transaction_ref=str(row.get('transaction_ref', '')).strip(),
                total_amount=total,
                total_tax=to_decimal(row.get('tax', 0)),
                sold_at=sold_at,
                source='csv',
            )

            SaleLineItem.objects.create(
                transaction=transaction,
                product=product,
                pricebook_item=pricebook_item,
                upc_raw=upc,
                product_name_raw=product_name,
                quantity=qty,
                unit_price=unit_price,
                cost_price=pricebook_item.cost_price if pricebook_item else to_decimal(row.get('cost_price', 0)),
                total_amount=total,
            )

            created += 1

        except Exception as e:
            errors.append({'row': i + 1, 'error': str(e)})

    return {
        'created_transactions': created,
        'total_processed': len(mapped_rows),
        'errors': errors,
    }

def insert_purchase_rows(mapped_rows: list, location) -> dict:
    """
    Insert mapped purchase/invoice rows into PurchaseOrder and PurchaseOrderItem.
    Groups rows by order_ref if available, otherwise one order per row.
    """
    created_orders = 0
    created_items = 0
    errors = []

    # Group rows by order_ref so one invoice = one PurchaseOrder
    from collections import defaultdict
    grouped = defaultdict(list)
    for i, row in enumerate(mapped_rows):
        ref = row.get('order_ref', '').strip() or f'AUTO-{i}'
        grouped[ref].append((i, row))

    for order_ref, rows in grouped.items():
        try:
            # Get date and supplier from first row in group
            _, first_row = rows[0]

            date_val = first_row.get('date', '').strip()
            if not date_val:
                for _, row in rows:
                    errors.append({'row': 0, 'error': 'Missing date'})
                continue

            ordered_at = parse_date(date_val)
            if timezone.is_naive(ordered_at):
                ordered_at = timezone.make_aware(ordered_at)

            # Get or create supplier
            supplier = None
            sup_name = first_row.get('supplier', '').strip()
            if sup_name:
                supplier, _ = Supplier.objects.get_or_create(
                    business=location.business,
                    name=sup_name
                )

            # Create purchase order
            order, _ = PurchaseOrder.objects.get_or_create(
                location=location,
                order_ref=order_ref,
                defaults={
                    'supplier': supplier,
                    'ordered_at': ordered_at,
                    'status': 'received',
                    'received_at': ordered_at,
                }
            )
            created_orders += 1

            # Create line items
            for i, row in rows:
                try:
                    upc = row.get('upc', '').strip()
                    product_name = row.get('product_name', '').strip()
                    product = None

                    if upc:
                        product = Product.objects.filter(upc=upc).first()
                    if not product and product_name:
                        product = Product.objects.filter(
                            name__iexact=product_name
                        ).first()

                    if not product:
                        # Create product if not found
                        if upc and product_name:
                            product, _ = Product.objects.get_or_create(
                                upc=upc,
                                defaults={'name': product_name}
                            )
                        else:
                            errors.append({'row': i, 'error': 'Cannot find or create product — missing UPC and name'})
                            continue

                    qty_ordered = to_decimal(row.get('quantity_ordered') or row.get('quantity') or 0)
                    qty_received = to_decimal(row.get('quantity_received') or qty_ordered)
                    unit_cost = to_decimal(row.get('unit_cost') or row.get('cost_price') or 0)

                    PurchaseOrderItem.objects.create(
                        purchase_order=order,
                        product=product,
                        quantity_ordered=qty_ordered,
                        quantity_received=qty_received,
                        unit_cost=unit_cost,
                    )

                    # Update pricebook cost price if we have better data
                    if unit_cost > 0:
                        PricebookItem.objects.filter(
                            location=location,
                            product=product,
                        ).update(cost_price=unit_cost)

                    created_items += 1

                except Exception as e:
                    errors.append({'row': i, 'error': str(e)})

        except Exception as e:
            errors.append({'row': 0, 'error': f'Order {order_ref}: {str(e)}'})

    return {
        'created_orders': created_orders,
        'created_items': created_items,
        'total_processed': len(mapped_rows),
        'errors': errors,
    }