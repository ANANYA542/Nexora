const reportRepository = require('../repositories/ReportRepository');


class ReportService {
  async getMonthlyReport(userId, filters) {
    const rows = await reportRepository.getMonthlyReport(userId, filters);
    return rows.map((r) => ({
      month: r.month,
      total_income: parseFloat(r.total_income),
      total_expense: parseFloat(r.total_expense),
      savings: parseFloat(r.savings),
    }));
  }
}

module.exports = new ReportService();
