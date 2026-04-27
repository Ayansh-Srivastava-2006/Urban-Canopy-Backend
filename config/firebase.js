const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// The application will look for serviceAccountKey.json in the project root
// If it doesn't exist, it will warn the user.
const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');

let app;

try {
    let serviceAccount;

    // Check for encoded Environment Variable first (For Cloud Deployments)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
        const buff = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64');
        serviceAccount = JSON.parse(buff.toString('utf8'));
        console.log("Firebase Admin Initialized from Base64 Environment Variable.");
    } 
    // Fallback to local file (For Local Development)
    else if (fs.existsSync(serviceAccountPath)) {
        serviceAccount = require(serviceAccountPath);
        console.log("Firebase Admin Initialized successfully from local JSON file.");
    }

    if (serviceAccount) {
        app = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: "https://urban-canopy-solution-default-rtdb.asia-southeast1.firebasedatabase.app/"
        });
    } else {
        console.warn("WARNING: serviceAccountKey.json is missing and FIREBASE_SERVICE_ACCOUNT_BASE64 is not set. Assuming default Google Application Default Credentials.");
        app = admin.initializeApp({
            databaseURL: "https://urban-canopy-solution-default-rtdb.asia-southeast1.firebasedatabase.app/"
        });
    }
} catch (error) {
    console.error("Firebase initialization error: ", error);
}

const db = admin.database();

module.exports = { admin, db };
