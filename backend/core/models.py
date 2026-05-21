from django.db import models
import uuid
from datetime import datetime, timedelta

from django.core.exceptions import ValidationError

class Business(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    owner_email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Businesses"

    def __str__(self):
        return self.name


class Location(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="locations")
    name = models.CharField(max_length=255)
    address = models.CharField(max_length=500)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=50)
    zip_code = models.CharField(max_length=20)
    phone = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("business", "name")

    def __str__(self):
        return f"{self.business.name} — {self.name}"


class Supplier(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="suppliers")
    name = models.CharField(max_length=255)
    rep_name = models.CharField(max_length=255, blank=True)
    rep_phone = models.CharField(max_length=20, blank=True)
    rep_email = models.EmailField(blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("business", "name")

    def __str__(self):
        return self.name


class Category(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.name


class Product(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Global product identity
    upc = models.CharField(max_length=50, unique=True, db_index=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    unit = models.CharField(max_length=50, default="each")
    case_pack = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.upc})"


class PricebookItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    location = models.ForeignKey(Location, on_delete=models.CASCADE, related_name="pricebook")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="pricebook_items")
    supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True, blank=True, related_name="pricebook_items")
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name="pricebook_items")

    cost_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    sell_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("location", "product")

    @property
    def margin(self):
        if self.sell_price and self.sell_price > 0:
            return round(((self.sell_price - self.cost_price) / self.sell_price) * 100, 2)
        return 0

    def __str__(self):
        return f"{self.product.name} @ {self.location.name} — ${self.sell_price}"


class SaleTransaction(models.Model):
    SOURCE_CHOICES = [
        ("csv", "CSV Import"),
        ("square", "Square POS"),
        ("clover", "Clover POS"),
        ("manual", "Manual Entry"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    location = models.ForeignKey(Location, on_delete=models.CASCADE, related_name="transactions")

    transaction_ref = models.CharField(max_length=100, blank=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    total_tax = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    sold_at = models.DateTimeField()
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default="csv")

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-sold_at"]
        indexes = [
            models.Index(fields=["location", "sold_at"]),
            models.Index(fields=["transaction_ref"]),
        ]

    def __str__(self):
        return f"{self.location.name} — {self.sold_at} (${self.total_amount})"


class SaleLineItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    transaction = models.ForeignKey(SaleTransaction, on_delete=models.CASCADE, related_name="line_items")
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True, related_name="sale_lines")
    pricebook_item = models.ForeignKey(PricebookItem, on_delete=models.SET_NULL, null=True, blank=True, related_name="sale_lines")

    upc_raw = models.CharField(max_length=50, blank=True)
    product_name_raw = models.CharField(max_length=255, blank=True)

    quantity = models.DecimalField(max_digits=10, decimal_places=3)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["product"]),
            models.Index(fields=["pricebook_item"]),
            models.Index(fields=["upc_raw"]),
        ]

    @property
    def gross_profit(self):
        return self.total_amount - (self.cost_price * self.quantity)

    def __str__(self):
        return f"{self.product_name_raw or self.product} x{self.quantity}"


class PurchaseOrder(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("received", "Received"),
        ("partial", "Partially Received"),
        ("cancelled", "Cancelled"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    location = models.ForeignKey(Location, on_delete=models.CASCADE, related_name="purchase_orders")
    supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True, blank=True, related_name="purchase_orders")

    order_ref = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")

    ordered_at = models.DateTimeField()
    received_at = models.DateTimeField(null=True, blank=True)

    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["location", "ordered_at"]),
            models.Index(fields=["order_ref"]),
        ]

    def __str__(self):
        return f"PO {self.order_ref or self.id} — {self.supplier} — {self.status}"


class PurchaseOrderItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="po_items")
    pricebook_item = models.ForeignKey(PricebookItem, on_delete=models.SET_NULL, null=True, blank=True, related_name="po_items")

    quantity_ordered = models.DecimalField(max_digits=10, decimal_places=3)
    quantity_received = models.DecimalField(max_digits=10, decimal_places=3, default=0)
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2)

    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def is_fully_received(self):
        return self.quantity_received >= self.quantity_ordered

    def __str__(self):
        return f"{self.product.name} — ordered {self.quantity_ordered}"


class InventorySnapshot(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    location = models.ForeignKey(Location, on_delete=models.CASCADE, related_name="inventory_snapshots")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="snapshots")
    pricebook_item = models.ForeignKey(PricebookItem, on_delete=models.SET_NULL, null=True, blank=True, related_name="snapshots")

    counted_quantity = models.DecimalField(max_digits=10, decimal_places=3)
    expected_quantity = models.DecimalField(max_digits=10, decimal_places=3)
    variance = models.DecimalField(max_digits=10, decimal_places=3, editable=False)

    counted_at = models.DateTimeField(auto_now_add=True)
    counted_by = models.CharField(max_length=100, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["location", "product", "counted_at"]),
            models.Index(fields=["pricebook_item", "counted_at"]),
        ]

    def save(self, *args, **kwargs):
        self.variance = self.counted_quantity - self.expected_quantity
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.product.name} @ {self.location.name} — variance: {self.variance}"


