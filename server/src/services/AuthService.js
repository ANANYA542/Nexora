const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/UserRepository');
const AppError = require('../utils/AppError');

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

  /**
   * Return the logged-in user's profile (no password_hash).
   */
  async getProfile(userId) {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    return user;
  }

  /**
   * Update name and/or password.
   * If changing password, requires current password for verification.
   */
  async updateProfile(userId, { name, current_password, new_password }) {
    const updates = {};

    if (name) {
      updates.name = name;
    }

    if (new_password) {
      if (!current_password) {
        throw new AppError('Current password is required to set a new password', 400);
      }
      // Fetch full user record (with password_hash) to verify current password
      const fullUser = await userRepository.findByEmail(
        (await userRepository.findById(userId)).email
      );
      const match = await bcrypt.compare(current_password, fullUser.password_hash);
      if (!match) {
        throw new AppError('Current password is incorrect', 401);
      }
      updates.password_hash = await bcrypt.hash(new_password, SALT_ROUNDS);
    }

    if (Object.keys(updates).length === 0) {
      throw new AppError('Nothing to update — provide name or new_password', 400);
    }

    const updated = await userRepository.updateById(userId, updates);
    return updated;
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
