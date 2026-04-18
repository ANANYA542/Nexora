const fs = require('fs');
const path = require('path');
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

    // Negative amounts are only valid for expense refunds, not income
    if (type === 'income' && amount < 0) {
      throw new AppError(
        'Income amount must be positive. To record a refund or reversal, use an expense transaction with a negative amount.',
        400
      );
    }

    // Always persist amounts as absolute values — the `type` column carries sign semantics
    const absAmount = Math.abs(amount);
    const converted_amount = Math.abs(getConvertedAmount(amount, currency));

    const transaction = await transactionRepository.create({ 
      userId, category_id: categoryId, type, amount: absAmount, currency, converted_amount, description, date, receipt_url 
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

    // Resolve final type and amount after partial update merge
    const resolvedType = body.type !== undefined ? body.type : existing.type;
    const resolvedAmount = body.amount !== undefined ? body.amount : parseFloat(existing.amount);

    if (resolvedType === 'income' && resolvedAmount < 0) {
      throw new AppError(
        'Income amount must be positive. To record a refund or reversal, use an expense transaction with a negative amount.',
        400
      );
    }

    // Always resolve amounts as absolute values before persisting
    const absResolvedAmount = Math.abs(resolvedAmount);

    if (body.amount !== undefined || body.currency !== undefined) {
      const curr = body.currency !== undefined ? body.currency : existing.currency;
      body.converted_amount = Math.abs(getConvertedAmount(absResolvedAmount, curr));
    }

    // Normalise the stored amount field itself to absolute
    if (body.amount !== undefined) {
      body.amount = absResolvedAmount;
    }
    if (existing.receipt_url) {
      const receiptRemoved = !body.receipt_url;
      const receiptReplaced = body.receipt_url && existing.receipt_url !== body.receipt_url;
  
    if (receiptRemoved || receiptReplaced) {
      this._deleteReceiptFile(existing.receipt_url);
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

    // Delete the attached receipt off disk if it exists
    if (deleted.receipt_url) {
      this._deleteReceiptFile(deleted.receipt_url);
    }

    return deleted;
  }

  _deleteReceiptFile(receiptUrl) {
    if (!receiptUrl) return;
    try {
     
   
      const fileName = path.basename(receiptUrl);
      const filePath = path.join(process.cwd(), 'uploads', 'receipts', fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error('[TRANSACTION] Failed to delete orphaned receipt file:', err.message);
    }
  }
}

module.exports = new TransactionService();
