const { Router } = require('express');
const transactionController = require('../controllers/TransactionController');
const { authenticate } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const {
  createTransactionSchema,
  updateTransactionSchema,
  transactionFilterSchema,
} = require('../validations/schemas');

const router = Router();

router.use(authenticate);


router.get(
  '/',
  validate(transactionFilterSchema, 'query'),
  (req, res) => transactionController.getTransactions(req, res)
);


router.get('/:id', (req, res) => transactionController.getTransaction(req, res));


router.post(
  '/',
  validate(createTransactionSchema),
  (req, res) => transactionController.createTransaction(req, res)
);

router.patch(
  '/:id',
  validate(updateTransactionSchema),
  (req, res) => transactionController.updateTransaction(req, res)
);


router.delete('/:id', (req, res) => transactionController.deleteTransaction(req, res));

module.exports = router;
