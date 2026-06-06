import csv
import io
import json
import re
from collections import defaultdict
from datetime import datetime
from decimal import Decimal, InvalidOperation

import anthropic
from django.conf import settings
from django.db import transaction as db_transaction
from django.utils import timezone

from core.models import (
    Category,
    Product,
    Supplier,
    PricebookItem,
    Location,
    SaleTransaction,
    SaleLineItem,
    PurchaseOrder,
    PurchaseOrderItem,
)

client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)


def safe_str(value) -> str:
    """Convert None/blank-ish values to a clean string safely."""
    if value is None:
        return ""
    return str(value).strip().strip('"').strip()


def read_csv_with_encoding(file) -> tuple:
    """
    Read a CSV file with automatic encoding detection.
    Handles UTF-8, UTF-16, UTF-16-LE, Latin-1 and more.
    Returns (list of column names, list of row dicts)
    """
    raw = file.read()

    if raw[:2] == b"\xff\xfe":
        encoding = "utf-16-le"
        raw = raw[2:]
    elif raw[:2] == b"\xfe\xff":
        encoding = "utf-16-be"
        raw = raw[2:]
    elif raw[:3] == b"\xef\xbb\xbf":
        encoding = "utf-8-sig"
    else:
        try:
            import chardet

            detected = chardet.detect(raw[:10000])
            encoding = detected.get("encoding") or "utf-8"
        except ImportError:
            encoding = "utf-8"

    try:
        content = raw.decode(encoding, errors="replace")
    except (LookupError, UnicodeDecodeError):
        content = raw.decode("utf-8", errors="replace")

    content = content.replace("\x00", "")

    reader = csv.DictReader(io.StringIO(content))
    original_columns = reader.fieldnames or []
    rows = [dict(row) for row in reader]

    columns = [safe_str(col) for col in original_columns if safe_str(col)]

    clean_rows = []
    for row in rows:
        clean_row = {}
        for key, value in row.items():
            clean_key = safe_str(key)
            if clean_key:
                clean_row[clean_key] = value
        clean_rows.append(clean_row)

    return columns, clean_rows


FIELD_DEFINITIONS = {
    "sales": {
        "date": "Date or datetime of the sale (required)",
        "upc": "UPC or barcode of the product",
        "product_name": "Name or description of the product",
        "quantity": "Quantity sold",
        "unit_price": "Price per unit",
        "total_amount": "Total sale amount",
        "transaction_ref": "Transaction ID or reference number",
        "tax": "Tax amount",
    },
    "purchases": {
        "date": "Date of the purchase or invoice (required)",
        "upc": "UPC or barcode of the product",
        "product_name": "Name or description of the product",
        "quantity_ordered": "Quantity ordered",
        "quantity_received": "Quantity actually received",
        "unit_cost": "Cost per unit",
        "total_cost": "Total cost of the order",
        "supplier": "Supplier or vendor name",
        "order_ref": "Invoice or order reference number",
    },
    "pricebook": {
        "upc": "UPC or barcode of the product (required)",
        "product_name": "Name or description of the product (required)",
        "cost_price": "Cost price / what you pay",
        "sell_price": "Sell price / retail price",
        "category": "Product category",
        "supplier": "Supplier or vendor name",
        "tax_rate": "Tax rate percentage",
        "unit": "Unit of measure (each, case, carton)",
        "case_pack": "Number of units per case",
    },
    "inventory": {
        "upc": "UPC or barcode of the product (required)",
        "product_name": "Name or description of the product",
        "quantity": "Current quantity on hand (required)",
        "date": "Date of the count",
        "counted_by": "Who counted it",
    },
}


def to_decimal(value):
    try:
        text = safe_str(value).replace("$", "").replace(",", "")
        if not text:
            return Decimal("0")
        return Decimal(text)
    except (InvalidOperation, ValueError):
        return Decimal("0")


