from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .auth_views import RegisterView, LoginView, LogoutView, MeView
from rest_framework_simplejwt.views import TokenRefreshView


from .views import (
    BusinessViewSet, LocationViewSet, SupplierViewSet,
    CategoryViewSet, ProductViewSet, PricebookItemViewSet,
    SaleTransactionViewSet, SaleLineItemViewSet,
    PurchaseOrderViewSet, PurchaseOrderItemViewSet,
    InventorySnapshotViewSet, ShrinkageAlertViewSet,
    DashboardView,
    ImportUploadView, ImportBatchListView, ImportBatchDetailView,
)
from .views import DetectMappingView, ConfirmMappingView
from .views import ExpectedInventoryView, RunAlertEngineView
from .views import DemandForecastView
from .views import SegmentationView
from .views import EmployeeViewSet, ShiftViewSet, StaffingInsightsView


router = DefaultRouter()
router.register(r"businesses", BusinessViewSet, basename="business")
router.register(r"locations", LocationViewSet, basename="location")
router.register(r"suppliers", SupplierViewSet, basename="supplier")
router.register(r"categories", CategoryViewSet, basename="category")
router.register(r"products", ProductViewSet, basename="product")
router.register(r"pricebook", PricebookItemViewSet, basename="pricebook")
router.register(r"sales", SaleTransactionViewSet, basename="sale")
router.register(r"sale-line-items", SaleLineItemViewSet, basename="sale-line-item")
router.register(r"purchase-orders", PurchaseOrderViewSet, basename="purchase-order")
router.register(r"purchase-order-items", PurchaseOrderItemViewSet, basename="purchase-order-item")
router.register(r"inventory-snapshots", InventorySnapshotViewSet, basename="inventory-snapshot")
router.register(r"shrinkage-alerts", ShrinkageAlertViewSet, basename="shrinkage-alert")
router.register(r'employees', EmployeeViewSet, basename='employee')
router.register(r'shifts', ShiftViewSet, basename='shift')

urlpatterns = [
    path("", include(router.urls)),
    path("dashboard/", DashboardView.as_view(), name="dashboard"),
    path("import/upload/", ImportUploadView.as_view(), name="import-upload"),
    path("import/batches/", ImportBatchListView.as_view(), name="import-batches"),
    path("import/batches/<uuid:batch_id>/", ImportBatchDetailView.as_view(), name="import-batch-detail"),
    path('import/detect-mapping/', DetectMappingView.as_view(), name='detect-mapping'),
    path('import/confirm-mapping/', ConfirmMappingView.as_view(), name='confirm-mapping'),
    path('inventory/expected/', ExpectedInventoryView.as_view(), name='expected-inventory'),
    path('audit/run/', RunAlertEngineView.as_view(), name='run-audit'),
    path('forecast/', DemandForecastView.as_view(), name='demand-forecast'),
    path('segmentation/', SegmentationView.as_view(), name='segmentation'),
    path('staffing/insights/', StaffingInsightsView.as_view(), name='staffing-insights'),
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/me/', MeView.as_view(), name='me'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

]