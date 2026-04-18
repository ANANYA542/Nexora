const pool = require('../config/db');


class DashboardRepository {
  async getSummary(userId, { start_date, end_date } = {}) {
    const conditions = ['user_id = $1'];
    const params = [userId];
    let idx = 2;

    if (start_date) { conditions.push(`date >= $${idx++}`); params.push(start_date); }
    if (end_date)   { conditions.push(`date <= $${idx++}`); params.push(end_date); }

    const where = conditions.join(' AND ');

    const { rows } = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN type = 'income'  THEN converted_amount ELSE 0 END), 0) AS total_income,
         COALESCE(ABS(SUM(CASE WHEN type = 'expense' THEN converted_amount ELSE 0 END)), 0) AS total_expense,
         COALESCE(SUM(CASE WHEN type = 'income'  THEN converted_amount ELSE 0 END), 0)
         - COALESCE(ABS(SUM(CASE WHEN type = 'expense' THEN converted_amount ELSE 0 END)), 0) AS savings
       FROM transactions
       WHERE ${where}`,
      params
    );
    return rows[0];
  }

  async getExpenseByCategory(userId, { start_date, end_date } = {}) {
    const conditions = ["t.user_id = $1", "t.type = 'expense'"];
    const params = [userId];
    let idx = 2;

    if (start_date) { conditions.push(`t.date >= $${idx++}`); params.push(start_date); }
    if (end_date)   { conditions.push(`t.date <= $${idx++}`); params.push(end_date); }

    const where = conditions.join(' AND ');

    const { rows } = await pool.query(
      `SELECT
         c.id   AS category_id,
         c.name AS category_name,
         ABS(SUM(t.converted_amount)) AS total
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
       WHERE ${where}
       GROUP BY c.id, c.name
       ORDER BY total DESC`,
      params
    );
    return rows;
  }

  async getIncomeByCategory(userId, { start_date, end_date } = {}) {
    const conditions = ["t.user_id = $1", "t.type = 'income'"];
    const params = [userId];
    let idx = 2;

    if (start_date) { conditions.push(`t.date >= $${idx++}`); params.push(start_date); }
    if (end_date)   { conditions.push(`t.date <= $${idx++}`); params.push(end_date); }

    const where = conditions.join(' AND ');

    const { rows } = await pool.query(
      `SELECT
         c.id   AS category_id,
         c.name AS category_name,
         SUM(t.converted_amount) AS total
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
       WHERE ${where}
       GROUP BY c.id, c.name
       ORDER BY total DESC`,
      params
    );
    return rows;
  }

  async getDailyExpenses(userId, { start_date, end_date } = {}) {
    const conditions = ["user_id = $1", "type = 'expense'"];
    const params = [userId];
    let idx = 2;

    if (start_date) { conditions.push(`date >= $${idx++}`); params.push(start_date); }
    if (end_date)   { conditions.push(`date <= $${idx++}`); params.push(end_date); }

    const where = conditions.join(' AND ');

    const { rows } = await pool.query(
      `SELECT
         TO_CHAR(date, 'YYYY-MM-DD') AS date,
         ABS(SUM(converted_amount)) AS total_expense
       FROM transactions
       WHERE ${where}
       GROUP BY date
       ORDER BY date ASC`,
      params
    );
    return rows;
  }

  async getHighestSpendingDay(userId, { start_date, end_date } = {}) {
    const conditions = ["user_id = $1", "type = 'expense'"];
    const params = [userId];
    let idx = 2;

    if (start_date) { conditions.push(`date >= $${idx++}`); params.push(start_date); }
    if (end_date)   { conditions.push(`date <= $${idx++}`); params.push(end_date); }

    const where = conditions.join(' AND ');

    const { rows } = await pool.query(
      `SELECT
         TO_CHAR(date, 'YYYY-MM-DD') AS date,
         ABS(SUM(converted_amount)) AS total_expense
       FROM transactions
       WHERE ${where}
       GROUP BY date
       ORDER BY total_expense DESC
       LIMIT 1`,
      params
    );
    return rows[0] || null;
  }
}

module.exports = new DashboardRepository();
