const { db } = require('../config/firebase');

exports.getMyNotifications = async (req, res) => {
    try {
        const onlyUnread = String(req.query.unread || 'false').toLowerCase() === 'true';
        const limit = Number.parseInt(req.query.limit, 10);
        const safeLimit = Number.isNaN(limit) ? 100 : Math.min(Math.max(limit, 1), 200);

        const snapshot = await db.ref(`notifications/${req.user.id}`).once('value');
        const notifications = [];

        snapshot.forEach((child) => {
            const value = child.val() || {};
            const item = {
                id: child.key,
                ...value
            };

            if (!onlyUnread || item.isRead !== true) {
                notifications.push(item);
            }
        });

        notifications.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        return res.json({
            count: notifications.length,
            notifications: notifications.slice(0, safeLimit)
        });
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({ msg: 'Failed to fetch notifications.' });
    }
};

exports.markNotificationAsRead = async (req, res) => {
    try {
        const { notificationId } = req.params;
        if (!notificationId) {
            return res.status(400).json({ msg: 'notificationId is required.' });
        }

        const ref = db.ref(`notifications/${req.user.id}/${notificationId}`);
        const snapshot = await ref.once('value');

        if (!snapshot.exists()) {
            return res.status(404).json({ msg: 'Notification not found.' });
        }

        await ref.update({
            isRead: true,
            readAt: Date.now()
        });

        const updated = (await ref.once('value')).val() || {};
        return res.json({
            id: notificationId,
            ...updated
        });
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({ msg: 'Failed to update notification.' });
    }
};