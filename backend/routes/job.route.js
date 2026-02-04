const express = require('express');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const emailService = require('../services/email.service');

const router = express.Router();

// Rate limiting for job applications
const jobLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Max 3 applications per IP per 15 minutes
  message: {
    success: false,
    message: "Too many job applications submitted. Please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// File upload configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'resume-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOC, and DOCX files are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// Job application endpoint
router.post('/job', jobLimiter, upload.single('resume'), async (req, res) => {
  console.log('📥 New job application received');
  let filePath = null;

  try {
    // Validate required fields
    const { name, email, phone, position, experience, message } = req.body;

    const requiredFields = ['name', 'email', 'phone', 'position', 'experience'];
    const missingFields = requiredFields.filter(field => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
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

    // Validate file upload
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Resume file is required"
      });
    }

    filePath = req.file.path;

    // Send admin email with resume attachment
    const adminSubject = `New Job Application - ${position} - ${name}`;
    const adminText = `
NEW JOB APPLICATION
-------------------

Personal Information:
- Name: ${name}
- Email: ${email}
- Phone: ${phone}
- Nationality: ${req.body.nationality || 'Not provided'}

Career Details:
- Position Applied For: ${position}
- Years of Experience: ${experience}
- Education: ${req.body.education || 'Not provided'}

Message/Notes: 
${message || 'Not provided'}

Submitted on: ${new Date().toLocaleString()}
    `;

    // Return success immediately
    res.status(200).json({
      success: true,
      message: "Job application submitted successfully"
    });

    // Background tasks: Admin notification + Auto-reply
    (async () => {
      try {
        // Send admin email with resume attachment
        await emailService.sendAdminEmail({
          subject: adminSubject,
          text: adminText,
          attachments: [{
            filename: req.file.originalname,
            path: filePath
          }]
        });

        // Add delay between emails
        await emailService.addEmailDelay();

        // Send auto-reply
        await emailService.sendAutoReply({
          to: email,
          name: name,
          formType: 'job',
          position: position
        });

        // Clean up file after successful delivery
        if (filePath && fs.existsSync(filePath)) {
          fs.unlink(filePath, (err) => {
            if (err) console.error('Error deleting file:', err);
            else console.log('✅ Temporary file cleaned up');
          });
        }
      } catch (error) {
        console.error('❌ Background job email task failed:', error);
        // Still clean up file on background failure
        if (filePath && fs.existsSync(filePath)) {
          fs.unlink(filePath, () => { });
        }
      }
    })();

  } catch (error) {
    console.error('❌ Job application error:', error);

    // Clean up file on error
    if (filePath && fs.existsSync(filePath)) {
      fs.unlink(filePath, () => { });
    }

    res.status(500).json({
      success: false,
      message: "Unable to submit job application. Please try again later."
    });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds 5MB limit'
      });
    }
  }

  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: 'Invalid file type. Only PDF, DOC, and DOCX files are allowed.'
    });
  }

  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

module.exports = router;