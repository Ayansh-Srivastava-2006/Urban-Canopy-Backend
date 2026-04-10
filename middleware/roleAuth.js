module.exports = function (allowedRoles) {
    return function (req, res, next) {
        if (!req.user || !req.user.role) {
            return res.status(403).json({ msg: 'Access Denied: Role missing in token' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ msg: `Access Denied: You must be a [${allowedRoles.join(' or ')}] to perform this action.` });
        }
        
        next();
    };
};
