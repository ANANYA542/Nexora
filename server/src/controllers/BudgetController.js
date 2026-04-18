const budgetService = require('../services/BudgetService');
const { sendSuccess } = require('../utils/response');

class BudgetController {
  async getBudgets(req, res) {
    const budgets = await budgetService.getBudgets(req.user.id, req.query);
    sendSuccess(res, { budgets });
  }

  async upsertBudget(req, res) {
    const budget = await budgetService.upsertBudget(req.user.id, req.body);
    sendSuccess(res, { budget }, 'Budget saved', 200);
  }

  async deleteBudget(req, res) {
    await budgetService.deleteBudget(req.user.id, req.params.id);
    sendSuccess(res, null, 'Budget deleted');
  }
}

module.exports = new BudgetController();
