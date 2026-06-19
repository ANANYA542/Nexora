const pool = require('../config/db');

class InvestmentRepository {
  async findAllForUser(userId) {
    const { rows } = await pool.query(
      `SELECT * FROM investments WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return rows;
  }

  async findByIdForUser(investmentId, userId) {
    const { rows } = await pool.query(
      `SELECT * FROM investments WHERE id = $1 AND user_id = $2`,
      [investmentId, userId]
    );
    return rows[0] || null;
  }

  async create({ userId, name, type, platform, invested_amount, current_value, units, last_updated, metadata }) {
    const { rows } = await pool.query(
      `INSERT INTO investments (user_id, name, type, platform, invested_amount, current_value, units, last_updated, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [userId, name, type, platform, invested_amount, current_value, units, last_updated, metadata]
    );
    return rows[0];
  }

  async updateForUser(investmentId, userId, updates) {
    const { name, type, platform, invested_amount, current_value, units, last_updated, metadata } = updates;
    const { rows } = await pool.query(
      `UPDATE investments
       SET name = COALESCE($3, name),
           type = COALESCE($4, type),
           platform = COALESCE($5, platform),
           invested_amount = COALESCE($6, invested_amount),
           current_value = COALESCE($7, current_value),
           units = COALESCE($8, units),
           last_updated = COALESCE($9, last_updated),
           metadata = COALESCE($10, metadata)
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [investmentId, userId, name, type, platform, invested_amount, current_value, units, last_updated, metadata]
    );
    return rows[0] || null;
  }

  async deleteForUser(investmentId, userId) {
    const { rows } = await pool.query(
      `DELETE FROM investments WHERE id = $1 AND user_id = $2 RETURNING *`,
      [investmentId, userId]
    );
    return rows[0] || null;
  }

  async getPortfolioSummary(userId) {
    const { rows } = await pool.query(
      `SELECT
         COALESCE(SUM(invested_amount), 0) AS total_invested,
         COALESCE(SUM(current_value), 0) AS total_current_value,
         COALESCE(SUM(current_value - invested_amount), 0) AS total_returns
       FROM investments
       WHERE user_id = $1`,
      [userId]
    );
    return rows[0];
  }

  async getAllocation(userId) {
    const { rows } = await pool.query(
      `SELECT
         type,
         COALESCE(SUM(current_value), 0) AS total_value
       FROM investments
       WHERE user_id = $1
       GROUP BY type`,
      [userId]
    );
    return rows;
  }
}

module.exports = new InvestmentRepository();
