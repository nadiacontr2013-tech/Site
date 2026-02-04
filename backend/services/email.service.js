const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializationPromise = null;
  }

  async getTransporter() {
    if (this.transporter) return this.transporter;

    if (!this.initializationPromise) {
      this.initializationPromise = (async () => {
        try {
          console.log('🔄 Initializing Email Transporter...');
          const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS,
            },
            pool: true, // Use connection pooling
            maxConnections: 5,
            maxMessages: 100
          });

          await transporter.verify();
          console.log('✅ Email transporter verified and ready');
          this.transporter = transporter;
          return transporter;
        } catch (error) {
          console.error('❌ Transporter initialization failed:', error.message);
          this.initializationPromise = null;
          throw error;
        }
      })();
    }

    return this.initializationPromise;
  }

  async sendAdminEmail({ subject, text, attachments = [] }) {
    const transporter = await this.getTransporter();

    const mailOptions = {
      from: `"NAC Form System" <${process.env.EMAIL_USER}>`,
      to: process.env.HR_EMAIL || process.env.EMAIL_USER,
      subject: subject,
      text: text,
      headers: {
        'X-Mailer': 'NAC Form System',
        'X-Priority': '1 (Highest)',
        'Importance': 'High'
      }
    };

    if (attachments && attachments.length > 0) {
      mailOptions.attachments = attachments;
    }

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Admin email sent:', info.messageId);
      return true;
    } catch (error) {
      console.error('❌ Admin email delivery failed:', error.message);
      throw error;
    }
  }

  async sendAutoReply({ to, name, formType, position = null }) {
    const transporter = await this.getTransporter();

    let subject, text;

    switch (formType) {
      case 'contact':
        subject = "Message Received - Nadia Al-Mutairi Contracting";
        text = `Dear ${name},

Thank you for contacting Nadia Al-Mutairi Contracting (NAC).

We have received your inquiry and our team is currently reviewing your message. One of our representatives will get back to you within 24 hours.

Your Submission Details:
- Date: ${new Date().toLocaleString()}
- Ref: NAC-MSG-${Date.now().toString().slice(-6)}

Best regards,
Customer Relations Team
Nadia Al-Mutairi Contracting`;
        break;

      case 'job':
      case 'career':
        subject = `Application Received: ${position || 'General Application'}`;
        text = `Dear ${name},

Thank you for your interest in joining Nadia Al-Mutairi Contracting.

We have successfully received your application${position ? ` for the ${position} position` : ''}. Our HR department will review your qualifications and contact you if there is a match with our current requirements.

Application Status: Received & In Review
Date: ${new Date().toLocaleString()}

Best regards,
Human Resources Department
Nadia Al-Mutairi Contracting`;
        break;

      case 'service-request':
        subject = "Service Request Received - NAC Partnership";
        text = `Dear ${name},

Thank you for choosing Nadia Al-Mutairi Contracting for your manpower requirements.

We have received your service request and it has been assigned to our Client Solutions specialist. We will analyze your requirements and contact you shortly to discuss the next steps.

Request Reference: SR-${Date.now().toString().slice(-6)}
Status: Processing

Best regards,
Client Solutions Team
Nadia Al-Mutairi Contracting`;
        break;

      default:
        subject = "Submission Received";
        text = `Dear ${name},

Thank you for your submission to Nadia Al-Mutairi Contracting. We have received your information.

Best regards,
NAC Team`;
    }

    const mailOptions = {
      from: `"NAC Support" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      text: text,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Auto-reply sent to:', to, '(', info.messageId, ')');
      return true;
    } catch (error) {
      console.error('❌ Auto-reply delivery failed:', error.message);
      return false;
    }
  }

  async addEmailDelay() {
    const delay = 2000 + Math.floor(Math.random() * 2000); // 2-4 seconds
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

module.exports = new EmailService();
