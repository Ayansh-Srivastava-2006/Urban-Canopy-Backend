const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const auth = require('../middleware/auth');
const authorizeRoles = require('../middleware/roleAuth');
const { chatWithAssistant } = require('../controllers/chatbotController');

const chatbotLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: 'Too many chatbot requests from this IP, please try again later.'
});

router.post('/', auth, authorizeRoles(['user', 'ngo', 'authority']), chatbotLimiter, chatWithAssistant);

module.exports = router;