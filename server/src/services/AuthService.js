const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
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
    const updates = {};

    if (name) {
      updates.name = name;
    }

    if (new_password) {
      if (!current_password) {
        throw new AppError('Current password is required to set a new password', 400);
      }
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

  async googleLogin(idToken) {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name } = payload;


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
