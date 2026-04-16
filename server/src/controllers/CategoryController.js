const categoryService = require('../services/CategoryService');
const { sendSuccess } = require('../utils/response');


class CategoryController {
  async getCategories(req, res) {
    const categories = await categoryService.getCategories(req.user.id);
    sendSuccess(res, { categories });
  }

  async createCategory(req, res) {
    const category = await categoryService.createCategory(req.user.id, req.body);
    sendSuccess(res, { category }, 'Category created', 201);
  }

  async deleteCategory(req, res) {
    await categoryService.deleteCategory(req.user.id, req.params.id);
    sendSuccess(res, null, 'Category deleted');
  }
}

module.exports = new CategoryController();
