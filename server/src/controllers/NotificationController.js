const notificationService = require('../services/NotificationService');
const notificationRepository = require('../repositories/NotificationRepository');
const { sendSuccess } = require('../utils/response');

class NotificationController {
  async getLatest(req, res) {
    const notifications = await notificationRepository.getLatestForUser(req.user.id, 5);
    sendSuccess(res, { notifications });
  }

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
