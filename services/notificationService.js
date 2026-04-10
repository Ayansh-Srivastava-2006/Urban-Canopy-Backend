const sendAuthorityAlert = async (post) => {
    // In a real application, you would use Nodemailer or an SMS gateway
    // and query the DB for the authority email attached to 'location'
    console.log(`[ALERT] Mock Notification to Authority`);
    console.log(`Post ID: ${post._id}`);
    console.log(`Location: [${post.location.coordinates[0]}, ${post.location.coordinates[1]}]`);
    console.log(`Description: ${post.description || 'N/A'}`);
    console.log(`Image URL: ${post.imageUrl}`);
    console.log(`-----------------------------------------------`);
};

module.exports = {
    sendAuthorityAlert
};
