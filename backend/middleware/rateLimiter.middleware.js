/**
 * NEXORA Rate Limiting Middleware
 * In-memory sliding window rate limiter
 */

const requestCounts = new Map();

function createRateLimiter({ windowMs = 60000, max = 30, message = 'Too many requests, please try again later.' }) {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';
    const key = `${ip}_${req.baseUrl || req.path}`;
    const now = Date.now();

    const record = requestCounts.get(key) || { count: 0, resetTime: now + windowMs };

    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
    } else {
      record.count += 1;
    }

    requestCounts.set(key, record);

    if (record.count > max) {
      res.setHeader('Retry-After', Math.ceil((record.resetTime - now) / 1000));
      return res.status(429).json({
        success: false,
        error: message,
        retryAfterSeconds: Math.ceil((record.resetTime - now) / 1000)
      });
    }

    next();
  };
}

module.exports = {
  createRateLimiter
};
