const { db } = require('../config/firebase');
const { sendAuthorityAlert } = require('../services/notificationService');
const { summarizePostDescription } = require('../services/postSummaryService');
const geofire = require('geofire-common');

/**
 * POST /api/posts
 * App-only: Authenticated users submit a new civic report.
 */
exports.createPost = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: { code: 'MISSING_IMAGE', message: 'Please upload an image.' } });
        }

        const { lng, lat, description } = req.body;
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);
        const hash = geofire.geohashForLocation([latitude, longitude]);

        const postsRef = db.ref('posts');
        const newPostRef = postsRef.push();
        const aiSummary = await summarizePostDescription({
            description,
            lat: latitude,
            lng: longitude
        });

        const postData = {
            userId: req.user.id,
            imageUrl: req.file.path.replace(/\\/g, '/'),
            description: description || '',
            aiSummary,
            location: {
                lat: latitude,
                lng: longitude,
                geohash: hash
            },
            status: 'Reported',
            createdAt: Date.now()
        };

        await newPostRef.set(postData);
        postData._id = newPostRef.key;

        // Notify NGO and authority users with summarized report details.
        await sendAuthorityAlert(postData);

        res.status(201).json({ success: true, data: postData });
    } catch (err) {
        console.error('createPost error:', err.message);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create post.' } });
    }
};

/**
 * GET /api/posts/nearby?lat=X&lng=Y&distance=5000
 * Public: Returns posts within radius using GeoFire.
 */
exports.getNearbyPosts = async (req, res) => {
    try {
        const { lng, lat, distance } = req.query;
        const center = [parseFloat(lat), parseFloat(lng)];
        const radiusInM = distance ? parseInt(distance) : 5000;

        const bounds = geofire.geohashQueryBounds(center, radiusInM);
        const promises = [];

        for (const b of bounds) {
            const q = db.ref('posts')
                .orderByChild('location/geohash')
                .startAt(b[0])
                .endAt(b[1]);
            promises.push(q.once('value'));
        }

        const snapshots = await Promise.all(promises);
        const matchingDocs = [];

        for (const snap of snapshots) {
            snap.forEach((child) => {
                const childObj = child.val();
                childObj._id = child.key;

                const dbLat = childObj.location.lat;
                const dbLng = childObj.location.lng;

                const distanceInKm = geofire.distanceBetween([dbLat, dbLng], center);
                const distanceInM = distanceInKm * 1000;

                if (distanceInM <= radiusInM) {
                    matchingDocs.push(childObj);
                }
            });
        }

        res.json({ success: true, data: { count: matchingDocs.length, posts: matchingDocs } });
    } catch (err) {
        console.error('getNearbyPosts error:', err.message);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch nearby posts.' } });
    }
};

/**
 * GET /api/posts/:id
 * Public: Returns a single post by ID.
 */
exports.getPostById = async (req, res) => {
    try {
        const snapshot = await db.ref('posts/' + req.params.id).once('value');
        if (!snapshot.exists()) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Post not found.' } });
        }
        const post = snapshot.val();
        post._id = snapshot.key;
        res.json({ success: true, data: post });
    } catch (err) {
        console.error('getPostById error:', err.message);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch post.' } });
    }
};

/**
 * GET /api/posts/all?limit=50&offset=0
 * Web-only: Authority/NGO users get all posts with pagination.
 */
exports.getAllPosts = async (req, res) => {
    try {
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 200);
        const offset = Math.max(parseInt(req.query.offset) || 0, 0);

        const snapshot = await db.ref('posts').once('value');
        const allPosts = [];

        snapshot.forEach((child) => {
            const childObj = child.val();
            childObj._id = child.key;
            allPosts.push(childObj);
        });

        // Sort newest first
        allPosts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        const paginated = allPosts.slice(offset, offset + limit);

        res.json({
            success: true,
            data: {
                total: allPosts.length,
                limit,
                offset,
                posts: paginated
            }
        });
    } catch (err) {
        console.error('getAllPosts error:', err.message);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch posts.' } });
    }
};

/**
 * PATCH /api/posts/:id/status
 * Web-only: Authority/NGO updates a post's status.
 */
exports.updatePostStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const postRef = db.ref('posts/' + req.params.id);
        const snapshot = await postRef.once('value');

        if (!snapshot.exists()) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Post not found.' } });
        }

        await postRef.update({
            status,
            updatedAt: Date.now(),
            updatedBy: req.user.id
        });

        const updated = (await postRef.once('value')).val();
        updated._id = req.params.id;

        res.json({ success: true, data: updated });
    } catch (err) {
        console.error('updatePostStatus error:', err.message);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update post status.' } });
    }
};

/**
 * GET /api/posts/stats
 * Web-only: Returns aggregated post statistics.
 */
exports.getPostStats = async (req, res) => {
    try {
        const snapshot = await db.ref('posts').once('value');
        const stats = {
            total: 0,
            reported: 0,
            underReview: 0,
            verified: 0,
            resolved: 0,
            dismissed: 0
        };

        snapshot.forEach((child) => {
            stats.total++;
            const status = child.val().status;
            switch (status) {
                case 'Reported': stats.reported++; break;
                case 'Under Review': stats.underReview++; break;
                case 'Verified': stats.verified++; break;
                case 'Resolved': stats.resolved++; break;
                case 'Dismissed': stats.dismissed++; break;
            }
        });

        res.json({ success: true, data: stats });
    } catch (err) {
        console.error('getPostStats error:', err.message);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to compute stats.' } });
    }
};
