const { Router } = require('express');
const categoryController = require('../controllers/CategoryController');
const { authenticate } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { createCategorySchema, uuidParamSchema } = require('../validations/schemas');

const router = Router();
router.use(authenticate);
router.get('/', (req, res) => categoryController.getCategories(req, res));
router.post('/', validate(createCategorySchema), (req, res) => categoryController.createCategory(req, res));
router.delete('/:id', validate(uuidParamSchema, 'params'), (req, res) => categoryController.deleteCategory(req, res));

module.exports = router;
