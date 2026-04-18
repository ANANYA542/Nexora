const { Router } = require('express');
const aiController = require('../controllers/AIController');
const { authenticate } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const upload = require('../middlewares/upload');
const {
  aiChatSchema,
  aiCategorizeSchema,
  aiReportSummaryQuerySchema,
  aiBudgetSuggestionQuerySchema,
} = require('../validations/schemas');

const router = Router();

router.use(authenticate);

router.post('/chat', validate(aiChatSchema), (req, res) => aiController.chat(req, res));
router.post('/categorize', validate(aiCategorizeSchema), (req, res) => aiController.categorize(req, res));
router.get('/report-summary', validate(aiReportSummaryQuerySchema, 'query'), (req, res) => aiController.getReportSummary(req, res));
router.post('/receipt', upload.single('receipt'), (req, res) => aiController.extractReceipt(req, res));
router.get('/budget-suggestion', validate(aiBudgetSuggestionQuerySchema, 'query'), (req, res) => aiController.getBudgetSuggestion(req, res));

module.exports = router;
