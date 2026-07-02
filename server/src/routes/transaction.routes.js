const { Router } = require('express');
const transactionController = require('../controllers/TransactionController');
const { authenticate } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const upload = require('../middlewares/upload');
const {
  createTransactionSchema,
  updateTransactionSchema,
  balanceCheckSchema,
  transactionFilterSchema,
  uuidParamSchema,
} = require('../validations/schemas');

const router = Router();

router.use(authenticate);

router.get(
  '/',
  validate(transactionFilterSchema, 'query'),
  (req, res) => transactionController.getTransactions(req, res)
);

router.get('/anomalies', async (req, res) => {
  const anomalyService = require('../services/AnomalyService');
  const { sendSuccess } = require('../utils/response');
  try {
    const anomalies = await anomalyService.getAnomalies(req.user.id);
    sendSuccess(res, { anomalies });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id', validate(uuidParamSchema, 'params'), (req, res) => transactionController.getTransaction(req, res));

router.post('/check-balance', validate(balanceCheckSchema), (req, res) => transactionController.checkBalance(req, res));

const importController = require('../controllers/ImportController');
const multer = require('multer');

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['text/csv', 'application/vnd.ms-excel', 'application/pdf'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only CSV or PDF files are allowed for import'), false);
  }
});

router.post(
  '/import',
  memoryUpload.single('statement'),
  (req, res, next) => importController.importStatement(req, res, next)
);

router.post(
  '/',
  upload.single('receipt'),
  validate(createTransactionSchema),
  (req, res) => transactionController.createTransaction(req, res)
);

router.patch(
  '/:id',
  validate(uuidParamSchema, 'params'),
  upload.single('receipt'),
  validate(updateTransactionSchema),
  (req, res) => transactionController.updateTransaction(req, res)
);

router.delete('/:id', validate(uuidParamSchema, 'params'), (req, res) => transactionController.deleteTransaction(req, res));

module.exports = router;
