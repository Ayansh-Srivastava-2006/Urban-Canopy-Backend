require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');
require('./config/firebase');
const { APP_ORIGINS, WEB_ORIGINS } = require('./config/frontendAccess');

const app = express();
const server = http.createServer(app);
const allowedOrigins = [...APP_ORIGINS, ...WEB_ORIGINS];

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']
  }
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

io.on('connection', (socket) => {
  console.log('A client connected via Socket.io:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Security Middlewares
app.use(helmet()); 
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" })); // Allow images to be loaded
app.use(cors({
  origin: (origin, callback) => {
    // Native mobile clients may not send Origin; allow those requests.
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS blocked: Origin not allowed'));
  },
  credentials: true
}));

// Rate Limiting (100 requests per 15 minutes limit per IP)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100, 
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

app.use(express.json());
app.use('/uploads', express.static('uploads')); // For serving uploaded images

// Routes
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/posts', require('./routes/postRoutes'));
app.use('/api/chatbot', require('./routes/chatbotRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));

app.get('/', (req, res) => {
  res.send('Green Net Backend API is running...');
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server started on port ${PORT}`));
