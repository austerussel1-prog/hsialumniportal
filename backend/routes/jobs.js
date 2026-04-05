const express = require('express');
const JobPosting = require('../models/JobPosting');
const User = require('../models/User');
const { verifyToken } = require('./auth');

const router = express.Router();

const ADMIN_ROLES = ['super_admin', 'superadmin', 'admin', 'hr', 'alumni_officer'];
const ALLOWED_CATEGORIES = ['exclusive', 'freelance', 'internship', 'part-time', 'contract'];

function normalizeLineList(value) {
  if (Array.isArray(value)) return value.map((x) => String(x || '').trim()).filter(Boolean);
  if (typeof value === 'string') {
    return value.split('\n').map((x) => x.trim()).filter(Boolean);
  }
  return [];
}

function sanitizePayload(payload = {}) {
  const categoryRaw = String(payload.category || 'exclusive').trim().toLowerCase();
  const category = ALLOWED_CATEGORIES.includes(categoryRaw) ? categoryRaw : 'exclusive';
  const company = String(payload.company || '').trim();
  const position = String(payload.position || '').trim();
  const location = String(payload.location || '').trim();
  const type = String(payload.type || '').trim();

  return {
    category,
    company,
    position,
    location,
    type,
    status: String(payload.status || 'Open').trim() || 'Open',
    applyLink: String(payload.applyLink || '').trim(),
    description: String(payload.description || '').trim(),
    department: String(payload.department || 'General').trim() || 'General',
    role: String(payload.role || 'Staff').trim() || 'Staff',
    tag: String(payload.tag || 'Standard').trim() || 'Standard',
    workMode: String(payload.workMode || '').trim(),
    experience: String(payload.experience || '').trim(),
    vacancies: String(payload.vacancies || '').trim(),
    salary: String(payload.salary || '').trim(),
    aboutCompany: String(payload.aboutCompany || '').trim(),
    jobDescription: String(payload.jobDescription || '').trim(),
    requirements: normalizeLineList(payload.requirements),
    responsibilities: normalizeLineList(payload.responsibilities),
  };
}

async function ensureAdmin(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select('role').lean();
    if (!user || !ADMIN_ROLES.includes(user.role)) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    req.adminUser = user;
    return next();
  } catch (error) {
    return res.status(500).json({ message: 'Failed to validate admin access' });
  }
}

router.get('/_route_check', (req, res) => {
  res.json({ ok: true, router: 'jobs' });
});

router.get('/', verifyToken, async (req, res) => {
  try {
    const status = String(req.query.status || '').trim();
    const category = String(req.query.category || '').trim().toLowerCase();
    const query = {};
    if (status) query.status = status;
    if (category && ALLOWED_CATEGORIES.includes(category)) query.category = category;

    const jobs = await JobPosting.find(query).sort({ createdAt: -1, _id: -1 }).lean();
    return res.json({ jobs });
  } catch (error) {
    console.error('GET /api/jobs error', error);
    return res.status(500).json({ message: 'Failed to fetch jobs' });
  }
});

router.get('/:id', verifyToken, async (req, res) => {
  try {
    const job = await JobPosting.findById(req.params.id).lean();
    if (!job) return res.status(404).json({ message: 'Job not found' });
    return res.json({ job });
  } catch (error) {
    console.error('GET /api/jobs/:id error', error);
    return res.status(500).json({ message: 'Failed to fetch job' });
  }
});

router.post('/', verifyToken, ensureAdmin, async (req, res) => {
  try {
    const payload = sanitizePayload(req.body || {});
    if (!payload.company || !payload.position || !payload.location) {
      return res.status(400).json({ message: 'company, position, and location are required' });
    }

    const resolvedType = payload.type || (
      payload.category === 'freelance' ? 'Project-based'
        : payload.category === 'internship' ? 'Internship/OJT'
          : payload.category === 'part-time' ? 'Part-time'
            : payload.category === 'contract' ? 'Contract'
              : 'Full-time'
    );

    const job = await JobPosting.create({
      ...payload,
      type: resolvedType,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    });

    return res.status(201).json({ message: 'Job posted', job });
  } catch (error) {
    console.error('POST /api/jobs error', error);
    return res.status(500).json({ message: 'Failed to post job' });
  }
});

router.patch('/:id', verifyToken, ensureAdmin, async (req, res) => {
  try {
    const payload = sanitizePayload(req.body || {});
    const update = {
      ...payload,
      updatedBy: req.user.id,
      updatedAt: new Date(),
    };

    const job = await JobPosting.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, runValidators: true }
    ).lean();

    if (!job) return res.status(404).json({ message: 'Job not found' });
    return res.json({ message: 'Job updated', job });
  } catch (error) {
    console.error('PATCH /api/jobs/:id error', error);
    return res.status(500).json({ message: 'Failed to update job' });
  }
});

router.delete('/:id', verifyToken, ensureAdmin, async (req, res) => {
  try {
    const job = await JobPosting.findById(req.params.id).select('_id').lean();
    if (!job) return res.status(404).json({ message: 'Job not found' });

    await JobPosting.deleteOne({ _id: job._id });
    return res.json({ message: 'Job deleted' });
  } catch (error) {
    console.error('DELETE /api/jobs/:id error', error);
    return res.status(500).json({ message: 'Failed to delete job' });
  }
});

module.exports = router;
