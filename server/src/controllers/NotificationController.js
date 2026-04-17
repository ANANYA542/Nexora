const notificationService = require('../services/NotificationService');
const { sendSuccess } = require('../utils/response');

class NotificationController {
  async triggerDailyChecks(_req, res) {
    await notificationService.runDailyChecks();
    sendSuccess(res, null, 'Daily notification checks triggered');
  }

  async triggerWeeklySummary(_req, res) {
    await notificationService.sendWeeklySummaries();
    sendSuccess(res, null, 'Weekly summaries sent');
  }

  async triggerMonthlySummary(_req, res) {
    await notificationService.sendMonthlySummaries();
    sendSuccess(res, null, 'Monthly summaries sent');
  }
}

module.exports = new NotificationController();
