const pool = require('../config/db');

class AccountRepository {
  async findAllForUser(userId) {
    const { rows } = await pool.query(
      `SELECT * FROM accounts WHERE user_id = $1 ORDER BY name`,
      [userId]
    );
    return rows;
  }

  async findByIdForUser(accountId, userId) {
    const { rows } = await pool.query(
      `SELECT * FROM accounts WHERE id = $1 AND user_id = $2`,
      [accountId, userId]
    );
    return rows[0] || null;
  }

  async create({ userId, name, type, institution, balance, currency, metadata }) {
    const { rows } = await pool.query(
      `INSERT INTO accounts (user_id, name, type, institution, balance, currency, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, name, type, institution, balance || 0, currency || 'INR', metadata]
    );
    return rows[0];
  }

  async updateForUser(accountId, userId, updates) {
    const { name, type, institution, balance, currency, is_active, metadata } = updates;
    const { rows } = await pool.query(
      `UPDATE accounts
       SET name = COALESCE($3, name),
           type = COALESCE($4, type),
           institution = COALESCE($5, institution),
           balance = COALESCE($6, balance),
           currency = COALESCE($7, currency),
           is_active = COALESCE($8, is_active),
           metadata = COALESCE($9, metadata)
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [accountId, userId, name, type, institution, balance, currency, is_active, metadata]
    );
    return rows[0] || null;
  }

  async deleteForUser(accountId, userId) {
    const { rows } = await pool.query(
      `DELETE FROM accounts WHERE id = $1 AND user_id = $2 RETURNING *`,
      [accountId, userId]
    );
    return rows[0] || null;
  }

  async getNetWorth(userId) {
    // Net worth = Savings/Assets accounts + Investment accounts - Credit Card dues
    const { rows } = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN type IN ('savings', 'current', 'wallet', 'investment') THEN balance ELSE 0 END), 0) AS assets,
         COALESCE(SUM(CASE WHEN type = 'credit_card' THEN balance ELSE 0 END), 0) AS liabilities
       FROM accounts
       WHERE user_id = $1 AND is_active = TRUE`,
      [userId]
    );
    const summary = rows[0];
    const netWorth = parseFloat(summary.assets) - parseFloat(summary.liabilities);
    return {
      assets: parseFloat(summary.assets),
      liabilities: parseFloat(summary.liabilities),
      net_worth: netWorth
    };
  }
}

module.exports = new AccountRepository();
