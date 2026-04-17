const { Router } = require('express');
const transactionController = require('../controllers/TransactionController');
const { authenticate } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const upload = require('../middlewares/upload');
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
  upload.single('receipt'),
  validate(createTransactionSchema),
  (req, res) => transactionController.createTransaction(req, res)
);

router.patch(
  '/:id',
  upload.single('receipt'),
  validate(updateTransactionSchema),
  (req, res) => transactionController.updateTransaction(req, res)
);

router.delete('/:id', (req, res) => transactionController.deleteTransaction(req, res));

module.exports = router;
