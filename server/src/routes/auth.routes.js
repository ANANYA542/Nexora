const { Router } = require('express');
const authController = require('../controllers/AuthController');
const { authenticate } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { registerSchema, loginSchema, updateProfileSchema } = require('../validations/schemas');

const router = Router();

// Public routes
router.post('/register', validate(registerSchema), (req, res) => authController.register(req, res));
router.post('/login',    validate(loginSchema),    (req, res) => authController.login(req, res));

// Protected routes — profile management
router.get('/profile',  authenticate, (req, res) => authController.getProfile(req, res));
router.put('/profile',  authenticate, validate(updateProfileSchema), (req, res) => authController.updateProfile(req, res));

module.exports = router;
