const express = require('express');
const rateLimit = require('express-rate-limit');
const emailService = require('../services/email.service');

const router = express.Router();

// Rate limiting for career applications
const careerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 applications per IP per 15 minutes
  message: {
    success: false,
    message: "Too many career applications submitted. Please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Career application endpoint
router.post('/career', careerLimiter, async (req, res) => {
  console.log('📥 New career application received');
  
  try {
    // Validate required fields
    const { name, email, phone, message } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Name and email are required"
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format"
      });
    }

    // Send admin email
    const adminSubject = `New Career Application - ${name}`;
    const adminText = `
NEW CAREER APPLICATION

Name: ${name}
Email: ${email}
Phone: ${phone || 'Not provided'}
Message: ${message || 'Not provided'}

Submitted on: ${new Date().toLocaleString()}
    `;

    try {
      await emailService.sendAdminEmail({
        subject: adminSubject,
        text: adminText
      });
    } catch (adminError) {
      console.error('❌ Admin email failed:', adminError.message);
      return res.status(500).json({
        success: false,
        message: "Unable to send notification. Please try again later."
      });
    }

    // Add delay between emails
    await emailService.addEmailDelay();

    // Send auto-reply
    try {
      await emailService.sendAutoReply({
        to: email,
        name: name,
        formType: 'career'
      });
    } catch (autoReplyError) {
      console.error('❌ Auto-reply failed:', autoReplyError.message);
      // Continue - auto-reply failure shouldn't break the process
    }

    // Return success only when admin email succeeds
    res.status(200).json({
      success: true,
      message: "Career application submitted successfully"
    });

  } catch (error) {
    console.error('❌ Career application error:', error);
    res.status(500).json({
      success: false,
      message: "Unable to submit career application. Please try again later."
    });
  }
});

module.exports = router;