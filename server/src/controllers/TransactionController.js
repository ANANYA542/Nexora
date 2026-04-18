const transactionService = require('../services/TransactionService');
const { sendSuccess } = require('../utils/response');


class TransactionController {
  async getTransactions(req, res) {
    const result = await transactionService.getTransactions(req.user.id, req.query);
    sendSuccess(res, result);
  }

  async getTransaction(req, res) {
    const transaction = await transactionService.getTransaction(req.user.id, req.params.id);
    sendSuccess(res, { transaction });
  }

  async createTransaction(req, res) {
    const payload = { ...req.body };
    if (req.file) {
      payload.receipt_url = `/uploads/receipts/${req.file.filename}`;
    }
    const transaction = await transactionService.createTransaction(req.user.id, payload);
    sendSuccess(res, { transaction }, 'Transaction created', 201);
  }

  async checkBalance(req, res) {
    const balance = await transactionService.checkBalance(req.user.id, req.body);
    sendSuccess(res, { balance });
  }

  async updateTransaction(req, res) {
    const payload = { ...req.body };
    if (req.file) {
      payload.receipt_url = `/uploads/receipts/${req.file.filename}`;
    }
    const transaction = await transactionService.updateTransaction(
      req.user.id,
      req.params.id,
      payload
    );
    sendSuccess(res, { transaction }, 'Transaction updated');
  }

  async deleteTransaction(req, res) {
    await transactionService.deleteTransaction(req.user.id, req.params.id);
    sendSuccess(res, null, 'Transaction deleted');
  }
}

module.exports = new TransactionController();
