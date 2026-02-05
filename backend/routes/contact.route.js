const express = require('express');
const rateLimit = require('express-rate-limit');
const emailService = require('../services/email.service');

const router = express.Router();

// Rate limiting for contact form
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 submissions per IP per 15 minutes
  message: {
    success: false,
    message: "Too many contact form submissions. Please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Contact form endpoint
router.post('/contact', contactLimiter, async (req, res) => {
  console.log('📥 New contact form submission');
  
  try {
    // Validate required fields
    const { name, email, phone, message } = req.body;
    
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and message are required"
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
    const adminSubject = `New Contact Form Submission - ${name}`;
    const adminText = `
NEW CONTACT FORM SUBMISSION

Name: ${name}
Email: ${email}
Phone: ${phone || 'Not provided'}
Message: ${message}

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
        formType: 'contact'
      });
    } catch (autoReplyError) {
      console.error('❌ Auto-reply failed:', autoReplyError.message);
      // Continue - auto-reply failure shouldn't break the process
    }

    // Return success only when admin email succeeds
    res.status(200).json({
      success: true,
      message: "Contact form submitted successfully"
    });

  } catch (error) {
    console.error('❌ Contact form error:', error);
    res.status(500).json({
      success: false,
      message: "Unable to submit contact form. Please try again later."
    });
  }
});

module.exports = router;