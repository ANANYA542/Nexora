const transactionRepository = require('../repositories/TransactionRepository');
const categoryRepository = require('../repositories/CategoryRepository');
const notificationService = require('./NotificationService');
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
    const { category_id, type, amount, currency = 'INR', description, date, receipt_url } = body;

    const category = await categoryRepository.findByIdForUser(category_id, userId);
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
      userId, category_id, type, amount, currency, converted_amount, description, date, receipt_url 
    });

    // Fire notification checks in the background (non-blocking)
    notificationService.onTransactionCreated(userId, transaction).catch(() => {});

    return transaction;
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
