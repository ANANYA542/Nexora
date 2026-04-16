const dashboardService = require('../services/DashboardService');
const { sendSuccess } = require('../utils/response');


class DashboardController {
  async getDashboard(req, res) {
    const data = await dashboardService.getDashboard(req.user.id, req.query);
    sendSuccess(res, data);
  }
}

module.exports = new DashboardController();
