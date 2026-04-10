const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// The application will look for serviceAccountKey.json in the project root
// If it doesn't exist, it will warn the user.
const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');

let app;

try {
    if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = require(serviceAccountPath);
        app = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: "https://urban-canopy-solution-default-rtdb.asia-southeast1.firebasedatabase.app/"
        });
        console.log("Firebase Admin Initialized successfully.");
    } else {
        console.warn("WARNING: serviceAccountKey.json is missing. Please download it from Firebase Console -> Project Settings -> Service Accounts, and place it in the root folder.");
        // Initialize without cert for now (may cause permission errors if auth is required)
        app = admin.initializeApp({
            databaseURL: "https://urban-canopy-solution-default-rtdb.asia-southeast1.firebasedatabase.app/"
        });
    }
} catch (error) {
    console.error("Firebase initialization error: ", error);
}

const db = admin.database();

module.exports = { admin, db };
