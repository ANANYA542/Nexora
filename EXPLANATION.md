# Personal Finance Tracker — Complete Codebase Explanation

> This document provides a **detailed, line-by-line explanation** of every file in the project.
> The project is built with **Node.js + Express + PostgreSQL** and follows a layered architecture:
> **Routes → Controllers → Services → Repositories → Database**.

---

## Table of Contents

1. [Project Structure Overview](#1-project-structure-overview)
2. [Root Configuration Files](#2-root-configuration-files)
3. [Server Entry Points](#3-server-entry-points)
4. [Database Configuration](#4-database-configuration)
5. [Database Migrations](#5-database-migrations)
6. [Middleware Layer](#6-middleware-layer)
7. [Validation Layer](#7-validation-layer)
8. [Utility Layer](#8-utility-layer)
9. [Route Layer](#9-route-layer)
10. [Controller Layer](#10-controller-layer)
11. [Service Layer (Business Logic)](#11-service-layer-business-logic)
12. [Repository Layer (Database Queries)](#12-repository-layer-database-queries)
13. [Client-Side HTML Pages](#13-client-side-html-pages)
14. [Client-Side JavaScript](#14-client-side-javascript)
15. [Client-Side CSS](#15-client-side-css)
16. [Suggested Improvements](#16-suggested-improvements)

---

## 1. Project Structure Overview

```
fischer-j/
├── .gitignore                         # Git ignore rules
├── README.md                          # Project documentation
├── client/                            # Frontend (basic HTML/CSS/JS)
│   ├── css/styles.css                 # Global stylesheet
│   ├── js/                            # Client-side JavaScript modules
│   │   ├── api.js                     # Shared API client, auth utilities
│   │   ├── auth.js                    # Login and registration handlers
│   │   ├── dashboard.js               # Dashboard rendering and charts
│   │   ├── transactions.js            # Transaction CRUD UI
│   │   ├── categories.js              # Category management UI
│   │   ├── budgets.js                 # Budget management UI
│   │   ├── reports.js                 # Monthly report UI
│   │   └── notifications.js           # Notification panel UI
│   ├── index.html                     # Login page
│   ├── register.html                  # Registration page
│   ├── dashboard.html                 # Main dashboard
│   ├── transactions.html              # Transactions page
│   ├── categories.html                # Categories page
│   ├── budgets.html                   # Budgets page
│   └── reports.html                   # Reports page
├── server/
│   ├── .env.example                   # Environment variable template
│   ├── package.json                   # Project metadata and dependencies
│   ├── server.js                      # Application bootstrap (entry point)
│   ├── app.js                         # Express application setup
│   ├── migrate_all.js                 # Database migration runner
│   ├── migrations/                    # SQL migration files
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_add_google_auth.sql
│   │   ├── 003_optimize_indexes.sql
│   │   ├── 004_notification_log.sql
│   │   ├── 005_feature_updates.sql
│   │   └── 006_anomaly_detection.sql
│   ├── uploads/                       # Receipt file uploads
│   └── src/
│       ├── config/db.js               # PostgreSQL connection pool
│       ├── middlewares/               # Express middleware
│       │   ├── auth.js                # JWT authentication guard
│       │   ├── errorHandler.js        # Centralized error handler
│       │   ├── upload.js              # Multer file upload config
│       │   └── validate.js            # Zod validation middleware
│       ├── validations/schemas.js     # All Zod validation schemas
│       ├── utils/                     # Shared utility modules
│       │   ├── AppError.js            # Custom operational error class
│       │   ├── response.js            # Standardized success response helper
│       │   ├── http.js                # Pre-configured Axios instance
│       │   ├── currency.js            # Static currency conversion utilities
│       │   ├── email.js               # SendGrid email service wrapper
│       │   └── aiClient.js            # Groq AI API client wrapper
│       ├── routes/                    # Express route definitions
│       ├── controllers/               # Request handlers (thin layer)
│       ├── services/                  # Core business logic
│       └── repositories/              # Raw SQL database access
```

---

## 2. Root Configuration Files

### `.gitignore`

```
Line 1-3:   Ignores all node_modules/ directories anywhere in the project.
Line 5-7:   Ignores .env files at every level to protect secrets (DB credentials, API keys).
Line 9-10:  Ignores *.log files — runtime logs should not be committed.
Line 12-13: Ignores macOS .DS_Store system files.
Line 15-17: Ignores dist/ and build/ output folders from any future build steps.
Line 19-21: Ignores IDE-specific directories (.vscode, .idea).
Line 22:    Ignores the api_testing_Screenshots folder (Postman screenshots).
```

### `server/package.json`

```
Line 1-10:  Declares project metadata:
            - name: "finance-tracker-server"
            - version: 1.0.0
            - main: "server.js" — Node uses this as the default entry point
            - Scripts:
              • "start": Runs `node server.js` for production
              • "dev": Runs `node --watch server.js` for auto-restart during development
              • "db:migrate": Runs `node migrate_all.js` to execute all SQL migrations

Line 20-33: Lists all runtime dependencies:
            - @sendgrid/mail: SendGrid SDK for sending transactional emails
            - axios: HTTP client for external API calls (Groq AI, currency APIs)
            - bcryptjs: Password hashing with bcrypt algorithm
            - cors: Cross-Origin Resource Sharing middleware
            - dotenv: Loads environment variables from .env file
            - express: Web framework for building the RESTful API
            - express-validator: (legacy dependency, Zod is actually used instead)
            - google-auth-library: Google OAuth 2.0 ID token verification
            - jsonwebtoken: JWT creation and verification for session management
            - multer: Multipart form-data parsing for file uploads (receipts)
            - pg: PostgreSQL client for Node.js
            - uuid: UUID generation (used alongside PostgreSQL's gen_random_uuid)
            - zod: Schema validation library (validates all incoming request data)
```

### `server/.env.example`

```
Line 2:  PORT=5000 — The port the Express server listens on.
Line 5:  DATABASE_URL= — Full PostgreSQL connection string (e.g., postgres://user:pass@host:5432/db).
Line 8:  JWT_SECRET= — Secret key used to sign and verify JWT tokens.
Line 9:  JWT_EXPIRES_IN=7d — Token expiration duration (7 days).
Line 12: GOOGLE_CLIENT_ID= — Google OAuth Client ID for verifying Google Sign-In tokens.
```

---

## 3. Server Entry Points

### `server/server.js` — Application Bootstrap

This is the very first file Node.js executes. It connects to the database, starts the HTTP server, and sets up graceful shutdown.

```
Line 1:   require('dotenv').config()
          → Loads all key-value pairs from the .env file into process.env.
            This MUST be the very first line so that all subsequent code
            (database, JWT, SendGrid) can read their configuration.

Line 2:   const app = require('./app')
          → Imports the fully configured Express application from app.js.

Line 3:   const pool = require('./src/config/db')
          → Imports the PostgreSQL connection pool instance.

Line 5:   const PORT = process.env.PORT || 5000
          → Reads the desired port from environment variables, defaults to 5000.

Line 7-29: start() — async IIFE that bootstraps the server:

  Line 10:  await pool.query('SELECT 1')
            → Runs a trivial query to verify the database connection is alive
              BEFORE accepting any HTTP traffic. If this fails, the server
              won't start (fail-fast pattern).

  Line 11:  console.log('Database connected')
            → Confirms successful DB connection in the terminal.

  Line 13:  const server = await app.listen(PORT)
            → Binds Express to the port. `app.listen` returns the underlying
              http.Server instance, which we store for later shutdown.

  Line 14-16: Logs the running URL and current NODE_ENV to the terminal.

  Line 19-25: SIGTERM handler — graceful shutdown:
              When the process receives a SIGTERM signal (sent by Docker,
              systemd, Heroku, etc. during deployment restarts):
              1. Stops accepting new connections (server.close)
              2. Closes all idle PostgreSQL connections (pool.end)
              3. Exits cleanly with code 0

  Line 26-28: catch block — if anything in start() throws:
              Logs the error and exits with code 1 (failure).

Line 32:  start() — Invokes the bootstrap function.
```

### `server/app.js` — Express Application Configuration

This file creates and configures the Express app, registers all routes, and attaches global middleware.

```
Line 1:   require('dotenv').config()
          → Redundant dotenv load (safe because dotenv ignores duplicate calls).
            Ensures .env is available if app.js is ever imported independently.

Line 2:   const express = require('express')
          → Imports the Express framework.

Line 4:   const { errorHandler } = require('./src/middlewares/errorHandler')
          → Imports the centralized error-handling middleware.

Line 7-14: Imports all route modules:
           - authRoutes: Registration, login, Google OAuth, profile management
           - categoryRoutes: CRUD for income/expense categories
           - transactionRoutes: CRUD for financial transactions
           - dashboardRoutes: Aggregated financial overview
           - reportRoutes: Monthly income vs. expense reports
           - budgetRoutes: Budget goal management
           - notificationRoutes: Email notification triggers and history
           - aiRoutes: AI-powered features (chat, categorization, receipt extraction)

Line 15:  const schedulerService = require('./src/services/SchedulerService')
          → Imports the notification scheduler (runs periodic background checks).

Line 17:  const cors = require('cors')
          → Imports CORS middleware for cross-origin requests (client on a
            different port/domain needs to call the API).

Line 19:  const app = express()
          → Creates the Express application instance.

Line 21:  app.use(cors())
          → Enables CORS for ALL origins. In production, this should be
            restricted to specific allowed origins.

Line 22:  app.use(express.json())
          → Parses incoming JSON request bodies (Content-Type: application/json).

Line 23:  app.use(express.urlencoded({ extended: true }))
          → Parses URL-encoded form data (used when multipart forms send
            non-file fields alongside file uploads).

Line 24:  app.use('/uploads', express.static('uploads'))
          → Serves the uploads/ directory as static files.
            This allows uploaded receipts to be accessed via URLs like
            /uploads/receipts/receipt-12345.jpg

Line 26:  Health check endpoint:
          GET /health → Returns { status: "ok", timestamp: "..." }
          Used by deployment platforms (Render, AWS) to verify the app is alive.

Line 29-36: Route mounting — each route module is mounted at its API prefix:
            /api/auth          → authRoutes
            /api/categories    → categoryRoutes
            /api/transactions  → transactionRoutes
            /api/dashboard     → dashboardRoutes
            /api/reports       → reportRoutes
            /api/budgets       → budgetRoutes
            /api/notifications → notificationRoutes
            /api/ai            → aiRoutes

Line 38:  schedulerService.start()
          → Starts the background notification scheduler. This sets up
            setInterval timers for daily, weekly, and monthly checks.

Line 40-42: 404 catch-all — any request that doesn't match a defined route
            returns { success: false, message: "Route not found" }.

Line 44:  app.use(errorHandler)
          → Registers the centralized error handler as the LAST middleware.
            Any error thrown or passed via next(err) in any route/middleware
            flows here for consistent error responses.

Line 46:  module.exports = app
          → Exports the configured app for use by server.js and testing.
```

### `server/migrate_all.js` — Database Migration Runner

Reads all `.sql` files from the `migrations/` directory and executes them in order.

```
Line 1-4:  Imports dotenv, fs, path, and the database pool.

Line 6:    async function runMigrations()
           → Main migration function.

Line 7:    const dir = path.join(__dirname, 'migrations')
           → Resolves the absolute path to the migrations/ directory.

Line 8:    const files = fs.readdirSync(dir).sort()
           → Reads all filenames and sorts them alphabetically.
             Because files are named 001_, 002_, etc., this guarantees
             they run in the correct order.

Line 9:    let hasErrors = false — Error tracking flag.

Line 11-23: Loops through each file:
            - Skips non-.sql files
            - Reads the SQL content from disk
            - Executes it against the database via pool.query(sql)
            - If any migration fails, sets hasErrors = true and BREAKS
              (stops running further migrations to prevent cascading failures)

Line 26-32: If errors occurred, exits with code 1 (failure).
            Otherwise, prints "Done!" and exits with code 0 (success).

Line 35:   runMigrations() — Invokes the migration function immediately.
```

---

## 4. Database Configuration

### `server/src/config/db.js` — PostgreSQL Connection Pool

```
Line 1:   const { Pool } = require('pg')
          → Imports the Pool class from the pg (node-postgres) library.
            A Pool manages a set of reusable database connections, which is
            far more efficient than opening a new connection for every query.

Line 3-6:  const isLocal = ...
           → Detects whether the database is running locally by checking if
             DATABASE_URL is missing or contains "localhost" or "127.0.0.1".

Line 8-11: const pool = new Pool({ ... })
           → Creates the connection pool:
             - connectionString: The full postgres:// URL from environment
             - ssl: Disabled for local development, enabled with
               rejectUnauthorized: false for cloud databases (Render, AWS RDS)
               which use self-signed certificates.

Line 13-16: pool.on('error', ...) — Error event listener:
            If an idle client in the pool encounters an unexpected error
            (e.g., database restarts), this logs it and forces the process
            to exit. This is a safety mechanism — without it, the pool could
            silently hold broken connections.

Line 18:  module.exports = pool
          → Exports the singleton pool instance. Every repository imports
            this same pool, ensuring connection reuse across the entire app.
```

---

## 5. Database Migrations

### `migrations/001_initial_schema.sql` — Core Tables

```
Line 2:    CREATE EXTENSION IF NOT EXISTS "pgcrypto"
           → Enables the pgcrypto extension, which provides gen_random_uuid().
             This is what generates UUIDs for all primary keys.

Line 4-11: CREATE TABLE users
           → The users table stores registered accounts:
             - id: UUID primary key, auto-generated
             - name: User's display name (max 100 chars)
             - email: Unique email address (used for login)
             - password_hash: bcrypt hash of the password
             - created_at / updated_at: Timestamps with timezone

Line 14-20: CREATE FUNCTION set_updated_at()
            → A PL/pgSQL trigger function that automatically sets
              updated_at = NOW() whenever a row is updated.

Line 22-26: CREATE TRIGGER users_updated_at
            → Attaches the set_updated_at() function to the users table.
              Every UPDATE on users automatically refreshes the updated_at column.

Line 29-34: CREATE TABLE categories
            → Stores income/expense categories:
              - id: UUID primary key
              - name: Category name (e.g., "Food", "Salary")
              - type: CHECK constraint — must be 'income' or 'expense'
              - user_id: NULL for system categories, set for user-created ones.
                References users(id) with ON DELETE CASCADE (if user is deleted,
                their custom categories are also deleted).

Line 37-38: UNIQUE INDEX categories_name_type_user_unique
            → Prevents duplicate category names of the same type per user.
              Uses COALESCE to handle NULL user_id (system categories) by
              substituting a zero UUID, so the uniqueness constraint works
              correctly for both system and personal categories.

Line 41-50: CREATE TABLE transactions
            → The core financial data table:
              - id: UUID primary key
              - user_id: Foreign key → users(id), CASCADE on delete
              - category_id: Foreign key → categories(id)
              - type: 'income' or 'expense' (CHECK constraint)
              - amount: NUMERIC(12,2) — up to 12 digits with 2 decimal places.
                CHECK (amount <> 0) prevents zero-value transactions.
              - description: Optional text description
              - date: Transaction date (defaults to CURRENT_DATE)
              - created_at: When the record was inserted

Line 53-57: Indexes on transactions:
            → These speed up the most common queries:
              - idx_transactions_user_id: Filter by user
              - idx_transactions_category_id: Filter by category
              - idx_transactions_date: Filter/sort by date
              - idx_transactions_type: Filter by income/expense
              - idx_transactions_user_id_date: Composite for dashboard queries

Line 60-69: CREATE TABLE budgets
            → Stores monthly budget limits per category:
              - limit_amount: Must be positive (CHECK constraint)
              - month: 1-12 (CHECK constraint)
              - year: Must be >= 2000 (CHECK constraint)
              - UNIQUE (user_id, category_id, month, year): Prevents duplicate
                budgets for the same category in the same month.

Line 72-85: INSERT INTO categories ... ON CONFLICT DO NOTHING
            → Seeds default system categories (user_id = NULL):
              Income: Salary, Freelance, Investment, Other Income
              Expense: Food, Transport, Utilities, Rent, Entertainment,
                       Healthcare, Shopping, Other Expense
              ON CONFLICT DO NOTHING ensures re-running migrations won't
              create duplicates.
```

### `migrations/002_add_google_auth.sql` — Google OAuth Support

```
Line 1-3:  ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE
           → Adds a google_id column to store the Google account's unique sub ID.
             The UNIQUE constraint ensures one Google account maps to one user.

           ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'local'
           → Tracks how the user registered: 'local' (email/password) or 'google'.
             Defaults to 'local' so existing users are unaffected.
```

### `migrations/003_optimize_indexes.sql` — Query Performance

```
Line 2-12: Adds a composite UNIQUE constraint categories_id_type_key on (id, type).
           This enables the compound foreign key in the next statement.

Line 15-23: Adds a composite foreign key fk_transactions_category_type:
            → Ensures that a transaction's (category_id, type) pair matches
              the category's actual (id, type). This prevents, at the database
              level, assigning an income category to an expense transaction.

Line 26-29: Replaces the old user_id+date index with a more efficient one:
            idx_transactions_dashboard — a covering index that INCLUDES amount
            and category_id, allowing dashboard queries to be answered entirely
            from the index without accessing the table rows.

Line 32-33: idx_transactions_list_pagination — optimized for the transaction
            list page's default sort order (date DESC, created_at DESC).

Line 36-37: idx_categories_user_id — speeds up category lookups by user.
```

### `migrations/004_notification_log.sql` — Notification History

```
Line 1-7:  CREATE TABLE notification_log
           → Records every notification sent to users:
             - type: Category of notification (e.g., "budget_exceeded")
             - message: Human-readable log message
             - sent_at: Timestamp of when it was sent

Line 9-10: Two indexes for efficient querying:
           - idx_notification_log_user_id: Find all notifications for a user
           - idx_notification_log_type: Find latest by (user, type) — used to
             check "was this notification already sent today?"
```

### `migrations/005_feature_updates.sql` — Multi-Currency & Receipts

```
Line 2-3:  Adds receipt_url (VARCHAR 500) — stores the file path of uploaded receipts.

Line 6-7:  Adds currency (VARCHAR 10, default 'INR') — the original currency of the
           transaction as entered by the user.

Line 9-10: Adds converted_amount (NUMERIC 12,2) — the amount converted to INR (the
           base currency) for consistent aggregation.

Line 13-15: Backfills converted_amount = amount for all existing rows where it's NULL.

Line 18-19: Makes converted_amount NOT NULL after backfilling, ensuring all future
            transactions must have a converted amount.
```

### `migrations/006_anomaly_detection.sql` — Anomaly Tracking

```
Line 3-4:  Adds is_anomaly BOOLEAN (default FALSE) — flags transactions detected
           as unusual by the anomaly detection system.

Line 6-7:  Adds anomaly_reason TEXT — stores the AI-generated explanation of why
           the transaction was flagged.

Line 9-11: Partial index idx_transactions_anomaly — only indexes rows where
           is_anomaly = TRUE, making anomaly lookups extremely efficient while
           adding zero overhead for normal transactions.
```

---

## 6. Middleware Layer

### `src/middlewares/auth.js` — JWT Authentication Guard

Every protected route passes through this middleware before reaching the controller.

```
Line 1:   const jwt = require('jsonwebtoken')
          → JWT library for token verification.

Line 2:   const AppError = require('../utils/AppError')
          → Custom error class for operational errors.

Line 5:   const authenticate = (req, _res, next) => { ... }
          → Middleware function signature. _res is prefixed with underscore
            because it's intentionally unused (we call next() instead).

Line 6:   const authHeader = req.headers.authorization
          → Reads the Authorization header from the incoming request.

Line 8-9: if (!authHeader || !authHeader.startsWith('Bearer '))
          → Validates that the header exists AND follows the "Bearer <token>"
            format. If not, returns 401 with "Authentication token missing".

Line 12:  const token = authHeader.split(' ')[1]
          → Extracts just the token string after "Bearer ".

Line 14-17: jwt.verify(token, process.env.JWT_SECRET)
            → Verifies the token's signature and expiration.
              If valid, returns the decoded payload { sub: userId, email: ... }.
              Attaches req.user = { id, email } so all downstream handlers
              can access the authenticated user's identity.

Line 18-20: catch → If verification fails (expired, tampered, malformed),
            returns 401 "Invalid or expired token".

Line 23:  module.exports = { authenticate }
```

### `src/middlewares/errorHandler.js` — Centralized Error Handler

Express requires error handlers to have exactly 4 parameters (err, req, res, next).

```
Line 1:   Imports AppError.

Line 3:   const errorHandler = (err, req, res, _next) => { ... }

Line 4-7:  Logging:
           - In non-test environments, logs the error method, URL, and message.
           - For non-operational errors (unexpected crashes), also logs the
             full stack trace for debugging.

Line 9-14: PostgreSQL error 23505 (unique constraint violation):
           → Returns 409 Conflict — "A record with that value already exists".
             Triggered when trying to create a duplicate email, category, etc.

Line 17-22: PostgreSQL error 23503 (foreign key violation):
            → Returns 400 — "Referenced record does not exist".
              Triggered when a transaction references a non-existent category.

Line 25-30: PostgreSQL errors 42703/42P01 (undefined column/table):
            → Returns 500 — "Database schema is out of date".
              This means migrations haven't been run. Gives the developer
              a clear actionable message instead of a cryptic SQL error.

Line 33-38: MulterError (file upload errors):
            → Returns 400 with Multer's own error message (e.g., "File too large").

Line 41-48: Validation error check:
            If the error is operational (AppError with statusCode 400),
            attempts to parse the message as JSON (because the validate
            middleware serializes Zod errors as a JSON string in the message).

Line 50-61: Final response construction:
            - Operational errors: Use the error's own status code and message.
            - Unexpected errors: Return 500 with a generic message
              (never leak internal error details to the client).
            - Always returns { success: false, message, errors }.
```

### `src/middlewares/upload.js` — File Upload Configuration

Configures Multer for receipt image/PDF uploads.

```
Line 1-4:  Imports multer (file upload handling), fs, path, and AppError.

Line 6-7:  const uploadDir = path.join(process.cwd(), 'uploads', 'receipts')
           fs.mkdirSync(uploadDir, { recursive: true })
           → Ensures the upload directory exists. Creates it on server startup
             if it doesn't. The `recursive: true` flag creates parent directories
             as needed.

Line 9-18: storage = multer.diskStorage({ ... })
           → Configures WHERE and HOW files are saved:
             - destination: All receipts go to uploads/receipts/
             - filename: Generates unique names like "receipt-1713456789123-987654321.jpg"
               using timestamp + random number to prevent collisions.

Line 20-27: fileFilter
            → Restricts allowed file types to:
              - image/jpeg (JPG photos)
              - image/png (PNG images)
              - application/pdf (PDF documents)
              Rejects everything else with a 400 error.

Line 29-33: const upload = multer({ storage, fileFilter, limits: { fileSize: 5MB } })
            → Creates the configured Multer instance with a 5 MB file size limit.

Line 35:   module.exports = upload
```

### `src/middlewares/validate.js` — Zod Validation Middleware

A factory function that creates middleware for validating request data with Zod schemas.

```
Line 1:   Imports AppError.

Line 3:   const validate = (schema, source = 'body') => (req, _res, next) => { ... }
          → Takes a Zod schema and an optional source ('body', 'query', or 'params').
            Returns a middleware function.

Line 4:   const result = schema.safeParse(req[source])
          → Uses Zod's safeParse (non-throwing) to validate the request data.
            safeParse returns { success: boolean, data, error }.

Line 6-11: if (!result.success):
           → Maps Zod errors into a clean array: [{ field: "email", message: "Invalid email" }]
             Serializes them as JSON in an AppError(message, 400).
             The errorHandler will detect this JSON string and return it
             as a structured `errors` array.

Line 14:  req[source] = result.data
          → REPLACES the raw request data with the validated/transformed data.
            This means: coerced numbers are actual numbers, defaults are applied,
            extra unknown fields are stripped. Downstream code always works
            with clean, typed data.

Line 15:  next() → Passes control to the next middleware/controller.
```

---

## 7. Validation Layer

### `src/validations/schemas.js` — All Zod Schemas

This single file defines every validation schema used across the entire API.

```
Line 1:   const { z } = require('zod')
          → Imports the Zod schema builder.

── Auth Schemas ──

Line 4-8:  registerSchema:
           - name: string, 2-100 characters
           - email: must be a valid email format
           - password: 8-72 characters (72 is bcrypt's max input length)

Line 10-13: loginSchema:
            - email: valid email format
            - password: at least 1 character (actual validation is done by bcrypt)

Line 15-17: googleLoginSchema:
            - id_token: non-empty string (the Google Sign-In JWT token)

Line 19-26: updateProfileSchema:
            - name: optional, 2-100 chars
            - current_password: optional (required only when changing password)
            - new_password: optional, 8-72 chars
            - .refine(): Custom validation — at least one of `name` or
              `new_password` must be provided, otherwise the update is pointless.

── Transaction Schemas ──

Line 29-38: createTransactionSchema:
            - category_id: optional UUID (if omitted, AI auto-categorization is attempted)
            - type: must be exactly 'income' or 'expense'
            - amount: coerced to number (handles string inputs from forms),
              refined to reject zero values
            - currency: optional, defaults to 'INR', max 10 chars
            - description: optional, max 500 chars
            - date: optional, must match YYYY-MM-DD format via regex

Line 40:    updateTransactionSchema = createTransactionSchema.partial()
            → All fields become optional for PATCH requests.

Line 42-49: balanceCheckSchema:
            → Used by the pre-transaction balance check endpoint.
              Validates amount, currency, type, and optional transaction_id
              (for edit-mode balance recalculation).

Line 51-58: transactionFilterSchema:
            → Query parameter validation for the transaction list:
              - type, category_id, start_date, end_date: optional filters
              - page: defaults to 1, must be >= 1
              - limit: defaults to 20, must be 1-100

── Category, Budget, Dashboard, Report, AI Schemas ──

Line 61-68: createCategorySchema: name (1-100 chars) + type (income/expense)
            uuidParamSchema: validates URL params like /transactions/:id

Line 71-81: upsertBudgetSchema: category_id, limit_amount (positive), month (1-12), year (>=2000)
            budgetFilterSchema: optional month and year for filtering

Line 84-88: dashboardQuerySchema: optional start_date, end_date, currency (INR/USD/EUR/GBP defaults INR)

Line 91-93: reportQuerySchema: optional year filter

Line 95-111: AI schemas for chat, categorize, report-summary, budget-suggestion endpoints

Line 113-132: module.exports — exports all schemas as named exports.
```

---

## 8. Utility Layer

### `src/utils/AppError.js` — Custom Error Class

```
Line 2:   class AppError extends Error
          → Extends JavaScript's built-in Error class.

Line 4-8: constructor(message, statusCode = 500):
          - super(message): Sets the error message
          - this.statusCode: HTTP status code to return
          - this.isOperational = true: Marks this as an expected error
            (as opposed to a programming bug). The error handler uses this
            flag to decide whether to show the error message to the user
            or return a generic "Something went wrong" message.
          - Error.captureStackTrace: Excludes the constructor itself from
            the stack trace for cleaner debugging.

Line 12:  module.exports = AppError
```

### `src/utils/response.js` — Success Response Helper

```
Line 2:   const sendSuccess = (res, data, message, statusCode) => { ... }
          → Every successful API response goes through this function to
            ensure a consistent response shape:
            {
              success: true,
              message: "Success",
              data: { ... }
            }
          Defaults: message = "Success", statusCode = 200.

Line 10:  module.exports = { sendSuccess }
```

### `src/utils/http.js` — Axios HTTP Client

```
Line 1:   const axios = require('axios')

Line 5-10: const apiClient = axios.create({ timeout: 5000, headers: { ... } })
           → A pre-configured Axios instance for making external HTTP requests.
             - 5-second timeout prevents hanging on unresponsive APIs
             - JSON content type header set by default
             Used for server-to-server API calls (e.g., live currency rates).

Line 12:  module.exports = apiClient
```

### `src/utils/currency.js` — Currency Conversion

```
Line 1-6: CONVERSION_RATES = { INR: 1, USD: 83, EUR: 90, GBP: 105 }
          → Static exchange rates. INR is the base currency (rate = 1).
            These represent "1 unit of foreign currency = X INR".
            For example: 1 USD = 83 INR.

Line 8-11: getConvertedAmount(amount, currency)
           → Converts a foreign amount TO INR.
             Example: getConvertedAmount(10, 'USD') returns 830.00
             Uses toFixed(2) for decimal precision.

Line 13-16: convertFromINR(amount, currency)
            → Converts an INR amount to the target currency.
              Example: convertFromINR(830, 'USD') returns 10.00
              Used by the dashboard service to display values in
              the user's preferred display currency.

Line 18-22: Exports all three.
```

### `src/utils/email.js` — SendGrid Email Service

```
Line 1:   const sgMail = require('@sendgrid/mail')

Line 3-5: Conditionally sets the SendGrid API key. If SENDGRID_API_KEY is not
          configured, the SDK is not initialized (emails will fail gracefully).

Line 7-42: generateEmailTemplate({ title, greeting, intro, content, ... })
           → Generates a polished HTML email template with:
             - A branded header with "FINANCE TRACKER" label and dynamic title
             - A body section with greeting, intro text, and main content
             - An optional highlighted box (used for budget alerts, summaries)
             - A footer disclaimer
           All styling is inline (required for email client compatibility).

Line 44-51: getFromAddress()
            → Reads EMAIL_FROM from environment. Wraps bare emails in
              "Finance Tracker <email>" format for proper sender display.

Line 53-55: normalizeSubject(subject)
            → Ensures all email subjects are prefixed with "Finance Tracker:".

Line 57-80: sendEmail(to, subject, htmlOrTemplate)
            → Main email sending function:
              - Checks SENDGRID_API_KEY exists (throws if not)
              - Accepts either raw HTML string or a template object
              - Constructs the SendGrid message (to, from, subject, html)
              - Sends via sgMail.send()
              - Logs success or failure to console

Line 82:   Exports generateEmailTemplate and sendEmail.
```

### `src/utils/aiClient.js` — Groq AI API Client

```
Line 1-2: Imports axios and AppError.

Line 4:   GROQ_API_URL — The Groq API endpoint (OpenAI-compatible format).

Line 5:   TEXT_MODEL — Default text model: llama-3.1-8b-instant (fast, efficient).

Line 6:   VISION_MODEL — Model for image analysis: llama-4-scout-17b-16e-instruct.

Line 8-14: getApiKey() — Reads GROQ_API_KEY from environment.
           Throws 500 if not configured.

Line 16-41: createChatCompletion({ messages, model, response_format })
            → Sends a chat completion request to Groq:
              - temperature: 0.3 (low randomness for consistent, factual responses)
              - max_completion_tokens: 800 (keeps responses concise)
              - response_format: Optional JSON mode for structured responses
              - Returns the assistant's reply text.
              - On error: Extracts the Groq error message and throws AppError 502.

Line 43-57: createVisionCompletion({ prompt, dataUrl })
            → Wraps createChatCompletion for image analysis:
              - Sends the image as a base64 data URL alongside a text prompt
              - Uses the vision model
              - Forces JSON response format for structured receipt extraction

Line 59-62: Exports both functions.
```

---

## 9. Route Layer

Each route file defines the HTTP endpoints for a feature area, validates inputs, and delegates to controllers.

### `src/routes/auth.routes.js`

```
Line 1-5: Imports Router, AuthController, auth middleware, validation middleware, and schemas.

Line 7:   const router = Router()

Line 10:  POST /register → validate body with registerSchema → authController.register
Line 11:  POST /login    → validate body with loginSchema → authController.login
Line 12:  POST /google   → validate body with googleLoginSchema → authController.googleLogin

Line 15:  GET /profile   → authenticate → authController.getProfile
Line 16:  PUT /profile   → authenticate → validate body → authController.updateProfile

Line 18:  module.exports = router
```

### `src/routes/category.routes.js`

```
Line 10:  router.use(authenticate) → ALL category routes require authentication.

Line 13:  GET /            → List all categories (system + user's custom)
Line 15:  POST /           → Create a new personal category
Line 18:  DELETE /:id      → Delete a personal category (validates :id as UUID)
```

### `src/routes/transaction.routes.js`

```
Line 16:  router.use(authenticate) → ALL transaction routes require authentication.

Line 18-22: GET /           → List transactions with filters (type, date range, pagination)
Line 24-33: GET /anomalies  → List anomaly-flagged transactions (inline handler)
Line 35:    GET /:id        → Get single transaction by ID
Line 37:    POST /check-balance → Pre-transaction balance check
Line 39-44: POST /          → Create transaction (supports file upload via multer)
Line 46-52: PATCH /:id      → Update transaction (supports file upload)
Line 54:    DELETE /:id     → Delete transaction
```

### `src/routes/dashboard.routes.js`

```
Line 9:   router.use(authenticate)
Line 12-16: GET / → validate query (currency, date range) → getDashboard
```

### `src/routes/report.routes.js`

```
Line 9:   router.use(authenticate)
Line 12-16: GET /monthly → validate query (optional year) → getMonthlyReport
```

### `src/routes/budget.routes.js`

```
Line 9:   router.use(authenticate)
Line 11:  GET /       → List budgets with optional month/year filter
Line 14-18: POST /    → Create or update budget (upsert)
Line 21:  DELETE /:id → Delete budget
```

### `src/routes/notification.routes.js`

```
Line 7:   router.use(authenticate)
Line 9:   GET /                   → Get latest notification history for user
Line 10:  POST /trigger/daily     → Manually trigger daily notification checks
Line 11:  POST /trigger/weekly    → Manually trigger weekly summary emails
Line 12:  POST /trigger/monthly   → Manually trigger monthly summary emails
```

### `src/routes/ai.routes.js`

```
Line 15:  router.use(authenticate)
Line 17:  POST /chat              → AI financial advisor chat
Line 18:  POST /categorize        → AI transaction auto-categorization
Line 19:  GET /report-summary     → AI monthly report narrative summary
Line 20:  POST /receipt           → AI receipt image data extraction
Line 21:  GET /budget-suggestion  → AI-powered budget limit recommendation
```

---

## 10. Controller Layer

Controllers are deliberately thin — they extract request data and delegate to services.

### `src/controllers/AuthController.js`

```
Line 4:   class AuthController

Line 5-8: register(req, res):
          → Calls authService.register(req.body)
          → Returns { user, token } with 201 status.

Line 10-13: login(req, res):
            → Calls authService.login(req.body)
            → Returns { user, token }.

Line 15-19: googleLogin(req, res):
            → Extracts id_token from request body
            → Calls authService.googleLogin(id_token)
            → Returns { user, token }.

Line 21-24: getProfile(req, res):
            → Calls authService.getProfile(req.user.id) — req.user was set
              by the auth middleware from the JWT token.

Line 26-29: updateProfile(req, res):
            → Calls authService.updateProfile(req.user.id, req.body).
```

### `src/controllers/TransactionController.js`

```
Line 6-9:   getTransactions: Passes req.user.id and query filters to service.

Line 11-14: getTransaction: Fetches single transaction by ID.

Line 16-23: createTransaction:
            → If a file was uploaded (req.file), adds receipt_url to the payload.
            → Calls service.createTransaction(userId, payload).

Line 25-28: checkBalance: Checks if a pending expense would exceed the user's balance.

Line 30-41: updateTransaction:
            → Same receipt handling as create.
            → Calls service.updateTransaction(userId, transactionId, payload).

Line 43-46: deleteTransaction: Deletes and returns 200.
```

### `src/controllers/DashboardController.js`

```
Line 6-9: getDashboard:
          → Single call to dashboardService.getDashboard(userId, query).
          → The service handles all 5 parallel database queries internally.
```

### `src/controllers/ReportController.js`

```
Line 5-8: getMonthlyReport:
          → Delegates to reportService.getMonthlyReport(userId, query).
```

### `src/controllers/BudgetController.js`

```
Line 8-10:  getBudgets: Lists budgets with optional month/year filter.
Line 13-16: upsertBudget: Creates or updates a budget (INSERT ON CONFLICT UPDATE).
Line 18-21: deleteBudget: Deletes a budget.
```

### `src/controllers/NotificationController.js`

```
Line 6-9:   getLatest: Fetches the 5 most recent notifications from the database.
Line 11-14: triggerDailyChecks: Manually runs all daily notification checks.
Line 16-19: triggerWeeklySummary: Manually sends weekly email summaries.
Line 21-24: triggerMonthlySummary: Manually sends monthly email summaries.
```

### `src/controllers/AIController.js`

```
Line 5-8:   chat: AI financial advisor — takes user message, returns AI response.
Line 10-16: categorize: AI auto-categorization — returns matched category_id and name.
Line 18-21: getReportSummary: AI-generated narrative for a specific month's report.
Line 23-26: extractReceipt: AI receipt image analysis — returns amount, date, merchant, category.
Line 28-31: getBudgetSuggestion: AI-recommended budget limit based on spending history.
```

---

## 11. Service Layer (Business Logic)

The service layer contains ALL business logic. No business rules exist in controllers or repositories.

### `src/services/AuthService.js`

```
Line 1-5: Imports bcrypt, jwt, Google OAuth client, UserRepository, AppError.

Line 7:   googleClient = new OAuth2Client(GOOGLE_CLIENT_ID)
          → Initializes the Google token verification client.

Line 9:   SALT_ROUNDS = 12
          → bcrypt cost factor. 12 rounds takes ~250ms per hash, providing
            strong protection against brute-force attacks while remaining fast
            enough for a good user experience.

Line 12-22: register({ name, email, password }):
            1. Checks if email already exists → throws 409 if duplicate
            2. Hashes password with bcrypt (12 rounds)
            3. Creates user in database via repository
            4. Signs a JWT token
            5. Returns { user, token }

Line 24-38: login({ email, password }):
            1. Finds user by email → throws 401 if not found
            2. Compares password against stored hash → throws 401 if wrong
            3. Strips password_hash from user object (creates safeUser)
            4. Signs JWT and returns { user, token }

Line 40-44: getProfile(userId):
            → Simple lookup by ID. Throws 404 if user doesn't exist.

Line 46-87: updateProfile(userId, { name, current_password, new_password }):
            → Handles two update scenarios:
              1. Name change: Simply updates the name field
              2. Password change:
                 - If user has no existing password (Google OAuth user),
                   allows setting one without current_password
                 - If user has an existing password, requires current_password
                   verification before accepting the new one
            → Throws 400 if nothing to update, 401 if current password is wrong.

Line 89-132: googleLogin(idToken):
             1. Validates GOOGLE_CLIENT_ID is configured
             2. Verifies the Google ID token cryptographically
             3. Extracts profile data: googleId, email, name, emailVerified
             4. Rejects unverified Google emails
             5. Checks if user exists by googleId → returns existing user
             6. If not found, checks by email → throws 409 if email taken
             7. Creates new Google user → returns { user, token }

Line 134-141: _signToken(user):
              → Creates a JWT with:
                - sub: user.id (standard JWT claim for subject)
                - email: user.email
                - Signed with JWT_SECRET
                - Expires based on JWT_EXPIRES_IN (default: 7 days)
```

### `src/services/CategoryService.js`

```
Line 1-3: Imports CategoryRepository, AppError, and pool.

Line 6-8: getCategories(userId):
          → Returns ALL categories visible to the user
            (system categories + user's personal categories).

Line 10-12: createCategory(userId, { name, type }):
            → Creates a new personal category.
              The unique index in the database prevents duplicates.

Line 14-38: deleteCategory(userId, categoryId):
            → The most carefully guarded operation:
              1. Verifies the category belongs to the user (not a system category)
              2. Checks if ANY transactions use this category
              3. If transactions exist, returns 409 with the exact count:
                 'Cannot delete "Food" — it is used by 5 transaction(s).
                  Reassign or delete those transactions first.'
              4. Only deletes if the category has zero transactions
            → This handles the "deleting a category with existing transactions"
              edge case required by the assignment.
```

### `src/services/TransactionService.js`

```
Line 1-6: Imports repositories, NotificationService, AIService, currency utility, AppError.

Line 11-24: getTransactions(userId, filters):
            → Fetches paginated transactions and returns:
              { transactions: [...], pagination: { page, limit, total, totalPages } }

Line 27-33: getTransaction(userId, transactionId):
            → Single transaction lookup. Throws 404 if not found or not owned by user.

Line 37-76: createTransaction(userId, body):
            → The most complex creation flow:
              1. If no category_id is provided BUT a description exists,
                 attempts AI auto-categorization via aiService.categorizeTransaction()
              2. If still no category_id after AI attempt, throws 400
              3. Validates the category exists and is accessible to the user
              4. Validates TYPE MATCH: prevents assigning an income category
                 to an expense transaction (and vice versa)
              5. Converts the amount from original currency to INR
              6. Inserts the transaction via repository
              7. Fires notification checks in the background (non-blocking,
                 errors are silently caught so they don't affect the response)
              8. Fires anomaly detection in the background (same pattern)

Line 78-103: checkBalance(userId, { amount, currency, type, transaction_id }):
             → Pre-transaction balance verification:
               1. Gets current balance (all income - all expenses)
               2. If editing an existing transaction (transaction_id provided),
                  removes that transaction's effect from the balance first
               3. Calculates projected balance after the new/edited transaction
               4. Returns { current_balance, projected_balance, exceeds_balance }
             → The frontend uses exceeds_balance to warn before proceeding.

Line 106-138: updateTransaction(userId, transactionId, body):
              1. Verifies transaction exists
              2. If category or type changed, validates the new combination
              3. If amount or currency changed, recalculates converted_amount
              4. Updates via repository

Line 141-147: deleteTransaction: Delete with 404 check.
```

### `src/services/DashboardService.js`

```
Line 1-2: Imports DashboardRepository and currency converter.

Line 5-44: getDashboard(userId, filters):
           → Fires 5 database queries IN PARALLEL using Promise.all:
             1. getSummary: Total income, total expense, savings
             2. getExpenseByCategory: Spending breakdown
             3. getIncomeByCategory: Income breakdown
             4. getDailyExpenses: Day-by-day expense totals
             5. getHighestSpendingDay: The single highest-spending date

           → Converts all INR values to the requested display currency
             using convertFromINR().

           → Returns a structured object with all dashboard data,
             ready for the frontend to render without any calculations.
```

### `src/services/ReportService.js`

```
Line 3-12: getMonthlyReport(userId, filters):
           → Fetches monthly aggregates from ReportRepository.
           → Maps each row to ensure numeric types with parseFloat().
           → Returns: [{ month: "2025-04", total_income, total_expense, savings }, ...]
```

### `src/services/BudgetService.js`

```
Line 6-15: getBudgets(userId, filters):
           → Fetches budgets with their spending progress.
           → Adds is_over_budget boolean by comparing amount_spent vs limit_amount.

Line 17-29: upsertBudget(userId, body):
            1. Validates the category exists and is accessible
            2. Ensures it's an EXPENSE category (budgets on income don't make sense)
            3. Uses INSERT ON CONFLICT UPDATE (upsert): if a budget already exists
               for this category/month/year, updates the limit instead of creating
               a duplicate.

Line 32-38: deleteBudget: Delete with 404 check.
```

### `src/services/NotificationService.js`

This is the largest service file — it implements 17 different notification scenarios.

```
Line 1-3: Imports NotificationRepository, UserRepository, email utility.

Line 5-8: Configuration constants:
          - SPIKE_THRESHOLD = 2.0: Daily spending must be 2x the average to trigger
          - BUDGET_WARNING_PERCENT = 0.8: Warn at 80% budget usage
          - INACTIVITY_DAYS = 7: Alert after 7 days of no transactions
          - LOW_SAVINGS_THRESHOLD = 1000: Alert if monthly savings < ₹1000

Line 10-12: formatCurrency(value) — Formats numbers as "INR 1,234.56".

── Transaction-Triggered Notifications (Line 15-41) ──

Line 15-41: onTransactionCreated(userId, transaction):
            → Called after every new transaction. Runs these checks:
              For EXPENSES:
              1. _checkBudgetAlerts: Budget exceeded or near limit?
              2. _checkSpendingSpike: Today's spending > 2x daily average?
              3. _checkHighestSpendingDay: New all-time highest spending day?
              4. _checkCategorySpike: Category spend > 2x last month?
              5. _checkBudgetNotSet: Spending in a category without a budget?
              6. Refund alert: If amount is negative (refund)
              For ALL types:
              7. _checkLowSavings: Monthly savings below threshold?
              8. _checkNoIncome: No income recorded after the 10th of the month?

── Scheduled Notifications (Line 43-108) ──

Line 43-50: runDailyChecks():
            → Iterates through ALL users and runs:
              - _checkInactivity: No transactions in 7+ days
              - _checkSpendingHabitInsight: Top spending category
              - _checkRecurringPayments: Detects recurring expenses

Line 52-70: sendWeeklySummaries():
            → Sends each user a weekly email with income, expenses, savings,
              and transaction count for the last 7 days.

Line 72-90: sendMonthlySummaries():
            → Sends current month's financial summary email.

Line 92-108: sendNewMonthBudgetReminders():
             → On the 1st of each month, if a user has no budgets set,
               sends a reminder to configure them.

── Individual Check Methods (Line 110-348) ──

Line 123-158: _checkBudgetAlerts:
              → Finds the budget for the transaction's category
              → If spent > limit: sends "Budget Exceeded" email
              → If spent >= 80% of limit: sends "Budget Near Limit" email

Line 160-182: _checkSpendingSpike:
              → Deduplicates by checking if already sent today
              → Compares today's total expense vs average daily expense
              → If today > 2x average: sends "Spending Spike Detected" email

Line 184-204: _checkHighestSpendingDay:
              → Checks if today became the new all-time highest
              → Sends "Highest Spending Day" alert with the total

Line 206-223: _checkCategorySpike:
              → Compares current month vs previous month per-category spending
              → If current > 2x previous: sends insight email

Line 225-257: _checkLowSavings:
              → If savings < ₹1000: sends "Low Savings Alert"
              → If savings > 1.5x last month: sends "Savings Improvement" praise

Line 259-275: _checkNoIncome:
              → After the 10th of the month, if zero income transactions exist,
                sends a gentle reminder to record income.

Line 277-291: _checkInactivity:
              → Calculates days since last transaction
              → If ≥ 7 days: sends "Activity Reminder"

Line 293-309: _checkSpendingHabitInsight:
              → Finds the top spending category for the current month
              → Sends an insight email with the category name and total

Line 311-334: _checkRecurringPayments:
              → Queries for expenses with the same description appearing 3+ times
              → Sends an email listing all detected recurring payments

Line 336-348: _checkBudgetNotSet:
              → If spending occurs in a category without an active budget,
                sends a suggestion to create one

── Core Email Sending (Line 350-363) ──

Line 350-363: _sendNotification(user, type, payload):
              → Wraps every notification:
                1. Sends the email via sendEmail()
                2. Logs the notification to the database
                3. If either fails, logs the error but does NOT throw
                   (notifications should never break the main transaction flow)
```

### `src/services/SchedulerService.js`

```
Line 1:   Imports NotificationService.

Line 3-4: Constants: ONE_DAY = 86400000ms, ONE_WEEK = 7 days.

Line 6-9: Constructor: tracks whether start() has been called to prevent
          duplicate timers.

Line 11-48: start():
            → Called once from app.js during server initialization.
            → Sets up THREE setInterval timers:

            1. Daily (every 24 hours):
               Runs notificationService.runDailyChecks()
               → Checks inactivity, spending insights, recurring payments

            2. Weekly (every 7 days):
               Runs notificationService.sendWeeklySummaries()
               → Sends 7-day financial summaries to all users

            3. Monthly (every 24 hours, but only fires on the 1st):
               Checks if today.getDate() === 1, then:
               → Sends monthly summaries
               → Sends budget reminder emails

            All errors are caught and logged (never crash the server).

Line 51:  module.exports = new SchedulerService()
          → Exported as a singleton.
```

### `src/services/AIService.js`

```
Line 1-8: Imports: fs (file reading), repositories, services, AI client, AppError.

Line 10-12: normalizeText(value):
            → Trims whitespace and lowercases text. Used to fuzzy-match AI responses
              against category names (e.g., "food" matches "Food").

Line 14-26: parseJsonResponse(content):
            → Safely parses JSON from AI responses.
              First tries direct JSON.parse.
              If that fails, extracts the first {...} block from the text
              (AI sometimes wraps JSON in markdown or explanation text).

── PROMPT 1: AI Chat Advisor (Line 36-81) ──

Line 36-81: chat(userId, message):
            → Provides personalized financial advice:
              1. Fetches user's data in parallel: last 10 transactions, budgets, dashboard
              2. Constructs a detailed system prompt with real financial data
              3. Explicitly instructs the AI to ONLY use provided data (no fabrication)
              4. Sends to Groq and returns the trimmed response

── PROMPT 2: Auto-Categorize Transaction (Line 94-155) ──

Line 94-155: categorizeTransaction(userId, { description, type }):
             → AI-powered transaction classification:
               1. Fetches user's available categories filtered by type
               2. Defines what each category means (Food = "meals, groceries, ...")
               3. Provides disambiguation rules:
                  - "Tuition Fee" → "Other Expense" (NOT Healthcare)
                  - "Medicine" → "Healthcare"
               4. Instructs AI to return ONLY the category name
               5. Fuzzy-matches the AI response against actual category names
                  (tries exact match first, then substring match)

── PROMPT 3: Monthly Report Summary (Line 163-196) ──

Line 163-196: getMonthlyReportSummary(userId, { month, year }):
              → Generates a human-readable narrative:
                1. Fetches the specific month's report data
                2. Sends exact figures to AI
                3. Instructions: 3-4 sentences, mention exact numbers,
                   one actionable suggestion
                4. Returns { month, summary }

── Receipt Extraction (Line 199-245) ──

Line 199-245: extractReceipt(userId, file):
              → AI vision model for receipt images:
                1. Validates file exists and is an image
                2. Fetches user's expense categories
                3. Reads the file and converts to base64 data URL
                4. Sends to vision model with structured extraction prompt
                5. Parses JSON response: { amount, date, merchant, suggested_category }

── Budget Suggestion (Line 248-310) ──

Line 248-310: getBudgetSuggestion(userId, categoryId):
              1. Validates the category exists and is an expense category
              2. Fetches the last 3 months of transactions in that category
              3. Calculates average monthly spending
              4. Asks AI to suggest a budget with 10-20% buffer above average
              5. Returns { suggested_budget, reason, category_name }
```

### `src/services/AnomalyService.js`

```
Line 1-5: Imports: pool, AI client, email, UserRepository, NotificationRepository.

Line 7-10: Detection constants:
           - MIN_TRANSACTIONS_FOR_CHECK = 3: Need at least 3 past transactions
           - STDDEV_MULTIPLIER = 2: Flag if amount > avg + 2σ
           - MAX_AMOUNT_MULTIPLIER = 3: Flag if amount > 3x historical max
           - DUPLICATE_WINDOW_HOURS = 48: Check for duplicates within 48 hours

Line 18-80: detectAnomaly(transaction, userId):
            → Main entry point, called after transaction creation:
              1. Gets category statistics (avg, stddev, max, count)
              2. Skips if < 3 historical transactions (insufficient data)
              3. Applies THREE rules:
                 Rule 1: amount > (avg + 2 × standard deviation)
                 Rule 2: amount > 3× the all-time category max
                 Rule 3: Same amount + same category within 48 hours (duplicate)
              4. If any rule triggers, calls AI for a human-readable explanation
              5. Updates the transaction row with is_anomaly = TRUE
              6. Sends an anomaly email notification (fire-and-forget)
              7. Returns { isAnomaly: true/false, explanation }

Line 85-99: _getCategoryStats:
            → SQL query calculating AVG, STDDEV_POP, MAX, and COUNT
              for the user's transactions in this category over the last 3 months.

Line 104-116: _checkDuplicate:
              → Looks for transactions with the exact same absolute amount
                in the same category, created within the last 48 hours.

Line 121-127: _getCategoryName: Simple lookup for the AI prompt.

Line 133-180: _getAIExplanation:
              → Constructs a detailed prompt with the transaction details,
                category statistics, and specific flag reasons.
              → Asks AI for exactly 2 sentences explaining why it looks unusual.
              → Falls back to the raw flag reasons if AI call fails.

Line 185-190: _markAsAnomaly:
              → UPDATE query setting is_anomaly = TRUE and anomaly_reason on the transaction row.

Line 195-228: _sendAnomalyEmail:
              → Fire-and-forget async IIFE:
                - Fetches user email
                - Sends formatted email with transaction details and AI explanation
                - Logs notification to database
                - Catches and logs any errors (never throws)

Line 234-254: getAnomalies(userId):
              → Fetches all anomaly transactions from the last 30 days for display
                on the dashboard.
```

---

## 12. Repository Layer (Database Queries)

Repositories contain ONLY SQL queries. No business logic.

### `src/repositories/UserRepository.js`

```
Line 6-12:  findByEmail(email): SELECT * WHERE email = $1
            → Returns the full user row (including password_hash) for login verification.

Line 15-21: findById(id): SELECT (safe columns) WHERE id = $1
            → Returns user WITHOUT password_hash (for profile display).

Line 23-31: create({ name, email, password_hash }):
            → INSERT RETURNING id, name, email, created_at.

Line 33-39: findByGoogleId(googleId): Lookup by Google sub ID.

Line 41-49: createGoogleUser({ name, email, googleId }):
            → INSERT with empty password_hash, google_id, auth_provider = 'google'.

Line 51-75: updateById(id, fields):
            → Dynamic UPDATE — only updates fields that are provided.
            → Builds SET clauses dynamically from allowed fields ['name', 'password_hash'].
            → Uses parameterized queries ($1, $2...) to prevent SQL injection.
```

### `src/repositories/CategoryRepository.js`

```
Line 6-14:  findAllForUser(userId):
            → WHERE user_id IS NULL OR user_id = $1
              Returns both system categories AND the user's personal categories.

Line 17-25: findByIdForUser(categoryId, userId):
            → WHERE id = $1 AND (user_id IS NULL OR user_id = $2)
              Ensures the user can access system or their own categories.

Line 27-35: create({ name, type, userId }): Standard INSERT.

Line 37-43: findByIdAndOwner(categoryId, userId):
            → WHERE id = $1 AND user_id = $2
              Only matches categories OWNED by the user (not system categories).
              Used for deletion — prevents deleting system-wide categories.

Line 45-53: deleteForUser: DELETE with ownership check.
```

### `src/repositories/TransactionRepository.js`

```
Line 6-65: findAllForUser(userId, filters):
           → The most complex query builder:
             1. Starts with base condition: t.user_id = $1
             2. Dynamically adds filter conditions if provided:
                - type filter: t.type = $2
                - category filter: t.category_id = $3
                - date range: t.date >= $4 AND t.date <= $5
             3. Builds TWO queries from the same conditions:
                - Data query: JOIN with categories, ORDER BY date DESC, LIMIT/OFFSET
                - Count query: Just COUNT(*) for pagination
             4. Runs BOTH in parallel with Promise.all
             5. Returns { rows, total }
           → TO_CHAR(t.date, 'YYYY-MM-DD') ensures consistent date formatting
             regardless of server timezone.

Line 68-80: findByIdForUser: Single transaction lookup with category name JOIN.

Line 82-92: getBalanceForUser:
            → SUM(income) - ABS(SUM(expense)) = net balance
              Uses converted_amount (INR) for consistent calculation.

Line 95-103: create: INSERT with all fields including currency and converted_amount.
             Uses 'today' as default date if none provided.

Line 106-131: updateForUser: Dynamic UPDATE (same pattern as UserRepository.updateById).
              Only updates fields that are present in the request body.

Line 134-142: deleteForUser: DELETE with RETURNING for confirmation.
```

### `src/repositories/DashboardRepository.js`

```
Line 5-26:  getSummary(userId, { start_date, end_date }):
            → Calculates total_income, total_expense, savings in a single query.
              Uses CASE WHEN to split by type within one aggregation.
              ABS() handles negative expense amounts.

Line 28-51: getExpenseByCategory: GROUP BY category with SUM.
Line 53-76: getIncomeByCategory: Same structure for income.

Line 78-99: getDailyExpenses:
            → Groups by date, returns daily expense totals for time-series charts.
              TO_CHAR ensures YYYY-MM-DD format.

Line 101-123: getHighestSpendingDay:
              → Same aggregation as daily expenses but ORDER BY total DESC LIMIT 1.
```

### `src/repositories/ReportRepository.js`

```
Line 6-31: getMonthlyReport(userId, { year }):
           → Groups transactions by month using DATE_TRUNC('month', date).
           → Returns one row per month with total_income, total_expense, savings.
           → Optionally filtered by year.
           → TO_CHAR formats the month as 'YYYY-MM' for clean display.
```

### `src/repositories/BudgetRepository.js`

```
Line 5-43: findAllForUser(userId, { month, year }):
           → Complex query with a LEFT JOIN subquery:
             1. Main: Fetches budget rows joined with category names
             2. Subquery "spent": Calculates actual spending per category
                for the same month/year period
             3. LEFT JOIN ensures budgets with zero spending still appear
             4. Computes remaining = limit_amount - COALESCE(spent.total, 0)

Line 45-55: upsert:
            → INSERT ... ON CONFLICT (user_id, category_id, month, year)
              DO UPDATE SET limit_amount = EXCLUDED.limit_amount
              This is a PostgreSQL upsert — if a budget already exists for
              this combination, it simply updates the limit instead of throwing
              a duplicate error.

Line 57-63: deleteForUser: DELETE with user ownership check.
```

### `src/repositories/NotificationRepository.js`

The largest repository — contains all notification-related database queries.

```
Line 5-17:   getAverageDailyExpense: Average of daily expense totals.
Line 19-27:  getExpenseForDate: Total expense for a specific date.
Line 29-40:  getHighestSpendingDay: All-time highest expense day.
Line 42-52:  getCategorySpendingCurrentMonth: Category total for this month.
Line 54-64:  getCategorySpendingPreviousMonth: Category total for last month.
Line 66-80:  getCurrentMonthSummary: This month's income, expense, savings.
Line 82-94:  getPreviousMonthSavings: Last month's net savings.
Line 96-105: getCurrentMonthIncomeCount: How many income transactions this month.
Line 107-113: getLastTransactionDate: When was the last transaction created?
Line 115-129: getTopSpendingCategory: Highest-spending category this month.
Line 131-145: getRecurringTransactions: Expenses with same description ≥ 3 times.
Line 147-164: getCategoriesWithoutBudget: Expense categories used this month
              but missing a budget entry.
Line 166-185: getWeeklySummary: Last 7 days aggregated totals.
Line 187-207: getBudgetsForCurrentMonth: Active budgets WITH actual spending.
Line 209-212: getAllUserIds: List of all users (for scheduled batch notifications).
Line 214-219: logNotification: INSERT into notification_log.
Line 221-231: getLatestForUser: Last N notifications for the notification panel.
Line 233-240: wasNotificationSentOnDate: Deduplication check — prevents sending
              the same notification type twice on the same day.
```

---

## 13. Client-Side HTML Pages

### `client/index.html` — Login Page

```
Line 1-7:  HTML head: Title, CSS link, Google Sign-In SDK.
Line 9-41: Auth wrapper with centered login form:
           - Email input field
           - Password input field
           - "Login" submit button
           - "OR" separator
           - Google Sign-In button (configured with client ID)
           - Link to registration page
Line 42-44: Loads api.js (shared utilities) and auth.js (form handlers).
```

### `client/register.html` — Registration Page

```
Same structure as index.html but with:
- Full Name input field added
- "Register" submit button
- Google Sign-Up button (context="signup")
- Link back to login page
```

### `client/dashboard.html` — Main Dashboard

```
Line 5-17:  Navigation bar with links to all pages + Logout button.
Line 19-36: Page header + currency selector dropdown (INR/USD/EUR/GBP).
Line 38-39: Summary cards container (filled dynamically: Income, Expense, Savings).
Line 42-53: Chart grid: two canvas elements for expense and income bar charts.
Line 56-103: Widget grid with:
             - Recent transactions table (last 6)
             - Budget allocation progress bars
             - Highest spending day metric
             - Latest notifications panel with manual trigger buttons
             - AI Advisor chat input with "Ask AI" button
Line 106-116: Unusual transactions (anomaly detection) table.
Line 119-121: Loads api.js, notifications.js, dashboard.js.
```

### `client/transactions.html` — Transaction Management

```
Line 20-84: Split layout:
            Left: Transaction table (Date, Description, Category, Value, Receipt, Actions)
            Right: Form panel with:
              - Amount + Currency selector (inline row)
              - Type dropdown (Expense/Income)
              - Category dropdown + "Auto Categorize" button
              - Description input
              - Date picker
              - File upload for receipts + "Extract Receipt" button
              - Create/Update + Cancel buttons
Line 86-88: Loads api.js, categories.js, transactions.js.
```

### `client/categories.html` — Category Management

```
Line 20-52: Split layout:
            Left: Create category form (Name + Type)
            Right: Categories table showing Name, Type, Scope (System/Personal),
                   Delete button (only for personal categories)
Line 54-55: Loads api.js, categories.js.
```

### `client/reports.html` — Monthly Reports

```
Line 19-50: Page with:
            - Month and Year filter inputs
            - "Apply" button to filter report data
            - "Generate AI Summary" button
            - AI summary display card
            - Monthly report table (Period, Income, Expenses, Savings)
Line 52-53: Loads api.js, reports.js.
```

### `client/budgets.html` — Budget Management

```
Line 19-67: Split layout:
            Left: Budgets table (Category, Period, Limit, Spent, Remaining, Actions)
            Right: Budget form with:
              - Category dropdown (expense categories only)
              - Monthly Limit input
              - "Suggest Budget" button (AI-powered)
              - Month and Year inputs
              - Save/Update + Cancel buttons
Line 69-71: Loads api.js, categories.js, budgets.js.
```

---

## 14. Client-Side JavaScript

### `client/js/api.js` — Shared API Client

```
Line 1:   API_BASE = 'http://localhost:5003/api'
          → Base URL for all API calls. Points to the local Express server.

Line 3-8: isAuthPage():
          → Returns true if the current page is login or register.
            Used to skip auth checks on public pages.

Line 10-16: getHeaders(isFormData):
            → Builds request headers:
              - Always includes Authorization: Bearer <token> if a token exists
              - Includes Content-Type: application/json unless sending FormData
                (FormData sets its own multipart content-type with boundary)

Line 18-26: apiCall(endpoint, method, data, isFormData):
            → Centralized fetch wrapper:
              1. Constructs fetch options with method and headers
              2. Serializes data as JSON or passes FormData directly
              3. Calls fetch with the full URL
              4. Parses the JSON response
              5. Throws an Error if the response status is not OK
              6. Returns the parsed JSON on success

Line 28-33: saveSession(token, user):
            → Stores JWT token and user object in localStorage.

Line 35-51: User utility functions:
            - getStoredUser(): Reads cached user from localStorage
            - getDisplayName(user): Returns name or email
            - getAvatarLabel(user): Returns first letter for avatar circle

Line 53-100: renderUserNav(user):
             → Creates a user avatar dropdown menu in the navbar.
               Clicking the avatar toggles the dropdown.
               Clicking outside closes it.
               Contains a "Logout" button.

Line 102-119: loadCurrentUser(forceRefresh):
              → Either returns cached user or fetches fresh profile from API.

Line 121-134: initUserNav():
              → Initializes the user navigation on non-auth pages.
                Uses cached user first for instant display, then refreshes.

Line 136-140: logout():
              → Clears localStorage and redirects to login page.

Line 142-148: checkAuth() + initUserNav():
              → Runs immediately on every page load:
                - If not authenticated and not on auth page → redirect to login
                - Initialize the user avatar menu
```

### `client/js/auth.js` — Authentication Handlers

```
Line 1-7: handleGoogleLogin(response):
          → Called by Google Sign-In SDK after successful Google authentication.
            Sends the Google credential (id_token) to POST /api/auth/google.
            On success, saves session and redirects to dashboard.

Line 9-21: Login form handler:
           → If the loginForm element exists, attaches an onsubmit handler:
             1. Prevents default form submission
             2. Posts email + password to /api/auth/login
             3. Saves token + user to localStorage
             4. Redirects to dashboard.html

Line 23-36: Register form handler:
            → Same pattern but posts name + email + password to /api/auth/register.
```

### `client/js/dashboard.js` — Dashboard Rendering

```
Line 1:   BAR_COLORS — Color palette for chart bars (dark greens and golds).

Line 3-9: getDashboardCurrency() and formatMoney() — Utility functions.

Line 11-90: renderBarChart(canvasId, labels, values):
            → Renders a custom bar chart on an HTML5 canvas:
              - Handles high-DPI displays (devicePixelRatio)
              - Draws horizontal grid lines
              - Draws rounded-corner colored bars
              - Labels values above each bar
              - Rotates category labels for readability
              - Shows "No data available" when empty

Line 92-99: renderMetricList(): Renders category breakdown as <li> items.

Line 101-141: renderDashboard(data):
              → Populates ALL dashboard widgets:
                - Summary cards (Income, Expense, Savings)
                - Expense bar chart
                - Income bar chart
                - Category breakdown lists
                - Highest spending day metric

Line 143-169: loadDashboard():
              → Fetches dashboard data from API with caching:
                1. Checks sessionStorage for cached data → renders immediately if found
                2. Fetches fresh data from /api/dashboard?currency=X
                3. Caches the fresh response in sessionStorage
                4. Re-renders with fresh data

Line 172-193: loadRecentTransactions():
              → Fetches the last 6 transactions for the dashboard table.
                Colors income green (gold) and expenses red.

Line 196-226: loadBudgetAllocation():
              → Fetches current month's budgets.
              → Renders progress bars showing spent/limit percentages.
              → Over-budget bars are colored red.

Line 228-253: askAiAdvisor():
              → Sends the user's question to POST /api/ai/chat,
                shows "Thinking..." state while waiting,
                displays the AI response.

Line 255-279: loadAnomalies():
              → Fetches flagged transactions and displays them with anomaly reasons.

Line 281-291: Event listeners and initial data loading:
              - Currency change → reload dashboard
              - Daily/Weekly/Monthly notification triggers
              - AI advisor button
              - Loads all 5 data sections on page load
```

### `client/js/transactions.js` — Transaction CRUD

```
Line 1:   transactionCache — In-memory cache of loaded transactions.

Line 3-12: renderTransactionCategorySelect():
           → Renders category dropdown filtered by type (income/expense).
             Includes an empty "Choose manually or use AI" option.

Line 14-33: Helper functions for formatting amounts, dates, and normalizing
            transaction objects.

Line 35-54: renderTransactions():
            → Renders the transaction table from cache with Edit/Delete buttons.

Line 56-66: resetTransactionForm():
            → Resets all form fields to defaults (clears edit state).

Line 77-88: loadTransactions():
            → Fetches up to 100 transactions, normalizes, and caches them.

Line 90-122: editTransaction(id):
             → Populates the form with an existing transaction's data for editing.
               Uses cache first, falls back to API fetch.

Line 124-141: deleteTransaction(id):
              → Optimistic deletion:
                1. Removes from cache and re-renders immediately
                2. Sends DELETE to API
                3. If API fails, restores the cache and re-renders (rollback)

Line 143-169: shouldProceedWithBalanceCheck():
              → For expenses, calls /check-balance before creating.
                If balance would go negative, shows a confirmation dialog.

Line 171-198: autoCategorizeTransaction():
              → Sends description to POST /api/ai/categorize.
                If AI returns a match, selects it in the category dropdown.

Line 200-243: extractReceiptDetails():
              → Uploads receipt image to POST /api/ai/receipt.
                If AI extracts data, auto-fills amount, date, description,
                and category.

Line 245-291: Form submit handler:
              1. Runs balance check (with confirmation)
              2. Builds FormData (supports file upload)
              3. If txId present → PATCH (update), otherwise → POST (create)
              4. Updates cache and re-renders

Line 293-305: Event listeners and initialization.
```

### `client/js/categories.js` — Category Management

```
Line 1:   categoryCache — Global category cache used by ALL pages.

Line 3-7: fetchCategories(): Fetches all categories and caches them.

Line 9-11: getCachedCategories(): Returns the cache.

Line 13-15: filterCategoriesByType(type): Filters cache by type.

Line 17-23: renderCategorySelect(selectId, type):
            → Populates a <select> element with category <option> elements.
              Used by transactions and budgets pages.

Line 25-41: renderCategoriesTable():
            → Renders the categories table. System categories have no Delete button.

Line 43-52: deleteCategory(id): DELETE with confirmation + cache refresh.

Line 54-68: createCategory(event): POST new category + cache refresh.

Line 70-87: initCategoriesPage():
            → Only initializes if the categoriesTable element exists
              (this script is loaded on the transactions page too,
               where it's only used for the category dropdown).
```

### `client/js/reports.js` — Monthly Reports

```
Line 1-3: formatMoney(): Formats values with 2 decimal places + "INR".

Line 5-23: generateAiSummary():
           → Reads month/year inputs
           → Calls GET /api/ai/report-summary?month=X&year=Y
           → Displays the AI narrative in the summary card

Line 25-46: loadReports():
            → Calls GET /api/reports/monthly (optionally filtered by year)
            → Renders each month's income, expense, savings in a table

Line 48-54: Event listeners:
            - "Apply" button → loadReports()
            - "Generate AI Summary" → generateAiSummary()
            - Auto-fills current month and year on page load
```

### `client/js/budgets.js` — Budget Management

```
Line 1-8: resetBudgetForm(): Clears the budget form and edit state.

Line 10-17: loadBudgetCategories():
            → Fetches categories and renders only EXPENSE categories in the dropdown.

Line 19-44: loadBudgets():
            → Fetches all budgets and renders them with Edit/Delete buttons.

Line 46-55: editBudget(): Populates form with existing budget data for editing.

Line 57-68: deleteBudget(): DELETE with confirmation.

Line 70-95: suggestBudget():
            → Calls GET /api/ai/budget-suggestion?category_id=X
            → Auto-fills the limit input with the AI suggestion
            → Displays the AI's reasoning

Line 97-111: Form submit handler:
             → POST /api/budgets with category_id, limit_amount, month, year.
               The backend upserts (creates or updates).

Line 113-121: Event listeners and initialization.
```

### `client/js/notifications.js` — Notification Panel

```
Line 1-3: formatNotificationDate(): Formats ISO timestamp to locale string.

Line 5-17: renderNotifications(): Renders notification list items.

Line 19-42: loadLatestNotifications():
            → Uses sessionStorage caching for instant display.
            → Fetches fresh data from GET /api/notifications.

Line 44-78: triggerNotificationAction(endpoint, successMessage):
            → Generic function for trigger buttons:
              1. Disables all trigger buttons
              2. Shows "Running..." on the active button
              3. POSTs to the trigger endpoint
              4. Refreshes the notification list
              5. Re-enables buttons
```

---

## 15. Client-Side CSS

### `client/css/styles.css`

```
Line 1:   Imports "Inter" font from Google Fonts (weights: 400, 500, 600, 700).

Line 3-11: CSS custom properties (design tokens):
           - --bg-color: #f6f6f4 (warm off-white background)
           - --text-dark: #121212 (near-black text)
           - --text-muted: #888888 (secondary text)
           - --border-color: #e5e5e5 (subtle borders)
           - --panel-bg: #ffffff (card backgrounds)
           - --brand-dark: #18221f (dark forest green — primary brand color)
           - --brand-gold: #b39b59 (gold accent — for active links and income)

Line 13:   Body: Sets Inter font family, removes margin, applies background.

Line 15-30: Navbar styles: Horizontal layout, logo, link styling, active state
            (gold underline), user avatar menu with dropdown animation.

Line 32-53: Layout: Container max-width 1200px, page headers with large typography,
            dashboard cards grid, widget sections.

Line 55-61: Lists: Styled as dashed-border-separated rows, notification items
            stack vertically.

Line 62-69: Tables: Full-width, uppercase headers, left-aligned, consistent padding.

Line 71-99: Forms: Bottom-border inputs (no boxes), uppercase labels, primary
            buttons (dark green), secondary buttons (outlined), danger text links.

Line 101-109: Auth pages: Full-viewport centered layout, uppercase headings.

Line 111-121: Charts and budget progress bars.

Line 123-133: Mobile responsive breakpoint at 900px:
              - All grids collapse to single column
              - Nav wraps and stacks
              - Reduced padding
```

---

## 16. Suggested Improvements

1. **Rate Limiting**: Add express-rate-limit middleware to prevent brute-force login attempts and API abuse.

2. **Live Currency Rates**: Replace the static CONVERSION_RATES object in `currency.js` with real-time rates from an external API (e.g., Open Exchange Rates, Fixer.io).

3. **JWT Refresh Tokens**: The current setup has a single 7-day token. Implement a short-lived access token (15 min) paired with a refresh token for better security.

4. **Input Sanitization**: Add HTML sanitization for text fields (description, category name) to prevent stored XSS if the frontend renders user input without escaping.

5. **Transaction Pagination on Frontend**: The transactions page fetches up to 100 records. Implement actual page navigation controls for users with many transactions.

6. **Database Connection Pooling Limits**: Configure pool `min`, `max`, and `idleTimeoutMillis` in `db.js` for production environments.

7. **Cron Job Instead of setInterval**: Replace `SchedulerService.js`'s setInterval approach with a proper cron library (e.g., node-cron) for more reliable scheduling, especially on multi-instance deployments.

8. **API Versioning**: Prefix all routes with `/api/v1/` to allow future non-breaking API evolution.

9. **Receipt Cloud Storage**: Replace local disk storage (`uploads/`) with cloud object storage (AWS S3, Cloudinary) for scalability and persistence across deployments.

10. **Test Coverage**: The `tests/` directory is empty. Add integration tests for critical flows (auth, transaction CRUD, balance checks, budget alerts) using a test database.
