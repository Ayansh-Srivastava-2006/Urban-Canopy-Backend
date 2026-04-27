const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate registration input fields.
 */
function validateRegister(req, res, next) {
    const { name, email, password } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_NAME', message: 'Name is required and must be at least 2 characters.' } });
    }

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_EMAIL', message: 'A valid email address is required.' } });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
        return res.status(400).json({ success: false, error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters.' } });
    }

    // Sanitize
    req.body.name = name.trim();
    req.body.email = email.trim().toLowerCase();

    next();
}

/**
 * Validate login input fields.
 */
function validateLogin(req, res, next) {
    const { email, password } = req.body;

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_EMAIL', message: 'A valid email address is required.' } });
    }

    if (!password || typeof password !== 'string' || password.length === 0) {
        return res.status(400).json({ success: false, error: { code: 'MISSING_PASSWORD', message: 'Password is required.' } });
    }

    req.body.email = email.trim().toLowerCase();

    next();
}

/**
 * Validate web registration (authority/NGO users).
 */
function validateWebRegister(req, res, next) {
    const { role } = req.body;
    const allowedRoles = ['authority', 'ngo'];

    if (!role || !allowedRoles.includes(role)) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_ROLE', message: `Role must be one of: ${allowedRoles.join(', ')}` } });
    }

    // Chain to the generic register validator
    validateRegister(req, res, next);
}

/**
 * Validate post creation coordinates.
 */
function validatePostCoords(req, res, next) {
    const { lat, lng } = req.body;

    if (lat === undefined || lng === undefined) {
        return res.status(400).json({ success: false, error: { code: 'MISSING_COORDS', message: 'Location coordinates (lat, lng) are required.' } });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || latitude < -90 || latitude > 90) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_LAT', message: 'Latitude must be between -90 and 90.' } });
    }

    if (isNaN(longitude) || longitude < -180 || longitude > 180) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_LNG', message: 'Longitude must be between -180 and 180.' } });
    }

    next();
}

/**
 * Validate nearby query parameters.
 */
function validateNearbyQuery(req, res, next) {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
        return res.status(400).json({ success: false, error: { code: 'MISSING_COORDS', message: 'Query parameters lat and lng are required.' } });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || latitude < -90 || latitude > 90) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_LAT', message: 'Latitude must be between -90 and 90.' } });
    }

    if (isNaN(longitude) || longitude < -180 || longitude > 180) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_LNG', message: 'Longitude must be between -180 and 180.' } });
    }

    next();
}

/**
 * Validate status update.
 */
function validateStatusUpdate(req, res, next) {
    const { status } = req.body;
    const allowedStatuses = ['Reported', 'Under Review', 'Verified', 'Resolved', 'Dismissed'];

    if (!status || !allowedStatuses.includes(status)) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: `Status must be one of: ${allowedStatuses.join(', ')}` } });
    }

    next();
}

module.exports = {
    validateRegister,
    validateLogin,
    validateWebRegister,
    validatePostCoords,
    validateNearbyQuery,
    validateStatusUpdate
};
