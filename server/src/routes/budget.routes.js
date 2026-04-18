const { Router } = require('express');
const budgetController = require('../controllers/BudgetController');
const { authenticate } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { upsertBudgetSchema, budgetFilterSchema, uuidParamSchema } = require('../validations/schemas');

const router = Router();

router.use(authenticate);
router.get('/', validate(budgetFilterSchema, 'query'), (req, res) => budgetController.getBudgets(req, res));
router.post(
  '/',
  validate(upsertBudgetSchema),
  (req, res) => budgetController.upsertBudget(req, res)
);
router.delete('/:id', validate(uuidParamSchema, 'params'), (req, res) => budgetController.deleteBudget(req, res));

module.exports = router;
