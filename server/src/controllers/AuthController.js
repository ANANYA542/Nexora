const authService = require('../services/AuthService');
const { sendSuccess } = require('../utils/response');

class AuthController {
  async register(req, res) {
    const { user, token } = await authService.register(req.body);
    sendSuccess(res, { user, token }, 'Registration successful', 201);
  }

  async login(req, res) {
    const { user, token } = await authService.login(req.body);
    sendSuccess(res, { user, token }, 'Login successful');
  }

  async googleLogin(req, res) {
    const { id_token } = req.body;
    const { user, token } = await authService.googleLogin(id_token);
    sendSuccess(res, { user, token }, 'Google login successful');
  }

  async getProfile(req, res) {
    const user = await authService.getProfile(req.user.id);
    sendSuccess(res, { user });
  }

  async updateProfile(req, res) {
    const user = await authService.updateProfile(req.user.id, req.body);
    sendSuccess(res, { user }, 'Profile updated');
  }
}

module.exports = new AuthController();
