module.exports = function (allowedPlatforms) {
    return function (req, res, next) {
        if (!req.user || !req.user.platform) {
            return res.status(403).json({ msg: 'Access Denied: Session platform missing. Please login again.' });
        }

        if (!allowedPlatforms.includes(req.user.platform)) {
            return res.status(403).json({ msg: `Access Denied: This endpoint is only for [${allowedPlatforms.join(' or ')}] clients.` });
        }

        next();
    };
};