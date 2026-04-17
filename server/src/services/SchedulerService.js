const notificationService = require('./NotificationService');

const ONE_DAY = 24 * 60 * 60 * 1000;
const ONE_WEEK = 7 * ONE_DAY;

class SchedulerService {
  start() {
    console.log('[SCHEDULER] Started notification scheduler');

   
    setInterval(() => {
      console.log('[SCHEDULER] Running daily checks...');
      notificationService.runDailyChecks().catch(err =>
        console.error('[SCHEDULER] Daily check error:', err.message)
      );
    }, ONE_DAY);

    // Weekly summary — every 7 days
    setInterval(() => {
      console.log('[SCHEDULER] Sending weekly summaries...');
      notificationService.sendWeeklySummaries().catch(err =>
        console.error('[SCHEDULER] Weekly summary error:', err.message)
      );
    }, ONE_WEEK);

    // Monthly summary + budget reminder — check daily, run on 1st of month
    setInterval(() => {
      const today = new Date();
      if (today.getDate() === 1) {
        console.log('[SCHEDULER] Sending monthly summaries and budget reminders...');
        notificationService.sendMonthlySummaries().catch(err =>
          console.error('[SCHEDULER] Monthly summary error:', err.message)
        );
        notificationService.sendNewMonthBudgetReminders().catch(err =>
          console.error('[SCHEDULER] Budget reminder error:', err.message)
        );
      }
    }, ONE_DAY);
  }
}

module.exports = new SchedulerService();