class ShrinkageAlert(models.Model):
    SEVERITY_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    location = models.ForeignKey(Location, on_delete=models.CASCADE, related_name="shrinkage_alerts")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="shrinkage_alerts")
    pricebook_item = models.ForeignKey(PricebookItem, on_delete=models.SET_NULL, null=True, blank=True, related_name="shrinkage_alerts")
    snapshot = models.ForeignKey(InventorySnapshot, on_delete=models.SET_NULL, null=True, blank=True)

    expected_quantity = models.DecimalField(max_digits=10, decimal_places=3)
    actual_quantity = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True)
    variance = models.DecimalField(max_digits=10, decimal_places=3)

    confidence_score = models.FloatField(default=0)
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default="low")

    reason = models.TextField(blank=True)
    recommended_action = models.TextField(blank=True)

    is_resolved = models.BooleanField(default=False)
    resolved_note = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["location", "created_at"]),
            models.Index(fields=["product", "created_at"]),
            models.Index(fields=["severity", "is_resolved"]),
        ]

    def __str__(self):
        return f"Alert: {self.product.name} @ {self.location.name} — {self.severity}"


class ImportBatch(models.Model):
    IMPORT_TYPE_CHOICES = [
        ("sales", "Sales"),
        ("purchases", "Purchases"),
        ("pricebook", "Pricebook"),
        ("inventory", "Inventory"),
        ("other", "Other"),
    ]

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("processing", "Processing"),
        ("done", "Done"),
        ("failed", "Failed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    location = models.ForeignKey(Location, on_delete=models.CASCADE, related_name="import_batches")
    import_type = models.CharField(max_length=20, choices=IMPORT_TYPE_CHOICES)

    file_name = models.CharField(max_length=255)
    total_rows = models.IntegerField(default=0)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    errors = models.JSONField(default=list, blank=True)

    uploaded_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-uploaded_at"]
        indexes = [
            models.Index(fields=["location", "uploaded_at"]),
            models.Index(fields=["import_type", "status"]),
        ]

    def __str__(self):
        return f"{self.import_type} — {self.file_name} — {self.status}"


class RawImportRow(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("processed", "Processed"),
        ("skipped", "Skipped"),
        ("error", "Error"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    batch = models.ForeignKey(ImportBatch, on_delete=models.CASCADE, related_name="rows")
    row_number = models.IntegerField()

    raw_data = models.JSONField()

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    error_message = models.TextField(blank=True)

    is_mapped = models.BooleanField(default=False)
    processed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["row_number"]
        unique_together = ("batch", "row_number")
        indexes = [
            models.Index(fields=["batch"]),
            models.Index(fields=["status"]),
            models.Index(fields=["is_mapped"]),
        ]

    def __str__(self):
        return f"Row {self.row_number} — {self.status}"
    


class Employee(models.Model):
    ROLE_CHOICES = [
        ('cashier', 'Cashier'),
        ('manager', 'Manager'),
        ('assistant_manager', 'Assistant Manager'),
        ('stock_clerk', 'Stock Clerk'),
        ('cleaner', 'Cleaner'),
        ('other', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.ForeignKey(
        Business,
        on_delete=models.CASCADE,
        related_name='employees'
    )
    name = models.CharField(max_length=255)
    role = models.CharField(max_length=100, choices=ROLE_CHOICES, default='cashier')
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    hourly_rate = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        unique_together = ['business', 'name']

    def __str__(self):
        return f"{self.name} ({self.role})"


class Shift(models.Model):
    DAY_CHOICES = [
        ('monday', 'Monday'),
        ('tuesday', 'Tuesday'),
        ('wednesday', 'Wednesday'),
        ('thursday', 'Thursday'),
        ('friday', 'Friday'),
        ('saturday', 'Saturday'),
        ('sunday', 'Sunday'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    location = models.ForeignKey(
        Location,
        on_delete=models.CASCADE,
        related_name='shifts'
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='shifts'
    )
    day = models.CharField(max_length=10, choices=DAY_CHOICES)
    start_time = models.TimeField()
    end_time = models.TimeField()
    week_start = models.DateField()
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['week_start', 'day', 'start_time']

    def clean(self):
        if self.end_time <= self.start_time:
            raise ValidationError("Shift end time must be after start time.")

        if self.employee.business != self.location.business:
            raise ValidationError("Employee must belong to the same business as the location.")

    @property
    def duration_hours(self):
        start = datetime.combine(self.week_start, self.start_time)
        end = datetime.combine(self.week_start, self.end_time)
        duration = end - start
        return round(duration.total_seconds() / 3600, 2)

    @property
    def estimated_labor_cost(self):
        return round(self.duration_hours * float(self.employee.hourly_rate), 2)

    def __str__(self):
        return f"{self.employee.name} — {self.day} {self.start_time}-{self.end_time}"  