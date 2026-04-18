const dashboardRepository = require('../repositories/DashboardRepository');
const { convertFromINR } = require('../utils/currency');

class DashboardService {
  async getDashboard(userId, filters) {
    const currency = filters.currency || 'INR';
    const [summary, expenseByCategory, incomeByCategory, dailyExpenses, highestSpendingDay] =
      await Promise.all([
        dashboardRepository.getSummary(userId, filters),
        dashboardRepository.getExpenseByCategory(userId, filters),
        dashboardRepository.getIncomeByCategory(userId, filters),
        dashboardRepository.getDailyExpenses(userId, filters),
        dashboardRepository.getHighestSpendingDay(userId, filters),
      ]);

    return {
      currency,
      summary: {
        total_income: convertFromINR(summary.total_income, currency),
        total_expense: convertFromINR(summary.total_expense, currency),
        savings: convertFromINR(summary.savings, currency),
      },
      expense_by_category: expenseByCategory.map((r) => ({
        category_id: r.category_id,
        category_name: r.category_name,
        total: convertFromINR(r.total, currency),
      })),
      income_by_category: incomeByCategory.map((r) => ({
        category_id: r.category_id,
        category_name: r.category_name,
        total: convertFromINR(r.total, currency),
      })),
      daily_expenses: dailyExpenses.map((r) => ({
        date: r.date,
        total_expense: convertFromINR(r.total_expense, currency),
      })),
      highest_spending_day: highestSpendingDay
        ? {
            date: highestSpendingDay.date,
            total_expense: convertFromINR(highestSpendingDay.total_expense, currency),
          }
        : null,
    };
  }
}

module.exports = new DashboardService();
