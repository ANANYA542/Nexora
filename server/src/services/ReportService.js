const reportRepository = require('../repositories/ReportRepository');
const notificationService = require('./NotificationService');
const userRepository = require('../repositories/UserRepository');
class ReportService {
  async getMonthlyReport(userId, filters) {
    const rows = await reportRepository.getMonthlyReport(userId, filters);

    // Fire monthly summary insights in background
    userRepository.findById(userId).then(user => {
      if (user) {
        notificationService.sendMonthlySummaries().catch(() => {});
      }
    }).catch(() => {});

    return rows.map((r) => ({
      month: r.month,
      total_income: parseFloat(r.total_income),
      total_expense: parseFloat(r.total_expense),
      savings: parseFloat(r.savings),
    }));
  }
}

module.exports = new ReportService();
