const express = require('express');
const multer = require('multer');
const { sendJobApplicationEmail } = require('../services/emailService');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

router.post('/', upload.single('resume'), async (req, res) => {
  try {
    const {
      name,
      email,
      phone = '',
      mobile,
      startDate,
      coverLetter = '',
      jobId = '',
      jobTitle = '',
      company = '',
    } = req.body || {};

    if (!name || !email || !mobile || !startDate) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Resume file is required.' });
    }

    await sendJobApplicationEmail({
      applicant: { name, email, phone, mobile, startDate, coverLetter },
      job: { jobId, jobTitle, company },
      resume: {
        filename: req.file.originalname,
        content: req.file.buffer,
        contentType: req.file.mimetype,
      },
    });

    return res.json({ message: 'Application submitted successfully.' });
  } catch (error) {
    console.error('POST /api/job-applications error', error);
    return res.status(500).json({
      message: 'Failed to submit application.',
      error: error.message,
    });
  }
});

module.exports = router;

