const pool = require('../config/db');

class NotificationRepository {

  async getAverageDailyExpense(userId) {
    const { rows } = await pool.query(
      `SELECT COALESCE(AVG(daily_total), 0) AS avg_daily
       FROM (
         SELECT TO_CHAR(date, 'YYYY-MM-DD') AS date, ABS(SUM(converted_amount)) AS daily_total
         FROM transactions
         WHERE user_id = $1 AND type = 'expense'
         GROUP BY date
       ) daily`,
      [userId]
    );
    return parseFloat(rows[0].avg_daily);
  }

  async getExpenseForDate(userId, dateString) {
    const { rows } = await pool.query(
      `SELECT COALESCE(ABS(SUM(converted_amount)), 0) AS total
       FROM transactions
       WHERE user_id = $1 AND type = 'expense' AND date = $2`,
      [userId, dateString]
    );
    return parseFloat(rows[0].total);
  }

  async getHighestSpendingDay(userId) {
    const { rows } = await pool.query(
      `SELECT TO_CHAR(date, 'YYYY-MM-DD') AS date, ABS(SUM(converted_amount)) AS total
       FROM transactions
       WHERE user_id = $1 AND type = 'expense'
       GROUP BY date
       ORDER BY total DESC
       LIMIT 1`,
      [userId]
    );
    return rows[0] || null;
  }

  async getCategorySpendingCurrentMonth(userId, categoryId) {
    const { rows } = await pool.query(
      `SELECT COALESCE(ABS(SUM(converted_amount)), 0) AS total
       FROM transactions
       WHERE user_id = $1 AND category_id = $2 AND type = 'expense'
         AND EXTRACT(MONTH FROM date) = EXTRACT(MONTH FROM CURRENT_DATE)
         AND EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM CURRENT_DATE)`,
      [userId, categoryId]
    );
    return parseFloat(rows[0].total);
  }

  async getCategorySpendingPreviousMonth(userId, categoryId) {
    const { rows } = await pool.query(
      `SELECT COALESCE(ABS(SUM(converted_amount)), 0) AS total
       FROM transactions
       WHERE user_id = $1 AND category_id = $2 AND type = 'expense'
         AND EXTRACT(MONTH FROM date) = EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '1 month')
         AND EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '1 month')`,
      [userId, categoryId]
    );
    return parseFloat(rows[0].total);
  }

