const rateLimit = require("express-rate-limit");

const emailRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                 // 20 emails per IP
  message: {
    success: false,
    message: "Too many requests. Please try again later."
  }
});

module.exports = emailRateLimiter;
