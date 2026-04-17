const notificationRepo = require('../repositories/NotificationRepository');
const userRepository = require('../repositories/UserRepository');
const { sendEmail } = require('../utils/email');

const SPIKE_THRESHOLD = 2.0;
const BUDGET_WARNING_PERCENT = 0.8;
const INACTIVITY_DAYS = 7;
const LOW_SAVINGS_THRESHOLD = 1000;

class NotificationService {


  async onTransactionCreated(userId, transaction) {
    const user = await userRepository.findById(userId);
    if (!user) return;

    if (transaction.type === 'expense') {
      await this._checkBudgetAlerts(user, transaction);
      await this._checkSpendingSpike(user);
      await this._checkHighestSpendingDay(user);
      await this._checkCategorySpike(user, transaction.category_id);
      await this._checkBudgetNotSet(user, transaction.category_id);

      if (parseFloat(transaction.amount) < 0) {
        await this._sendNotification(user, 'refund_alert',
          'Refund Detected',
          `<p>A refund of <strong>₹${Math.abs(transaction.amount)}</strong> was recorded.</p>
           <p>Description: ${transaction.description || 'N/A'}</p>`
        );
      }
    }

    await this._checkLowSavings(user);
    await this._checkNoIncome(user);
  }

  // --- SCHEDULED NOTIFICATIONS (called by scheduler) ---

  async runDailyChecks() {
    const users = await notificationRepo.getAllUserIds();
    for (const user of users) {
      await this._checkInactivity(user);
      await this._checkSpendingHabitInsight(user);
      await this._checkRecurringPayments(user);
    }
  }

  async sendWeeklySummaries() {
    const users = await notificationRepo.getAllUserIds();
    for (const user of users) {
      const summary = await notificationRepo.getWeeklySummary(user.id);
      await this._sendNotification(user, 'weekly_summary',
        'Weekly Spending Summary',
        `<h3>Your Week in Review</h3>
         <p>💵 Income: <strong>₹${summary.income.toFixed(2)}</strong></p>
         <p>💸 Expenses: <strong>₹${summary.expense.toFixed(2)}</strong></p>
         <p>🏦 Savings: <strong>₹${summary.savings.toFixed(2)}</strong></p>
         <p>📊 Transactions: <strong>${summary.transaction_count}</strong></p>`
      );
    }
  }

  async sendMonthlySummaries() {
    const users = await notificationRepo.getAllUserIds();
    for (const user of users) {
      const summary = await notificationRepo.getCurrentMonthSummary(user.id);
      await this._sendNotification(user, 'monthly_summary',
        'Monthly Financial Summary',
        `<h3>Monthly Report</h3>
         <p>💵 Total Income: <strong>₹${summary.income.toFixed(2)}</strong></p>
         <p>💸 Total Expenses: <strong>₹${summary.expense.toFixed(2)}</strong></p>
         <p>🏦 Net Savings: <strong>₹${summary.savings.toFixed(2)}</strong></p>`
      );
    }
  }

  async sendNewMonthBudgetReminders() {
    const users = await notificationRepo.getAllUserIds();
    for (const user of users) {
      const budgets = await notificationRepo.getBudgetsForCurrentMonth(user.id);
      if (budgets.length === 0) {
        await this._sendNotification(user, 'budget_reminder',
          'Set Your Budgets for This Month',
          `<p>A new month has started! 🗓️</p>
           <p>You haven't set any budgets yet. Set your budgets now to stay on track.</p>`
        );
      }
    }
  }

  // --- RECEIPT UPLOAD NOTIFICATION ---

  async onReceiptUploaded(userId, transactionDescription) {
    const user = await userRepository.findById(userId);
    if (!user) return;
    await this._sendNotification(user, 'receipt_uploaded',
      'Receipt Uploaded Successfully',
      `<p>Your receipt for "<strong>${transactionDescription}</strong>" has been uploaded. ✅</p>`
    );
  }

  // --- INTERNAL CHECK METHODS ---

  async _checkBudgetAlerts(user, transaction) {
    const budgets = await notificationRepo.getBudgetsForCurrentMonth(user.id);
    const budget = budgets.find(b => b.category_id === transaction.category_id);
    if (!budget) return;

    const spent = parseFloat(budget.amount_spent);
    const limit = parseFloat(budget.limit_amount);

    if (spent > limit) {
      await this._sendNotification(user, 'budget_exceeded',
        `Budget Exceeded — ${budget.category_name}`,
        `<p>⚠️ You have exceeded your budget for <strong>${budget.category_name}</strong>.</p>
         <p>Budget: ₹${limit.toFixed(2)} | Spent: ₹${spent.toFixed(2)}</p>`
      );
    } else if (spent >= limit * BUDGET_WARNING_PERCENT) {
      await this._sendNotification(user, 'budget_near_limit',
        `Near Budget Limit — ${budget.category_name}`,
        `<p>⚡ You've used ${Math.round((spent / limit) * 100)}% of your budget for <strong>${budget.category_name}</strong>.</p>
         <p>Budget: ₹${limit.toFixed(2)} | Spent: ₹${spent.toFixed(2)}</p>`
      );
    }
  }

  async _checkSpendingSpike(user) {
    const alreadySent = await notificationRepo.wasNotificationSentToday(user.id, 'spending_spike');
    if (alreadySent) return;

    const avgDaily = await notificationRepo.getAverageDailyExpense(user.id);
    const todayExpense = await notificationRepo.getTodayExpense(user.id);

    if (avgDaily > 0 && todayExpense > avgDaily * SPIKE_THRESHOLD) {
      await this._sendNotification(user, 'spending_spike',
        'Unusual Spending Spike Detected',
        `<p>📈 Today's spending <strong>₹${todayExpense.toFixed(2)}</strong> is significantly higher than your daily average of <strong>₹${avgDaily.toFixed(2)}</strong>.</p>`
      );
    }
  }

