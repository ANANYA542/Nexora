const { Router } = require('express');
const dashboardController = require('../controllers/DashboardController');
const { authenticate } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { dashboardQuerySchema } = require('../validations/schemas');

const router = Router();

router.use(authenticate);
router.get(
  '/',
  validate(dashboardQuerySchema, 'query'),
  (req, res) => dashboardController.getDashboard(req, res)
);

module.exports = router;
