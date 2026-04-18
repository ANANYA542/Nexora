const notificationRepo = require('../repositories/NotificationRepository');
const userRepository = require('../repositories/UserRepository');
const { sendEmail } = require('../utils/email');

const SPIKE_THRESHOLD = 2.0;
const BUDGET_WARNING_PERCENT = 0.8;
const INACTIVITY_DAYS = 7;
const LOW_SAVINGS_THRESHOLD = 1000;

function formatCurrency(value) {
  return `INR ${parseFloat(value).toFixed(2)}`;
}

class NotificationService {
  async onTransactionCreated(userId, transaction) {
    const user = await userRepository.findById(userId);
    if (!user) return;

    if (transaction.type === 'expense') {
      await this._checkBudgetAlerts(user, transaction);
      await this._checkSpendingSpike(user, transaction);
      await this._checkHighestSpendingDay(user, transaction);
      await this._checkCategorySpike(user, transaction.category_id);
      await this._checkBudgetNotSet(user, transaction.category_id);

      if (parseFloat(transaction.amount) < 0) {
        await this._sendNotification(user, 'refund_alert', {
          subject: 'Notification',
          title: 'Refund Recorded',
          intro: 'A refund transaction has been recorded on your account.',
          content: `<p style="margin:0 0 12px;">Description: <strong>${transaction.description || 'N/A'}</strong></p>`,
          highlightTitle: 'Refund Details',
          highlightContent: `<div>Amount: <strong>${formatCurrency(Math.abs(transaction.amount))}</strong></div>`,
          logMessage: 'Refund recorded',
        });
      }
    }

    await this._checkLowSavings(user);
    await this._checkNoIncome(user);
  }

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
      await this._sendNotification(user, 'weekly_summary', {
        subject: 'Weekly Spending Summary',
        title: 'Weekly Spending Summary',
        intro: 'Here is your weekly financial summary from Finance Tracker.',
        highlightTitle: 'This Week',
        highlightContent: `
          <div>Income: <strong>${formatCurrency(summary.income)}</strong></div>
          <div>Expenses: <strong>${formatCurrency(summary.expense)}</strong></div>
          <div>Savings: <strong>${formatCurrency(summary.savings)}</strong></div>
          <div>Transactions: <strong>${summary.transaction_count}</strong></div>
        `,
        logMessage: 'Weekly spending summary sent',
      });
    }
  }

  async sendMonthlySummaries() {
    const users = await notificationRepo.getAllUserIds();
    for (const user of users) {
      const summary = await notificationRepo.getCurrentMonthSummary(user.id);
      await this._sendNotification(user, 'monthly_summary', {
        subject: 'Monthly Spending Summary',
        title: 'Monthly Spending Summary',
        intro: 'Your monthly financial summary is ready.',
        content: '<p style="margin:0;">These values are based on your recorded transactions and backend calculations.</p>',
        highlightTitle: 'Monthly Overview',
        highlightContent: `
          <div>Income: <strong>${formatCurrency(summary.income)}</strong></div>
          <div>Expenses: <strong>${formatCurrency(summary.expense)}</strong></div>
          <div>Savings: <strong>${formatCurrency(summary.savings)}</strong></div>
        `,
        logMessage: 'Monthly spending summary sent',
      });
    }
  }

  async sendNewMonthBudgetReminders() {
    const users = await notificationRepo.getAllUserIds();
    for (const user of users) {
      const budgets = await notificationRepo.getBudgetsForCurrentMonth(user.id);
      if (budgets.length === 0) {
        await this._sendNotification(user, 'budget_reminder', {
          subject: 'Notification',
          title: 'Budget Reminder',
          intro: 'A new month has started and no budgets are currently set.',
          content: '<p style="margin:0;">Set category budgets to keep your spending aligned with your financial goals.</p>',
          highlightTitle: 'Recommended Action',
          highlightContent: 'Add monthly budgets for your main expense categories in Finance Tracker.',
          logMessage: 'Budget reminder sent',
        });
      }
    }
  }

  async onReceiptUploaded(userId, transactionDescription) {
    const user = await userRepository.findById(userId);
    if (!user) return;
    await this._sendNotification(user, 'receipt_uploaded', {
      subject: 'Notification',
      title: 'Receipt Uploaded',
      intro: 'A receipt has been successfully attached to one of your transactions.',
      highlightTitle: 'Receipt Reference',
      highlightContent: `<div>Description: <strong>${transactionDescription}</strong></div>`,
      logMessage: 'Receipt uploaded successfully',
    });
  }

  async _checkBudgetAlerts(user, transaction) {
    const budgets = await notificationRepo.getBudgetsForCurrentMonth(user.id);
    const budget = budgets.find((item) => item.category_id === transaction.category_id);
    if (!budget) return;

    const spent = parseFloat(budget.amount_spent);
    const limit = parseFloat(budget.limit_amount);

    if (spent > limit) {
      await this._sendNotification(user, 'budget_exceeded', {
        subject: 'Budget Alert',
        title: 'Budget Exceeded',
        intro: `Your spending in ${budget.category_name} has exceeded the monthly budget.`,
        content: '<p style="margin:0;">Review this category to avoid overspending for the rest of the month.</p>',
        highlightTitle: budget.category_name,
        highlightContent: `
          <div>Budget: <strong>${formatCurrency(limit)}</strong></div>
          <div>Spent: <strong>${formatCurrency(spent)}</strong></div>
        `,
        logMessage: `Budget exceeded for ${budget.category_name}`,
      });
    } else if (spent >= limit * BUDGET_WARNING_PERCENT) {
      await this._sendNotification(user, 'budget_near_limit', {
        subject: 'Budget Alert',
        title: 'Budget Near Limit',
        intro: `Your spending in ${budget.category_name} is approaching the budget limit.`,
        highlightTitle: budget.category_name,
        highlightContent: `
          <div>Usage: <strong>${Math.round((spent / limit) * 100)}%</strong></div>
          <div>Budget: <strong>${formatCurrency(limit)}</strong></div>
          <div>Spent: <strong>${formatCurrency(spent)}</strong></div>
        `,
        logMessage: `Budget near limit for ${budget.category_name}`,
      });
    }
  }

  async _checkSpendingSpike(user, transaction) {
    const txDate = transaction.date ? new Date(transaction.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    const alreadySent = await notificationRepo.wasNotificationSentOnDate(user.id, 'spending_spike', txDate);
    if (alreadySent) return;

    const avgDaily = await notificationRepo.getAverageDailyExpense(user.id);
    const dayExpense = await notificationRepo.getExpenseForDate(user.id, txDate);

    if (avgDaily > 0 && dayExpense > avgDaily * SPIKE_THRESHOLD) {
      await this._sendNotification(user, 'spending_spike', {
        subject: 'Notification',
        title: 'Spending Spike Detected',
        intro: `Your expense total for ${txDate} is significantly above your recent daily average.`,
        highlightTitle: 'Comparison',
        highlightContent: `
          <div>Date: <strong>${txDate}</strong></div>
          <div>Expenses: <strong>${formatCurrency(dayExpense)}</strong></div>
          <div>Average Daily Expense: <strong>${formatCurrency(avgDaily)}</strong></div>
        `,
        logMessage: `Spending spike detected for ${txDate}`,
      });
    }
  }

  async _checkHighestSpendingDay(user, transaction) {
    const highest = await notificationRepo.getHighestSpendingDay(user.id);
    if (!highest) return;

    const txDate = transaction.date ? new Date(transaction.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    const dayExpense = await notificationRepo.getExpenseForDate(user.id, txDate);

    if (new Date(highest.date).toISOString().split('T')[0] === txDate && dayExpense >= parseFloat(highest.total)) {
      const alreadySent = await notificationRepo.wasNotificationSentOnDate(user.id, 'highest_spending_day', txDate);
      if (alreadySent) return;

      await this._sendNotification(user, 'highest_spending_day', {
        subject: 'Notification',
        title: 'Highest Spending Day',
        intro: `The date ${txDate} is currently your highest spending day on record.`,
        highlightTitle: 'Expense Data',
        highlightContent: `<div>Expense Total: <strong>${formatCurrency(dayExpense)}</strong></div>`,
        logMessage: `Highest spending day recorded on ${txDate}`,
      });
    }
  }

  async _checkCategorySpike(user, categoryId) {
    const current = await notificationRepo.getCategorySpendingCurrentMonth(user.id, categoryId);
    const previous = await notificationRepo.getCategorySpendingPreviousMonth(user.id, categoryId);

    if (previous > 0 && current > previous * SPIKE_THRESHOLD) {
      await this._sendNotification(user, 'category_spike', {
        subject: 'Notification',
        title: 'Monthly Spending Insight',
        intro: 'A category has seen a sharp increase in spending compared with last month.',
        highlightTitle: 'Category Comparison',
        highlightContent: `
          <div>Previous Month: <strong>${formatCurrency(previous)}</strong></div>
          <div>Current Month: <strong>${formatCurrency(current)}</strong></div>
        `,
        logMessage: 'Category spending spike detected',
      });
    }
  }

  async _checkLowSavings(user) {
    const txDate = new Date().toISOString().split('T')[0];
    const alreadySent = await notificationRepo.wasNotificationSentOnDate(user.id, 'low_savings', txDate);
    if (alreadySent) return;

    const summary = await notificationRepo.getCurrentMonthSummary(user.id);
    const prevSavings = await notificationRepo.getPreviousMonthSavings(user.id);

    if (summary.savings < LOW_SAVINGS_THRESHOLD) {
      await this._sendNotification(user, 'low_savings', {
        subject: 'Notification',
        title: 'Low Savings Alert',
        intro: 'Your current month savings are below the configured threshold.',
        highlightTitle: 'Savings Status',
        highlightContent: `<div>Current Savings: <strong>${formatCurrency(summary.savings)}</strong></div>`,
        logMessage: 'Low savings warning',
      });
    } else if (prevSavings > 0 && summary.savings > prevSavings * 1.5) {
      const alreadySentHigh = await notificationRepo.wasNotificationSentOnDate(user.id, 'high_savings', txDate);
      if (alreadySentHigh) return;
      await this._sendNotification(user, 'high_savings', {
        subject: 'Notification',
        title: 'Savings Improvement',
        intro: 'Your savings this month are significantly stronger than last month.',
        highlightTitle: 'Savings Comparison',
        highlightContent: `
          <div>This Month: <strong>${formatCurrency(summary.savings)}</strong></div>
          <div>Last Month: <strong>${formatCurrency(prevSavings)}</strong></div>
        `,
        logMessage: 'Savings improvement detected',
      });
    }
  }

  async _checkNoIncome(user) {
    const txDate = new Date().toISOString().split('T')[0];
    const alreadySent = await notificationRepo.wasNotificationSentOnDate(user.id, 'no_income', txDate);
    if (alreadySent) return;

    const incomeCount = await notificationRepo.getCurrentMonthIncomeCount(user.id);
    const today = new Date();
    if (today.getDate() >= 10 && incomeCount === 0) {
      await this._sendNotification(user, 'no_income', {
        subject: 'Notification',
        title: 'No Income Recorded',
        intro: 'No income transactions have been recorded for the current month so far.',
        content: '<p style="margin:0;">If income has already been received, add it to keep your reports accurate.</p>',
        logMessage: 'No income recorded this month',
      });
    }
  }

  async _checkInactivity(user) {
    const lastDate = await notificationRepo.getLastTransactionDate(user.id);
    if (!lastDate) return;

    const daysSince = Math.floor((Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince >= INACTIVITY_DAYS) {
      await this._sendNotification(user, 'inactivity', {
        subject: 'Notification',
        title: 'Activity Reminder',
        intro: `It has been ${daysSince} days since your last recorded transaction.`,
        content: '<p style="margin:0;">Keeping your transactions up to date helps Finance Tracker produce accurate insights and reports.</p>',
        logMessage: 'Inactivity reminder sent',
      });
    }
  }

  async _checkSpendingHabitInsight(user) {
    const txDate = new Date().toISOString().split('T')[0];
    const alreadySent = await notificationRepo.wasNotificationSentOnDate(user.id, 'spending_insight', txDate);
    if (alreadySent) return;

    const top = await notificationRepo.getTopSpendingCategory(user.id);
    if (top) {
      await this._sendNotification(user, 'spending_insight', {
        subject: 'Monthly Spending Summary',
        title: 'Monthly Spending Insight',
        intro: 'Here is the category with the highest spend for the current month.',
        highlightTitle: top.category_name,
        highlightContent: `<div>Amount Spent: <strong>${formatCurrency(top.total)}</strong></div>`,
        logMessage: `Top spending category is ${top.category_name}`,
      });
    }
  }

  async _checkRecurringPayments(user) {
    const txDate = new Date().toISOString().split('T')[0];
    const alreadySent = await notificationRepo.wasNotificationSentOnDate(user.id, 'recurring_payment', txDate);
    if (alreadySent) return;

    const recurring = await notificationRepo.getRecurringTransactions(user.id);
    if (recurring.length > 0) {
      const content = recurring.map((item) => `
        <div style="margin-bottom:8px;">
          <strong>${item.description}</strong><br>
          ${formatCurrency(item.amount)} | ${item.occurrences} times | ${item.category_name}
        </div>
      `).join('');

      await this._sendNotification(user, 'recurring_payment', {
        subject: 'Notification',
        title: 'Recurring Payment Insight',
        intro: 'Potential recurring payments were detected in your recent transactions.',
        highlightTitle: 'Recurring Items',
        highlightContent: content,
        logMessage: 'Recurring payments detected',
      });
    }
  }

  async _checkBudgetNotSet(user, categoryId) {
    const cats = await notificationRepo.getCategoriesWithoutBudget(user.id);
    const match = cats.find((item) => item.id === categoryId);
    if (match) {
      await this._sendNotification(user, 'budget_not_set', {
        subject: 'Notification',
        title: 'Budget Not Set',
        intro: `You have recorded spending in ${match.name} without an active monthly budget.`,
        content: '<p style="margin:0;">Consider adding a budget to track this category more effectively.</p>',
        logMessage: `No budget set for ${match.name}`,
      });
    }
  }

  async _sendNotification(user, type, payload) {
    try {
      await sendEmail(user.email, payload.subject, {
        title: payload.title,
        intro: payload.intro,
        content: payload.content,
        highlightTitle: payload.highlightTitle,
        highlightContent: payload.highlightContent,
      });
      await notificationRepo.logNotification(user.id, type, payload.logMessage || payload.title);
    } catch (err) {
      console.error(`[NOTIFICATION] Error sending ${type} to ${user.email}:`, err.message);
    }
  }
  async sendAnomalyAlert(user, transaction, explanation) {
    const subject = `Unusual Transaction Detected — ${transaction.category_name || 'Uncategorized'}`;
    const amountStr = `${Math.abs(parseFloat(transaction.amount)).toFixed(2)} ${transaction.currency || 'INR'}`;
    const content = `
      <p style="margin:0 0 12px;">
        <strong>${transaction.description || 'No description'}</strong><br>
        Amount: <strong>${amountStr}</strong><br>
        Category: <strong>${transaction.category_name || 'Uncategorized'}</strong><br>
        Date: <strong>${transaction.date}</strong>
      </p>
    `;

    await this._sendNotification(user, 'anomaly_alert', {
      subject,
      title: 'Unusual Transaction Detected',
      intro: `Hi ${user.name}, a transaction on your account has been flagged as statistically unusual.`,
      content,
      highlightTitle: 'Why This Was Flagged',
      highlightContent: `
        <div>${explanation}</div>
        <div style="margin-top:12px;font-size:13px;color:#64748b;">
          If this was you, no action needed. If this looks unfamiliar, please review your account immediately.
        </div>
      `,
    });
  }

  async sendBudgetOverrunAlert(user, category, spent, limit) {
    const subject = `Budget Overrun Alert — ${category}`;
    const overrun = (spent - limit).toFixed(2);
    const content = `
      <p style="margin:0 0 12px;">
        Hi ${user.name}, you have exceeded your budget for <strong>${category}</strong>.
      </p>
    `;

    await this._sendNotification(user, 'budget_overrun', {
      subject,
      title: 'Budget Overrun Alert',
      intro: `Your spending in ${category} has exceeded the monthly budget limit.`,
      content,
      highlightTitle: category,
      highlightContent: `
        <div>Budget: <strong>${limit}</strong></div>
        <div>Spent: <strong>${spent}</strong></div>
        <div style="margin-top:8px;font-weight:700;color:#ef4444;">Overrun by: ${overrun}</div>
      `,
    });
  }
  async sendPasswordResetLink(user, token) {
    const subject = 'Password Reset Request';
    const resetUrl = `http://localhost:5500/reset-password.html?token=${token}`;
    await this._sendNotification(user, 'password_reset_link', {
      subject,
      title: 'Reset Your Password',
      intro: `Hi ${user.name}, we received a request to reset your password.`,
      content: '<p style="margin:0 0 12px;">If you did not make this request, you can safely ignore this email. This link will expire securely in 15 minutes.</p>',
      highlightTitle: 'Action Required',
      highlightContent: `<div style="text-align: center; margin-top: 16px;"><a href="${resetUrl}" style="background-color: #d4a44c; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Reset Password Now</a></div>`,
      logMessage: 'Password reset secure token dispatched'
    });
  }
}

module.exports = new NotificationService();
