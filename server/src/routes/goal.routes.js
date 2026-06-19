const { Router } = require('express');
const goalController = require('../controllers/GoalController');
const { authenticate } = require('../middlewares/auth');

const router = Router();

router.use(authenticate);

router.get('/', (req, res) => goalController.getGoals(req, res));
router.post('/', (req, res) => goalController.createGoal(req, res));
router.put('/:id', (req, res) => goalController.updateGoal(req, res));
router.post('/:id/contribute', (req, res) => goalController.contributeToGoal(req, res));
router.delete('/:id', (req, res) => goalController.deleteGoal(req, res));

module.exports = router;
