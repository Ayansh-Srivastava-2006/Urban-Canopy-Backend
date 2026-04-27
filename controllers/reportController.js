const { db } = require('../config/firebase');
const geofire = require('geofire-common');

exports.createReport = async (req, res) => {
    try {
        const { lat, lng, description, imageUrl } = req.body;
        
        if (lat === undefined || lng === undefined) {
            return res.status(400).json({ success: false, msg: 'Latitude and Longitude are required' });
        }

        const reportRef = db.ref('reports').push();
        const reportId = reportRef.key;

        const hash = geofire.geohashForLocation([parseFloat(lat), parseFloat(lng)]);

        await reportRef.set({
            userId: req.user.id,
            description: description || '',
            imageUrl: imageUrl || null,
            status: 'pending',
            createdAt: Date.now(),
            location: { lat: parseFloat(lat), lng: parseFloat(lng) },
            geohash: hash
        });

        // Broadcast using Socket.io
        if (req.io) {
            req.io.emit('new_report', { id: reportId, lat: parseFloat(lat), lng: parseFloat(lng), status: 'pending', description, imageUrl });
        }

        res.status(201).json({ success: true, data: { id: reportId, status: 'pending' } });
    } catch (error) {
        console.error('Error creating report:', error);
        res.status(500).json({ success: false, msg: 'Server error' });
    }
};

exports.getReports = async (req, res) => {
    try {
        const { lat, lng, radius } = req.query;

        if (lat && lng && radius) {
            const center = [parseFloat(lat), parseFloat(lng)];
            const radiusInM = parseFloat(radius) * 1000;
            const bounds = geofire.geohashQueryBounds(center, radiusInM);
            const promises = [];

            for (const b of bounds) {
                const q = db.ref('reports')
                            .orderByChild('geohash')
                            .startAt(b[0])
                            .endAt(b[1]);
                promises.push(q.once('value'));
            }

            const snapshots = await Promise.all(promises);
            const matchingReports = [];

            for (const snap of snapshots) {
                for (const child of snap.val() ? Object.keys(snap.val()) : []) {
                    const report = snap.val()[child];
                    const distanceInKm = geofire.distanceBetween([report.location.lat, report.location.lng], center);
                    if (distanceInKm <= parseFloat(radius)) {
                        matchingReports.push({ id: child, ...report });
                    }
                }
            }

            return res.status(200).json({ success: true, data: matchingReports });
        } else {
            // Return all reports
            const snapshot = await db.ref('reports').once('value');
            const reports = [];
            snapshot.forEach((childSnapshot) => {
                reports.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });
            return res.status(200).json({ success: true, data: reports });
        }
    } catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).json({ success: false, msg: 'Server error' });
    }
};

exports.resolveReport = async (req, res) => {
    try {
        const { id } = req.params;
        const { remarks } = req.body;

        const reportRef = db.ref(`reports/${id}`);
        const snapshot = await reportRef.once('value');

        if (!snapshot.exists()) {
            return res.status(404).json({ success: false, msg: 'Report not found' });
        }

        await reportRef.update({
            status: 'resolved',
            resolvedBy: req.user.id,
            resolvedAt: Date.now(),
            remarks: remarks || ''
        });

        // Broadcast update
        if (req.io) {
            req.io.emit('report_resolved', { id, status: 'resolved' });
        }

        res.status(200).json({ success: true, data: { id, status: 'resolved' } });
    } catch (error) {
        console.error('Error resolving report:', error);
        res.status(500).json({ success: false, msg: 'Server error' });
    }
};
