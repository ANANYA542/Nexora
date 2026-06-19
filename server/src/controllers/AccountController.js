const accountService = require('../services/AccountService');
const { sendSuccess } = require('../utils/response');

class AccountController {
  async getAccounts(req, res) {
    try {
      const accounts = await accountService.getAccounts(req.user.id);
      sendSuccess(res, { accounts });
    } catch (err) {
      res.status(err.status || 500).json({ success: false, message: err.message });
    }
  }

  async createAccount(req, res) {
    try {
      const account = await accountService.createAccount(req.user.id, req.body);
      sendSuccess(res, { account }, 'Account created successfully', 201);
    } catch (err) {
      res.status(err.status || 500).json({ success: false, message: err.message });
    }
  }

  async updateAccount(req, res) {
    try {
      const account = await accountService.updateAccount(req.user.id, req.params.id, req.body);
      sendSuccess(res, { account }, 'Account updated successfully');
    } catch (err) {
      res.status(err.status || 500).json({ success: false, message: err.message });
    }
  }

  async deleteAccount(req, res) {
    try {
      await accountService.deleteAccount(req.user.id, req.params.id);
      sendSuccess(res, null, 'Account deleted successfully');
    } catch (err) {
      res.status(err.status || 500).json({ success: false, message: err.message });
    }
  }

  async getNetWorth(req, res) {
    try {
      const summary = await accountService.getNetWorth(req.user.id);
      sendSuccess(res, summary);
    } catch (err) {
      res.status(err.status || 500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new AccountController();
