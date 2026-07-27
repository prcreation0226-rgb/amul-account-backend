# Project Overview

This document provides a high-level overview of the backend POS + Accounting SaaS system built using Node.js, Express.js, Prisma ORM, and MySQL. The backend is designed for local development using Prisma and a local MySQL instance, and future Railway deployment utilizing the Railway MySQL plugin, using the exact same codebase. This ensures seamless transitions with zero code changes. No hard-coded or mock data is used; all configurations rely strictly on environment variables.

### Multi-Tenant Architecture
The system enforces strict multi-tenancy. Every core module and data table contains a `companyId` to guarantee data isolation between different tenant companies.

## Core Modules

### 1. Authentication
Handles user login, token generation (JWT), and role-based access control (Superadmin, Company Admin, Staff). Secures all endpoints and ensures data isolation across companies and branches using the mandatory `companyId`.

### 2. Dashboard & Account Summary
Aggregates summary metrics across sales, purchases, collections, inventory, and account balances to provide a real-time overview of business performance.

### 2a. POS / Billing (Point of Sale)
Dedicated frontend-driven module for rapid retail billing. Supports:
- Cart management and quick item selection.
- Multiple payment modes (Cash, Bank, Credit).
- Seamless integration with inventory to deduct stock instantly.

### 2b. Product Master & Product Settings
Comprehensive product management including:
- Commission types, HSN, Barcode, Sub Inventory tracking, and multi-tier Sale Prices.
- Support for base, purchase, and sales units with conversions.
- Advanced settings like purchase price code parsing and automated markups.

### 3. Masters
Core entities that power the transactional modules.
- **Branch Master**: Manages multiple physical or logical branches under a company.
- **Warehouse Master**: Defines storage locations. Essential for precise inventory tracking.

### 4. Inventory Engine
Manages physical goods movement and stock levels.
- **Purchase Order**: Requests sent to suppliers. No immediate stock or financial impact.
- **Purchase**: Receiving goods from suppliers. Increases stock.
- **Purchase Return**: Sending goods back to suppliers. Decreases stock.
- **Sales**: Selling goods to customers. Decreases stock.
- **Sales Return**: Receiving goods back from customers. Increases stock.
- **Customer Challan**: Delivery challans that may or may not impact financials until invoiced.
- **Stock Transfer**: Moving goods between warehouses. No financial impact, only location change.
- **Stock Adjustment**: Manual corrections to inventory levels (e.g., due to damage or audits).

### 5. Pre-Sales Engine
- **Quotation**: Estimations provided to customers. No inventory or accounting impact. Can be converted into Sales.

### 6. Dispatch Engine
- **Loading Sheet**: Logistics and dispatch document. Tracks goods leaving the premises. No accounting or ownership change.

### 7. Financial Engine
Handles the flow of money.
- **Purchase**: Creates a payable entry against the supplier.
- **Sales**: Creates a receivable entry against the customer.
- **Collection Reports**: Aggregates all incoming (Money In) and outgoing (Money Out) payments to calculate net collections and account balances.

### 8. Reports & Audit Logs
Comprehensive data extraction across inventory, sales, purchases, Bill Book, and financials. Audit logs track every critical user action per `companyId` for security and compliance.

### 9. Settings
Extensive configuration module allowing overriding of default behaviors at the Company, Branch, or User level. Controls UI visibility (e.g., Show GST, Show MRP), default rules (e.g., Default Warehouse), and feature flags (e.g., Quick Product entry).

---
*Note: This architecture strictly isolates Inventory, Finance, Dispatch, and Pre-Sales modules to maintain data integrity and clear separation of concerns.*
