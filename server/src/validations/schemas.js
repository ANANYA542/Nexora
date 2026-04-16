const { z } = require('zod');

// ── Auth ─────────────────────────────────────────────────────────────────────
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  current_password: z.string().optional(),
  new_password: z.string().min(8, 'New password must be at least 8 characters').max(72).optional(),
}).refine(
  (data) => data.name || data.new_password,
  { message: 'Provide at least name or new_password to update' }
);

// ── Transactions ─────────────────────────────────────────────────────────────
const createTransactionSchema = z.object({
  category_id: z.string().uuid('Invalid category ID'),
  type: z.enum(['income', 'expense']),
  amount: z
    .number({ invalid_type_error: 'Amount must be a number' })
    .refine((v) => v !== 0, { message: 'Amount cannot be zero' }),
  description: z.string().max(500).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
});

const updateTransactionSchema = createTransactionSchema.partial();

const transactionFilterSchema = z.object({
  type: z.enum(['income', 'expense']).optional(),
  category_id: z.string().uuid().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ── Categories ───────────────────────────────────────────────────────────────
const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['income', 'expense']),
});

// ── Budgets ──────────────────────────────────────────────────────────────────
const upsertBudgetSchema = z.object({
  category_id: z.string().uuid('Invalid category ID'),
  limit_amount: z.number().positive('Budget limit must be positive'),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000),
});

// ── Dashboard ────────────────────────────────────────────────────────────────
const dashboardQuerySchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// ── Reports ──────────────────────────────────────────────────────────────────
const reportQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).optional(),
});

module.exports = {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  createTransactionSchema,
  updateTransactionSchema,
  transactionFilterSchema,
  createCategorySchema,
  upsertBudgetSchema,
  dashboardQuerySchema,
  reportQuerySchema,
};
