const notificationService = require('./NotificationService');

const ONE_DAY = 24 * 60 * 60 * 1000;
const ONE_WEEK = 7 * ONE_DAY;

class SchedulerService {
  constructor() {
    this.started = false;
  }

  start() {
    if (this.started) {
      return;
    }

    this.started = true;
    console.log('[SCHEDULER] Started notification scheduler');

   
    setInterval(() => {
      console.log('[SCHEDULER] Running daily checks...');
      notificationService.runDailyChecks().catch(err =>
        console.error('[SCHEDULER] Daily check error:', err.message)
      );
    }, ONE_DAY);


    setInterval(() => {
      console.log('[SCHEDULER] Sending weekly summaries...');
      notificationService.sendWeeklySummaries().catch(err =>
        console.error('[SCHEDULER] Weekly summary error:', err.message)
      );
    }, ONE_WEEK);


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
