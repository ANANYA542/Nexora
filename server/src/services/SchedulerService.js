const cron = require('node-cron');
const backgroundJobService = require('./BackgroundJobService');

class SchedulerService {
  async start() {
    try {
      console.log('[SCHEDULER] Initializing node-cron repeatable jobs...');
      
      cron.schedule('0 9 * * *', () => {
        console.log('[SCHEDULER] Running daily checks...');
        backgroundJobService.runDailyChecks();
      });

      cron.schedule('0 9 * * MON', () => {
        console.log('[SCHEDULER] Running weekly summary...');
        backgroundJobService.runWeeklySummary();
      });

      cron.schedule('0 9 1 * *', () => {
        console.log('[SCHEDULER] Running monthly summary...');
        backgroundJobService.runMonthlySummary();
      });

      console.log('[SCHEDULER] node-cron repeatable jobs registered successfully.');
    } catch (err) {
      console.error('[SCHEDULER] Failed to start:', err.message);
      throw err;
    }
  }
}

module.exports = new SchedulerService();
