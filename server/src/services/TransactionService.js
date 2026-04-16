const transactionRepository = require('../repositories/TransactionRepository');
const categoryRepository = require('../repositories/CategoryRepository');
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
    const { category_id, type, amount, description, date } = body;

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

    return transactionRepository.create({ userId, category_id, type, amount, description, date });
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
