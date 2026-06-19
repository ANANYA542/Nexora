const { Router } = require('express');
const accountController = require('../controllers/AccountController');
const { authenticate } = require('../middlewares/auth');

const router = Router();

router.use(authenticate);

router.get('/', (req, res) => accountController.getAccounts(req, res));
router.post('/', (req, res) => accountController.createAccount(req, res));
router.get('/net-worth', (req, res) => accountController.getNetWorth(req, res));
router.put('/:id', (req, res) => accountController.updateAccount(req, res));
router.delete('/:id', (req, res) => accountController.deleteAccount(req, res));

module.exports = router;
