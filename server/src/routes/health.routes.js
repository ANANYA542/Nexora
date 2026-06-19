const { Router } = require('express');
const healthController = require('../controllers/HealthController');
const { authenticate } = require('../middlewares/auth');

const router = Router();

router.use(authenticate);

router.get('/score', (req, res) => healthController.getHealthScore(req, res));
router.get('/history', (req, res) => healthController.getHealthHistory(req, res));

module.exports = router;
