const { db } = require('../config/firebase');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { resolvePlatform } = require('../config/frontendAccess');

exports.registerUser = async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const platform = resolvePlatform(req);
        if (platform !== 'app') {
            return res.status(403).json({ msg: 'Registration is only available for app users.' });
        }

        const usersRef = db.ref('users');
        const snapshot = await usersRef.orderByChild('email').equalTo(email).once('value');
        if (snapshot.exists()) {
            return res.status(400).json({ msg: 'User already exists' });
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
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: 360000 }, (err, token) => {
            if (err) throw err;
            res.json({ token, user: { id: newUserRef.key, name, email, role: userRole, platform: 'app' } });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

exports.loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        const platform = resolvePlatform(req);
        if (!platform) {
            return res.status(400).json({ msg: 'Platform is required. Send platform as "app" or "web".' });
        }

        const usersRef = db.ref('users');
        const snapshot = await usersRef.orderByChild('email').equalTo(email).once('value');
        
        if (!snapshot.exists()) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }
        
        const users = snapshot.val();
        const userId = Object.keys(users)[0];
        const user = users[userId];
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        if (platform === 'app' && user.role !== 'user') {
            return res.status(403).json({ msg: 'Only users can access the app.' });
        }

        if (platform === 'web' && !['ngo', 'authority'].includes(user.role)) {
            return res.status(403).json({ msg: 'Only NGOs and authorities can access the web portal.' });
        }
        
        const payload = { user: { id: userId, role: user.role || 'user', platform } };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: 360000 }, (err, token) => {
            if (err) throw err;
            res.json({ token, user: { id: userId, name: user.name, email: user.email, role: user.role || 'user', platform } });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};
