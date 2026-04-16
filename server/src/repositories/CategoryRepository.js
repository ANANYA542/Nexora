const pool = require('../config/db');


class CategoryRepository {
  
  async findAllForUser(userId) {
    const { rows } = await pool.query(
      `SELECT * FROM categories
       WHERE user_id IS NULL OR user_id = $1
       ORDER BY type, name`,
      [userId]
    );
    return rows;
  }

  
  async findByIdForUser(categoryId, userId) {
    const { rows } = await pool.query(
      `SELECT * FROM categories
       WHERE id = $1 AND (user_id IS NULL OR user_id = $2)
       LIMIT 1`,
      [categoryId, userId]
    );
    return rows[0] || null;
  }

  async create({ name, type, userId }) {
    const { rows } = await pool.query(
      `INSERT INTO categories (name, type, user_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, type, userId]
    );
    return rows[0];
  }

  async findByIdAndOwner(categoryId, userId) {
    const { rows } = await pool.query(
      `SELECT * FROM categories WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [categoryId, userId]
    );
    return rows[0] || null;
  }

  async deleteForUser(categoryId, userId) {
    const { rows } = await pool.query(
      `DELETE FROM categories
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [categoryId, userId]
    );
    return rows[0] || null;
  }
}

module.exports = new CategoryRepository();
