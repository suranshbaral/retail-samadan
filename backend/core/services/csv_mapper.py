import json
import csv
import io
import re
from collections import defaultdict
from decimal import Decimal, InvalidOperation
from datetime import datetime

import anthropic
from django.conf import settings
from django.db import transaction
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
    if value is None:
        return ""
    return str(value).strip()


def to_decimal(val):
    try:
        if val is None:
            return Decimal("0")
        cleaned = str(val).replace("$", "").replace(",", "").strip()
        if cleaned == "":
            return Decimal("0")
        return Decimal(cleaned)
    except (InvalidOperation, ValueError, TypeError):
        return Decimal("0")


def read_csv_with_encoding(file) -> tuple:
    """
    Read a CSV file with automatic encoding detection.
    Handles UTF-8, UTF-16, UTF-16-LE, UTF-16-BE, Latin-1 and more.
    Returns (list of column names, list of row dicts).
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
            encoding = detected.get("encoding", "utf-8") or "utf-8"
        except Exception:
            encoding = "utf-8"

    try:
        content = raw.decode(encoding, errors="replace")
    except (LookupError, UnicodeDecodeError):
        content = raw.decode("utf-8", errors="replace")

    content = content.replace("\x00", "")

    reader = csv.DictReader(io.StringIO(content))
    columns = reader.fieldnames or []
    rows = [dict(row) for row in reader]

    clean_columns = [safe_str(c).strip('"').strip() for c in columns if c]

    clean_rows = []
    for row in rows:
        clean_row = {}
        for key, value in row.items():
            if key:
                clean_key = safe_str(key).strip('"').strip()
                clean_row[clean_key] = value
        clean_rows.append(clean_row)

    return clean_columns, clean_rows


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


def detect_column_mapping(columns: list, sample_rows: list, import_type: str) -> dict:
    """
    Uses Claude tool calling so we do not depend on raw JSON text parsing.
    Limits columns to avoid long prompts.
    Sanitizes column names before sending to Claude, then maps them back to original names.
    """
    fields = FIELD_DEFINITIONS.get(import_type, {})

    if not fields:
        raise ValueError(f"Unsupported import_type: {import_type}")

    if not columns:
        raise ValueError("No columns found in CSV")

    columns_to_map = columns[:35]

    safe_columns = []
    col_map = {}

    for col in columns_to_map:
        safe = re.sub(r"[^a-zA-Z0-9_]+", "_", str(col)).strip("_")

        if not safe:
            safe = "column"

        original_safe = safe
        counter = 1

        while safe in col_map:
            safe = f"{original_safe}_{counter}"
            counter += 1

        safe_columns.append(safe)
        col_map[safe] = col

    filtered_samples = []
    for row in sample_rows[:3]:
        filtered_row = {}
        for safe_col, original_col in col_map.items():
            if original_col in row:
                filtered_row[safe_col] = safe_str(row.get(original_col))[:200]
        filtered_samples.append(filtered_row)

    tool = {
        "name": "map_columns",
        "description": "Map CSV columns to retail system fields",
        "input_schema": {
            "type": "object",
            "properties": {
                "mapping": {
                    "type": "object",
                    "description": "Safe CSV column name to system field name mapping",
                    "additionalProperties": {"type": ["string", "null"]},
                },
                "confidence": {
                    "type": "object",
                    "description": "Confidence score 0-1 for each mapping",
                    "additionalProperties": {"type": "number"},
                },
                "missing_required": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Required fields not found in CSV",
                },
                "unmapped": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "CSV columns that do not map to any useful field",
                },
                "notes": {
                    "type": "string",
                    "description": "Any important warnings",
                },
            },
            "required": ["mapping", "missing_required"],
        },
    }

    prompt = f"""You are mapping CSV columns to retail system fields.

Import type: {import_type.upper()}

CSV columns:
{json.dumps(safe_columns, indent=2)}

Sample rows:
{json.dumps(filtered_samples, indent=2)}

System fields available:
{json.dumps(list(fields.keys()), indent=2)}

Field descriptions:
{json.dumps(fields, indent=2)}

