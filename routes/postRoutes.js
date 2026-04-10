const express = require('express');
const router = express.Router();
const { createPost, getNearbyPosts, getPostById, getAllPosts } = require('../controllers/postController');
const auth = require('../middleware/auth');
const authorizeRoles = require('../middleware/roleAuth');
const authorizePlatform = require('../middleware/platformAuth');
const upload = require('../middleware/upload');

// Create post route (APP ONLY: Users submit reports)
router.post('/', auth, authorizeRoles(['user']), authorizePlatform(['app']), upload.single('image'), createPost);

// Get ALL posts (WEB ONLY: Authorities and NGOs)
router.get('/all', auth, authorizeRoles(['authority', 'ngo']), authorizePlatform(['web']), getAllPosts);

// Nearby queries (Public or app users)
router.get('/nearby', getNearbyPosts);

// Get post by ID (Public)
router.get('/:id', getPostById);

module.exports = router;
