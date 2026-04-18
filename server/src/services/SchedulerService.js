const notificationQueue = require('../../jobs/notificationQueue');

class SchedulerService {
  async start() {
    try {
      console.log('[SCHEDULER] Initializing Bull repeatable jobs...');
      
      const jobs = await notificationQueue.getRepeatableJobs();
      for (const job of jobs) {
        await notificationQueue.removeRepeatableByKey(job.key);
      }

      await notificationQueue.add('daily-checks', {}, { repeat: { cron: '0 9 * * *' } });
      await notificationQueue.add('weekly-summary', {}, { repeat: { cron: '0 9 * * MON' } });
      await notificationQueue.add('monthly-summary', {}, { repeat: { cron: '0 9 1 * *' } });

      console.log('[SCHEDULER] Bull repeatable jobs registered successfully.');
    } catch (err) {
      console.error('[SCHEDULER] Failed to start:', err.message);
      throw err;
    }
  }
}

module.exports = new SchedulerService();
