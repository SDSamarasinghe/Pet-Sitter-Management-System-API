#!/bin/bash

# 🔧 Email SMTP Test Script
echo "📧 Testing SMTP Connection for Whiskarz Pet-Sitter API"
echo "============================================================"

# Create a simple Node.js test script
cat > email-test.js << 'EOF'
const nodemailer = require('nodemailer');
require('dotenv').config();

async function testEmail() {
  console.log('🔧 Email Configuration:');
  console.log('- Host:', process.env.MAIL_HOST);
  console.log('- Port:', process.env.MAIL_PORT);
  console.log('- User:', process.env.MAIL_USER);
  console.log('- Admin Email:', process.env.ADMIN_EMAIL);
  
  const transporter = nodemailer.createTransporter({
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT),
    secure: false,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  try {
    console.log('\n🔍 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!');
    
    console.log('\n📧 Sending test email...');
    const result = await transporter.sendMail({
      from: `"Whiskarz Test" <${process.env.MAIL_FROM}>`,
      to: process.env.ADMIN_EMAIL,
      subject: 'Test Email - Pet-Sitter Management System',
      html: `
        <h2>🎉 Email System Test Successful!</h2>
        <p>This is a test email from the Whiskarz Pet-Sitter Management System.</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        <p><strong>Configuration:</strong></p>
        <ul>
          <li>Host: ${process.env.MAIL_HOST}</li>
          <li>Port: ${process.env.MAIL_PORT}</li>
          <li>User: ${process.env.MAIL_USER}</li>
        </ul>
        <p>If you received this email, the email system is working correctly! 🚀</p>
      `,
    });
    
    console.log('✅ Test email sent successfully!');
    console.log('📧 Message ID:', result.messageId);
    console.log('📨 Check your inbox:', process.env.ADMIN_EMAIL);
    
  } catch (error) {
    console.error('❌ Email test failed:');
    console.error('Error:', error.message);
    if (error.code) {
      console.error('Error Code:', error.code);
    }
    if (error.response) {
      console.error('SMTP Response:', error.response);
    }
  }
}

testEmail();
EOF

echo "🚀 Running email test..."
node email-test.js

# Clean up
rm email-test.js

echo ""
echo "📋 If the test failed, check:"
echo "1. Gmail App Password is correct (not regular password)"
echo "2. 2-Factor Authentication is enabled on Gmail"
echo "3. 'Less secure app access' is enabled (if not using App Password)"
echo "4. Environment variables are loaded correctly"
echo ""
echo "🔧 To fix Gmail issues:"
echo "1. Go to Google Account settings"
echo "2. Enable 2-Factor Authentication"
echo "3. Generate App Password for 'Mail'"
echo "4. Use the App Password in MAIL_PASS variable"
