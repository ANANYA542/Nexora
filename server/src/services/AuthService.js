const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/db');
const { OAuth2Client } = require('google-auth-library');
const userRepository = require('../repositories/UserRepository');
const AppError = require('../utils/AppError');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const SALT_ROUNDS = 12;

class AuthService {
  async register({ name, email, password }) {
    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw new AppError('Email is already registered', 409);
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await userRepository.create({ name, email, password_hash });
    const token = this._signToken(user);
    return { user, token };
  }

  async login({ email, password }) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    const safeUser = { id: user.id, name: user.name, email: user.email, created_at: user.created_at };
    const token = this._signToken(safeUser);
    return { user: safeUser, token };
  }

  async getProfile(userId) {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    return user;
  }

  async updateProfile(userId, { name, current_password, new_password }) {
    const currentUser = await userRepository.findById(userId);
    if (!currentUser) {
      throw new AppError('User not found', 404);
    }

    const updates = {};

    if (name) {
      updates.name = name;
    }

    if (new_password) {
      const fullUser = await userRepository.findByEmail(currentUser.email);
      if (!fullUser) {
        throw new AppError('User not found', 404);
      }

      if (!fullUser.password_hash) {
        updates.password_hash = await bcrypt.hash(new_password, SALT_ROUNDS);
      } else {
        if (!current_password) {
          throw new AppError('Current password is required to set a new password', 400);
        }
        const match = await bcrypt.compare(current_password, fullUser.password_hash);
        if (!match) {
          throw new AppError('Current password is incorrect', 401);
        }
        updates.password_hash = await bcrypt.hash(new_password, SALT_ROUNDS);
      }
    }

    if (Object.keys(updates).length === 0) {
      throw new AppError('Nothing to update — provide name or new_password', 400);
    }

    const updated = await userRepository.updateById(userId, updates);
    if (!updated) {
      throw new AppError('User not found', 404);
    }
    return updated;
  }

  async forgotPassword(email) {
    if (!email) throw new AppError('Email is required', 400);
    const user = await userRepository.findByEmail(email);
    if (!user) return true; // Pretend it succeeded always per normal security rules

    const token = crypto.randomBytes(32).toString('hex');
    const token_hash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
    
    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [user.id, token_hash, expiresAt]
    );

    const notificationService = require('./NotificationService');
    notificationService.sendPasswordResetLink(user, token).catch(() => {});
    
    return true;
  }

  async verifyResetToken(token) {
    if (!token) throw new AppError('Token is required', 400);
    const token_hash = crypto.createHash('sha256').update(token).digest('hex');
    const { rows } = await pool.query(
      `SELECT * FROM password_reset_tokens WHERE token_hash = $1 AND expires_at > NOW()`,
      [token_hash]
    );
    if (rows.length === 0) throw new AppError('Token is invalid or has prominently expired', 400);
    return true;
  }

  async resetPassword(token, newPassword) {
    if (!token) throw new AppError('Token is required', 400);
    if (!newPassword || newPassword.length < 6) throw new AppError('Password must be at least 6 characters', 400);
    
    const token_hash = crypto.createHash('sha256').update(token).digest('hex');
    const { rows } = await pool.query(
      `SELECT * FROM password_reset_tokens WHERE token_hash = $1 AND expires_at > NOW()`,
      [token_hash]
    );
    
    if (rows.length === 0) throw new AppError('Token is invalid or has expired', 400);
    
    const userId = rows[0].user_id;
    const password_hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    
    await userRepository.updateById(userId, { password_hash });
    await pool.query(`DELETE FROM password_reset_tokens WHERE token_hash = $1`, [token_hash]);
    
    return true;
  }

  async googleLogin(idToken) {
    if (!process.env.GOOGLE_CLIENT_ID) {
      throw new AppError('Google OAuth is not configured on the server', 500);
    }

    if (!idToken) {
      throw new AppError('Google ID token is required', 400);
    }

    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
    } catch (_err) {
      throw new AppError('Google sign-in could not be verified. Check the configured Google client ID and allowed origins.', 401);
    }

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, email_verified: emailVerified } = payload;

    if (!email || !googleId) {
      throw new AppError('Google sign-in did not return a usable account identity', 401);
    }

    if (!emailVerified) {
      throw new AppError('Your Google account email is not verified', 401);
    }

    let user = await userRepository.findByGoogleId(googleId);

    if (!user) {
      const existingByEmail = await userRepository.findByEmail(email);
      if (existingByEmail) {
        throw new AppError('An account with this email already exists. Please log in with email and password.', 409);
      }
      user = await userRepository.createGoogleUser({ name, email, googleId });
    }

    const token = this._signToken(user);
    return { user, token };
  }

  _signToken(user) {
    return jwt.sign(
      { sub: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
  }
}

module.exports = new AuthService();
