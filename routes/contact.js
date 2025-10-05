const express = require('express');
const nodemailer = require('nodemailer');
const Joi = require('joi');

const router = express.Router();

// Validation schema for contact form
const contactSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().min(10).max(15).required(),
  schoolName: Joi.string().min(2).max(200).required(),
  designation: Joi.string().max(100).optional().allow(''),
  description: Joi.string().max(1000).optional().allow('')
});

// Create nodemailer transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail', // Use Gmail service
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Send contact email
router.post('/send', async (req, res) => {
  try {
    // Validate request body
    const { error, value } = contactSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const { name, email, phone, schoolName, designation, description } = value;

    // Create transporter
    const transporter = createTransporter();

    // Email template
    const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Inquiry - Shikshan</title>
  <style>
    body {
      font-family: 'Segoe UI', Roboto, Arial, sans-serif;
      background-color: #f3f4f6;
      margin: 0;
      padding: 0;
      color: #111827;
    }

    .container {
      max-width: 640px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 6px 20px rgba(0,0,0,0.07);
      overflow: hidden;
    }

    .header {
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      color: #ffffff;
      text-align: center;
      padding: 35px 20px;
    }

    .header h1 {
      font-size: 24px;
      margin: 0 0 6px;
      font-weight: 700;
    }

    .header p {
      margin: 0;
      font-size: 15px;
      opacity: 0.9;
    }

    .content {
      padding: 35px 30px 25px;
      background: #f9fafb;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      background: #fff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }

    td {
      padding: 14px 16px;
      font-size: 15px;
      border-bottom: 1px solid #e5e7eb;
    }

    td.label {
      font-weight: 600;
      color: #374151;
      width: 35%;
      background: #f9fafb;
    }

    td.value {
      color: #1f2937;
      word-break: break-word;
    }

    td.value a {
      color: #2563eb;
      text-decoration: none;
    }

    td.value a:hover {
      text-decoration: underline;
    }

    .footer {
      background: #f3f4f6;
      padding: 22px 20px;
      text-align: center;
      font-size: 14px;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
    }

    .footer strong {
      color: #111827;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Shikshan Visitors</h1>
      <p>A prospective school has reached out via the Shikshan contact form</p>
    </div>

    <div class="content">
      <table>
        <tr>
          <td class="label">Full Name</td>
          <td class="value">${name}</td>
        </tr>
        ${designation ? `
        <tr>
          <td class="label">Designation</td>
          <td class="value">${designation}</td>
        </tr>` : ''}
        <tr>
          <td class="label">Email Address</td>
          <td class="value"><a href="mailto:${email}">${email}</a></td>
        </tr>
        <tr>
          <td class="label">Phone Number</td>
          <td class="value"><a href="tel:${phone}">${phone}</a></td>
        </tr>
        <tr>
          <td class="label">School / Institution</td>
          <td class="value">${schoolName}</td>
        </tr>
        ${description ? `
        <tr>
          <td class="label">Message</td>
          <td class="value">${description}</td>
        </tr>` : ''}
        <tr>
          <td class="label">Submitted On</td>
          <td class="value">${new Date().toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</td>
        </tr>
      </table>
    </div>

    <div class="footer">
      <p>This message was sent from <strong>Shikshan</strong>.</p>
      <p>Reach out to them within 24 hours for the best response rate!</p>
    </div>
  </div>
</body>
</html>
`;
    // Plain text version
    const textTemplate = `
New Contact Request - Shikshan

Name: ${name}
Email: ${email}
Phone: ${phone}
School Name: ${schoolName}
${designation ? `Designation: ${designation}` : ''}
${description ? `Description: ${description}` : ''}

Submitted At: ${new Date().toLocaleString('en-IN', { 
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})}

---
This message was sent from the Shikshan.
Reach out to them within 24 hours for the best response rate!
    `;

    // Email options
    const mailOptions = {
      from: `"Shikshan" <${process.env.EMAIL_USER}>`,
      to: 'shreeramkumar.ktr@gmail.com',
      subject: `[Shikshan] New Inquiry from ${name} (${schoolName})`,
      text: textTemplate,
      html: htmlTemplate,
      replyTo: email
    };

    // Send email
    await transporter.sendMail(mailOptions);

    console.log('Contact email sent successfully:', {
      to: 'shreeramkumar.ktr@gmail.com',
      from: email,
      school: schoolName,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Your message has been sent successfully!'
    });

  } catch (error) {
    console.error('Contact email error:', error);
    
    // Handle specific nodemailer errors
    if (error.code === 'EAUTH') {
      console.error('Email authentication failed. Please check EMAIL_USER and EMAIL_PASS in .env file');
    } else if (error.code === 'ECONNECTION') {
      console.error('Email connection failed. Please check EMAIL_HOST and EMAIL_PORT in .env file');
    }

    res.status(500).json({
      success: false,
      error: 'Failed to send message. Please try again later.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Test email configuration
router.get('/test', async (req, res) => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    
    res.json({
      success: true,
      message: 'Email configuration is working correctly'
    });
  } catch (error) {
    console.error('Email test error:', error);
    res.status(500).json({
      success: false,
      error: 'Email configuration test failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;