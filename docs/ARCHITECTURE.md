# Architecture Overview

This document outlines the architectural patterns and lifecycles of the backend application. The system is designed to be fully compatible with both a local development environment and Railway deployment without requiring any code alterations.

## Flow Architecture

The backend strictly adheres to a layered architecture:

```text
Routes → Controllers → Services → Prisma → MySQL
```

1. **Routes (`/src/routes`)**: Define the HTTP endpoints, apply middleware (authentication, authorization, validation), and route requests to the appropriate controller.
2. **Controllers (`/src/controllers`)**: Handle HTTP request/response formatting, extract parameters, and call the underlying service layer. They should not contain deep business logic.
3. **Services (`/src/services` - conceptual/actual)**: Contain the core business logic, coordinate multiple database calls, and enforce business rules (e.g., updating stock when a purchase is made).
4. **Prisma ORM**: The single source of truth for database interactions. Utilizes a single unified schema (`schema.prisma`).
5. **MySQL**: The relational database. Locally hosted during development, and provisioned on Railway for production.

## Database & Environment Configuration

- **Unified Schema**: There is only one Prisma schema (`schema.prisma`). No separate local or production schemas exist, and no local-only generators (like SQLite) are used.
- **Environment Variables**: The database connection string is strictly loaded from the `DATABASE_URL` environment variable. The Express app listens on `process.env.PORT` (fallback 3000 allowed locally). Other critical variables include `JWT_SECRET` and optional payment keys.
  - **Local**: `DATABASE_URL="mysql://root:password@localhost:3306/erp_db"`
  - **Railway**: Uses the automatically injected `DATABASE_URL` provided by the Railway MySQL plugin. Railway deployment requires zero code changes.
- **No Hardcoding**: No host, port, or credentials (no mock data) are ever hardcoded in the application code.
- **No Environment-Specific Branching**: The codebase behaves identically across all environments. Environment variables alone control connections and ports.

## Multi-Tenant Architecture
The architecture guarantees multi-tenancy at the database level. Every transactional and master data table (e.g., `Product`, `Invoice`, `Customer`, `CompanySetting`) includes a `companyId` column. 
- The `companyId` is extracted from the user's JWT upon authentication.
- Every Prisma query must automatically append `where: { companyId }` to ensure data isolation.

## Database Indexing Strategy
To ensure high performance and maintain data integrity in a multi-tenant environment, the database schema strictly follows these indexing patterns:
1. **Tenant-Level Indexes:** Every core table must be indexed on `companyId` to optimize the mandatory isolation queries.
2. **Composite Uniqueness:** Logical uniqueness is scoped per tenant. For example, `@@unique([sku, companyId])` on the `Product` model ensures SKUs are unique *within* a company, but allows identical SKUs across different companies in the SaaS.
3. **Foreign Key Optimization:** Prisma inherently indexes relational foreign keys (e.g., `customerId`, `warehouseId`). This accelerates JOIN equivalents and ensures atomic `$transaction` operations execute swiftly.

## Connection Lifecycle

1. **Initialization**: The Prisma Client is instantiated once and reused across the application to manage connection pooling efficiently.
2. **Request Handling**: Each incoming request utilizes the existing Prisma connection pool.
3. **Termination**: The connection pool gracefully disconnects during application shutdown.

## Transaction Flow

Transactions (`prisma.$transaction`) are heavily utilized to ensure atomicity, particularly in modules bridging Inventory and Finance (e.g., creating a Sales Invoice and simultaneously updating stock and receivable accounts).
- If any operation within the transaction fails, all operations rollback to prevent corrupted states (e.g., deducting stock without creating a financial entry).

## Startup & Shutdown Sequence

### Startup
1. Environment variables are loaded (`dotenv`).
2. The Express server initializes.
3. Prisma Client connects to the MySQL database (validating the `DATABASE_URL`).
4. The server begins listening on the designated `process.env.PORT` (fallback 3000 allowed locally).

### Shutdown
1. Intercept `SIGINT` or `SIGTERM` signals.
2. Stop accepting new HTTP requests.
3. Await completion of ongoing Prisma transactions.
4. Call `prisma.$disconnect()` to gracefully close database connections.
5. Exit the process.

## Error Handling

A centralized error handling strategy ensures consistent API responses:
- **400 Bad Request**: Input validation failures or malformed requests.
- **401 Unauthorized**: Missing or invalid JWT tokens.
- **403 Forbidden**: User lacks sufficient role privileges.
- **404 Not Found**: Requested resource or record does not exist.
- **409 Conflict**: Business rule violation (e.g., duplicate email, insufficient stock).
- **422 Unprocessable Entity**: Semantic errors.
- **500 Internal Server Error**: Unhandled exceptions, database connection drops. (Stack traces are hidden in production).
