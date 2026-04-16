const pool = require('../config/db');


class ReportRepository {
 
  async getMonthlyReport(userId, { year } = {}) {
    const conditions = ['user_id = $1'];
    const params = [userId];
    let idx = 2;

    if (year) {
      conditions.push(`EXTRACT(YEAR FROM date) = $${idx++}`);
      params.push(year);
    }

    const where = conditions.join(' AND ');

    const { rows } = await pool.query(
      `SELECT
         TO_CHAR(DATE_TRUNC('month', date), 'YYYY-MM') AS month,
         COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END), 0)        AS total_income,
         COALESCE(ABS(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END)), 0)   AS total_expense,
         COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END), 0)
         - COALESCE(ABS(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END)), 0) AS savings
       FROM transactions
       WHERE ${where}
       GROUP BY DATE_TRUNC('month', date)
       ORDER BY DATE_TRUNC('month', date) ASC`,
      params
    );
    return rows;
  }
}

module.exports = new ReportRepository();
