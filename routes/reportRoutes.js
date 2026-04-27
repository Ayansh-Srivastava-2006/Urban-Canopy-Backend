const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');

// POST /api/reports - Create new report
router.post('/', auth, reportController.createReport);

// GET /api/reports - Fetch reports
router.get('/', auth, reportController.getReports);

// PATCH /api/reports/:id/resolve - Resolve report
router.patch('/:id/resolve', [auth, roleAuth(['admin', 'ngo'])], reportController.resolveReport);

module.exports = router;
