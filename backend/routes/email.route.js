const express = require('express');
const emailRateLimiter = require("../middlewares/rateLimiter.js");
const { sendEmail, sendServiceRequest } = require("../controllers/emailController.js");

const router = express.Router();

router.post("/send-email", emailRateLimiter, sendEmail);
router.post("/send-service-request", emailRateLimiter, sendServiceRequest);

module.exports = router;
