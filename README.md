# 💰 Personal Finance Tracker — Backend API

A production-grade REST API for tracking personal income, expenses, budgets, and financial reports — built with **Node.js**, **Express.js**, and **PostgreSQL**.

---

## 🧭 Table of Contents

- [Overview](#-overview)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Database Design & ER Diagram](#-database-design--er-diagram)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [Error Handling](#-error-handling)
- [Design Decisions](#-design-decisions)

---

## 📌 Overview

This backend system lets users:
- Register and log in securely (JWT + bcrypt)
- Create, update, and delete financial transactions (income & expenses)
- Organize transactions by categories (global system categories + personal)
- Set monthly budgets per category and track spending against them
- View a real-time financial dashboard (income, expense, savings, breakdowns)
- Generate monthly income vs. expense reports

All database aggregations are done **purely in SQL** — no JavaScript loops, no N+1 queries.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js v5 |
| Database | PostgreSQL (hosted on Render) |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Validation | Zod |
| DB Driver | node-postgres (`pg`) |
| Config | dotenv |

---

## 🏗 Architecture

The system follows a strict **4-layer architecture**. Each layer has one job and communicates only with the layer directly below it.

```
HTTP Request
     │
     ▼
┌─────────────┐
│   Routes    │  ← Maps URL + verb to controller. Applies middleware chain.
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  Middleware     │  ← auth.js (JWT verify), validate.js (Zod schema), errorHandler.js
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  Controllers    │  ← Reads req, calls service, sends response. Zero business logic.
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│   Services      │  ← ALL business rules live here. Orchestrates repositories.
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  Repositories   │  ← Raw SQL queries only. Returns plain JS objects.
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│   PostgreSQL    │  ← Source of truth. Enforces constraints at the DB level too.
└─────────────────┘
```

### Why this structure?

| Principle | How it's applied |
|---|---|
| **Single Responsibility** | Each file/class does exactly one thing |
| **Open/Closed** | Add a new feature by adding files, not editing existing ones |
| **No try-catch in controllers** | Express 5 propagates async errors automatically to `errorHandler` |
| **SQL over JS loops** | Dashboard aggregations, monthly reports, and budget spending all computed in SQL |
| **OOP Repositories & Services** | All repos and services are classes, exported as singletons |

---

## 📁 Project Structure

```
server/
├── app.js                        # Express app (no listen — importable for testing)
├── server.js                     # Entry point — connects DB, starts listening
├── migrations/
│   └── 001_initial_schema.sql    # All tables, indexes, triggers, seed data
└── src/
    ├── config/
    │   └── db.js                 # pg.Pool singleton (shared across all repos)
    ├── validations/
    │   └── schemas.js            # ALL Zod schemas in one file
    ├── middlewares/
    │   ├── auth.js               # JWT verification → attaches req.user
    │   ├── validate.js           # Generic Zod validation middleware
    │   └── errorHandler.js       # Centralized error handler (catches everything)
    ├── repositories/             # Pure SQL — no business logic
    │   ├── UserRepository.js
    │   ├── CategoryRepository.js
    │   ├── TransactionRepository.js
    │   ├── DashboardRepository.js
    │   ├── ReportRepository.js
    │   └── BudgetRepository.js
    ├── services/                 # Business rules & orchestration
    │   ├── AuthService.js
    │   ├── CategoryService.js
    │   ├── TransactionService.js
    │   ├── DashboardService.js
    │   ├── ReportService.js
    │   └── BudgetService.js
    ├── controllers/              # HTTP layer only — req in, res out
    │   ├── AuthController.js
    │   ├── CategoryController.js
    │   ├── TransactionController.js
    │   ├── DashboardController.js
    │   ├── ReportController.js
    │   └── BudgetController.js
    ├── routes/                   # Route definitions + middleware chains
    │   ├── auth.routes.js
    │   ├── category.routes.js
    │   ├── transaction.routes.js
    │   ├── dashboard.routes.js
    │   ├── report.routes.js
    │   └── budget.routes.js
    └── utils/
        ├── AppError.js           # Custom error class (statusCode + isOperational)
        └── response.js           # sendSuccess() — consistent JSON envelope
```

---

## 🗄 Database Design & ER Diagram

### Schema Overview

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
        TEXT description
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

    users ||--o{ transactions : "has many"
    users ||--o{ budgets : "has many"
    users ||--o{ categories : "owns (personal)"
    categories ||--o{ transactions : "classifies"
    categories ||--o{ budgets : "budgeted in"
```

### Key Design Decisions

| Decision | Reason |
|---|---|
| `NUMERIC(12,2)` for money | Never use `FLOAT` for currency — floating-point precision causes rounding errors |
| `UUID` primary keys | No sequential ID enumeration; globally unique across distributed systems |
| `user_id IS NULL` on categories | Marks a category as "global" (available to all users) vs personal |
| `CHECK (amount <> 0)` | Zero-amount transactions have no financial meaning — rejected at DB level |
| `ON CONFLICT DO UPDATE` for budgets | Atomic upsert — no race conditions between INSERT and UPDATE |
| `UNIQUE (user_id, category_id, month, year)` on budgets | One budget per category per month per user — enforced by DB |
| 5 indexes on transactions | `user_id`, `category_id`, `date`, `type`, `(user_id, date)` — top query patterns |
| Trigger `set_updated_at` | Auto-updates `updated_at` on every row change — no app-level code needed |

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

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | ❌ | Register new user |
| POST | `/api/auth/login` | ❌ | Login, receive JWT |

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
    "user": { "id": "uuid", "name": "Ananya Newton", "email": "ananya@fintech.dev" },
    "token": "eyJhbGci..."
  }
}
```

---

### 🗂 Categories

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/categories` | List all (global + personal) |
| POST | `/api/categories` | Create personal category |
| DELETE | `/api/categories/:id` | Delete personal category |

```http
POST /api/categories
{ "name": "Pet Expenses", "type": "expense" }
```

**Global categories seeded automatically:**
`Salary`, `Freelance`, `Investment`, `Other Income`, `Food`, `Transport`, `Utilities`, `Rent`, `Entertainment`, `Healthcare`, `Shopping`, `Other Expense`

---

### 💸 Transactions

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/transactions` | List with filters + pagination |
| GET | `/api/transactions/:id` | Single transaction |
| POST | `/api/transactions` | Create transaction |
| PATCH | `/api/transactions/:id` | Partial update |
| DELETE | `/api/transactions/:id` | Delete |

**Query params for GET `/api/transactions`:**

| Param | Type | Example |
|---|---|---|
| `type` | `income` \| `expense` | `?type=expense` |
| `category_id` | UUID | `?category_id=...` |
| `start_date` | YYYY-MM-DD | `?start_date=2026-01-01` |
| `end_date` | YYYY-MM-DD | `?end_date=2026-04-30` |
| `page` | integer | `?page=2` |
| `limit` | integer (max 100) | `?limit=10` |

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

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/dashboard` | Full financial dashboard |

Optional: `?start_date=2026-01-01&end_date=2026-04-30`

```json
{
  "data": {
    "summary": {
      "total_income": 50000.00,
      "total_expense": 32000.00,
      "savings": 18000.00
    },
    "expense_by_category": [
      { "category_name": "Rent", "total": 15000.00 },
      { "category_name": "Food", "total": 8000.00 }
    ],
    "income_by_category": [
      { "category_name": "Salary", "total": 45000.00 }
    ],
    "daily_expenses": [
      { "date": "2026-04-01", "total_expense": 350.00 },
      { "date": "2026-04-05", "total_expense": 3500.00 }
    ],
    "highest_spending_day": {
      "date": "2026-04-05",
      "total_expense": 3500.00
    }
  }
}
```

> All 5 aggregations run in **parallel** (`Promise.all`) and computed fully in SQL.

---

### 📈 Reports

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/reports/monthly` | Monthly income vs expense |

Optional: `?year=2026`

```json
{
  "data": {
    "report": [
      { "month": "2026-01", "total_income": 50000, "total_expense": 30000, "savings": 20000 },
      { "month": "2026-02", "total_income": 50000, "total_expense": 28000, "savings": 22000 }
    ]
  }
}
```

---

### 💼 Budgets

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/budgets` | List budgets with actual spending |
| POST | `/api/budgets` | Set/update budget (upsert) |
| DELETE | `/api/budgets/:id` | Remove a budget |

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
    "budgets": [{
      "category_name": "Food",
      "limit_amount": 8000.00,
      "amount_spent": 3500.00,
      "remaining": 4500.00,
      "is_over_budget": false,
      "month": 4,
      "year": 2026
    }]
  }
}
```

> Budgets can **only be set for expense categories**.

---

## ⚠️ Error Handling

All errors go through the **centralized `errorHandler` middleware** — no try-catch scattered across controllers.

| Status | When |
|---|---|
| `400` | Validation error or business rule violation |
| `401` | Missing or invalid JWT token |
| `404` | Resource not found |
| `409` | Duplicate record (e.g., email already registered) |
| `500` | Unexpected server error |

**Validation error response:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "amount", "message": "Amount cannot be zero" },
    { "field": "email",  "message": "Invalid email address" }
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
