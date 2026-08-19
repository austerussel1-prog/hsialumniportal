const express = require('express');
const multer = require('multer');
const JobApplication = require('../models/JobApplication');
const { verifyToken } = require('./auth');
const { sendJobApplicationEmail } = require('../services/emailService');

const router = express.Router();
const ADMIN_ROLES = ['super_admin', 'admin', 'hr', 'alumni_officer'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

function ensureAdminAccess(req, res, next) {
  const role = req.user?.role;
  if (!role || !ADMIN_ROLES.includes(role)) {
    return res.status(403).json({ message: 'Admin access required.' });
  }
  return next();
}

router.get('/', verifyToken, ensureAdminAccess, async (req, res) => {
  try {
    const { jobId = '', status = '', search = '' } = req.query || {};
    const filter = {};

    if (jobId) filter.jobId = String(jobId);
    if (status) filter.status = String(status);
    if (search) {
      const term = String(search).trim();
      if (term) {
        filter.$or = [
          { name: { $regex: term, $options: 'i' } },
          { email: { $regex: term, $options: 'i' } },
          { jobTitle: { $regex: term, $options: 'i' } },
          { company: { $regex: term, $options: 'i' } },
        ];
      }
    }

    const applications = await JobApplication.find(filter).sort({ createdAt: -1, _id: -1 }).lean();
    return res.json({ applications });
  } catch (error) {
    console.error('GET /api/job-applications error', error);
    return res.status(500).json({ message: 'Failed to fetch job applications.' });
  }
});

router.patch('/:id/status', verifyToken, ensureAdminAccess, async (req, res) => {
  try {
    const { status } = req.body || {};
    const allowedStatuses = ['pending', 'reviewed', 'approved', 'rejected'];
    const nextStatus = String(status || '').trim().toLowerCase();

    if (!allowedStatuses.includes(nextStatus)) {
      return res.status(400).json({ message: 'Invalid status value.' });
    }

    const application = await JobApplication.findByIdAndUpdate(
      req.params.id,
      { $set: { status: nextStatus } },
      { new: true }
    ).lean();

    if (!application) {
      return res.status(404).json({ message: 'Application not found.' });
    }

    return res.json({ message: 'Application status updated.', application });
  } catch (error) {
    console.error('PATCH /api/job-applications/:id/status error', error);
    return res.status(500).json({ message: 'Failed to update application status.' });
  }
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

    const application = await JobApplication.create({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      phone: String(phone || '').trim(),
      mobile: String(mobile || '').trim(),
      startDate: String(startDate || '').trim(),
      coverLetter: String(coverLetter || '').trim(),
      jobId: String(jobId || '').trim(),
      jobTitle: String(jobTitle || '').trim(),
      company: String(company || '').trim(),
      resumeFileName: req.file.originalname,
      resumeMimeType: req.file.mimetype,
      resumeBuffer: req.file.buffer,
    });

    await sendJobApplicationEmail({
      applicant: { name, email, phone, mobile, startDate, coverLetter },
      job: { jobId, jobTitle, company },
      resume: {
        filename: req.file.originalname,
        content: req.file.buffer,
        contentType: req.file.mimetype,
      },
    });

    return res.status(201).json({ message: 'Application submitted successfully.', applicationId: application._id });
  } catch (error) {
    console.error('POST /api/job-applications error', error);
    return res.status(500).json({
      message: 'Failed to submit application.',
      error: error.message,
    });
  }
});

module.exports = router;

