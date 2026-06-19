const accountRepository = require('../repositories/AccountRepository');
const AppError = require('../utils/AppError');

class AccountService {
  async getAccounts(userId) {
    const accounts = await accountRepository.findAllForUser(userId);
    return accounts.map(a => ({
      ...a,
      balance: parseFloat(a.balance)
    }));
  }

  async createAccount(userId, body) {
    const { name, type, institution, balance, currency, metadata } = body;
    if (!name || !type) {
      throw new AppError('Name and type are required fields', 400);
    }
    return accountRepository.create({
      userId, name, type, institution, balance, currency, metadata
    });
  }

  async updateAccount(userId, accountId, body) {
    const account = await accountRepository.findByIdForUser(accountId, userId);
    if (!account) {
      throw new AppError('Account not found', 404);
    }
    return accountRepository.updateForUser(accountId, userId, body);
  }

  async deleteAccount(userId, accountId) {
    const deleted = await accountRepository.deleteForUser(accountId, userId);
    if (!deleted) {
      throw new AppError('Account not found', 404);
    }
    return deleted;
  }

  async getNetWorth(userId) {
    return accountRepository.getNetWorth(userId);
  }
}

module.exports = new AccountService();
