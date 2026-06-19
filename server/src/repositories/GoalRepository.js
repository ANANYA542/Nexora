const pool = require('../config/db');

class GoalRepository {
  async findAllForUser(userId) {
    const { rows } = await pool.query(
      `SELECT * FROM goals WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return rows;
  }

  async findByIdForUser(goalId, userId) {
    const { rows } = await pool.query(
      `SELECT * FROM goals WHERE id = $1 AND user_id = $2`,
      [goalId, userId]
    );
    return rows[0] || null;
  }

  async create({ userId, name, target_amount, current_amount, deadline, priority, category, auto_save_amount }) {
    const { rows } = await pool.query(
      `INSERT INTO goals (user_id, name, target_amount, current_amount, deadline, priority, category, auto_save_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [userId, name, target_amount, current_amount || 0, deadline, priority || 'medium', category, auto_save_amount]
    );
    return rows[0];
  }

  async updateForUser(goalId, userId, updates) {
    const { name, target_amount, current_amount, deadline, priority, category, auto_save_amount, status } = updates;
    const { rows } = await pool.query(
      `UPDATE goals
       SET name = COALESCE($3, name),
           target_amount = COALESCE($4, target_amount),
           current_amount = COALESCE($5, current_amount),
           deadline = COALESCE($6, deadline),
           priority = COALESCE($7, priority),
           category = COALESCE($8, category),
           auto_save_amount = COALESCE($9, auto_save_amount),
           status = COALESCE($10, status)
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [goalId, userId, name, target_amount, current_amount, deadline, priority, category, auto_save_amount, status]
    );
    return rows[0] || null;
  }

  async contributeForUser(goalId, userId, amount) {
    const { rows } = await pool.query(
      `UPDATE goals
       SET current_amount = current_amount + $3
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [goalId, userId, amount]
    );
    return rows[0] || null;
  }

  async deleteForUser(goalId, userId) {
    const { rows } = await pool.query(
      `DELETE FROM goals WHERE id = $1 AND user_id = $2 RETURNING *`,
      [goalId, userId]
    );
    return rows[0] || null;
  }
}

module.exports = new GoalRepository();
