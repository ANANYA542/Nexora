const { Router } = require('express');
const notificationController = require('../controllers/NotificationController');
const { authenticate } = require('../middlewares/auth');

const router = Router();

router.use(authenticate);

router.post('/trigger/daily',   (req, res) => notificationController.triggerDailyChecks(req, res));
router.post('/trigger/weekly',  (req, res) => notificationController.triggerWeeklySummary(req, res));
router.post('/trigger/monthly', (req, res) => notificationController.triggerMonthlySummary(req, res));

module.exports = router;