def extract_json_object(text: str) -> dict:
    """Parse Claude JSON robustly even if it returns fenced JSON or tiny extra text."""
    response_text = safe_str(text)

    if response_text.startswith("```"):
        response_text = re.sub(r"^```(?:json)?\s*", "", response_text, flags=re.IGNORECASE)
        response_text = re.sub(r"\s*```$", "", response_text)

    try:
        return json.loads(response_text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", response_text, flags=re.DOTALL)
        if match:
            return json.loads(match.group(0))
        raise


def detect_column_mapping(columns: list, sample_rows: list, import_type: str) -> dict:
    fields = FIELD_DEFINITIONS.get(import_type, {})
    if not fields:
        raise ValueError(f"Unsupported import_type: {import_type}")

    if not columns:
        raise ValueError("No columns found in CSV")

    # Limit columns sent to Claude so huge POS/pricebook exports do not create
    # oversized prompts. Keep the full original rows in the database; only the
    # AI prompt is limited and sanitized.
    columns_to_map = columns[:25]

    # Clean column names before sending them to Claude. Some vendor exports have
    # symbols, quotes, or weird characters in headers that can confuse JSON output.
    safe_columns = []
    col_map = {}  # safe_name -> original_name

    for index, col in enumerate(columns_to_map, start=1):
        original_col = safe_str(col)
        safe_col = re.sub(r"[^a-zA-Z0-9_\s]", "_", original_col).strip()
        safe_col = re.sub(r"\s+", "_", safe_col)
        safe_col = safe_col or f"column_{index}"

        # Avoid collisions after sanitizing, e.g. "Cost($)" and "Cost %".
        base_safe_col = safe_col
        suffix = 2
        while safe_col in col_map:
            safe_col = f"{base_safe_col}_{suffix}"
            suffix += 1

        safe_columns.append(safe_col)
        col_map[safe_col] = original_col

    filtered_samples = []
    for row in sample_rows[:3]:
        filtered_row = {}
        for safe_col, original_col in col_map.items():
            if original_col in row:
                filtered_row[safe_col] = row.get(original_col)
        filtered_samples.append(filtered_row)

    prompt = f"""You are a data mapping assistant for a retail management system.

I have a CSV file of type: {import_type.upper()}

CSV Columns detected. IMPORTANT: use these exact sanitized column names as JSON keys:
{json.dumps(safe_columns, indent=2)}

Sample data using those sanitized column names:
{json.dumps(filtered_samples, indent=2, default=str)}

I need to map these CSV columns to our system fields:
{json.dumps(fields, indent=2)}

Rules:
- Map each CSV column to the most likely system field
- A CSV column can only map to ONE system field
- Not all CSV columns need to be mapped
- Use null if a column doesn't match anything useful
- Use only the sanitized CSV column names shown above as keys
- Be smart about common POS export formats (Gilbarco, Verifone, NCR, Square, Clover, generic Excel)
- Look at both column names AND sample data to make the best guess

Respond ONLY with valid JSON. No markdown. No explanation.
Use this exact format:
{{
    "mapping": {{
        "sanitized_csv_column_name": "system_field_or_null"
    }},
    "confidence": {{
        "sanitized_csv_column_name": 0.0
    }},
    "unmapped": ["sanitized columns that dont match anything"],
    "missing_required": ["required system fields not found in CSV"],
    "notes": "any important warnings"
}}"""

    message = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=4096,
        temperature=0,
        messages=[{"role": "user", "content": prompt}],
    )

    response_text = message.content[0].text if message.content else ""
    result = extract_json_object(response_text)

    # Reverse sanitized column names back to the original CSV column names so
    # apply_mapping() can read values from the real raw row keys.
    if "mapping" in result and isinstance(result["mapping"], dict):
        original_mapping = {}
        for safe_col, field in result["mapping"].items():
            original_col = col_map.get(safe_col, safe_col)
            original_mapping[original_col] = field
        result["mapping"] = original_mapping

    if "confidence" in result and isinstance(result["confidence"], dict):
        original_confidence = {}
        for safe_col, confidence in result["confidence"].items():
            original_col = col_map.get(safe_col, safe_col)
            original_confidence[original_col] = confidence
        result["confidence"] = original_confidence

    if "unmapped" in result and isinstance(result["unmapped"], list):
        result["unmapped"] = [col_map.get(col, col) for col in result["unmapped"]]

    return result


