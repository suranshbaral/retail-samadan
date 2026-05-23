import csv
import io
from decimal import Decimal
from datetime import timedelta, datetime

from django.db.models import Sum, Count, F, Q
from django.db.models.functions import TruncDay
from django.utils import timezone

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser

from .models import (
    Business, Location, Supplier, Category, Product,
    PricebookItem, SaleTransaction, SaleLineItem,
    PurchaseOrder, PurchaseOrderItem,
    InventorySnapshot, ShrinkageAlert,
    ImportBatch, RawImportRow
)

from .serializers import (
    BusinessSerializer, LocationSerializer, SupplierSerializer,
    CategorySerializer, ProductSerializer, PricebookItemSerializer,
    SaleTransactionSerializer, SaleLineItemSerializer,
    PurchaseOrderSerializer, PurchaseOrderItemSerializer,
    InventorySnapshotSerializer, ShrinkageAlertSerializer,
    CSVImportSerializer,
    ImportBatchSerializer, ImportBatchListSerializer, RawImportRowSerializer
)
from .services.csv_mapper import detect_column_mapping, apply_mapping
from .services.inventory_engine import calculate_all_expected_inventory
from .services.alert_engine import run_alert_engine, detect_abnormal_drop
from .services.demand_forecast import run_demand_forecast_all, forecast_reorder_point
from .services.segmentation import segment_products
from .models import Employee, Shift
from .serializers import EmployeeSerializer, ShiftSerializer
from .services.staffing import get_sales_by_day, get_sales_by_hour, get_staffing_recommendation


def to_decimal(value):
    try:
        return Decimal(str(value).replace("$", "").replace(",", "").strip())
    except Exception:
        return Decimal("0")


class BusinessViewSet(viewsets.ModelViewSet):
    queryset = Business.objects.all()
    serializer_class = BusinessSerializer
    permission_classes = [permissions.IsAuthenticated]


class LocationViewSet(viewsets.ModelViewSet):
    queryset = Location.objects.select_related("business").all()
    serializer_class = LocationSerializer
    permission_classes = [permissions.IsAuthenticated]


class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.select_related("business").all()
    serializer_class = SupplierSerializer
    permission_classes = [permissions.IsAuthenticated]


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.select_related("business").all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get("search")

        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(upc__icontains=search))

        return qs


class PricebookItemViewSet(viewsets.ModelViewSet):
    queryset = PricebookItem.objects.select_related(
        "product", "location", "supplier", "category"
    ).all()
    serializer_class = PricebookItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        location_id = self.request.query_params.get("location_id")

        if location_id:
            qs = qs.filter(location_id=location_id)

        return qs

    @action(detail=False, methods=["post"], parser_classes=[MultiPartParser])
    def import_csv(self, request):
        serializer = CSVImportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            location = Location.objects.get(id=data["location_id"])
        except Location.DoesNotExist:
            return Response({"error": "Location not found"}, status=404)

        csv_file = data["file"]
        decoded = csv_file.read().decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(decoded))

        rows_total = 0
        rows_imported = 0
        rows_skipped = 0
        errors = []

        for i, row in enumerate(reader, start=2):
            rows_total += 1

            try:
                upc = (
                    row.get("upc")
                    or row.get("UPC")
                    or row.get("barcode")
                    or row.get("Barcode")
                    or ""
                ).strip()

                name = (
                    row.get("name")
                    or row.get("product_name")
                    or row.get("Product Name")
                    or row.get("item")
                    or row.get("Item")
                    or ""
                ).strip()

                if not upc or not name:
                    rows_skipped += 1
                    errors.append({"row": i, "error": "Missing UPC or product name"})
                    continue

                product, _ = Product.objects.update_or_create(
                    upc=upc,
                    defaults={
                        "name": name,
                        "unit": row.get("unit", "each") or "each",
                        "case_pack": int(row.get("case_pack", 1) or 1),
                    },
                )

                category = None
                category_name = (
                    row.get("category")
                    or row.get("Category")
                    or ""
                ).strip()

                if category_name:
                    category, _ = Category.objects.get_or_create(
                        business=location.business,
                        name=category_name,
                    )

                supplier = None
                supplier_name = (
                    row.get("supplier")
                    or row.get("Supplier")
                    or ""
                ).strip()

                if supplier_name:
                    supplier, _ = Supplier.objects.get_or_create(
                        business=location.business,
                        name=supplier_name,
                    )

                PricebookItem.objects.update_or_create(
                    location=location,
                    product=product,
                    defaults={
                        "supplier": supplier,
                        "category": category,
                        "cost_price": to_decimal(row.get("cost_price") or row.get("cost") or 0),
                        "sell_price": to_decimal(row.get("sell_price") or row.get("price") or 0),
                        "tax_rate": to_decimal(row.get("tax_rate") or 0),
                        "is_active": True,
                    },
                )

                rows_imported += 1

            except Exception as e:
                rows_skipped += 1
                errors.append({"row": i, "error": str(e)})

        return Response({
            "rows_total": rows_total,
            "rows_imported": rows_imported,
            "rows_skipped": rows_skipped,
            "errors": errors[:20],
        })


