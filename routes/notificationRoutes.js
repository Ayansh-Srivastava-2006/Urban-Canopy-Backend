const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorizeRoles = require('../middleware/roleAuth');
const authorizePlatform = require('../middleware/platformAuth');
const { getMyNotifications, markNotificationAsRead } = require('../controllers/notificationController');

// Web-only dashboard notifications for NGO and authority users.
router.get('/', auth, authorizeRoles(['ngo', 'authority']), authorizePlatform(['web']), getMyNotifications);
router.patch('/:notificationId/read', auth, authorizeRoles(['ngo', 'authority']), authorizePlatform(['web']), markNotificationAsRead);

module.exports = router;