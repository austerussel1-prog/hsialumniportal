const express = require('express');
const User = require('../models/User');
const { sendOTP } = require('../services/emailService');
const { logAuditEvent, getClientIp } = require('../utils/auditLogger');

const router = express.Router();


function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}


router.post('/send-otp', async (req, res) => {
  try {
    const rawEmail = String(req.body?.email || '').trim().toLowerCase();
    const rawName = String(req.body?.name || '').trim();
    const rawUsername = String(req.body?.username || '').trim();
    const { password, consent } = req.body;
    const termsAccepted = Boolean(consent?.termsAccepted);
    const privacyAccepted = Boolean(consent?.privacyAccepted);
    const termsVersion = typeof consent?.termsVersion === 'string' ? consent.termsVersion : 'v1.0';
    const privacyVersion = typeof consent?.privacyVersion === 'string' ? consent.privacyVersion : 'v1.0';

    if (!rawEmail || !rawName || !rawUsername || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (!termsAccepted || !privacyAccepted) {
      return res.status(400).json({ message: 'Terms and Privacy Policy consent is required' });
    }


    const existingUsername = await User.findOne({ username: rawUsername });
    if (existingUsername && existingUsername.email !== rawEmail) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    const existingUser = await User.findByEmail(rawEmail);
    if (existingUser && existingUser.status !== 'pending' && existingUser.status !== 'rejected') {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); 

    const consentRecord = {
      termsAccepted: true,
      privacyAccepted: true,
      termsVersion,
      privacyVersion,
      acceptedAt: new Date(),
      source: 'register_form',
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'] || '',
    };

    if (existingUser) {
      existingUser.name = rawName;
      existingUser.password = password;
      existingUser.otp = otp;
      existingUser.otpExpiry = otpExpiry;
      existingUser.username = rawUsername;
      existingUser.status = 'pending'; // Reset status to pending for retry
      existingUser.registrationVerifiedAt = null;
      existingUser.consent = consentRecord;
      await existingUser.save();
    } else {
      const tempUser = new User({
        email: rawEmail,
        name: rawName,
        username: rawUsername,
        password,
        otp,
        otpExpiry,
        status: 'pending',
        registrationVerifiedAt: null,
        consent: consentRecord,
      });
      await tempUser.save();
    }

    await sendOTP(rawEmail, otp);

    await logAuditEvent({
      req,
      actorEmail: rawEmail,
      action: 'REGISTER_OTP_SENT',
      entityType: 'User',
      entityId: rawEmail,
      status: 'success',
      metadata: { source: 'register_form' },
    });

    res.json({
         message: "OTP sent to your email"
       });
  } catch (err) {
    console.error('❌ Error in /send-otp:', err);
    await logAuditEvent({
      req,
      actorEmail: req.body?.email || '',
      action: 'REGISTER_OTP_SENT',
      entityType: 'User',
      entityId: req.body?.email || '',
      status: 'failure',
      metadata: { error: err.message },
    });
    res.status(500).json({ message: 'Error sending OTP: ' + err.message });
  }
});


router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

  
    const user = await User.findByEmail(email);
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or OTP' });
    }

 
    if (user.otpExpiry < new Date()) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }


    if (user.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }


    user.otp = undefined;
    user.otpExpiry = undefined;
    user.status = 'pending';
    user.registrationVerifiedAt = new Date();

    await user.save();

    await logAuditEvent({
      req,
      actorId: user._id,
      actorEmail: user.email,
      action: 'REGISTER_OTP_VERIFIED',
      entityType: 'User',
      entityId: String(user._id),
      status: 'success',
    });

    res.json({ 
      message: 'Registration successful! Your account is pending admin approval.',
      status: 'pending'
    });
  } catch (err) {
    console.error(err);
    await logAuditEvent({
      req,
      actorEmail: req.body?.email || '',
      action: 'REGISTER_OTP_VERIFIED',
      entityType: 'User',
      entityId: req.body?.email || '',
      status: 'failure',
      metadata: { error: err.message },
    });
    res.status(500).json({ message: 'Error verifying OTP' });
  }
});

module.exports = router;
