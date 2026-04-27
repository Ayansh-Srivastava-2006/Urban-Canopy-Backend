const { db } = require('../config/firebase');

/**
 * GET /api/notifications
 * Web-only: Returns notifications for the authenticated NGO/authority user.
 */
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
            success: true,
            data: {
                count: notifications.length,
                notifications: notifications.slice(0, safeLimit)
            }
        });
    } catch (err) {
        console.error('getMyNotifications error:', err.message);
        return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch notifications.' } });
    }
};

/**
 * PATCH /api/notifications/:notificationId/read
 * Web-only: Marks a notification as read.
 */
exports.markNotificationAsRead = async (req, res) => {
    try {
        const { notificationId } = req.params;
        if (!notificationId) {
            return res.status(400).json({ success: false, error: { code: 'MISSING_ID', message: 'notificationId is required.' } });
        }

        const ref = db.ref(`notifications/${req.user.id}/${notificationId}`);
        const snapshot = await ref.once('value');

        if (!snapshot.exists()) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Notification not found.' } });
        }

        await ref.update({
            isRead: true,
            readAt: Date.now()
        });

        const updated = (await ref.once('value')).val() || {};
        return res.json({
            success: true,
            data: {
                id: notificationId,
                ...updated
            }
        });
    } catch (err) {
        console.error('markNotificationAsRead error:', err.message);
        return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update notification.' } });
    }
};