const { db } = require('../config/firebase');
const { sendAuthorityAlert } = require('../services/notificationService');
const geofire = require('geofire-common');

exports.createPost = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ msg: 'Please upload an image' });
        }
        
        const { lng, lat, description } = req.body;
        if (!lng || !lat) {
            return res.status(400).json({ msg: 'Location coordinates (lng, lat) are required' });
        }

        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);
        const hash = geofire.geohashForLocation([latitude, longitude]);

        const postsRef = db.ref('posts');
        const newPostRef = postsRef.push();
        
        const postData = {
            userId: req.user.id,
            imageUrl: req.file.path.replace(/\\/g, '/'),
            description: description || '',
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
        
        // Mock notification
        postData.location.coordinates = [longitude, latitude]; // Format for the notification service mock
        await sendAuthorityAlert(postData);

        res.json(postData);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.getNearbyPosts = async (req, res) => {
    try {
        const { lng, lat, distance } = req.query;

        if (!lng || !lat) {
            return res.status(400).json({ msg: 'Longitude (lng) and Latitude (lat) are required' });
        }

        const center = [parseFloat(lat), parseFloat(lng)];
        const radiusInM = distance ? parseInt(distance) : 5000;
        
        // Each item in 'bounds' represents a startAt/endAt pair. We have to
        // perform a separate query for each pair, then combine the results.
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
                
                // We have to filter out a few false positives due to GeoHash accuracy
                const distanceInKm = geofire.distanceBetween([dbLat, dbLng], center);
                const distanceInM = distanceInKm * 1000;
                
                if (distanceInM <= radiusInM) {
                    matchingDocs.push(childObj);
                }
            });
        }
        
        res.json(matchingDocs);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.getPostById = async (req, res) => {
    try {
        const snapshot = await db.ref('posts/' + req.params.id).once('value');
        if (!snapshot.exists()) {
            return res.status(404).json({ msg: 'Post not found' });
        }
        const post = snapshot.val();
        post._id = snapshot.key;
        res.json(post);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.getAllPosts = async (req, res) => {
    try {
        const snapshot = await db.ref('posts').once('value');
        const posts = [];
        snapshot.forEach((child) => {
            const childObj = child.val();
            childObj._id = child.key;
            posts.push(childObj);
        });
        
        res.json(posts);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};
