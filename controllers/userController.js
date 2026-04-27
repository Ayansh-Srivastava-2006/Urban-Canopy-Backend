const { db } = require('../config/firebase');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { resolvePlatform } = require('../config/frontendAccess');

const JWT_EXPIRY = '24h';

/**
 * POST /api/users/register
 * App-only: Creates a new public user account.
 */
exports.registerUser = async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const platform = resolvePlatform(req);
        if (platform !== 'app') {
            return res.status(403).json({ success: false, error: { code: 'PLATFORM_DENIED', message: 'Registration is only available for app users.' } });
        }

        const usersRef = db.ref('users');
        const snapshot = await usersRef.orderByChild('email').equalTo(email).once('value');
        if (snapshot.exists()) {
            return res.status(409).json({ success: false, error: { code: 'USER_EXISTS', message: 'An account with this email already exists.' } });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUserRef = usersRef.push();
        const userRole = 'user';

        await newUserRef.set({
            name,
            email,
            password: hashedPassword,
            role: userRole,
            createdAt: Date.now()
        });

        const payload = { user: { id: newUserRef.key, role: userRole, platform: 'app' } };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRY });

        res.status(201).json({
            success: true,
            data: {
                token,
                user: { id: newUserRef.key, name, email, role: userRole, platform: 'app' }
            }
        });
    } catch (err) {
        console.error('registerUser error:', err.message);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error.' } });
    }
};

/**
 * POST /api/users/register-web
 * Web-only: Creates authority or NGO accounts.
 */
exports.registerWebUser = async (req, res) => {
    const { name, email, password, role } = req.body;
    try {
        const platform = resolvePlatform(req);
        if (platform !== 'web') {
            return res.status(403).json({ success: false, error: { code: 'PLATFORM_DENIED', message: 'Web registration is only available from the web portal.' } });
        }

        const usersRef = db.ref('users');
        const snapshot = await usersRef.orderByChild('email').equalTo(email).once('value');
        if (snapshot.exists()) {
            return res.status(409).json({ success: false, error: { code: 'USER_EXISTS', message: 'An account with this email already exists.' } });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUserRef = usersRef.push();

        await newUserRef.set({
            name,
            email,
            password: hashedPassword,
            role, // 'authority' or 'ngo' — validated by middleware
            createdAt: Date.now()
        });

        const payload = { user: { id: newUserRef.key, role, platform: 'web' } };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRY });

        res.status(201).json({
            success: true,
            data: {
                token,
                user: { id: newUserRef.key, name, email, role, platform: 'web' }
            }
        });
    } catch (err) {
        console.error('registerWebUser error:', err.message);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error.' } });
    }
};

/**
 * POST /api/users/login
 * Both platforms: Authenticates and returns JWT token.
 */
exports.loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        const platform = resolvePlatform(req);
        if (!platform) {
            return res.status(400).json({ success: false, error: { code: 'MISSING_PLATFORM', message: 'Platform is required. Send x-client-platform header as "app" or "web".' } });
        }

        const usersRef = db.ref('users');
        const snapshot = await usersRef.orderByChild('email').equalTo(email).once('value');

        if (!snapshot.exists()) {
            return res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } });
        }

        const users = snapshot.val();
        const userId = Object.keys(users)[0];
        const user = users[userId];

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } });
        }

        if (platform === 'app' && user.role !== 'user') {
            return res.status(403).json({ success: false, error: { code: 'ROLE_MISMATCH', message: 'Only public users can access the app.' } });
        }

        if (platform === 'web' && !['ngo', 'authority'].includes(user.role)) {
            return res.status(403).json({ success: false, error: { code: 'ROLE_MISMATCH', message: 'Only NGOs and authorities can access the web portal.' } });
        }

        const payload = { user: { id: userId, role: user.role || 'user', platform } };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRY });

        res.json({
            success: true,
            data: {
                token,
                user: { id: userId, name: user.name, email: user.email, role: user.role || 'user', platform }
            }
        });
    } catch (err) {
        console.error('loginUser error:', err.message);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error.' } });
    }
};

/**
 * GET /api/users/me
 * Authenticated: Returns current user profile from token + DB.
 */
exports.getMe = async (req, res) => {
    try {
        const snapshot = await db.ref('users/' + req.user.id).once('value');
        if (!snapshot.exists()) {
            return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User profile not found.' } });
        }

        const user = snapshot.val();
        res.json({
            success: true,
            data: {
                user: {
                    id: req.user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    platform: req.user.platform,
                    createdAt: user.createdAt
                }
            }
        });
    } catch (err) {
        console.error('getMe error:', err.message);
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error.' } });
    }
};
