// Rate limiting is COMPLETELY disabled globally as requested by the user.
export const apiLimiter = (req, res, next) => next();
export const authLimiter = (req, res, next) => next();
export const messageLimiter = (req, res, next) => next();
export const uploadLimiter = (req, res, next) => next();
export const connectionLimiter = (req, res, next) => next();