  async getCurrentMonthSummary(userId) {
    const { rows } = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN type = 'income' THEN converted_amount ELSE 0 END), 0) AS total_income,
         COALESCE(ABS(SUM(CASE WHEN type = 'expense' THEN converted_amount ELSE 0 END)), 0) AS total_expense
       FROM transactions
       WHERE user_id = $1
         AND EXTRACT(MONTH FROM date) = EXTRACT(MONTH FROM CURRENT_DATE)
         AND EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM CURRENT_DATE)`,
      [userId]
    );
    const income = parseFloat(rows[0].total_income);
    const expense = parseFloat(rows[0].total_expense);
    return { income, expense, savings: income - expense };
  }

  async getPreviousMonthSavings(userId) {
    const { rows } = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN type = 'income' THEN converted_amount ELSE 0 END), 0)
         - COALESCE(ABS(SUM(CASE WHEN type = 'expense' THEN converted_amount ELSE 0 END)), 0) AS savings
       FROM transactions
       WHERE user_id = $1
         AND EXTRACT(MONTH FROM date) = EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '1 month')
         AND EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '1 month')`,
      [userId]
    );
    return parseFloat(rows[0].savings);
  }

  async getCurrentMonthIncomeCount(userId) {
    const { rows } = await pool.query(
      `SELECT COUNT(*) AS count FROM transactions
       WHERE user_id = $1 AND type = 'income'
         AND EXTRACT(MONTH FROM date) = EXTRACT(MONTH FROM CURRENT_DATE)
         AND EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM CURRENT_DATE)`,
      [userId]
    );
    return parseInt(rows[0].count, 10);
  }

  async getLastTransactionDate(userId) {
    const { rows } = await pool.query(
      `SELECT MAX(created_at) AS last_date FROM transactions WHERE user_id = $1`,
      [userId]
    );
    return rows[0].last_date || null;
  }

  async getTopSpendingCategory(userId) {
    const { rows } = await pool.query(
      `SELECT c.name AS category_name, ABS(SUM(t.converted_amount)) AS total
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
       WHERE t.user_id = $1 AND t.type = 'expense'
         AND EXTRACT(MONTH FROM t.date) = EXTRACT(MONTH FROM CURRENT_DATE)
         AND EXTRACT(YEAR FROM t.date) = EXTRACT(YEAR FROM CURRENT_DATE)
       GROUP BY c.name
       ORDER BY total DESC
       LIMIT 1`,
      [userId]
    );
    return rows[0] || null;
  }

  async getRecurringTransactions(userId) {
    const { rows } = await pool.query(
      `SELECT t.description AS description, ABS(t.converted_amount) AS amount, COUNT(*) AS occurrences,
              c.name AS category_name
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
       WHERE t.user_id = $1 AND t.type = 'expense'
         AND t.description IS NOT NULL AND t.description != ''
       GROUP BY t.description, t.converted_amount, c.name
       HAVING COUNT(*) >= 3
       ORDER BY occurrences DESC`,
      [userId]
    );
    return rows;
  }

  async getCategoriesWithoutBudget(userId) {
    const { rows } = await pool.query(
      `SELECT DISTINCT c.id, c.name
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
       WHERE t.user_id = $1 AND t.type = 'expense'
         AND EXTRACT(MONTH FROM t.date) = EXTRACT(MONTH FROM CURRENT_DATE)
         AND EXTRACT(YEAR FROM t.date) = EXTRACT(YEAR FROM CURRENT_DATE)
         AND c.id NOT IN (
           SELECT category_id FROM budgets
           WHERE user_id = $1
             AND month = EXTRACT(MONTH FROM CURRENT_DATE)
             AND year = EXTRACT(YEAR FROM CURRENT_DATE)
         )`,
      [userId]
    );
    return rows;
  }

  async getWeeklySummary(userId) {
    const { rows } = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN type = 'income' THEN converted_amount ELSE 0 END), 0) AS total_income,
         COALESCE(ABS(SUM(CASE WHEN type = 'expense' THEN converted_amount ELSE 0 END)), 0) AS total_expense,
         COUNT(*) AS transaction_count
       FROM transactions
       WHERE user_id = $1
         AND date >= CURRENT_DATE - INTERVAL '7 days'`,
      [userId]
    );
    const income = parseFloat(rows[0].total_income);
    const expense = parseFloat(rows[0].total_expense);
    return {
      income,
      expense,
      savings: income - expense,
      transaction_count: parseInt(rows[0].transaction_count, 10),
    };
  }

  async getBudgetsForCurrentMonth(userId) {
    const { rows } = await pool.query(
      `SELECT b.id, b.limit_amount, b.category_id, c.name AS category_name,
              COALESCE(spent.total, 0) AS amount_spent
       FROM budgets b
       JOIN categories c ON c.id = b.category_id
       LEFT JOIN (
         SELECT category_id, ABS(SUM(converted_amount)) AS total
         FROM transactions
         WHERE user_id = $1 AND type = 'expense'
           AND EXTRACT(MONTH FROM date) = EXTRACT(MONTH FROM CURRENT_DATE)
           AND EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM CURRENT_DATE)
         GROUP BY category_id
       ) spent ON spent.category_id = b.category_id
       WHERE b.user_id = $1
         AND b.month = EXTRACT(MONTH FROM CURRENT_DATE)
         AND b.year = EXTRACT(YEAR FROM CURRENT_DATE)`,
      [userId]
    );
    return rows;
  }

  async getAllUserIds() {
    const { rows } = await pool.query('SELECT id, email, name FROM users');
    return rows;
  }

  async logNotification(userId, type, message) {
    await pool.query(
      `INSERT INTO notification_log (user_id, type, message) VALUES ($1, $2, $3)`,
      [userId, type, message]
    );
  }

  async getLatestForUser(userId, limit = 5) {
    const { rows } = await pool.query(
      `SELECT id, type, message, sent_at
       FROM notification_log
       WHERE user_id = $1
       ORDER BY sent_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return rows;
  }

  async wasNotificationSentOnDate(userId, type, dateString) {
    const { rows } = await pool.query(
      `SELECT COUNT(*) AS count FROM notification_log
       WHERE user_id = $1 AND type = $2 AND DATE(sent_at) = $3`,
      [userId, type, dateString]
    );
    return parseInt(rows[0].count, 10) > 0;
  }
}

module.exports = new NotificationRepository();
