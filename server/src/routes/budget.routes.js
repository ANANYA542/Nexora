const { Router } = require('express');
const budgetController = require('../controllers/BudgetController');
const { authenticate } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { upsertBudgetSchema } = require('../validations/schemas');

const router = Router();

router.use(authenticate);

router.get('/', (req, res) => budgetController.getBudgets(req, res));


router.post(
  '/',
  validate(upsertBudgetSchema),
  (req, res) => budgetController.upsertBudget(req, res)
);


router.delete('/:id', (req, res) => budgetController.deleteBudget(req, res));

module.exports = router;
