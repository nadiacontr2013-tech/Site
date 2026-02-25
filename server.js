// ======================================================
// 🚀 NAC Backend Server (Render Ready)
// Email System: Resend API (No SMTP Timeout)
// ======================================================

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// ✅ Email API
const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

const app = express();
const PORT = process.env.PORT || 5002;

// ======================================================
// 🔐 SECURITY
// ======================================================

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// ======================================================
// 🌍 CORS
// ======================================================

const allowedOrigins = [
  "https://nacksa.com",
  "https://www.nacksa.com",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      if (
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:")
      ) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.options("*", cors());

// ======================================================
// 🧠 BODY PARSER
// ======================================================

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// ======================================================
// 🚦 RATE LIMIT
// ======================================================

app.use(
  "/api/",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
  })
);

// ======================================================
// 📂 FILE UPLOAD
// ======================================================

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    const unique = Date.now() + "-" + Math.random();
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// ======================================================
// 📧 EMAIL SENDER (Resend)
// ======================================================

async function sendEmails(type, data, files = []) {
  const { name, email } = data;
  const adminEmail =
    process.env.BUSINESS_EMAIL || process.env.EMAIL_USER;

  // Build body
  let details = "";
  for (const [key, value] of Object.entries(data)) {
    if (value && key !== "name" && key !== "email") {
      details += `<p><b>${key}:</b> ${value}</p>`;
    }
  }

  // Admin mail
  await resend.emails.send({
    from: "NAC <onboarding@resend.dev>",
    to: adminEmail,
    subject: `[NAC] New ${type}: ${name}`,
    html: `
      <h2>New ${type}</h2>
      <p><b>Name:</b> ${name}</p>
      <p><b>Email:</b> ${email}</p>
      ${details}
    `,
  });

  // User auto reply
  await resend.emails.send({
    from: "NAC <onboarding@resend.dev>",
    to: email,
    subject: "Thank you for contacting NAC",
    html: `
      <p>Hello ${name},</p>
      <p>We received your request. Our team will contact you soon.</p>
      <br/>
      <p>— NAC Team</p>
    `,
  });

  // Cleanup uploads
  files.forEach((f) => fs.unlink(f.path, () => {}));
}

// ======================================================
// 🧪 TEST EMAIL
// ======================================================

app.get("/api/test-email", async (_, res) => {
  try {
    await resend.emails.send({
      from: "NAC <onboarding@resend.dev>",
      to: process.env.EMAIL_USER,
      subject: "SMTP Test → Resend",
      html: "<p>Email working ✅</p>",
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ======================================================
// 📩 CONTACT FORM
// ======================================================

app.post(
  "/api/contact",
  upload.array("attachment"),
  async (req, res) => {
    try {
      const { name, email } = req.body;
      if (!name || !email)
        return res
          .status(400)
          .json({ error: "Name & Email required" });

      await sendEmails(
        "Contact Form",
        req.body,
        req.files || []
      );

      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Email failed" });
    }
  }
);

// ======================================================
// 💼 JOB APPLICATION
// ======================================================

app.post(
  "/api/job-application",
  upload.any(),
  async (req, res) => {
    try {
      const { name, email } = req.body;
      if (!name || !email)
        return res
          .status(400)
          .json({ error: "Name & Email required" });

      await sendEmails(
        "Job Application",
        req.body,
        req.files || []
      );

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Email failed" });
    }
  }
);

// ======================================================
// 🏢 CLIENT INQUIRY
// ======================================================

app.post(
  "/api/client-inquiry",
  upload.none(),
  async (req, res) => {
    try {
      const { clientName, email } = req.body;
      if (!clientName || !email)
        return res.status(400).json({
          error: "Client Name & Email required",
        });

      await sendEmails(
        "Client Inquiry",
        { name: clientName, ...req.body },
        []
      );

      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Email failed" });
    }
  }
);

// ======================================================
// ❤️ HEALTH CHECK
// ======================================================

app.get("/api/health", (_, res) => {
  res.json({ status: "OK" });
});

// ======================================================
// 🌐 ROOT
// ======================================================

app.get("/", (_, res) => {
  res.send("NAC Backend Running 🚀");
});

// ======================================================
// ❌ ERROR HANDLER
// ======================================================

app.use((err, _, res, __) => {
  console.error(err);
  res.status(500).json({ error: "Server Error" });
});

// ======================================================
// ▶️ START SERVER
// ======================================================

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