class SaleTransactionViewSet(viewsets.ModelViewSet):
    queryset = SaleTransaction.objects.select_related("location").prefetch_related("line_items").all()
    serializer_class = SaleTransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        location_id = self.request.query_params.get("location_id")

        if location_id:
            qs = qs.filter(location_id=location_id)

        return qs


class SaleLineItemViewSet(viewsets.ModelViewSet):
    queryset = SaleLineItem.objects.select_related(
        "transaction", "product", "pricebook_item"
    ).all()
    serializer_class = SaleLineItemSerializer
    permission_classes = [permissions.IsAuthenticated]


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrder.objects.select_related(
        "location", "supplier"
    ).prefetch_related("items").all()
    serializer_class = PurchaseOrderSerializer
    permission_classes = [permissions.IsAuthenticated]


class PurchaseOrderItemViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrderItem.objects.select_related(
        "purchase_order", "product", "pricebook_item"
    ).all()
    serializer_class = PurchaseOrderItemSerializer
    permission_classes = [permissions.IsAuthenticated]


class InventorySnapshotViewSet(viewsets.ModelViewSet):
    queryset = InventorySnapshot.objects.select_related(
        "location", "product", "pricebook_item"
    ).all()
    serializer_class = InventorySnapshotSerializer
    permission_classes = [permissions.IsAuthenticated]


class ShrinkageAlertViewSet(viewsets.ModelViewSet):
    queryset = ShrinkageAlert.objects.select_related(
        "location", "product", "pricebook_item", "snapshot"
    ).all()
    serializer_class = ShrinkageAlertSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        location_id = self.request.query_params.get("location_id")
        resolved = self.request.query_params.get("resolved")

        if location_id:
            qs = qs.filter(location_id=location_id)

        if resolved is not None:
            qs = qs.filter(is_resolved=resolved == "true")

        return qs


class ImportUploadView(APIView):
    parser_classes = [MultiPartParser]
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        file = request.FILES.get("file")
        location_id = request.data.get("location_id")
        import_type = request.data.get("import_type")

        if not file:
            return Response({"error": "No file provided"}, status=400)

        if not location_id:
            return Response({"error": "location_id is required"}, status=400)

        if not import_type:
            return Response(
                {"error": "import_type is required: sales, purchases, pricebook, inventory, other"},
                status=400,
            )

        try:
            location = Location.objects.get(id=location_id)
        except Location.DoesNotExist:
            return Response({"error": "Location not found"}, status=404)

        try:
            decoded = file.read().decode("utf-8-sig")
            reader = csv.DictReader(io.StringIO(decoded))
            rows = list(reader)
        except Exception as e:
            return Response({"error": f"Could not parse CSV: {str(e)}"}, status=400)

        if not rows:
            return Response({"error": "CSV is empty"}, status=400)

        batch = ImportBatch.objects.create(
            location=location,
            import_type=import_type,
            file_name=file.name,
            total_rows=len(rows),
            status="pending",
        )

        raw_rows = [
            RawImportRow(
                batch=batch,
                row_number=i,
                raw_data=row,
                status="pending",
            )
            for i, row in enumerate(rows, start=1)
        ]

        RawImportRow.objects.bulk_create(raw_rows)

        return Response({
            "batch_id": batch.id,
            "file_name": batch.file_name,
            "import_type": batch.import_type,
            "total_rows": batch.total_rows,
            "status": batch.status,
            "columns_detected": list(rows[0].keys()),
        }, status=201)


class ImportBatchListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        location_id = request.query_params.get("location_id")

        qs = ImportBatch.objects.select_related("location").all().order_by("-uploaded_at")

        if location_id:
            qs = qs.filter(location_id=location_id)

        serializer = ImportBatchListSerializer(qs, many=True)
        return Response(serializer.data)


class ImportBatchDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, batch_id):
        try:
            batch = ImportBatch.objects.get(id=batch_id)
        except ImportBatch.DoesNotExist:
            return Response({"error": "Batch not found"}, status=404)

        rows = RawImportRow.objects.filter(batch=batch).order_by("row_number")
        first_row = rows.first()

        return Response({
            "batch": ImportBatchListSerializer(batch).data,
            "columns": list(first_row.raw_data.keys()) if first_row else [],
            "rows": RawImportRowSerializer(rows[:50], many=True).data,
            "total_rows": rows.count(),
        })


class DashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        location_id = request.query_params.get("location_id")
        days = int(request.query_params.get("days", 30))
        since = timezone.now() - timedelta(days=days)

        qs = SaleLineItem.objects.filter(transaction__sold_at__gte=since)

        if location_id:
            qs = qs.filter(transaction__location_id=location_id)

        totals = qs.aggregate(
            total_revenue=Sum("total_amount"),
            total_cost=Sum(F("cost_price") * F("quantity")),
            total_transactions=Count("transaction", distinct=True),
            total_units=Sum("quantity"),
        )

        revenue = totals["total_revenue"] or Decimal("0")
        cost = totals["total_cost"] or Decimal("0")
        gross_profit = revenue - cost
        margin = round((gross_profit / revenue * 100), 2) if revenue else 0

        top_products = (
            qs.values("product__name", "upc_raw")
            .annotate(
                revenue=Sum("total_amount"),
                units=Sum("quantity"),
                profit=Sum(F("total_amount") - F("cost_price") * F("quantity")),
            )
            .order_by("-revenue")[:10]
        )

        slow_movers = (
            qs.values("product__name", "upc_raw")
            .annotate(
                revenue=Sum("total_amount"),
                units=Sum("quantity"),
            )
            .order_by("units")[:10]
        )

        daily = (
            qs.annotate(day=TruncDay("transaction__sold_at"))
            .values("day")
            .annotate(
                revenue=Sum("total_amount"),
                transactions=Count("transaction", distinct=True),
            )
            .order_by("day")
        )

        alerts = ShrinkageAlert.objects.filter(is_resolved=False)

        if location_id:
            alerts = alerts.filter(location_id=location_id)

        return Response({
            "period_days": days,
            "summary": {
                "total_revenue": revenue,
                "gross_profit": gross_profit,
                "margin_pct": margin,
                "total_transactions": totals["total_transactions"] or 0,
                "total_units_sold": totals["total_units"] or 0,
            },
            "top_products": list(top_products),
            "slow_movers": list(slow_movers),
            "daily_sales": list(daily),
            "shrinkage_alerts": ShrinkageAlertSerializer(alerts[:5], many=True).data,
        })
    


class DetectMappingView(APIView):
    """
    POST /api/import/detect-mapping/
    Send a batch_id and get back AI-suggested column mapping.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        batch_id = request.data.get('batch_id')
        if not batch_id:
            return Response({'error': 'batch_id is required'}, status=400)

        try:
            batch = ImportBatch.objects.get(id=batch_id)
        except ImportBatch.DoesNotExist:
            return Response({'error': 'Batch not found'}, status=404)

        # Get columns and sample rows from raw import
        rows = RawImportRow.objects.filter(batch=batch).order_by('row_number')[:5]
        if not rows.exists():
            return Response({'error': 'No rows found in batch'}, status=400)

        columns = list(rows[0].raw_data.keys())
        sample_rows = [row.raw_data for row in rows]

        # Ask Claude to detect the mapping
        try:
            mapping_result = detect_column_mapping(columns, sample_rows, batch.import_type)
        except Exception as e:
            return Response({'error': f'AI mapping failed: {str(e)}'}, status=500)

        return Response({
            'batch_id': batch_id,
            'import_type': batch.import_type,
            'columns_detected': columns,
            'sample_data': sample_rows[:2],
            'suggested_mapping': mapping_result,
        })


class ConfirmMappingView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        batch_id = request.data.get('batch_id')
        mapping = request.data.get('mapping')

        if not batch_id or not mapping:
            return Response({'error': 'batch_id and mapping are required'}, status=400)

        try:
            batch = ImportBatch.objects.get(id=batch_id)
        except ImportBatch.DoesNotExist:
            return Response({'error': 'Batch not found'}, status=404)

        raw_rows = RawImportRow.objects.filter(batch=batch).order_by('row_number')
        raw_data = [row.raw_data for row in raw_rows]

        mapped_rows = apply_mapping(raw_data, mapping, batch.import_type)

        batch.status = 'processing'
        batch.save()

        result = {}

        if batch.import_type == 'pricebook':
            from .services.csv_mapper import insert_pricebook_rows
            result = insert_pricebook_rows(mapped_rows, batch.location)

        elif batch.import_type == 'sales':
            from .services.csv_mapper import insert_sales_rows
            result = insert_sales_rows(mapped_rows, batch.location)

        elif batch.import_type == 'purchases':
            from .services.csv_mapper import insert_purchase_rows
            result = insert_purchase_rows(mapped_rows, batch.location)

        else:
            result = {
                'message': f'No insert handler found for import_type: {batch.import_type}'
            }

        raw_rows.update(status='processed')
        batch.status = 'done'
        batch.save()

        return Response({
            'batch_id': batch_id,
            'import_type': batch.import_type,
            'status': 'done',
            'result': result,
            'preview': mapped_rows[:3],
        })
    
class ExpectedInventoryView(APIView):
    """
    GET /api/inventory/expected/?location_id=<id>
    Returns expected inventory for all products at a location.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        location_id = request.query_params.get('location_id')
        if not location_id:
            return Response({'error': 'location_id required'}, status=400)

        try:
            location = Location.objects.get(id=location_id)
        except Location.DoesNotExist:
            return Response({'error': 'Location not found'}, status=404)

        results = calculate_all_expected_inventory(location)

        return Response({
            'location': location.name,
            'products_count': len(results),
            'inventory': results,
        })


