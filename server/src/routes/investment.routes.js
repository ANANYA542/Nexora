const { Router } = require('express');
const investmentController = require('../controllers/InvestmentController');
const { authenticate } = require('../middlewares/auth');

const router = Router();

router.use(authenticate);

router.get('/', (req, res) => investmentController.getInvestments(req, res));
router.post('/', (req, res) => investmentController.createInvestment(req, res));
router.get('/portfolio', (req, res) => investmentController.getPortfolioSummary(req, res));
router.put('/:id', (req, res) => investmentController.updateInvestment(req, res));
router.delete('/:id', (req, res) => investmentController.deleteInvestment(req, res));

module.exports = router;