def apply_mapping(raw_rows: list, mapping: dict, import_type: str) -> list:
    mapped_rows = []

    for row in raw_rows:
        mapped = {}
        for csv_col, system_field in mapping.items():
            if system_field and system_field != "null":
                value = row.get(csv_col, "")
                clean_value = safe_str(value)
                if clean_value:
                    mapped[system_field] = clean_value
        mapped_rows.append(mapped)

    return mapped_rows


def insert_pricebook_rows(mapped_rows: list, location: Location) -> dict:
    created_products = 0
    updated_products = 0
    created_pricebook_items = 0
    updated_pricebook_items = 0
    errors = []

    for i, row in enumerate(mapped_rows, start=1):
        try:
            with db_transaction.atomic():
                upc = safe_str(row.get("upc"))
                name = safe_str(row.get("product_name"))

                if not upc or not name:
                    errors.append({"row": i, "error": "Missing UPC or product name"})
                    continue

                category = None
                cat_name = safe_str(row.get("category"))
                if cat_name:
                    category, _ = Category.objects.get_or_create(name=cat_name)

                product, product_created = Product.objects.update_or_create(
                    upc=upc,
                    defaults={"name": name},
                )
                if product_created:
                    created_products += 1
                else:
                    updated_products += 1

                supplier = None
                sup_name = safe_str(row.get("supplier"))
                if sup_name:
                    supplier, _ = Supplier.objects.get_or_create(
                        business=location.business,
                        name=sup_name,
                    )

                sell_price_value = (
                    row.get("sell_price")
                    or row.get("selling_price")
                    or row.get("retail_price")
                    or 0
                )

                _, pricebook_created = PricebookItem.objects.update_or_create(
                    location=location,
                    product=product,
                    defaults={
                        "supplier": supplier,
                        "category": category,
                        "cost_price": to_decimal(row.get("cost_price", 0)),
                        "sell_price": to_decimal(sell_price_value),
                        "tax_rate": to_decimal(row.get("tax_rate", 0)),
                        "is_active": True,
                    },
                )
                if pricebook_created:
                    created_pricebook_items += 1
                else:
                    updated_pricebook_items += 1

        except Exception as exc:
            errors.append({"row": i, "error": str(exc)})

    return {
        "created_products": created_products,
        "updated_products": updated_products,
        "created_pricebook_items": created_pricebook_items,
        "updated_pricebook_items": updated_pricebook_items,
        "total_processed": len(mapped_rows),
        "errors": errors,
    }


def parse_date(value):
    text = safe_str(value)
    if not text:
        raise ValueError("Missing date")

    formats = [
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S",
        "%m/%d/%Y %H:%M:%S",
        "%m/%d/%Y %H:%M",
        "%m/%d/%Y",
        "%Y-%m-%d",
        "%m-%d-%Y",
    ]

    for fmt in formats:
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            continue

    raise ValueError(f"Cannot parse date: {value}")


def make_aware_if_needed(dt):
    if timezone.is_naive(dt):
        return timezone.make_aware(dt)
    return dt


def insert_sales_rows(mapped_rows: list, location: Location) -> dict:
    created = 0
    errors = []

    for i, row in enumerate(mapped_rows, start=1):
        try:
            with db_transaction.atomic():
                date_val = safe_str(row.get("date"))
                if not date_val:
                    errors.append({"row": i, "error": "Missing date"})
                    continue

                sold_at = make_aware_if_needed(parse_date(date_val))

                qty = to_decimal(row.get("quantity", 1))
                unit_price = to_decimal(row.get("unit_price", 0))
                total = to_decimal(row.get("total_amount", 0))
                if total == 0:
                    total = qty * unit_price

                upc = safe_str(row.get("upc"))
                product_name = safe_str(row.get("product_name"))

                product = None
                pricebook_item = None

                if upc:
                    product = Product.objects.filter(upc=upc).first()
                if not product and product_name:
                    product = Product.objects.filter(name__iexact=product_name).first()
                if product:
                    pricebook_item = PricebookItem.objects.filter(
                        location=location,
                        product=product,
                    ).first()

                sale_transaction = SaleTransaction.objects.create(
                    location=location,
                    transaction_ref=safe_str(row.get("transaction_ref")),
                    total_amount=total,
                    total_tax=to_decimal(row.get("tax", 0)),
                    sold_at=sold_at,
                    source="csv",
                )

                SaleLineItem.objects.create(
                    transaction=sale_transaction,
                    product=product,
                    pricebook_item=pricebook_item,
                    upc_raw=upc,
                    product_name_raw=product_name,
                    quantity=qty,
                    unit_price=unit_price,
                    cost_price=(
                        pricebook_item.cost_price
                        if pricebook_item
                        else to_decimal(row.get("cost_price", 0))
                    ),
                    total_amount=total,
                )

                created += 1

        except Exception as exc:
            errors.append({"row": i, "error": str(exc)})

    return {
        "created_transactions": created,
        "total_processed": len(mapped_rows),
        "errors": errors,
    }