class RunAlertEngineView(APIView):
    """
    GET /api/audit/run/?location_id=<id>
    Runs the alert engine and creates shrinkage alerts.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        location_id = request.query_params.get('location_id')
        if not location_id:
            return Response({'error': 'location_id required'}, status=400)

        try:
            location = Location.objects.get(id=location_id)
        except Location.DoesNotExist:
            return Response({'error': 'Location not found'}, status=404)

        result = run_alert_engine(location)

        # Get all current alerts
        alerts = ShrinkageAlert.objects.filter(
            location=location,
            is_resolved=False,
        ).select_related('product')

        alert_data = []
        for alert in alerts:
            alert_data.append({
                'product': alert.product.name,
                'upc': alert.product.upc,
                'expected_quantity': float(alert.expected_quantity),
                'confidence': alert.confidence_score,
                'severity': alert.severity,
                'action': 'Count this item today',
                'created_at': alert.created_at,
            })

        return Response({
            'location': location.name,
            'engine_result': result,
            'alerts': alert_data,
        })
class DemandForecastView(APIView):
    """
    GET /api/forecast/?location_id=<id>
    Returns demand forecast for all products.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        location_id = request.query_params.get('location_id')
        if not location_id:
            return Response({'error': 'location_id required'}, status=400)

        try:
            location = Location.objects.get(id=location_id)
        except Location.DoesNotExist:
            return Response({'error': 'Location not found'}, status=404)

        results = run_demand_forecast_all(location)

        # Summary stats
        products_with_data = [r for r in results if r['sales_history_days'] > 0]
        total_forecast_revenue = sum(
            r['next_7_days_forecast'] * r['sell_price']
            for r in results
        )

        return Response({
            'location': location.name,
            'products_analyzed': len(results),
            'products_with_sales_data': len(products_with_data),
            'total_forecast_revenue_7d': round(total_forecast_revenue, 2),
            'forecasts': results,
        })
    
class SegmentationView(APIView):
    """
    GET /api/segmentation/?location_id=<id>&days=30
    Returns product segmentation — stars, cash cows, volume movers, dogs.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        location_id = request.query_params.get('location_id')
        days = int(request.query_params.get('days', 30))

        if not location_id:
            return Response({'error': 'location_id required'}, status=400)

        try:
            location = Location.objects.get(id=location_id)
        except Location.DoesNotExist:
            return Response({'error': 'Location not found'}, status=404)

        result = segment_products(location, days)

        return Response({
            'location': location.name,
            **result
        })



class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        business = Business.objects.filter(owner_email=user.email).first()
        if business:
            return Employee.objects.filter(business=business)
        return Employee.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        business = Business.objects.filter(owner_email=user.email).first()
        serializer.save(business=business)

class ShiftViewSet(viewsets.ModelViewSet):
    queryset = Shift.objects.select_related('employee', 'location').all()
    serializer_class = ShiftSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        location_id = self.request.query_params.get('location_id')
        week_start = self.request.query_params.get('week_start')
        if location_id:
            qs = qs.filter(location_id=location_id)
        if week_start:
            qs = qs.filter(week_start=week_start)
        return qs


class StaffingInsightsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        location_id = request.query_params.get('location_id')
        if not location_id:
            return Response({'error': 'location_id required'}, status=400)
        try:
            location = Location.objects.get(id=location_id)
        except Location.DoesNotExist:
            return Response({'error': 'Location not found'}, status=404)

        return Response({
            'location': location.name,
            'sales_by_day': get_sales_by_day(location),
            'sales_by_hour': get_sales_by_hour(location),
            'staffing_recommendation': get_staffing_recommendation(location),
        })