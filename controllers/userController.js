const { db } = require('../config/firebase');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.registerUser = async (req, res) => {
    // role is optional and defaults to 'user'
    const { name, email, password, role } = req.body;
    try {
        const usersRef = db.ref('users');
        const snapshot = await usersRef.orderByChild('email').equalTo(email).once('value');
        if (snapshot.exists()) {
            return res.status(400).json({ msg: 'User already exists' });
        }
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const newUserRef = usersRef.push();
        
        // Ensure role is strictly controlled
        const userRole = ['user', 'ngo', 'authority'].includes(role) ? role : 'user';

        await newUserRef.set({
            name,
            email,
            password: hashedPassword,
            role: userRole,
            createdAt: Date.now()
        });
        
        const payload = { user: { id: newUserRef.key, role: userRole } };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: 360000 }, (err, token) => {
            if (err) throw err;
            res.json({ token, user: { id: newUserRef.key, name, email, role: userRole } });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

exports.loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
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
        
        const payload = { user: { id: userId, role: user.role || 'user' } };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: 360000 }, (err, token) => {
            if (err) throw err;
            res.json({ token, user: { id: userId, name: user.name, email: user.email, role: user.role || 'user' } });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};
