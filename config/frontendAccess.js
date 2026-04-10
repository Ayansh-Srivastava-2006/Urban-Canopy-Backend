const parseOrigins = (value) => {
    if (!value) return [];
    return value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
};

const APP_ORIGINS = parseOrigins(process.env.APP_FRONTEND_ORIGINS);
const WEB_ORIGINS = parseOrigins(process.env.WEB_FRONTEND_ORIGINS);

const getPlatformFromOrigin = (origin) => {
    if (!origin) return null;
    if (APP_ORIGINS.includes(origin)) return 'app';
    if (WEB_ORIGINS.includes(origin)) return 'web';
    return null;
};

const resolvePlatform = (req) => {
    const bodyPlatform = typeof req.body?.platform === 'string' ? req.body.platform.trim().toLowerCase() : null;
    const headerPlatform = typeof req.header('x-client-platform') === 'string'
        ? req.header('x-client-platform').trim().toLowerCase()
        : null;
    const originPlatform = getPlatformFromOrigin(req.header('Origin'));

    const platform = bodyPlatform || headerPlatform || originPlatform;
    if (!platform) return null;
    return ['app', 'web'].includes(platform) ? platform : null;
};

module.exports = {
    APP_ORIGINS,
    WEB_ORIGINS,
    getPlatformFromOrigin,
    resolvePlatform
};