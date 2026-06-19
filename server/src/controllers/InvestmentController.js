const investmentService = require('../services/InvestmentService');
const { sendSuccess } = require('../utils/response');

class InvestmentController {
  async getInvestments(req, res) {
    try {
      const investments = await investmentService.getInvestments(req.user.id);
      sendSuccess(res, { investments });
    } catch (err) {
      res.status(err.status || 500).json({ success: false, message: err.message });
    }
  }

  async createInvestment(req, res) {
    try {
      const investment = await investmentService.createInvestment(req.user.id, req.body);
      sendSuccess(res, { investment }, 'Holding added successfully', 201);
    } catch (err) {
      res.status(err.status || 500).json({ success: false, message: err.message });
    }
  }

  async updateInvestment(req, res) {
    try {
      const investment = await investmentService.updateInvestment(req.user.id, req.params.id, req.body);
      sendSuccess(res, { investment }, 'Holding updated successfully');
    } catch (err) {
      res.status(err.status || 500).json({ success: false, message: err.message });
    }
  }

  async deleteInvestment(req, res) {
    try {
      await investmentService.deleteInvestment(req.user.id, req.params.id);
      sendSuccess(res, null, 'Holding removed successfully');
    } catch (err) {
      res.status(err.status || 500).json({ success: false, message: err.message });
    }
  }

  async getPortfolioSummary(req, res) {
    try {
      const summary = await investmentService.getPortfolioSummary(req.user.id);
      sendSuccess(res, summary);
    } catch (err) {
      res.status(err.status || 500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new InvestmentController();
