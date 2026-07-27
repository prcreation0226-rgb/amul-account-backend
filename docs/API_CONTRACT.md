# API Contract

This document acts as the definitive contract between the frontend and backend. It ensures 100% API coverage for all frontend features. All endpoints expect `application/json` (unless specified for file uploads) and return JSON responses. 

## Base URL
`/api/v1`

## Standard Error Responses
Unless otherwise noted, all endpoints utilize the following standard error formats:
- **400 Bad Request**: `{"error": "Validation failed", "details": [...]}`
- **401 Unauthorized**: `{"error": "Unauthorized. Missing or invalid token."}`
- **403 Forbidden**: `{"error": "Forbidden. Insufficient permissions."}`
- **404 Not Found**: `{"error": "Resource not found."}`
- **409 Conflict**: `{"error": "Conflict. Duplicate entry or business rule violation."}`
- **422 Unprocessable Entity**: `{"error": "Unprocessable entity. Logic failure."}`
- **500 Internal Server Error**: `{"error": "Internal server error."}`

## Pagination & Filtering (Standard Parameters)
For all `GET` lists (e.g., `/users`, `/sales`):
- **Query Params**: `?page=1&limit=50&search=keyword&startDate=2026-05-01&endDate=2026-05-30&sortBy=createdAt&sortOrder=desc`
- **Response Format**:
  ```json
  {
    "data": [...],
    "meta": { "total": 150, "page": 1, "limit": 50, "totalPages": 3 }
  }
  ```

---

## 1. Authentication
- `POST /auth/login`
  - Body: `{ "email": "admin@erp.com", "password": "password123" }`
  - Success (200): `{ "token": "jwt_string", "user": { "id": 1, "role": "ADMIN", "companyId": 1, "branchId": 1 } }`
- `POST /auth/logout`
  - Auth: Required. Success (200).

## 2. Dashboard
- `GET /dashboard/summary`
  - Auth: Required.
  - Success (200): Returns aggregates for Today's Sales, Cash Sales, Total Collection, etc.

## 3. Masters

### Users
- `GET /users` | `POST /users` | `PUT /users/:id` | `DELETE /users/:id`
  - Auth: Required. Role: Admin.

### Roles
- `GET /roles` | `POST /roles`
  - Auth: Required.

### Companies & Branches
- `GET /companies` | `POST /companies` | `PUT /companies/:id`
- `GET /branches` | `POST /branches` | `PUT /branches/:id` | `DELETE /branches/:id`
  - Auth: Required. Role: Superadmin/Admin. Returns isolated data based on token (`companyId`).

### Warehouses
- `GET /warehouses` | `POST /warehouses` | `PUT /warehouses/:id` | `DELETE /warehouses/:id`
  - Auth: Required. Role: Admin/Staff.

### Product Master & Settings
- `GET /products` | `POST /products` | `PUT /products/:id` | `DELETE /products/:id`
  - Auth: Required. Role: Admin/Staff.
  - Body Params: `name`, `sku`, `barcode`, `commissionType`, `hsnCode`, `baseUnit`, `purchaseUnit`, `salesUnit`, `creditSalePrice`, `wholesalePrice`, `purchasePrice`.
  - Enforces `companyId` isolation. Standard errors apply.
- `GET /units` | `POST /units` | `PUT /units/:id` | `DELETE /units/:id`
  - Auth: Required. Manages base units.
- `GET /unit-conversions` | `POST /unit-conversions` | `PUT /unit-conversions/:id` | `DELETE /unit-conversions/:id`
  - Auth: Required. Maps `baseQty` to `targetQty`.

### Account & Bill Book
- `GET /accounts` | `GET /accounts/:id/summary`
  - Auth: Required. Returns ledger balances and transaction histories.
- `GET /audit-logs`
  - Auth: Required. Role: Admin. Tracks user actions.

## 4. Inventory Engine (Transactions)

For all transaction endpoints (Purchase Order, Purchase, Purchase Return, Sales, Sales Return, Customer Challan, Stock Transfer, Quotation, Stock Adjustment):
- **Endpoints**: `GET /<module>` | `GET /<module>/:id` | `POST /<module>` | `PUT /<module>/:id` | `DELETE /<module>/:id`
- **POST Body Structure**:
  ```json
  {
    "partyId": 12,
    "date": "2026-06-15",
    "warehouseId": 3,
    "items": [
      { "productId": 101, "qty": 50, "rate": 100, "taxPercentage": 18, "discount": 0 }
    ],
    "notes": "Urgent delivery"
  }
  ```
- **Business Rule Enforcement**: `POST /sales` checks stock via Prisma before creating the record. 409 Conflict if stock is insufficient.

### Specific Modules:
- `/purchase-orders`
- `/purchases`
- `/purchase-returns`
- `/sales`
- `/sales-returns`
- `/customer-challans`
- `/stock-transfers`
  - Requires `fromWarehouseId` and `toWarehouseId`.
- `/stock-adjustments`
- `/quotations`
  - Includes endpoint `POST /quotations/:id/convert-to-sales` to promote a quote to a sale.

### POS / Billing
- `POST /pos/cart`
  - Auth: Required. Role: Admin/Staff.
  - Body: `{ "productId": 101, "qty": 1 }`
  - Validates stock, applies multi-tier pricing based on settings. Returns 409 if insufficient stock.
