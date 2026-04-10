const { db } = require('../config/firebase');

const sendAuthorityAlert = async (post) => {
    const usersSnapshot = await db.ref('users').once('value');
    const recipients = [];

    usersSnapshot.forEach((child) => {
        const user = child.val();
        if (user && ['ngo', 'authority'].includes(user.role)) {
            recipients.push({
                id: child.key,
                role: user.role,
                name: user.name || 'Unknown'
            });
        }
    });

    const notificationPayload = {
        type: 'NEW_POST_REPORTED',
        postId: post._id,
        userId: post.userId,
        description: post.description || '',
        shortSummary: post.aiSummary?.shortSummary || '',
        priority: post.aiSummary?.priority || 'medium',
        keywords: post.aiSummary?.keywords || [],
        summarySource: post.aiSummary?.source || 'fallback',
        model: post.aiSummary?.model || null,
        location: {
            lat: post.location?.lat,
            lng: post.location?.lng
        },
        status: post.status,
        imageUrl: post.imageUrl,
        reportedAt: post.createdAt,
        createdAt: Date.now(),
        isRead: false
    };

    const writes = recipients.map((recipient) => {
        const notificationRef = db.ref(`notifications/${recipient.id}`).push();
        return notificationRef.set({
            ...notificationPayload,
            recipientRole: recipient.role
        });
    });

    await Promise.all(writes);

    console.log(`[ALERT] Sent report notifications to ${recipients.length} NGO/Authority recipients`);
    console.log(`Post ID: ${post._id}`);
    console.log(`Summary: ${notificationPayload.shortSummary || 'N/A'}`);
    console.log(`Priority: ${notificationPayload.priority}`);
    console.log(`Location: [${notificationPayload.location.lng}, ${notificationPayload.location.lat}]`);
    console.log(`-----------------------------------------------`);
};

module.exports = {
    sendAuthorityAlert
};
