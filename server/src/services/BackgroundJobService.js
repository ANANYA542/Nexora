const notificationService = require('./NotificationService');

class BackgroundJobService {
  async processAnomalyAlert(user, transaction, explanation) {
    try {
      await notificationService.sendAnomalyAlert(user, transaction, explanation);
    } catch (error) {
      console.error('[BACKGROUND_JOB] Error in anomaly-alert:', error.message);
    }
  }

  async processBudgetOverrun(user, category, spent, limit) {
    try {
      await notificationService.sendBudgetOverrunAlert(user, category, spent, limit);
    } catch (error) {
      console.error('[BACKGROUND_JOB] Error in budget-overrun:', error.message);
    }
  }

  async runDailyChecks() {
    try {
      await notificationService.runDailyChecks();
    } catch (error) {
      console.error('[BACKGROUND_JOB] Error in daily-checks:', error.message);
    }
  }

  async runWeeklySummary() {
    try {
      const aiService = require('./AIService');
      const pool = require('../config/db');
      await notificationService.sendWeeklySummaries();
      
      const { rows: users } = await pool.query('SELECT id FROM users');
      for (const u of users) {
        try {
          await aiService.analyzeSpendingPatterns(u.id);
          await new Promise(res => setTimeout(res, 3000));
          await aiService.generateBudgetRecommendations(u.id);
          await new Promise(res => setTimeout(res, 3000));
          await aiService.generateIncomeInsights(u.id);
          await new Promise(res => setTimeout(res, 3000));
        } catch (innerErr) {
          console.error('[BACKGROUND_JOB] Error running AI pipeline for user', u.id, innerErr.message);
        }
      }
    } catch (error) {
      console.error('[BACKGROUND_JOB] Error in weekly-summary:', error.message);
    }
  }

  async runMonthlySummary() {
    try {
      await Promise.all([
        notificationService.sendMonthlySummaries(),
        notificationService.sendNewMonthBudgetReminders()
      ]);
    } catch (error) {
      console.error('[BACKGROUND_JOB] Error in monthly-summary:', error.message);
    }
  }
}

module.exports = new BackgroundJobService();
