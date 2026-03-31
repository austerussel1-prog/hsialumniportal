const nodemailer = require('nodemailer');


const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

async function sendOTPEmail(email, otp) {
  const mailOptions = {
    from: `HSI Portal <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Verify your email address',
    html: `
      <h2>Email Verification</h2>
      <p>Your OTP code is:</p>
      <h1 style="letter-spacing:3px">${otp}</h1>
      <p>This code will expire in 10 minutes.</p>
    `,
  };

  try {
    console.log('📧 Sending email via Gmail...', { to: email });
    await transporter.sendMail(mailOptions);
    console.log('✅ Email sent');
  } catch (err) {
    console.error('❌ Nodemailer sendMail failed:', err.message);
    throw err;
  }
}

module.exports = sendOTPEmail;
