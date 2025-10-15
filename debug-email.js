const nodemailer = require('nodemailer');
require('dotenv').config();

async function testEmailConfiguration() {
  console.log('🔧 Testing Email Configuration...\n');
  
  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log(`EMAIL_HOST: ${process.env.EMAIL_HOST}`);
  console.log(`EMAIL_PORT: ${process.env.EMAIL_PORT}`);
  console.log(`EMAIL_USER: ${process.env.EMAIL_USER}`);
  console.log(`EMAIL_PASS: ${process.env.EMAIL_PASS ? '***hidden***' : 'NOT SET'}`);
  
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('❌ EMAIL_USER or EMAIL_PASS not set in environment variables');
    return;
  }

  try {
    // Create transporter
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    console.log('\n🔄 Testing transporter connection...');
    
    // Verify connection
    await transporter.verify();
    console.log('✅ Email transporter verified successfully');

    // Send test email
    console.log('\n🔄 Sending test email...');
    
    const testMailOptions = {
      from: `"Shikshan Test" <${process.env.EMAIL_USER}>`,
      to: 'shreeramkumar.ktr@gmail.com',
      subject: 'Test Email from Shikshan Backend',
      text: 'This is a test email to verify the email configuration is working.',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #2563eb;">Email Test Successful!</h2>
          <p>This is a test email from your Shikshan backend.</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</p>
        </div>
      `
    };

    const info = await transporter.sendMail(testMailOptions);
    console.log('✅ Test email sent successfully');
    console.log('📧 Message ID:', info.messageId);
    console.log('📤 Response:', info.response);

  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    
    if (error.code === 'EAUTH') {
      console.error('🔧 Authentication failed. Check your EMAIL_USER and EMAIL_PASS');
      console.error('💡 Make sure you\'re using an App Password for Gmail, not your regular password');
    } else if (error.code === 'ECONNECTION') {
      console.error('🔧 Connection failed. Check your internet connection and email settings');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('🔧 Connection timed out. Check your network connection');
    }
    
    console.error('Full error:', error);
  }
}

testEmailConfiguration();