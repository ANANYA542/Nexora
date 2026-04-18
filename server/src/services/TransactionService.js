const transactionRepository = require('../repositories/TransactionRepository');
const categoryRepository = require('../repositories/CategoryRepository');
const notificationService = require('./NotificationService');
const aiService = require('./AIService');
const { getConvertedAmount } = require('../utils/currency');
const AppError = require('../utils/AppError');

class TransactionService {

  async getTransactions(userId, filters) {
    const { rows, total } = await transactionRepository.findAllForUser(userId, filters);
    const { page, limit } = filters;

    return {
      transactions: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  
  async getTransaction(userId, transactionId) {
    const transaction = await transactionRepository.findByIdForUser(transactionId, userId);
    if (!transaction) {
      throw new AppError('Transaction not found', 404);
    }
    return transaction;
  }

  async createTransaction(userId, body) {
    const { type, amount, currency = 'INR', description, date, receipt_url } = body;
    let categoryId = body.category_id;

    if (!categoryId && description) {
      const suggestedCategory = await aiService.categorizeTransaction(userId, { description, type });
      categoryId = suggestedCategory ? suggestedCategory.id : null;
    }

    if (!categoryId) {
      throw new AppError('Category is required. Auto-categorization could not find a match.', 400);
    }

    const category = await categoryRepository.findByIdForUser(categoryId, userId);
    if (!category) {
      throw new AppError('Category not found or not accessible', 404);
    }

    if (category.type !== type) {
      throw new AppError(
        `Category "${category.name}" is of type "${category.type}" but transaction type is "${type}"`,
        400
      );
    }

    const converted_amount = getConvertedAmount(amount, currency);

    const transaction = await transactionRepository.create({ 
      userId, category_id: categoryId, type, amount, currency, converted_amount, description, date, receipt_url 
    });

    notificationService.onTransactionCreated(userId, transaction).catch(() => {});

    const anomalyService = require('./AnomalyService');
    anomalyService.detectAnomaly(transaction, userId).catch(() => {});

    return transaction;
  }

  async checkBalance(userId, { amount, currency = 'INR', type, transaction_id }) {
    const currentBalance = await transactionRepository.getBalanceForUser(userId);
    const convertedAmount = getConvertedAmount(amount, currency);

    let baseBalance = currentBalance;
    if (transaction_id) {
      const existing = await transactionRepository.findByIdForUser(transaction_id, userId);
      if (!existing) {
        throw new AppError('Transaction not found', 404);
      }

      const existingEffect = existing.type === 'income'
        ? parseFloat(existing.converted_amount)
        : -Math.abs(parseFloat(existing.converted_amount));
      baseBalance = currentBalance - existingEffect;
    }

    const newEffect = type === 'income' ? convertedAmount : -Math.abs(convertedAmount);
    const projectedBalance = baseBalance + newEffect;

    return {
      current_balance: parseFloat(baseBalance.toFixed(2)),
      projected_balance: parseFloat(projectedBalance.toFixed(2)),
      exceeds_balance: type === 'expense' && projectedBalance < 0,
    };
  }


  async updateTransaction(userId, transactionId, body) {
    const existing = await transactionRepository.findByIdForUser(transactionId, userId);
    if (!existing) {
      throw new AppError('Transaction not found', 404);
    }

    if (body.category_id || body.type) {
      const categoryId = body.category_id || existing.category_id;
      const type = body.type || existing.type;

      const category = await categoryRepository.findByIdForUser(categoryId, userId);
      if (!category) {
        throw new AppError('Category not found or not accessible', 404);
      }
      if (category.type !== type) {
        throw new AppError(
          `Category "${category.name}" is of type "${category.type}" but transaction type is "${type}"`,
          400
        );
      }
    }

    if (body.amount !== undefined || body.currency !== undefined) {
      const amt = body.amount !== undefined ? body.amount : existing.amount;
      const curr = body.currency !== undefined ? body.currency : existing.currency;
      body.converted_amount = getConvertedAmount(amt, curr);
    }

    const updated = await transactionRepository.updateForUser(transactionId, userId, body);
    return updated;
  }


  async deleteTransaction(userId, transactionId) {
    const deleted = await transactionRepository.deleteForUser(transactionId, userId);
    if (!deleted) {
      throw new AppError('Transaction not found', 404);
    }
    return deleted;
  }
}

module.exports = new TransactionService();