Rules:
- Map each CSV column to the best matching system field, or null if no match.
- Only use the system fields listed above.
- Do not invent fields.
- Each system field can only be used once.
- If unsure, use null.
- Return the result using the provided tool only.
"""

    message = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=2048,
        temperature=0,
        tools=[tool],
        tool_choice={"type": "tool", "name": "map_columns"},
        messages=[{"role": "user", "content": prompt}],
    )

    for block in message.content:
        if getattr(block, "type", None) == "tool_use" and getattr(block, "name", None) == "map_columns":
            result = block.input

            original_mapping = {}
            for safe_col, field in result.get("mapping", {}).items():
                original_mapping[col_map.get(safe_col, safe_col)] = field
            result["mapping"] = original_mapping

            original_confidence = {}
            for safe_col, score in result.get("confidence", {}).items():
                original_confidence[col_map.get(safe_col, safe_col)] = score
            result["confidence"] = original_confidence

            original_unmapped = []
            for safe_col in result.get("unmapped", []):
                original_unmapped.append(col_map.get(safe_col, safe_col))
            result["unmapped"] = original_unmapped

            return result

    raise ValueError("Claude did not return a tool use response")


def apply_mapping(raw_rows: list, mapping: dict, import_type: str) -> list:
    mapped_rows = []

    for row in raw_rows:
        mapped = {}

        for csv_col, system_field in mapping.items():
            if system_field and system_field != "null":
                value = row.get(csv_col, "")

                if value is not None and safe_str(value) != "":
                    mapped[system_field] = safe_str(value)

        mapped_rows.append(mapped)

    return mapped_rows


@transaction.atomic
def insert_pricebook_rows(mapped_rows: list, location: Location) -> dict:
    created_products = 0
    updated_products = 0
    created_pricebook_items = 0
    updated_pricebook_items = 0
    errors = []

    for i, row in enumerate(mapped_rows, start=1):
        try:
            upc = safe_str(row.get("upc"))
            name = safe_str(row.get("product_name"))

            if not upc or not name:
                errors.append({"row": i, "error": "Missing UPC or product name"})
                continue

            category = None
            cat_name = safe_str(row.get("category"))

            if cat_name:
                category, _ = Category.objects.get_or_create(
                    name=cat_name,
                )

            product, product_created = Product.objects.update_or_create(
                upc=upc,
                defaults={
                    "name": name,
                    "unit": safe_str(row.get("unit")) or "each",
                    "case_pack": int(to_decimal(row.get("case_pack") or 1)),
                },
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

        except Exception as e:
            errors.append({"row": i, "error": str(e)})

    return {
        "created_products": created_products,
        "updated_products": updated_products,
        "created_pricebook_items": created_pricebook_items,
        "updated_pricebook_items": updated_pricebook_items,
        "total_processed": len(mapped_rows),
        "errors": errors,
    }


def parse_date(val):
    date_text = safe_str(val)

    formats = [
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M:%S.%f",
        "%m/%d/%Y %H:%M:%S",
        "%m/%d/%Y %H:%M",
        "%m/%d/%Y",
        "%Y-%m-%d",
        "%m-%d-%Y",
    ]

    for fmt in formats:
        try:
            return datetime.strptime(date_text, fmt)
        except ValueError:
            continue

    raise ValueError(f"Cannot parse date: {val}")


@transaction.atomic
def insert_sales_rows(mapped_rows: list, location) -> dict:
    created = 0
    errors = []

    for i, row in enumerate(mapped_rows, start=1):
        try:
            date_val = safe_str(row.get("date"))

            if not date_val:
                errors.append({"row": i, "error": "Missing date"})
                continue

            sold_at = parse_date(date_val)

            if timezone.is_naive(sold_at):
                sold_at = timezone.make_aware(sold_at)

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

            transaction_obj = SaleTransaction.objects.create(
                location=location,
                transaction_ref=safe_str(row.get("transaction_ref")),
                total_amount=total,
                total_tax=to_decimal(row.get("tax", 0)),
                sold_at=sold_at,
                source="csv",
            )

            SaleLineItem.objects.create(
                transaction=transaction_obj,
                product=product,
                pricebook_item=pricebook_item,
                upc_raw=upc,
                product_name_raw=product_name,
                quantity=qty,
                unit_price=unit_price,
                cost_price=pricebook_item.cost_price if pricebook_item else to_decimal(row.get("cost_price", 0)),
                total_amount=total,
            )

            created += 1

        except Exception as e:
            errors.append({"row": i, "error": str(e)})

    return {
        "created_transactions": created,
        "total_processed": len(mapped_rows),
        "errors": errors,
    }


@transaction.atomic
def insert_purchase_rows(mapped_rows: list, location) -> dict:
    """
    Insert mapped purchase/invoice rows into PurchaseOrder and PurchaseOrderItem.
    Groups rows by order_ref if available, otherwise one order per row.
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
            _, first_row = rows[0]

            date_val = safe_str(first_row.get("date"))
            if not date_val:
                for row_number, _ in rows:
                    errors.append({"row": row_number, "error": "Missing date"})
                continue

            ordered_at = parse_date(date_val)

            if timezone.is_naive(ordered_at):
                ordered_at = timezone.make_aware(ordered_at)

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
                updated_orders += 1
                PurchaseOrderItem.objects.filter(purchase_order=order).delete()

            for row_number, row in rows:
                try:
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
                                "row": row_number,
                                "error": "Cannot find or create product — missing UPC and name",
                            })
                            continue

                    qty_ordered = to_decimal(
                        row.get("quantity_ordered")
                        or row.get("quantity")
                        or 0
                    )
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

                except Exception as e:
                    errors.append({"row": row_number, "error": str(e)})

        except Exception as e:
            errors.append({"row": 0, "error": f"Order {order_ref}: {str(e)}"})

    return {
        "created_orders": created_orders,
        "updated_orders": updated_orders,
        "created_items": created_items,
        "total_processed": len(mapped_rows),
        "errors": errors,
    }
