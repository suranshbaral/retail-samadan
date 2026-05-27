# Retail Samadhan

**AI-powered retail intelligence platform for gas stations and convenience stores.**

Built for independent operators who need enterprise-grade inventory intelligence, demand forecasting, and operational clarity — without enterprise complexity.

---

## What It Does

Most convenience store owners run blind. They find out about shrinkage at month-end, guess when to reorder, and overpay for labor on slow days. Retail Samadhan fixes that.

- **AI CSV Import** — Upload any export from any POS system. The AI reads your columns, understands your format, and maps everything automatically. Works with Verifone, Gilbarco, Apex, Square, and plain Excel.
- **Shrinkage Detection** — Cross-references purchases against sales in real time. Flags which items to count today, not at month-end.
- **Demand Forecasting** — Moving average models with trend detection predict what you'll sell next week. Confidence-scored per product.
- **Product Segmentation** — Classifies every SKU as Star, Cash Cow, Volume Mover, or Dog based on revenue and velocity.
- **Shift Intelligence** — Analyzes sales by day and hour. Tells you exactly when to staff 2 people vs 1.
- **Margin Visibility** — Real cost and margin per product, per category, per period.

---

## Tech Stack

**Backend**
- Django 6 + Django REST Framework
- PostgreSQL
- JWT Authentication (SimpleJWT)
- Anthropic Claude API (AI column mapping)
- NumPy (forecasting engine)

**Frontend**
- React 19 + Vite
- Recharts (data visualization)
- Lucide React (icons)
- CSS variables (design system)

---

## Architecture
retail-samadan/
├── backend/
│   ├── config/          # Django settings, URLs
│   └── core/
│       ├── models.py    # Business, Location, Product, Sales, Inventory...
│       ├── views.py     # REST API endpoints
│       ├── serializers.py
│       ├── urls.py
│       ├── auth_views.py
│       └── services/
│           ├── csv_mapper.py      # AI column mapping
│           ├── inventory_engine.py # Expected inventory calculation
│           ├── alert_engine.py    # Shrinkage detection
│           ├── demand_forecast.py  # Moving average forecasting
│           ├── segmentation.py    # Product classification
│           └── staffing.py        # Labor optimization
└── frontend/
└── src/
├── pages/       # Dashboard, Upload, Inventory, Alerts, Forecast, Segmentation, Staffing
├── components/  # Layout, Sidebar, Cards, Skeleton loaders
├── api/         # Axios client + all API calls
└── context/     # Auth context (JWT)

---

## Data Model
Business → Location → PricebookItem → Product
→ SaleTransaction → SaleLineItem
→ PurchaseOrder → PurchaseOrderItem
→ InventorySnapshot
→ ShrinkageAlert
→ ImportBatch → RawImportRow
→ Shift → Employee

Multi-tenant from day one. One business can have multiple locations. Products are global (UPC-based) — PricebookItem holds location-specific pricing.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register/` | Create account + business + location |
| POST | `/api/auth/login/` | JWT login |
| POST | `/api/auth/logout/` | Blacklist refresh token |
| GET | `/api/auth/me/` | Current user + business + location |
| GET | `/api/dashboard/` | Revenue, margin, top products, daily sales |
| POST | `/api/import/upload/` | Upload CSV file |
| POST | `/api/import/detect-mapping/` | AI column mapping |
| POST | `/api/import/confirm-mapping/` | Execute import |
| GET | `/api/inventory/expected/` | Expected stock levels |
| GET | `/api/audit/run/` | Run shrinkage alert engine |
| GET | `/api/forecast/` | Demand forecast per product |
| GET | `/api/segmentation/` | Product segmentation |
| GET | `/api/staffing/insights/` | Labor optimization |
| CRUD | `/api/employees/` | Employee management |
| CRUD | `/api/shifts/` | Shift scheduling |

---

## Real Data

Tested against real data from **Westside Convenience Store, Greeley CO**:
- 2,848 SKU Apex pricebook export
- Verifone Commander store close reports
- McLane and Sam's Club invoice detail reports

---

## Local Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Fill in your values in .env

python manage.py migrate
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Environment Variables

See `.env.example` for all required variables.

---

## Pages

| Page | Description |
|------|-------------|
| `/home` | Landing page (public) |
| `/login` | JWT login |
| `/register` | Create account + store |
| `/` | Dashboard — KPIs, revenue chart, AI insights |
| `/upload` | Import Center — AI CSV mapping workflow |
| `/inventory` | Expected stock levels, health indicators |
| `/alerts` | Shrinkage alerts, items to count today |
| `/forecast` | Demand forecast with reorder recommendations |
| `/segmentation` | Product classification matrix |
| `/staffing` | Shift planner + AI staffing recommendations |

---

## Roadmap

- [ ] LSTM neural network for demand forecasting
- [ ] K-means product clustering
- [ ] TypeScript migration
- [ ] Deployment (Railway + Vercel)
- [ ] Multi-store dashboard
- [ ] Mobile app (React Native)
- [ ] Square + Clover integration

---

## License

Private — all rights reserved.