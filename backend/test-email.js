const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const nodemailer = require('nodemailer');

console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '***set***' : 'NOT SET');
console.log('Testing email connection...\n');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});


transporter.verify(function (error, success) {
  if (error) {
    console.log('❌ Connection failed:', error.message);
    console.log('\nFull error:', error);
  } else {
    console.log('✅ Server is ready to send emails');
    

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, 
      subject: 'Test Email - HSI Alumni Portal',
      text: 'This is a test email to verify the email service is working.',
    };
    
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.log('❌ Failed to send test email:', err.message);
      } else {
        console.log('✅ Test email sent successfully!');
        console.log('Message ID:', info.messageId);
      }
      process.exit(0);
    });
  }
});
