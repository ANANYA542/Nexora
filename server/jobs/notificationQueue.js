const Queue = require('bull');

const notificationQueue = new Queue('notification', process.env.REDIS_URL, {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

notificationQueue.on('completed', (job) => {
  console.log(`[BULL] Job ${job.id} completed!`);
});

notificationQueue.on('failed', (job, err) => {
  console.error(`[BULL] Job ${job.id} failed:`, err.message);
});

notificationQueue.on('error', (err) => {
  console.error('[BULL] Queue error:', err.message);
});

notificationQueue.on('ready', () => {
  console.log('[BULL] Queue is ready!');
});

module.exports = notificationQueue;
