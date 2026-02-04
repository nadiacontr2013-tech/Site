const emailService = require('../services/email.service');

const sendEmail = async (req, res) => {
  console.log('📥 New email request received');

  try {
    // Validate required fields
    const { name, email, phone, message, subject, company } = req.body;

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

    // Prepare subject and message content
    const emailSubject = subject || `New Message from ${name}`;
    const emailText = `
NEW MESSAGE RECEIVED
--------------------

From: ${name}
Company: ${company || 'Not provided'}
Email: ${email}
Phone: ${phone || 'Not provided'}
Subject: ${subject || 'No subject'}

Message:
${message}

Company Details:
- Commercial Register: ${req.body.commercialRegisterNumber || 'Not provided'}

Received on: ${new Date().toLocaleString()}
    `;

    // Return success immediately
    res.status(200).json({
      success: true,
      message: "Message sent successfully"
    });

    // Background tasks: Admin notification + Auto-reply
    (async () => {
      try {
        // Send admin email
        await emailService.sendAdminEmail({
          subject: emailSubject,
          text: emailText
        });

        // Add delay between emails
        await emailService.addEmailDelay();

        // Send auto-reply
        await emailService.sendAutoReply({
          to: email,
          name: name,
          formType: 'contact'
        });
      } catch (error) {
        console.error('❌ Background email task failed:', error.message);
      }
    })();

    return;

  } catch (error) {
    console.error('❌ Email sending error:', error);
    res.status(500).json({
      success: false,
      message: "Unable to send message. Please try again later."
    });
  }
};

const sendServiceRequest = async (req, res) => {
  console.log('📥 New service request received');

  try {
    // Validate required fields
    const { clientName, commercialRegisterNumber, contactPerson, email, phone, location, additionalInfo, requiredJobs } = req.body;

    if (!clientName || !contactPerson || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: "Client name, contact person, email, and phone are required"
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

    // Format jobs list
    let jobsHtml = '';
    if (requiredJobs && requiredJobs.length > 0) {
      jobsHtml = requiredJobs.map((job, index) => `
Job #${index + 1}:
- Position: ${job.finalPosition || job.position}
- Type: ${job.type || 'Not specified'}
- Quantity: ${job.quantity}
- Nationality: ${job.finalNationality || job.nationality}
      `).join('\n');
    } else {
      jobsHtml = 'No specific jobs listed';
    }

    // Prepare subject and message content
    const emailSubject = `New Service Request - ${clientName}`;
    const emailText = `
NEW SERVICE REQUEST
-------------------

Client Information:
Client Name: ${clientName}
Commercial Register: ${commercialRegisterNumber || 'Not provided'}
Contact Person: ${contactPerson}
Email: ${email}
Phone: ${phone}
Location: ${location || 'Not provided'}

Job Requirements:
${jobsHtml}

Additional Information:
${additionalInfo || 'None'}

Submitted on: ${new Date().toLocaleString()}
    `;

    // Return success immediately
    res.status(200).json({
      success: true,
      message: "Service request submitted successfully"
    });

    // Background tasks: Admin notification + Auto-reply
    (async () => {
      try {
        // Send admin email
        await emailService.sendAdminEmail({
          subject: emailSubject,
          text: emailText
        });

        // Add delay between emails
        await emailService.addEmailDelay();

        // Send auto-reply
        await emailService.sendAutoReply({
          to: email,
          name: contactPerson,
          formType: 'service-request'
        });
      } catch (error) {
        console.error('❌ Background service request email failed:', error.message);
      }
    })();

    return;

  } catch (error) {
    console.error('❌ Service request error:', error);
    res.status(500).json({
      success: false,
      message: "Unable to submit request. Please try again later."
    });
  }
};

module.exports = {
  sendEmail,
  sendServiceRequest
};
