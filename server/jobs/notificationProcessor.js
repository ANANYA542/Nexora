const notificationQueue = require('./notificationQueue');
const notificationService = require('../src/services/NotificationService');

notificationQueue.process('daily-checks', async (job) => {
  try {
    await notificationService.runDailyChecks();
  } catch (error) {
    console.error('[PROCESSOR] Error in daily-checks:', error.message);
    throw error;
  }
});

notificationQueue.process('weekly-summary', async (job) => {
  try {
    const aiService = require('../src/services/AIService');
    const pool = require('../src/config/db');
    await notificationService.sendWeeklySummaries();
    
    // Proactively generate deep insights for all users over the weekend
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
        console.error('[PROCESSOR] Error running AI pipeline for user', u.id, innerErr.message);
      }
    }
  } catch (error) {
    console.error('[PROCESSOR] Error in weekly-summary:', error.message);
    throw error;
  }
});

notificationQueue.process('monthly-summary', async (job) => {
  try {
    await Promise.all([
      notificationService.sendMonthlySummaries(),
      notificationService.sendNewMonthBudgetReminders()
    ]);
  } catch (error) {
    console.error('[PROCESSOR] Error in monthly-summary:', error.message);
    throw error;
  }
});

notificationQueue.process('anomaly-alert', async (job) => {
  try {
    const { user, transaction, explanation } = job.data;
    await notificationService.sendAnomalyAlert(user, transaction, explanation);
  } catch (error) {
    console.error('[PROCESSOR] Error in anomaly-alert:', error.message);
    throw error;
  }
});

notificationQueue.process('budget-overrun', async (job) => {
  try {
    const { user, category, spent, limit } = job.data;
    await notificationService.sendBudgetOverrunAlert(user, category, spent, limit);
  } catch (error) {
    console.error('[PROCESSOR] Error in budget-overrun:', error.message);
    throw error;
  }
});

module.exports = notificationQueue;
