const pool = require('../config/db');


class TransactionRepository {
  
  async findAllForUser(userId, filters = {}) {
    const { type, category_id, start_date, end_date, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    
    const conditions = ['t.user_id = $1'];
    const params = [userId];
    let idx = 2;

    if (type) {
      conditions.push(`t.type = $${idx++}`);
      params.push(type);
    }
    if (category_id) {
      conditions.push(`t.category_id = $${idx++}`);
      params.push(category_id);
    }
    if (start_date) {
      conditions.push(`t.date >= $${idx++}`);
      params.push(start_date);
    }
    if (end_date) {
      conditions.push(`t.date <= $${idx++}`);
      params.push(end_date);
    }

    const where = conditions.join(' AND ');

   
    const dataQuery = `
      SELECT
        t.id, t.type, t.amount, t.currency, t.converted_amount, t.description, TO_CHAR(t.date, 'YYYY-MM-DD') AS date, t.receipt_url, t.created_at,
        c.id   AS category_id,
        c.name AS category_name,
        c.type AS category_type
      FROM transactions t
      JOIN categories c ON c.id = t.category_id
      WHERE ${where}
      ORDER BY t.date DESC, t.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `;
    params.push(limit, offset);

  
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM transactions t
      WHERE ${where}
    `;

    const [dataResult, countResult] = await Promise.all([
      pool.query(dataQuery, params),
      pool.query(countQuery, params.slice(0, idx - 1)),
    ]);

    return {
      rows: dataResult.rows,
      total: parseInt(countResult.rows[0].total, 10),
    };
  }

  
  async findByIdForUser(transactionId, userId) {
    const { rows } = await pool.query(
      `SELECT
         t.id, t.type, t.amount, t.currency, t.converted_amount, t.description, TO_CHAR(t.date, 'YYYY-MM-DD') AS date, t.receipt_url, t.created_at,
         c.name AS category_name
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
       WHERE t.id = $1 AND t.user_id = $2
       LIMIT 1`,
      [transactionId, userId]
    );
    return rows[0] || null;
  }

  async getBalanceForUser(userId) {
    const { rows } = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN type = 'income' THEN converted_amount ELSE 0 END), 0)
         - COALESCE(ABS(SUM(CASE WHEN type = 'expense' THEN converted_amount ELSE 0 END)), 0) AS balance
       FROM transactions
       WHERE user_id = $1`,
      [userId]
    );
    return parseFloat(rows[0].balance);
  }


  async create({ userId, category_id, type, amount, currency, converted_amount, description, date, receipt_url }) {
    const { rows } = await pool.query(
      `INSERT INTO transactions (user_id, category_id, type, amount, currency, converted_amount, description, date, receipt_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, user_id, category_id, type, amount, currency, converted_amount, description, TO_CHAR(date, 'YYYY-MM-DD') AS date, receipt_url, created_at`,
      [userId, category_id, type, amount, currency, converted_amount, description || null, date || 'today', receipt_url || null]
    );
    return rows[0];
  }

 
  async updateForUser(transactionId, userId, fields) {
    const allowed = ['category_id', 'type', 'amount', 'currency', 'converted_amount', 'description', 'date', 'receipt_url'];
    const setClauses = [];
    const params = [];
    let idx = 1;

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        setClauses.push(`${key} = $${idx++}`);
        params.push(fields[key]);
      }
    }

    if (setClauses.length === 0) return null;

    params.push(transactionId, userId);

    const { rows } = await pool.query(
      `UPDATE transactions
       SET ${setClauses.join(', ')}
       WHERE id = $${idx} AND user_id = $${idx + 1}
       RETURNING id, user_id, category_id, type, amount, currency, converted_amount, description, TO_CHAR(date, 'YYYY-MM-DD') AS date, receipt_url, created_at`,
      params
    );
    return rows[0] || null;
  }

  
  async deleteForUser(transactionId, userId) {
    const { rows } = await pool.query(
      `DELETE FROM transactions
       WHERE id = $1 AND user_id = $2
       RETURNING id, user_id, category_id, type, amount, currency, converted_amount, description, TO_CHAR(date, 'YYYY-MM-DD') AS date, receipt_url, created_at`,
      [transactionId, userId]
    );
    return rows[0] || null;
  }
}

module.exports = new TransactionRepository();
