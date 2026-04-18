const { Router } = require('express');
const authController = require('../controllers/AuthController');
const { authenticate } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { registerSchema, loginSchema, googleLoginSchema, updateProfileSchema } = require('../validations/schemas');

const router = Router();


router.post('/register', validate(registerSchema), (req, res) => authController.register(req, res));
router.post('/login',    validate(loginSchema),    (req, res) => authController.login(req, res));
router.post('/google',   validate(googleLoginSchema), (req, res) => authController.googleLogin(req, res));


router.get('/profile',  authenticate, (req, res) => authController.getProfile(req, res));
router.put('/profile',  authenticate, validate(updateProfileSchema), (req, res) => authController.updateProfile(req, res));

module.exports = router;
