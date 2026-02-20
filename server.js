const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5002;

/* ======================================================
   🔐 SECURITY
====================================================== */

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

/* ======================================================
   🌍 CORS FIX (DEV + PRODUCTION)
====================================================== */
const allowedOrigins = [
  "https://nacksa.com",
  "https://www.nacksa.com"
];

app.use(cors({
  origin: function (origin, callback) {

    // Allow Postman / server-to-server
    if (!origin) return callback(null, true);

    // Allow production domains
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Allow local development
    if (
      origin.startsWith("http://localhost:") ||
      origin.startsWith("http://127.0.0.1:")
    ) {
      return callback(null, true);
    }

    console.warn(`⚠️ Blocked by CORS: ${origin}`);
    return callback(new Error("Not allowed by CORS"));
  },

  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

// Handle browser preflight
app.options('*', cors());

/* ======================================================
   BODY PARSER
====================================================== */

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

/* ======================================================
   RATE LIMIT
====================================================== */

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', apiLimiter);

/* ======================================================
   LOGGING
====================================================== */

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

/* ======================================================
   FILE UPLOAD
====================================================== */

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `file-${unique}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png'
  ];

  if (allowedTypes.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Invalid file type'), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

/* ======================================================
   EMAIL SETUP
====================================================== */

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

transporter.verify(err => {
  if (err) console.error('❌ Email Error:', err);
  else console.log('✅ Email Ready');
});

/* ======================================================
   EMAIL SENDER
====================================================== */

async function sendEmails(type, data, files = []) {
  const { name, email, message } = data;
  const adminRecipients = process.env.BUSINESS_EMAIL || process.env.EMAIL_USER;

  const adminMail = {
    from: `"NAC Website" <${process.env.EMAIL_USER}>`,
    to: adminRecipients,
    subject: `[NAC] New ${type}: ${name}`,
    text: `
Name: ${name}
Email: ${email}
Message: ${message || 'No message'}
    `,
    attachments: files.map(f => ({
      filename: f.originalname,
      path: f.path
    }))
  };

  const userMail = {
    from: `"NAC Team" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Thank you for contacting NAC',
    text: `Hello ${name}, we received your request.`
  };

  try {
    await transporter.sendMail(adminMail);
    await transporter.sendMail(userMail);
  } catch (err) {
    console.error('Email send error:', err);
  } finally {
    files.forEach(f => fs.unlink(f.path, () => { }));
  }
}

/* ======================================================
   API ROUTES
====================================================== */

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', env: process.env.NODE_ENV });
});

app.post('/api/contact', upload.array('attachment'), async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email)
      return res.status(400).json({ error: 'Name & Email required' });

    sendEmails('Contact Form', req.body, req.files || []);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/job-application', upload.any(), async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email)
      return res.status(400).json({ error: 'Name & Email required' });

    sendEmails('Job Application', req.body, req.files || []);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/client-inquiry', upload.none(), async (req, res) => {
  try {
    const { clientName, email } = req.body;
    if (!clientName || !email)
      return res.status(400).json({ error: 'Client Name & Email required' });

    sendEmails('Client Inquiry', { name: clientName, email }, []);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

/* ======================================================
   404 API
====================================================== */

app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

/* ======================================================
   SERVE FRONTEND
====================================================== */
app.get('/', (req, res) => {
  res.send('Nacksa Backend API Running');
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

/* ======================================================
   ERROR HANDLER
====================================================== */

app.use((err, req, res, next) => {
  console.error('💥 Server Error:', err.message);

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS blocked this request' });
  }

  res.status(500).json({ error: 'Internal Server Error' });
});

/* ======================================================
   START SERVER
====================================================== */

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);

});


