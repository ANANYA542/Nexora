const { Router } = require('express');
const reportController = require('../controllers/ReportController');
const { authenticate } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { reportQuerySchema } = require('../validations/schemas');

const router = Router();

router.use(authenticate);
router.get(
  '/monthly',
  validate(reportQuerySchema, 'query'),
  (req, res) => reportController.getMonthlyReport(req, res)
);

module.exports = router;
