const express = require('express');
const router = express.Router();
const { registerUser, registerWebUser, loginUser, getMe } = require('../controllers/userController');
const { validateRegister, validateLogin, validateWebRegister } = require('../middleware/validators');
const auth = require('../middleware/auth');

// Public user registration (app-only)
router.post('/register', validateRegister, registerUser);

// Authority/NGO registration (web-only)
router.post('/register-web', validateWebRegister, registerWebUser);

// Login (both platforms)
router.post('/login', validateLogin, loginUser);

// Get current user profile (requires auth)
router.get('/me', auth, getMe);

module.exports = router;
