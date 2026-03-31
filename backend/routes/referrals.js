const express = require('express');
const { sendReferralInvitationEmail } = require('../services/emailService');

const router = express.Router();

router.post('/send', async (req, res) => {
  try {
    const { email, jobLink, message } = req.body;

    if (!email || !jobLink) {
      return res.status(400).json({ message: 'Email and job link are required.' });
    }

    await sendReferralInvitationEmail(email, jobLink, message || '');
    return res.json({ message: 'Referral invitation sent successfully.' });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to send referral invitation.',
      error: error.message,
    });
  }
});

module.exports = router;
