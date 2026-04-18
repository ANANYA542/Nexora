const { z } = require('zod');


const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const googleLoginSchema = z.object({
  id_token: z.string().min(1, 'Google ID token is required'),
});

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  current_password: z.string().optional(),
  new_password: z.string().min(8, 'New password must be at least 8 characters').max(72).optional(),
}).refine(
  (data) => data.name || data.new_password,
  { message: 'Provide at least name or new_password to update' }
);


const createTransactionSchema = z.object({
  category_id: z.string().uuid('Invalid category ID').optional(),
  type: z.enum(['income', 'expense']),
  amount: z.coerce
    .number({ invalid_type_error: 'Amount must be a number' })
    .refine((v) => v !== 0, { message: 'Amount cannot be zero' }),
  currency: z.string().max(10).optional().default('INR'),
  description: z.string().max(500).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
});

const updateTransactionSchema = createTransactionSchema.partial();

const balanceCheckSchema = z.object({
  amount: z.coerce
    .number({ invalid_type_error: 'Amount must be a number' })
    .refine((v) => v !== 0, { message: 'Amount cannot be zero' }),
  currency: z.string().max(10).optional().default('INR'),
  type: z.enum(['income', 'expense']),
  transaction_id: z.string().uuid('Invalid transaction ID').optional(),
});

const transactionFilterSchema = z.object({
  type: z.enum(['income', 'expense']).optional(),
  category_id: z.string().uuid().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});


const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['income', 'expense']),
});

const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid ID'),
});


const upsertBudgetSchema = z.object({
  category_id: z.string().uuid('Invalid category ID'),
  limit_amount: z.coerce.number().positive('Budget limit must be positive'),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000),
});

const budgetFilterSchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).optional(),
});


const dashboardQuerySchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  currency: z.enum(['INR', 'USD', 'EUR', 'GBP']).optional().default('INR'),
});


const reportQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).optional(),
});

const aiChatSchema = z.object({
  message: z.string().min(1, 'Message is required').max(2000),
});

const aiCategorizeSchema = z.object({
  description: z.string().min(1, 'Description is required').max(500),
  type: z.enum(['income', 'expense']).default('expense'),
});

const aiReportSummaryQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000),
});

const aiBudgetSuggestionQuerySchema = z.object({
  category_id: z.string().uuid('Invalid category ID'),
});

module.exports = {
  registerSchema,
  loginSchema,
  googleLoginSchema,
  updateProfileSchema,
  createTransactionSchema,
  updateTransactionSchema,
  balanceCheckSchema,
  transactionFilterSchema,
  createCategorySchema,
  uuidParamSchema,
  upsertBudgetSchema,
  budgetFilterSchema,
  dashboardQuerySchema,
  reportQuerySchema,
  aiChatSchema,
  aiCategorizeSchema,
  aiReportSummaryQuerySchema,
  aiBudgetSuggestionQuerySchema,
};
