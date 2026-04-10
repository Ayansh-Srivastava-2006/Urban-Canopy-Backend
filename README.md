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
APP_FRONTEND_ORIGINS=http://localhost:8081,http://localhost:19006
WEB_FRONTEND_ORIGINS=http://localhost:3000,http://localhost:5173
OPENROUTER_API_KEY=your_openrouter_api_key
NEMOTRON_MODEL=nvidia/llama-3.1-nemotron-70b-instruct:free
NEMOTRON_SUMMARY_MODEL=nvidia/llama-3.1-nemotron-70b-instruct:free
OPENROUTER_MODEL=nvidia/llama-3.1-nemotron-70b-instruct:free
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_SITE_URL=http://localhost:5000
OPENROUTER_APP_NAME=Urban-Canopy-Backend
```

`APP_FRONTEND_ORIGINS` should contain origins used by the mobile app frontend.

`WEB_FRONTEND_ORIGINS` should contain origins used by the admin web frontend.

Set `NEMOTRON_MODEL` to the exact free NVIDIA Nemotron 3 Super slug available on your provider/OpenRouter account.

Use `NEMOTRON_SUMMARY_MODEL` if you want a separate model setting for post summarization.

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
- `POST /api/users/register` - App-only registration for role `user`.
  - Requires `name`, `email`, `password`, and `platform=app` (or `x-client-platform: app`).
- `POST /api/users/login` - Login with strict platform role checks.
  - For mobile app: `platform=app` and account role must be `user`.
  - For admin web: `platform=web` and account role must be `ngo` or `authority`.

### Posts (Reports)
- `POST /api/posts/` - Submit a new report. *(Requires JWT Bearer Auth)*
  - App-only, role must be `user`.
  - Requires `multipart/form-data`.
  - Keys: `image` (file), `lng` (longitude), `lat` (latitude), `description` (optional string).
  - Automatically generates and stores `aiSummary` from description.
  - Automatically sends summarized details with location and image metadata to all NGO and authority users under `notifications/{userId}` in Firebase.
- `GET /api/posts/all` - Fetch all reports for web dashboard. *(Requires JWT; role `ngo` or `authority`; platform `web`)*
- `GET /api/posts/nearby?lng=...&lat=...&distance=...` - Fetch reports within a radius using spatial mapping. (Default 5000m).
- `GET /api/posts/:id` - Fetch a single post object by its Firebase ID.

### Chatbot (NVIDIA Nemotron 3 Super - Free)
- `POST /api/chatbot/` - Chat with assistant. *(Requires JWT Bearer Auth)*
  - Allowed roles: `user`, `ngo`, `authority`.
  - Body example:

```json
{
  "message": "How do I report an uncovered construction site?",
  "history": [
    { "role": "user", "content": "I found dust pollution near my house." },
    { "role": "assistant", "content": "Please share the exact location and an image." }
  ]
}
```

### Notifications (NGO/Authority Web)
- `GET /api/notifications?unread=true&limit=50` - Fetch notifications for logged-in NGO/authority account. *(Requires JWT; role `ngo` or `authority`; platform `web`)*
- `PATCH /api/notifications/:notificationId/read` - Mark one notification as read. *(Requires JWT; role `ngo` or `authority`; platform `web`)*