- `GET /pos/quick-items`
  - Auth: Required. Returns frequently used items for fast billing.
- `POST /pos/checkout`
  - Auth: Required. Role: Admin/Staff.
  - Body: `{ "items": [...], "paymentModes": [{ "mode": "Cash", "amount": 1000 }, { "mode": "Bank", "amount": 500 }] }`
  - Success (200): Creates Invoice and instantly updates Inventory and Accounts.

#### POS Edge Cases & Payloads

**1. Split Payment Checkout**
When a user pays via multiple modes (e.g., Cash and Card).
```json
{
  "customerId": 45,
  "items": [
    { "productId": 102, "qty": 2, "price": 1500, "discount1": 100 }
  ],
  "paymentModes": [
    { "mode": "Cash", "amount": 1000 },
    { "mode": "Bank", "amount": 1900 }
  ],
  "totalAmount": 2900
}
```

**2. Applying Loyalty Points**
Redeeming customer loyalty points during checkout.
```json
{
  "customerId": 45,
  "items": [
    { "productId": 102, "qty": 1, "price": 1500 }
  ],
  "loyaltyPointsUsed": 500,
  "loyaltyDiscountValue": 50,
  "paymentModes": [
    { "mode": "Cash", "amount": 1450 }
  ]
}
```

**3. POS Sales Return (Partial Return)**
Returning specific items from an existing invoice.
- `POST /pos/returns`
```json
{
  "originalInvoiceId": 992,
  "returnItems": [
    { "productId": 102, "qty": 1, "refundAmount": 1500 }
  ],
  "refundMode": "Bank"
}
```

## 5. Dispatch Engine
- `GET /loading-sheets` | `POST /loading-sheets` | `PUT /loading-sheets/:id` | `DELETE /loading-sheets/:id`
  - Auth: Required. Associates an array of `invoiceIds` to a driver/vehicle.

## 6. Financial Engine
- `GET /collection-reports`
  - Params: `?date=2026-06-15&period=Today`
  - Success (200):
    ```json
    {
      "todaySales": 5000,
      "cashSales": 2000,
      "creditSales": 3000,
      "moneyIn": {
        "cashSale": 2000,
        "creditRecovery": 500,
        "otherIncome": 0,
        "total": 2500
      },
      "moneyOut": {
        "companyPaid": 1000,
        "employeePaid": 0,
        "expensesPaid": 200,
        "total": 1200
      },
      "netCollection": 1300,
      "accounts": { "cash": 10000, "bank": 50000 }
    }
    ```

## 7. Reports & Exports
- `GET /reports/inventory` | `GET /reports/financial`
- `GET /export/sales`
  - Query Params: `?format=csv|pdf`
  - Response: Returns the appropriate file stream (`Content-Type: text/csv` or `application/pdf`).

## 8. File Upload
- `POST /upload`
  - Content-Type: `multipart/form-data`
  - Body: `file`
  - Success (200): `{ "url": "/uploads/image_name.png" }`

---

## 9. Settings (CRITICAL: Dynamic Configurations)

Settings dictate UI behavior dynamically. No hardcoded logic exists in the frontend.

### General Settings API
- `GET /settings`
  - Auth: Required. Fetches the merged settings for the current user (User overrides Branch overrides Company).
- `PUT /settings`
  - Body: Key-value pairs to update.

### Purchase Order Settings Panel
These exact boolean/string flags must be served by `/settings` and strictly respected by the frontend.

**Toggle Settings (Booleans):**
- `quickProduct`: Enable quick product entry mode.
- `partyFirst`: Require selecting party before adding items.
- `showShippingParty`: Display shipping destination fields.
- `showCompany`: Show company selector.
- `showProductCode`: Display product code column.
- `showBatchNo`: Display batch tracking column.
- `compulsoryBatchNo`: Force batch number input.
- `showGST`: Display tax columns.
- `showHSN`: Display HSN code column.
- `showMRP`: Display Maximum Retail Price column.
- `showListPrice`: Display distributor list price.
- `showPurchasePrice`: Display purchase cost column.
- `showDiscount`: Enable discount fields.
- `hideTotalDiscount`: Hide the aggregated discount summary.
- `hideFreightCharge`: Hide shipping/freight input fields.
- `showPriceFirst`: Reorder columns to show price before quantity.
- `showUnit`: Show UOM (Unit of Measure) column.
- `showWarning`: Show warnings for limits or expirations.
- `negativeStockLock`: Prevent transactions if stock goes below zero.
- `useProductCode`: Search items by code primarily.
- `useBarcode`: Enable barcode scanner compatibility.
- `usePoints`: Enable loyalty point tracking.

**Text/Value Settings:**
- `lowStockQty`: (Integer) Threshold for triggering low stock alerts.
- `languagePreference`: (String) e.g., "en", "hi".
- `invoiceLayout`: (String) Default print template ID.
- `taxDisplayOption`: (String) "INCLUSIVE" or "EXCLUSIVE".
- `barcodeMode`: (String) "CONTINUOUS" or "MANUAL".
- `defaultQuantity`: (Integer) Auto-filled quantity when item selected.
- `defaultWarehouseId`: (Integer) ID of default warehouse.
- `defaultTerms`: (String) Standard T&C text for invoices.
- `remarkSettings`: (String) Default footer remarks.
