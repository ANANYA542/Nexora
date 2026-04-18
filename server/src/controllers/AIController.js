const aiService = require('../services/AIService');
const { sendSuccess } = require('../utils/response');

class AIController {
  async chat(req, res) {
    const reply = await aiService.chat(req.user.id, req.body.message);
    sendSuccess(res, { reply });
  }

  async categorize(req, res) {
    const category = await aiService.categorizeTransaction(req.user.id, req.body);
    sendSuccess(res, {
      category_id: category ? category.id : null,
      category_name: category ? category.name : null,
    });
  }

  async getReportSummary(req, res) {
    const result = await aiService.getMonthlyReportSummary(req.user.id, req.query);
    sendSuccess(res, result);
  }

  async extractReceipt(req, res) {
    const data = await aiService.extractReceipt(req.user.id, req.file);
    sendSuccess(res, data);
  }

  async getBudgetSuggestion(req, res) {
    const result = await aiService.getBudgetSuggestion(req.user.id, req.query.category_id);
    sendSuccess(res, result);
  }
}

module.exports = new AIController();
