# Personal Finance Tracker — Backend Architecture & API

A production-ready backend for personal finance tracking built with **Node.js**, **Express.js**, and **PostgreSQL**.

---

## Table of Contents

- [Overview](#-overview)
- [What’s Implemented](#whats-implemented)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [Feature Breakdown](#-feature-breakdown)
- [Project Structure](#-project-structure)
- [Data Model & ER Diagram](#-data-model--er-diagram)
- [Backend Flow Diagrams](#-backend-flow-diagrams)
- [Running Locally](#-running-locally)
- [Environment Variables](#-environment-variables)
- [API Endpoint Summary](#-api-endpoint-summary)
- [Design Decisions](#-design-decisions)

---

## Overview

This repository contains the backend for a Personal Finance Tracker.
It offers secure user authentication, transaction tracking, category and budget management, multi-currency support, receipt uploads, scheduled notifications, and analytics.

---

## What’s Implemented

- Authentication: email/password login and Google OAuth
- JWT-secured routes with profile management
- Transaction CRUD for income and expenses
- Receipt upload and static serving from `/uploads/receipts`
- Multi-currency support with INR normalization
- Category management with type-safe income/expense enforcement
- Monthly budgets with tracking and alerting
- Dashboard and monthly report endpoints
- Email notification pipeline using SendGrid
- Scheduled daily/weekly/monthly notification checks
- Notification logging and deduplication

---

## Tech Stack

| Layer         | Technology                  |
| ------------- | --------------------------- |
| Runtime       | Node.js                     |
| Web Framework | Express.js                  |
| Database      | PostgreSQL                  |
| Security      | JWT + bcryptjs              |
| Validation    | Zod                         |
| DB Driver     | node-postgres (`pg`)        |
| Email         | SendGrid (`@sendgrid/mail`) |
| Uploads       | Multer                      |
| OAuth         | google-auth-library         |
| Config        | dotenv                      |

---

## System Architecture

The backend is designed with layered separation:

1. **Routes** — map incoming HTTP requests to controllers
2. **Middleware** — guards, validation, uploads, error handling
3. **Controllers** — thin adapters that call services
4. **Services** — business logic and orchestration of repositories
5. **Repositories** — raw SQL queries for data access
6. **Database** — PostgreSQL enforces the final data contract

### Architecture flow

![alt text](image.png)

## Feature Breakdown

### Core platform features

- Secure user registration and login
- Google OAuth login flow
- JWT authentication middleware
- User profile read/update

### Transaction management

- Add/edit/delete transactions
- Support for `income` and `expense` transaction types
- Preserve original currency while storing normalized INR value
- Receipt upload support (`image/jpeg`, `image/png`, `application/pdf`)
- Receipt asset access via static route `/uploads`

### Categories

- Global default system categories
- User-specific categories
- Category type enforcement to prevent mismatched `income`/`expense`
- Delete category support where allowed

### Budgets

- Create or update monthly budgets per category
- Budget limit enforcement and analytics
- One budget per `user_id + category_id + month + year`

### Reporting and analytics

- Dashboard aggregate endpoint
- Monthly income vs expense reports
- Weekly summary output
- Top spending category detection
- Recurring payment detection
- Highest spending day and spending spike analysis

### Notifications and automation

- `notification_log` records all sent alerts
- Email notifications via SendGrid
- Daily, weekly, and monthly automated checks
- Alerts for budgets, spikes, inactivity, savings, recurring payments, receipts
- Manual trigger endpoints for notification checks

---

## Data Model & ER Diagram

### Entity summary

- `users`: accounts and credentials
- `categories`: system or user-specific categories
- `transactions`: income/expense records with currency, converted amount, and receipt_url metadata
- `budgets`: monthly budget targets per category
- `notification_log`: saved notification history

### ER diagram

```mermaid
erDiagram
    users {
        UUID id PK
        VARCHAR name
        VARCHAR email UK
        TEXT password_hash
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    categories {
        UUID id PK
        VARCHAR name
        VARCHAR type
        UUID user_id FK
    }

    transactions {
        UUID id PK
        UUID user_id FK
        UUID category_id FK
        VARCHAR type
        NUMERIC amount
        VARCHAR currency
        NUMERIC converted_amount
        TEXT description
        VARCHAR receipt_url
        DATE date
        TIMESTAMPTZ created_at
    }

    budgets {
        UUID id PK
        UUID user_id FK
        UUID category_id FK
        NUMERIC limit_amount
        SMALLINT month
        SMALLINT year
        TIMESTAMPTZ created_at
    }

    notification_log {
        UUID id PK
        UUID user_id FK
        VARCHAR type
        TEXT message
        TIMESTAMPTZ sent_at
    }

    users ||--o{ categories : "owns or inherits"
    users ||--o{ transactions : "records"
    users ||--o{ budgets : "plans"
    users ||--o{ notification_log : "receives"
    categories ||--o{ transactions : "classifies"
    categories ||--o{ budgets : "supports"
```

### Database rules and constraints

- `categories.user_id` is nullable: null means global category
- `transactions(category_id, type)` references `categories(id, type)` so category and transaction type must match
- `budgets` are unique per month/year/category for each user
- `notification_log` enables same-day deduplication of alerts
- `NUMERIC(12,2)` is used for financial values instead of float

---

## 🔁 Backend Flow Diagrams

### Request handling flow

```mermaid
flowchart TD
    Client[Client] --> Route[/api/.../endpoint]
    Route --> Auth[Auth Middleware]
    Auth --> Validate[Validation Middleware]
    Validate --> Controller[Controller]
    Controller --> Service[Service Layer]
    Service --> Repository[Repository Layer]
    Repository --> DB[PostgreSQL]
    Service --> Notification[NotificationService]
    Repository --> Upload[Uploads/receipts]
```

### Notification flow

```mermaid
sequenceDiagram
    participant User as User
    participant API as API Route
    participant NS as NotificationService
    participant Repo as NotificationRepository
    participant Email as SendGrid

    User->>API: create / update transaction
    API->>NS: onTransactionCreated(userId, transaction)
    NS->>Repo: getBudgetsForCurrentMonth(userId)
    Repo-->>NS: budget list
    NS->>Email: sendEmail(...)
    Email-->>NS: result
    NS->>Repo: logNotification(userId, type, message)
    Repo-->>NS: inserted
```

### Validation and persistence state flow

```mermaid
stateDiagram-v2
    [*] --> ReceiveRequest
    ReceiveRequest --> Authenticate
    Authenticate --> ValidatePayload
    ValidatePayload --> ValidateCategoryType
    ValidateCategoryType --> ConvertAmount
    ConvertAmount --> PersistTransaction
    PersistTransaction --> AsyncNotifications
    AsyncNotifications --> Completed
```

---

## 🏃 Running Locally

### Install

```bash
cd fischer-j/server
npm install
```

### Environment setup

Create a `.env` file with:

```env
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/finance_tracker
JWT_SECRET=your_secret
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=your_google_client_id_here
SENDGRID_API_KEY=your_sendgrid_api_key
EMAIL_FROM=notifications@yourdomain.com
DB_USER=your_db_user
DB_NAME=your_db_name
```

### Start app

```bash
npm run dev
```

### Run migrations

```bash
npm run db:migrate
```

> Note: `db:migrate` now runs every SQL file in `server/migrations` in order, including the Google OAuth schema update.

---

## 🌐 API Endpoint Summary

### Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/google`
- `GET /api/auth/profile`
- `PUT /api/auth/profile`

### Categories

- `GET /api/categories`
- `POST /api/categories`
- `DELETE /api/categories/:id`

### Transactions

- `GET /api/transactions`
- `GET /api/transactions/:id`
- `POST /api/transactions`
- `PATCH /api/transactions/:id`
- `DELETE /api/transactions/:id`

### Dashboard

- `GET /api/dashboard`

### Reports

- `GET /api/reports/monthly`

### Budgets

- `GET /api/budgets`
- `POST /api/budgets`
- `DELETE /api/budgets/:id`

### Notifications

- `POST /api/notifications/trigger/daily`
- `POST /api/notifications/trigger/weekly`
- `POST /api/notifications/trigger/monthly`

---

## ⚙️ Environment Variables

Required variables for full feature support:

- `PORT`
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `GOOGLE_CLIENT_ID`
- `SENDGRID_API_KEY`
- `EMAIL_FROM`
- `DB_USER`
- `DB_NAME`

---

## 🧠 Design Decisions

- Use `NUMERIC(12,2)` for all currency values to avoid floating-point drift.
- Store `currency` and `converted_amount` so raw input and normalized analytics coexist.
- Enforce category/transaction type consistency at both service and DB layers.
- Keep controllers thin and business logic in services.
- Serve receipts as static assets rather than storing blobs in the database.
- Use raw SQL in repository classes for performance and auditability.
- Schedule notification checks using an in-process scheduler for simplicity.

---

## 📌 Reviewer Notes

This README is written from a backend-first perspective:

1. feature set first,
2. implementation architecture second,
3. data model third,
4. diagrams last.

If required, I can also add a `TASKS.md` with completed vs pending features and a dedicated deployment checklist.

### Key Design Decisions

| Decision                                                | Reason                                                                           |
| ------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `NUMERIC(12,2)` for money                               | Never use `FLOAT` for currency — floating-point precision causes rounding errors |
| `UUID` primary keys                                     | No sequential ID enumeration; globally unique across distributed systems         |
| `user_id IS NULL` on categories                         | Marks a category as "global" (available to all users) vs personal                |
| `CHECK (amount <> 0)`                                   | Zero-amount transactions have no financial meaning — rejected at DB level        |
| `ON CONFLICT DO UPDATE` for budgets                     | Atomic upsert — no race conditions between INSERT and UPDATE                     |
| `UNIQUE (user_id, category_id, month, year)` on budgets | One budget per category per month per user — enforced by DB                      |
| 5 indexes on transactions                               | `user_id`, `category_id`, `date`, `type`, `(user_id, date)` — top query patterns |
| Trigger `set_updated_at`                                | Auto-updates `updated_at` on every row change — no app-level code needed         |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ (local or remote)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd fischer-j/server

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# Run the migration (creates all tables + seeds 12 global categories)
npm run db:migrate

# Start the server
npm run dev       # development (with --watch)
npm start         # production
```

---

## 🔐 Environment Variables

```env
PORT=5000

# PostgreSQL — use external URL for remote DB, local URL for dev
DATABASE_URL=postgresql://user:password@host:5432/dbname

# JWT
JWT_SECRET=your_long_random_secret_here
JWT_EXPIRES_IN=7d
```

> **Note:** For Render PostgreSQL, use the **External Database URL** from your Render dashboard. The internal URL only works within Render's network.

---

## 📡 API Reference

All protected routes require: `Authorization: Bearer <token>`

All responses follow a consistent envelope:

```json
{ "success": true, "message": "...", "data": { ... } }
```

---

### 🔑 Auth

| Method | Endpoint             | Auth | Description        |
| ------ | -------------------- | ---- | ------------------ |
| POST   | `/api/auth/register` | ❌   | Register new user  |
| POST   | `/api/auth/login`    | ❌   | Login, receive JWT |

**Register**

```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "Ananya Newton",
  "email": "ananya@fintech.dev",
  "password": "securepass123"
}
```

```json
// 201 Created
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": "uuid",
      "name": "Ananya Newton",
      "email": "ananya@fintech.dev"
    },
    "token": "eyJhbGci..."
  }
}
```

---

### 🗂 Categories

| Method | Endpoint              | Description                  |
| ------ | --------------------- | ---------------------------- |
| GET    | `/api/categories`     | List all (global + personal) |
| POST   | `/api/categories`     | Create personal category     |
| DELETE | `/api/categories/:id` | Delete personal category     |

```http
POST /api/categories
{ "name": "Pet Expenses", "type": "expense" }
```

**Global categories seeded automatically:**
`Salary`, `Freelance`, `Investment`, `Other Income`, `Food`, `Transport`, `Utilities`, `Rent`, `Entertainment`, `Healthcare`, `Shopping`, `Other Expense`

---

### 💸 Transactions

| Method | Endpoint                | Description                    |
| ------ | ----------------------- | ------------------------------ |
| GET    | `/api/transactions`     | List with filters + pagination |
| GET    | `/api/transactions/:id` | Single transaction             |
| POST   | `/api/transactions`     | Create transaction             |
| PATCH  | `/api/transactions/:id` | Partial update                 |
| DELETE | `/api/transactions/:id` | Delete                         |

**Query params for GET `/api/transactions`:**

| Param         | Type                  | Example                  |
| ------------- | --------------------- | ------------------------ |
| `type`        | `income` \| `expense` | `?type=expense`          |
| `category_id` | UUID                  | `?category_id=...`       |
| `start_date`  | YYYY-MM-DD            | `?start_date=2026-01-01` |
| `end_date`    | YYYY-MM-DD            | `?end_date=2026-04-30`   |
| `page`        | integer               | `?page=2`                |
| `limit`       | integer (max 100)     | `?limit=10`              |

**Create Transaction:**

```json
{
  "category_id": "uuid-of-food-category",
  "type": "expense",
  "amount": -3500,
  "description": "Monthly groceries",
  "date": "2026-04-05"
}
```

> **Rules:**
>
> - `amount` cannot be `0`
> - Negative amounts are allowed (refunds)
> - `type` must match the category's type

**Response includes pagination:**

```json
{
  "data": {
    "transactions": [ ... ],
    "pagination": { "page": 1, "limit": 20, "total": 47, "totalPages": 3 }
  }
}
```

---

### 📊 Dashboard

| Method | Endpoint         | Description              |
| ------ | ---------------- | ------------------------ |
| GET    | `/api/dashboard` | Full financial dashboard |

Optional: `?start_date=2026-01-01&end_date=2026-04-30`

```json
{
  "data": {
    "summary": {
      "total_income": 50000.0,
      "total_expense": 32000.0,
      "savings": 18000.0
    },
    "expense_by_category": [
      { "category_name": "Rent", "total": 15000.0 },
      { "category_name": "Food", "total": 8000.0 }
    ],
    "income_by_category": [{ "category_name": "Salary", "total": 45000.0 }],
    "daily_expenses": [
      { "date": "2026-04-01", "total_expense": 350.0 },
      { "date": "2026-04-05", "total_expense": 3500.0 }
    ],
    "highest_spending_day": {
      "date": "2026-04-05",
      "total_expense": 3500.0
    }
  }
}
```

> All 5 aggregations run in **parallel** (`Promise.all`) and computed fully in SQL.

---

### 📈 Reports

| Method | Endpoint               | Description               |
| ------ | ---------------------- | ------------------------- |
| GET    | `/api/reports/monthly` | Monthly income vs expense |

Optional: `?year=2026`

```json
{
  "data": {
    "report": [
      {
        "month": "2026-01",
        "total_income": 50000,
        "total_expense": 30000,
        "savings": 20000
      },
      {
        "month": "2026-02",
        "total_income": 50000,
        "total_expense": 28000,
        "savings": 22000
      }
    ]
  }
}
```

---

### 💼 Budgets

| Method | Endpoint           | Description                       |
| ------ | ------------------ | --------------------------------- |
| GET    | `/api/budgets`     | List budgets with actual spending |
| POST   | `/api/budgets`     | Set/update budget (upsert)        |
| DELETE | `/api/budgets/:id` | Remove a budget                   |

```json
// POST /api/budgets
{
  "category_id": "uuid-of-food-category",
  "limit_amount": 8000,
  "month": 4,
  "year": 2026
}
```

```json
// GET /api/budgets?month=4&year=2026
{
  "data": {
    "budgets": [
      {
        "category_name": "Food",
        "limit_amount": 8000.0,
        "amount_spent": 3500.0,
        "remaining": 4500.0,
        "is_over_budget": false,
        "month": 4,
        "year": 2026
      }
    ]
  }
}
```

> Budgets can **only be set for expense categories**.

---

## ⚠️ Error Handling

All errors go through the **centralized `errorHandler` middleware** — no try-catch scattered across controllers.

| Status | When                                              |
| ------ | ------------------------------------------------- |
| `400`  | Validation error or business rule violation       |
| `401`  | Missing or invalid JWT token                      |
| `404`  | Resource not found                                |
| `409`  | Duplicate record (e.g., email already registered) |
| `500`  | Unexpected server error                           |

**Validation error response:**

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "amount", "message": "Amount cannot be zero" },
    { "field": "email", "message": "Invalid email address" }
  ]
}
```

**Special Postgres error codes handled automatically:**

- `23505` (unique_violation) → `409 Conflict`
- `23503` (foreign_key_violation) → `400 Bad Request`

---

## 🧠 Design Decisions

### Why Express 5?

Express 5 natively propagates async errors to the error handler — no need for `express-async-errors` wrapper or try-catch blocks in every controller.

### Why Zod over Joi?

Zod is TypeScript-first, has excellent TypeScript inference, and its `.safeParse()` gives structured errors without throwing. All schemas live in **one file** (`schemas.js`) — single source of truth.

### Why singleton repositories?

`module.exports = new XRepository()` means the same `pg.Pool` instance is reused across all requests — no new connections opened per request.

### Why `validate(schema, 'query')` for GET requests?

The same generic middleware handles both body and query params by passing a second argument (`'body'` or `'query'`). Zod's `.coerce` transforms string query params to numbers/booleans automatically.

### Why PATCH over PUT for updates?

PATCH means "partial update" — clients only send the fields they want to change. PUT would require the full resource body. PATCH is semantically correct and more practical.
