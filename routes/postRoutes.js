const express = require('express');
const router = express.Router();
const { createPost, getNearbyPosts, getPostById, getAllPosts, updatePostStatus, getPostStats } = require('../controllers/postController');
const auth = require('../middleware/auth');
const authorizeRoles = require('../middleware/roleAuth');
const authorizePlatform = require('../middleware/platformAuth');
const upload = require('../middleware/upload');
const { validatePostCoords, validateNearbyQuery, validateStatusUpdate } = require('../middleware/validators');

// Create post route (APP ONLY: Users submit reports)
router.post('/', auth, authorizeRoles(['user']), authorizePlatform(['app']), upload.single('image'), validatePostCoords, createPost);

// Get aggregated stats (WEB ONLY: Authorities and NGOs)
router.get('/stats', auth, authorizeRoles(['authority', 'ngo']), authorizePlatform(['web']), getPostStats);

// Get ALL posts with pagination (WEB ONLY: Authorities and NGOs)
router.get('/all', auth, authorizeRoles(['authority', 'ngo']), authorizePlatform(['web']), getAllPosts);

// Nearby queries (Public or app users)
router.get('/nearby', validateNearbyQuery, getNearbyPosts);

// Update post status (WEB ONLY: Authorities and NGOs)
router.patch('/:id/status', auth, authorizeRoles(['authority', 'ngo']), authorizePlatform(['web']), validateStatusUpdate, updatePostStatus);

// Get post by ID (Public)
router.get('/:id', getPostById);

module.exports = router;
