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
router.post('/budget-recommendations', async (req, res) => {
  try {
    const aiService = require('../services/AIService');
    const recommendations = await aiService.generateBudgetRecommendations(req.user.id);
    res.json({ success: true, data: { recommendations } });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/spending-patterns', async (req, res) => {
  try {
    const aiService = require('../services/AIService');
    const result = await aiService.analyzeSpendingPatterns(req.user.id);
    res.json({ success: true, data: result });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/monthly-report', async (req, res) => {
  try {
    const aiService = require('../services/AIService');
    const { month, year } = req.body;
    const report = await aiService.generateNaturalLanguageReport(req.user.id, month, year);
    res.json({ success: true, data: { report } });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/income-insights', async (req, res) => {
  try {
    const aiService = require('../services/AIService');
    const result = await aiService.generateIncomeInsights(req.user.id);
    res.json({ success: true, data: result });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/recommendations', async (req, res) => {
  try {
    const pool = require('../config/db');
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM ai_recommendations WHERE user_id = $1';
    let countQuery = 'SELECT COUNT(*) FROM ai_recommendations WHERE user_id = $1';
    const params = [req.user.id];
    
    if (req.query.type) {
      query += ' AND type = $2';
      countQuery += ' AND type = $2';
      params.push(req.query.type);
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    const { rows } = await pool.query(query, params);
    const { rows: countRows } = await pool.query(countQuery, params.slice(0, req.query.type ? 2 : 1));
    const total = parseInt(countRows[0].count);
    
    if (rows.length > 0) {
      const ids = rows.map(r => r.id);
      await pool.query('UPDATE ai_recommendations SET is_read = TRUE WHERE id = ANY($1)', [ids]);
    }
    
    res.json({ success: true, data: { recommendations: rows, pagination: { page, limit, total } } });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
