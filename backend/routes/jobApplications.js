const express = require('express');
const multer = require('multer');
const { sendJobApplicationEmail } = require('../services/emailService');
const fs = require('fs');
const path = require('path');
const JobApplication = require('../models/JobApplication');

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

    // persist resume to uploads/job-applications
    const uploadsDir = path.join(__dirname, '..', 'uploads', 'job-applications');
    try {
      fs.mkdirSync(uploadsDir, { recursive: true });
    } catch (err) {
      // ignore
    }
    const timestamp = Date.now();
    const safeFilename = `${timestamp}-${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const savePath = path.join(uploadsDir, safeFilename);
    try {
      fs.writeFileSync(savePath, req.file.buffer);
    } catch (err) {
      console.error('Failed to save resume file:', err);
    }

    // record application in database
    try {
      await JobApplication.create({
        name,
        email,
        phone,
        mobile,
        startDate,
        coverLetter,
        jobPostingId: jobId || undefined,
        jobTitle,
        company,
        resumePath: `uploads/job-applications/${safeFilename}`,
      });
    } catch (dbErr) {
      console.error('Failed to persist job application:', dbErr);
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

