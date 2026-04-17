const pool = require('../config/db');


class UserRepository {
 
  async findByEmail(email) {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE email = $1 LIMIT 1',
      [email]
    );
    return rows[0] || null;
  }

 
  async findById(id) {
    const { rows } = await pool.query(
      'SELECT id, name, email, created_at, updated_at FROM users WHERE id = $1 LIMIT 1',
      [id]
    );
    return rows[0] || null;
  }

  async create({ name, email, password_hash }) {
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at`,
      [name, email, password_hash]
    );
    return rows[0];
  }

  async findByGoogleId(googleId) {
    const { rows } = await pool.query(
      'SELECT id, name, email, created_at, updated_at FROM users WHERE google_id = $1 LIMIT 1',
      [googleId]
    );
    return rows[0] || null;
  }

  async createGoogleUser({ name, email, googleId }) {
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, google_id, auth_provider)
       VALUES ($1, $2, '', $3, 'google')
       RETURNING id, name, email, created_at`,
      [name, email, googleId]
    );
    return rows[0];
  }

  async updateById(id, fields) {
    const allowed = ['name', 'password_hash'];
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

    params.push(id);
    const { rows } = await pool.query(
      `UPDATE users
       SET ${setClauses.join(', ')}
       WHERE id = $${idx}
       RETURNING id, name, email, created_at, updated_at`,
      params
    );
    return rows[0] || null;
  }
}

module.exports = new UserRepository();
