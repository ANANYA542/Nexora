const dashboardRepository = require('../repositories/DashboardRepository');
const notificationService = require('./NotificationService');
const userRepository = require('../repositories/UserRepository');

class DashboardService {
  async getDashboard(userId, filters) {
    const [summary, expenseByCategory, incomeByCategory, dailyExpenses, highestSpendingDay] =
      await Promise.all([
        dashboardRepository.getSummary(userId, filters),
        dashboardRepository.getExpenseByCategory(userId, filters),
        dashboardRepository.getIncomeByCategory(userId, filters),
        dashboardRepository.getDailyExpenses(userId, filters),
        dashboardRepository.getHighestSpendingDay(userId, filters),
      ]);

    // Trigger insight notifications in the background
    userRepository.findById(userId).then(user => {
      if (user) {
        notificationService._checkSpendingHabitInsight(user).catch(() => {});
        notificationService._checkRecurringPayments(user).catch(() => {});
        notificationService._checkInactivity(user).catch(() => {});
      }
    }).catch(() => {});

    return {
      summary: {
        total_income: parseFloat(summary.total_income),
        total_expense: parseFloat(summary.total_expense),
        savings: parseFloat(summary.savings),
      },
      expense_by_category: expenseByCategory.map((r) => ({
        category_id: r.category_id,
        category_name: r.category_name,
        total: parseFloat(r.total),
      })),
      income_by_category: incomeByCategory.map((r) => ({
        category_id: r.category_id,
        category_name: r.category_name,
        total: parseFloat(r.total),
      })),
      daily_expenses: dailyExpenses.map((r) => ({
        date: r.date,
        total_expense: parseFloat(r.total_expense),
      })),
      highest_spending_day: highestSpendingDay
        ? {
            date: highestSpendingDay.date,
            total_expense: parseFloat(highestSpendingDay.total_expense),
          }
        : null,
    };
  }
}

module.exports = new DashboardService();
