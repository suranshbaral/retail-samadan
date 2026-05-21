from django.contrib import admin
from .models import (
    Business, Location, Supplier, Category, Product,
    PricebookItem, SaleTransaction, SaleLineItem,
    PurchaseOrder, PurchaseOrderItem, InventorySnapshot, ShrinkageAlert
)

admin.site.register(Business)
admin.site.register(Location)
admin.site.register(Supplier)
admin.site.register(Category)
admin.site.register(Product)
admin.site.register(PricebookItem)
admin.site.register(SaleTransaction)
admin.site.register(SaleLineItem)
admin.site.register(PurchaseOrder)
admin.site.register(PurchaseOrderItem)
admin.site.register(InventorySnapshot)
admin.site.register(ShrinkageAlert)