def insert_purchase_rows(mapped_rows: list, location: Location) -> dict:
    """
    Insert mapped purchase/invoice rows into PurchaseOrder and PurchaseOrderItem.
    Groups rows by order_ref if available, otherwise one order per row.
    Re-importing the same order_ref replaces its previous line items to avoid duplicates.
    """
    created_orders = 0
    updated_orders = 0
    created_items = 0
    errors = []

    grouped = defaultdict(list)
    for i, row in enumerate(mapped_rows, start=1):
        ref = safe_str(row.get("order_ref")) or f"AUTO-{i}"
        grouped[ref].append((i, row))

    for order_ref, rows in grouped.items():
        try:
            with db_transaction.atomic():
                _, first_row = rows[0]

                date_val = safe_str(first_row.get("date"))
                if not date_val:
                    for row_num, _ in rows:
                        errors.append({"row": row_num, "error": "Missing date"})
                    continue

                ordered_at = make_aware_if_needed(parse_date(date_val))

                supplier = None
                sup_name = safe_str(first_row.get("supplier"))
                if sup_name:
                    supplier, _ = Supplier.objects.get_or_create(
                        business=location.business,
                        name=sup_name,
                    )

                order, order_created = PurchaseOrder.objects.get_or_create(
                    location=location,
                    order_ref=order_ref,
                    defaults={
                        "supplier": supplier,
                        "ordered_at": ordered_at,
                        "status": "received",
                        "received_at": ordered_at,
                    },
                )

                if order_created:
                    created_orders += 1
                else:
                    PurchaseOrder.objects.filter(pk=order.pk).update(
                        supplier=supplier,
                        ordered_at=ordered_at,
                        status="received",
                        received_at=ordered_at,
                    )
                    PurchaseOrderItem.objects.filter(purchase_order=order).delete()
                    updated_orders += 1

                for row_num, row in rows:
                    upc = safe_str(row.get("upc"))
                    product_name = safe_str(row.get("product_name"))

                    product = None
                    if upc:
                        product = Product.objects.filter(upc=upc).first()
                    if not product and product_name:
                        product = Product.objects.filter(name__iexact=product_name).first()

                    if not product:
                        if upc and product_name:
                            product, _ = Product.objects.get_or_create(
                                upc=upc,
                                defaults={"name": product_name},
                            )
                        else:
                            errors.append({
                                "row": row_num,
                                "error": "Cannot find or create product — missing UPC and name",
                            })
                            continue

                    qty_ordered = to_decimal(row.get("quantity_ordered") or row.get("quantity") or 0)
                    qty_received = to_decimal(row.get("quantity_received") or qty_ordered)
                    unit_cost = to_decimal(row.get("unit_cost") or row.get("cost_price") or 0)

                    PurchaseOrderItem.objects.create(
                        purchase_order=order,
                        product=product,
                        quantity_ordered=qty_ordered,
                        quantity_received=qty_received,
                        unit_cost=unit_cost,
                    )

                    if unit_cost > 0:
                        PricebookItem.objects.filter(
                            location=location,
                            product=product,
                        ).update(cost_price=unit_cost)

                    created_items += 1

        except Exception as exc:
            errors.append({"row": 0, "error": f"Order {order_ref}: {str(exc)}"})

    return {
        "created_orders": created_orders,
        "updated_orders": updated_orders,
        "created_items": created_items,
        "total_processed": len(mapped_rows),
        "errors": errors,
    }
