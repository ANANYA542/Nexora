const budgetRepository = require('../repositories/BudgetRepository');
const categoryRepository = require('../repositories/CategoryRepository');
const AppError = require('../utils/AppError');

class BudgetService {
  async getBudgets(userId, filters) {
    const rows = await budgetRepository.findAllForUser(userId, filters);
    return rows.map((r) => ({
      ...r,
      limit_amount: parseFloat(r.limit_amount),
      amount_spent: parseFloat(r.amount_spent),
      remaining: parseFloat(r.remaining),
      is_over_budget: parseFloat(r.amount_spent) > parseFloat(r.limit_amount),
    }));
  }

  async upsertBudget(userId, body) {
    const { category_id, limit_amount, month, year } = body;

    const category = await categoryRepository.findByIdForUser(category_id, userId);
    if (!category) {
      throw new AppError('Category not found or not accessible', 404);
    }

    if (category.type !== 'expense') {
      throw new AppError('Budgets can only be set for expense categories', 400);
    }

    return budgetRepository.upsert({ userId, category_id, limit_amount, month, year });
  }

  async deleteBudget(userId, budgetId) {
    const deleted = await budgetRepository.deleteForUser(budgetId, userId);
    if (!deleted) {
      throw new AppError('Budget not found', 404);
    }
    return deleted;
  }
}

module.exports = new BudgetService();
