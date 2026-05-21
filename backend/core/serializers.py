from rest_framework import serializers
from .models import (
    Business, Location, Supplier, Category, Product,
    PricebookItem, SaleTransaction, SaleLineItem,
    PurchaseOrder, PurchaseOrderItem, InventorySnapshot,
    ShrinkageAlert, ImportBatch, RawImportRow,
    Employee, Shift 
)


class BusinessSerializer(serializers.ModelSerializer):
    class Meta:
        model = Business
        fields = "__all__"


class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = "__all__"


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = "__all__"


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = "__all__"


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = "__all__"


class PricebookItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_upc = serializers.CharField(source="product.upc", read_only=True)
    location_name = serializers.CharField(source="location.name", read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    margin = serializers.FloatField(read_only=True)

    class Meta:
        model = PricebookItem
        fields = "__all__"


class SaleLineItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_upc = serializers.CharField(source="product.upc", read_only=True)
    gross_profit = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True
    )

    class Meta:
        model = SaleLineItem
        fields = "__all__"


class SaleTransactionSerializer(serializers.ModelSerializer):
    line_items = SaleLineItemSerializer(many=True, read_only=True)
    location_name = serializers.CharField(source="location.name", read_only=True)

    class Meta:
        model = SaleTransaction
        fields = "__all__"


class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_upc = serializers.CharField(source="product.upc", read_only=True)
    is_fully_received = serializers.BooleanField(read_only=True)

    class Meta:
        model = PurchaseOrderItem
        fields = "__all__"


class PurchaseOrderSerializer(serializers.ModelSerializer):
    items = PurchaseOrderItemSerializer(many=True, read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    location_name = serializers.CharField(source="location.name", read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = "__all__"


class InventorySnapshotSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_upc = serializers.CharField(source="product.upc", read_only=True)
    location_name = serializers.CharField(source="location.name", read_only=True)

    class Meta:
        model = InventorySnapshot
        fields = "__all__"


class ShrinkageAlertSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_upc = serializers.CharField(source="product.upc", read_only=True)
    location_name = serializers.CharField(source="location.name", read_only=True)

    class Meta:
        model = ShrinkageAlert
        fields = "__all__"


class RawImportRowSerializer(serializers.ModelSerializer):
    class Meta:
        model = RawImportRow
        fields = "__all__"


class ImportBatchSerializer(serializers.ModelSerializer):
    rows = RawImportRowSerializer(many=True, read_only=True)
    location_name = serializers.CharField(source="location.name", read_only=True)

    class Meta:
        model = ImportBatch
        fields = "__all__"


class ImportBatchListSerializer(serializers.ModelSerializer):
    location_name = serializers.CharField(source="location.name", read_only=True)

    class Meta:
        model = ImportBatch
        fields = [
            "id",
            "location",
            "location_name",
            "import_type",
            "file_name",
            "total_rows",
            "status",
            "errors",
            "uploaded_at",
            "processed_at",
        ]


class CSVImportSerializer(serializers.Serializer):
    file = serializers.FileField()
    location_id = serializers.UUIDField()
    import_type = serializers.ChoiceField(
        choices=["sales", "purchases", "pricebook", "inventory", "other"],
        default="other"
    )

class EmployeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = '__all__'


class ShiftSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.name', read_only=True)
    employee_role = serializers.CharField(source='employee.role', read_only=True)

    class Meta:
        model = Shift
        fields = '__all__'