const reportService = require('../services/ReportService');
const { sendSuccess } = require('../utils/response');

class ReportController {
  async getMonthlyReport(req, res) {
    const report = await reportService.getMonthlyReport(req.user.id, req.query);
    sendSuccess(res, { report });
  }
}

module.exports = new ReportController();
