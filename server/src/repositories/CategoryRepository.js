const pool = require('../config/db');


class CategoryRepository {
  
  async findAllForUser(userId) {
    const { rows } = await pool.query(
      `SELECT * FROM categories
       WHERE (user_id IS NULL OR user_id = $1)
       AND is_deleted = false
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
    // Check if category exists (including soft-deleted)
    const { rows: existing } = await pool.query(
      `SELECT * FROM categories 
       WHERE name = $1 AND type = $2 AND (user_id = $3 OR user_id IS NULL)`,
      [name, type, userId]
    );

    if (existing.length > 0) {
      if (existing[0].is_deleted) {
        // Undelete the existing soft-deleted category
        const { rows: updated } = await pool.query(
          `UPDATE categories SET is_deleted = false WHERE id = $1 RETURNING *`,
          [existing[0].id]
        );
        return updated[0];
      }
      // If it exists and is NOT soft-deleted, trying to insert will legitimately fail via constraints,
      // but we can throw an error nicely here or let constraints handle it below.
    }

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

  async softDeleteForUser(categoryId, userId) {
    const { rows } = await pool.query(
      `UPDATE categories
       SET is_deleted = true
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [categoryId, userId]
    );
    return rows[0] || null;
  }
}

module.exports = new CategoryRepository();
