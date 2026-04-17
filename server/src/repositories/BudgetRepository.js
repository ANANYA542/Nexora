const pool = require('../config/db');


class BudgetRepository {
  async findAllForUser(userId, { month, year } = {}) {
    const conditions = ['b.user_id = $1'];
    const params = [userId];
    let idx = 2;

    if (month) { conditions.push(`b.month = $${idx++}`); params.push(month); }
    if (year)  { conditions.push(`b.year  = $${idx++}`); params.push(year); }

    const where = conditions.join(' AND ');

    const { rows } = await pool.query(
      `SELECT
         b.id,
         b.month,
         b.year,
         b.limit_amount,
         c.id   AS category_id,
         c.name AS category_name,
         COALESCE(spent.total, 0) AS amount_spent,
         b.limit_amount - COALESCE(spent.total, 0) AS remaining
       FROM budgets b
       JOIN categories c ON c.id = b.category_id
       LEFT JOIN (
         SELECT
           category_id,
           ABS(SUM(converted_amount)) AS total
         FROM transactions
         WHERE user_id = $1
           AND type = 'expense'
           ${month ? `AND EXTRACT(MONTH FROM date) = $${idx - (year ? 2 : 1)}` : ''}
           ${year  ? `AND EXTRACT(YEAR  FROM date) = $${idx - 1}` : ''}
         GROUP BY category_id
       ) spent ON spent.category_id = b.category_id
       WHERE ${where}
       ORDER BY b.year DESC, b.month DESC, c.name`,
      params
    );
    return rows;
  }

  async upsert({ userId, category_id, limit_amount, month, year }) {
    const { rows } = await pool.query(
      `INSERT INTO budgets (user_id, category_id, limit_amount, month, year)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, category_id, month, year)
       DO UPDATE SET limit_amount = EXCLUDED.limit_amount
       RETURNING *`,
      [userId, category_id, limit_amount, month, year]
    );
    return rows[0];
  }

  async deleteForUser(budgetId, userId) {
    const { rows } = await pool.query(
      `DELETE FROM budgets WHERE id = $1 AND user_id = $2 RETURNING *`,
      [budgetId, userId]
    );
    return rows[0] || null;
  }
}

module.exports = new BudgetRepository();