  async _checkHighestSpendingDay(user) {
    const highest = await notificationRepo.getHighestSpendingDay(user.id);
    if (!highest) return;

    const todayExpense = await notificationRepo.getTodayExpense(user.id);
    const today = new Date().toISOString().split('T')[0];

    if (highest.date === today && todayExpense >= parseFloat(highest.total)) {
      const alreadySent = await notificationRepo.wasNotificationSentToday(user.id, 'highest_spending_day');
      if (alreadySent) return;

      await this._sendNotification(user, 'highest_spending_day',
        'New Highest Spending Day!',
        `<p>🔴 Today is your highest spending day with <strong>₹${todayExpense.toFixed(2)}</strong> in expenses.</p>`
      );
    }
  }

  async _checkCategorySpike(user, categoryId) {
    const current = await notificationRepo.getCategorySpendingCurrentMonth(user.id, categoryId);
    const previous = await notificationRepo.getCategorySpendingPreviousMonth(user.id, categoryId);

    if (previous > 0 && current > previous * SPIKE_THRESHOLD) {
      await this._sendNotification(user, 'category_spike',
        'Category Spending Spike',
        `<p>📊 Your spending in this category has jumped from <strong>₹${previous.toFixed(2)}</strong> last month to <strong>₹${current.toFixed(2)}</strong> this month.</p>`
      );
    }
  }

  async _checkLowSavings(user) {
    const alreadySent = await notificationRepo.wasNotificationSentToday(user.id, 'low_savings');
    if (alreadySent) return;

    const summary = await notificationRepo.getCurrentMonthSummary(user.id);
    const prevSavings = await notificationRepo.getPreviousMonthSavings(user.id);

    if (summary.savings < LOW_SAVINGS_THRESHOLD) {
      await this._sendNotification(user, 'low_savings',
        'Low Savings Warning',
        `<p>⚠️ Your savings this month are <strong>₹${summary.savings.toFixed(2)}</strong>, which is below ₹${LOW_SAVINGS_THRESHOLD}.</p>`
      );
    } else if (prevSavings > 0 && summary.savings > prevSavings * 1.5) {
      await this._sendNotification(user, 'high_savings',
        'Great Savings Achievement! 🎉',
        `<p>🏆 Your savings this month (<strong>₹${summary.savings.toFixed(2)}</strong>) are significantly higher than last month (<strong>₹${prevSavings.toFixed(2)}</strong>). Keep it up!</p>`
      );
    }
  }

  async _checkNoIncome(user) {
    const alreadySent = await notificationRepo.wasNotificationSentToday(user.id, 'no_income');
    if (alreadySent) return;

    const incomeCount = await notificationRepo.getCurrentMonthIncomeCount(user.id);
    const today = new Date();
    if (today.getDate() >= 10 && incomeCount === 0) {
      await this._sendNotification(user, 'no_income',
        'No Income Recorded This Month',
        `<p>📭 No income transactions have been recorded for this month so far. If you've received income, don't forget to log it!</p>`
      );
    }
  }

  async _checkInactivity(user) {
    const lastDate = await notificationRepo.getLastTransactionDate(user.id);
    if (!lastDate) return;

    const daysSince = Math.floor((Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince >= INACTIVITY_DAYS) {
      await this._sendNotification(user, 'inactivity',
        'We Miss You!',
        `<p>👋 It's been <strong>${daysSince} days</strong> since your last transaction. Keeping your finances up to date helps you stay on track!</p>`
      );
    }
  }

  async _checkSpendingHabitInsight(user) {
    const alreadySent = await notificationRepo.wasNotificationSentToday(user.id, 'spending_insight');
    if (alreadySent) return;

    const top = await notificationRepo.getTopSpendingCategory(user.id);
    if (top) {
      await this._sendNotification(user, 'spending_insight',
        'Spending Habit Insight',
        `<p>📌 Your top spending category this month is <strong>${top.category_name}</strong> with <strong>₹${parseFloat(top.total).toFixed(2)}</strong> spent.</p>`
      );
    }
  }

  async _checkRecurringPayments(user) {
    const alreadySent = await notificationRepo.wasNotificationSentToday(user.id, 'recurring_payment');
    if (alreadySent) return;

    const recurring = await notificationRepo.getRecurringTransactions(user.id);
    if (recurring.length > 0) {
      const list = recurring.map(r =>
        `<li>${r.description} — ₹${parseFloat(r.amount).toFixed(2)} (${r.occurrences} times, ${r.category_name})</li>`
      ).join('');

      await this._sendNotification(user, 'recurring_payment',
        'Recurring Payment Detected',
        `<p>🔄 We detected possible recurring payments:</p><ul>${list}</ul>`
      );
    }
  }

  async _checkBudgetNotSet(user, categoryId) {
    const cats = await notificationRepo.getCategoriesWithoutBudget(user.id);
    const match = cats.find(c => c.id === categoryId);
    if (match) {
      await this._sendNotification(user, 'budget_not_set',
        `No Budget Set — ${match.name}`,
        `<p>📋 You have expenses in <strong>${match.name}</strong> but no budget set for this month. Consider setting one!</p>`
      );
    }
  }

  // --- CORE SEND + LOG ---

  async _sendNotification(user, type, subject, htmlContent) {
    try {
      await sendEmail(user.email, subject, htmlContent);
      await notificationRepo.logNotification(user.id, type, subject);
    } catch (err) {
      console.error(`[NOTIFICATION] Error sending ${type} to ${user.email}:`, err.message);
    }
  }
}

module.exports = new NotificationService();
