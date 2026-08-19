const express = require('express');
const router = express.Router();
const JobApplication = require('../models/JobApplication');

// GET /api/analytics/job-applications/total
// Optional query params:
// - windowDays: number of days to look back (integer)
// - jobId: filter by job posting id
router.get('/job-applications/total', async (req, res) => {
  try {
    const { windowDays, jobId } = req.query || {};
    const filter = {};
    if (jobId) filter.jobPostingId = jobId;
    if (windowDays) {
      const days = parseInt(windowDays, 10) || 0;
      if (days > 0) {
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        filter.createdAt = { $gte: since };
      }
    }

    const total = await JobApplication.countDocuments(filter);
    return res.json({ total });
  } catch (err) {
    console.error('GET /api/analytics/job-applications/total error', err);
    return res.status(500).json({ message: 'Failed to compute analytics', error: String(err) });
  }
});

module.exports = router;
