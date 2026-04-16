const categoryRepository = require('../repositories/CategoryRepository');
const AppError = require('../utils/AppError');
const pool = require('../config/db');

class CategoryService {
  async getCategories(userId) {
    return categoryRepository.findAllForUser(userId);
  }

  async createCategory(userId, { name, type }) {
    return categoryRepository.create({ name, type, userId });
  }

  async deleteCategory(userId, categoryId) {
    const category = await categoryRepository.findByIdAndOwner(categoryId, userId);
    if (!category) {
      throw new AppError(
        'Category not found or you cannot delete a global category',
        404
      );
    }

    const { rows } = await pool.query(
      'SELECT COUNT(*) AS count FROM transactions WHERE category_id = $1 AND user_id = $2',
      [categoryId, userId]
    );
    const transactionCount = parseInt(rows[0].count, 10);

    if (transactionCount > 0) {
      throw new AppError(
        `Cannot delete category "${category.name}" — it is used by ${transactionCount} transaction(s). ` +
        `Reassign or delete those transactions first.`,
        409
      );
    }

    const deleted = await categoryRepository.deleteForUser(categoryId, userId);
    return deleted;
  }
}

module.exports = new CategoryService();
