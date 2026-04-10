# Green Net Tracker Backend

A robust Node.js backend for an application that tracks and maps construction sites failing to use proper green net covers (dust/debris barriers). Built with **Express**, protected by **JWT**, and powered by **Firebase Realtime Database** with **GeoFire** for advanced location-based queries.

## 🚀 Features

* **JWT User Authentication:** Secure register and login system using bcrypt for password hashing.
* **Geospatial Reporting:** Submit reports with precise Latitude and Longitude mapping to geohashes using GeoFire.
* **Nearby Location Discovery:** Query the Firebase Realtime Database to find all construction site reports within a set kilometer radius.
* **Multipart Image Uploads:** Save report evidence directly to local storage using `multer`.
* **Automated Alert System:** Included scaffold logic to notify relevant authorities when an incident is logged.
* **Enhanced API Security:** Built utilizing `helmet` for secure HTTP headers and `express-rate-limit` for blocking DoS attacks.

## 💻 Tech Stack

* **Runtime:** Node.js
* **Framework:** Express.js
* **Database:** Firebase Realtime Database (`firebase-admin`)
* **Security:** Helmet, Express Rate Limit, bcryptjs, JSON Web Tokens
* **Handling:** Multer (files), GeoFire Common (spatial data)

## ⚙️ Installation & Setup

**1. Clone the repository and install dependencies:**
```bash
npm install
```

**2. Configure Environment Variables:**
Create a `.env` file in the root directory:
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your_super_secret_jwt_key
```

**3. Configure Firebase Admin:**
* Go to your Firebase project console.
* Navigate to **Project Settings** > **Service accounts**.
* Generate and download a new private key.
* Rename the file to `serviceAccountKey.json` and place it in the root folder (`green_net_backend/`).

**4. Start the Application Server:**
```bash
node server.js
```

## 🛠️ API Reference

### User Authentication
- `POST /api/users/register` - Create a new user account (Requires Email, Name, Password).
- `POST /api/users/login` - Authenticate an existing account and obtain a JWT string.

### Posts (Reports)
- `POST /api/posts/` - Submit a new report. *(Requires JWT Bearer Auth)*
  - Requires `multipart/form-data`.
  - Keys: `image` (file), `lng` (longitude), `lat` (latitude), `description` (optional string).
- `GET /api/posts/nearby?lng=...&lat=...&distance=...` - Fetch reports within a radius using spatial mapping. (Default 5000m).
- `GET /api/posts/:id` - Fetch a single post object by its Firebase ID.
