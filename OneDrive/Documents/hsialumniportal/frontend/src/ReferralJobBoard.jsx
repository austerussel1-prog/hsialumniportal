import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Sidebar from './components/Sidebar';

const USER_POSTED_JOBS_KEY = 'hsi_user_job_posts';

function getStoredJobs() {
  try {
    const raw = localStorage.getItem(USER_POSTED_JOBS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

export default function ReferralJobBoard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [jobs, setJobs] = useState(getStoredJobs);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [jobForm, setJobForm] = useState({ company: '', position: '', location: '' });
  const [freelanceForm, setFreelanceForm] = useState({
    company: '',
    position: '',
    location: '',
    type: 'Project-based',
  });

  const handlePostJob = (event) => {
    event.preventDefault();
    if (!jobForm.company || !jobForm.position || !jobForm.location) {
      return;
    }

    const postedJob = {
      id: Date.now(),
      category: 'exclusive',
      company: jobForm.company,
      position: jobForm.position,
      location: jobForm.location,
      applyLink: `mailto:hr@hsi.com?subject=Application%20-%20${encodeURIComponent(jobForm.position)}`,
    };

    setJobs((prev) => {
      const updated = [...prev, postedJob];
      localStorage.setItem(USER_POSTED_JOBS_KEY, JSON.stringify(updated));
      return updated;
    });

    setJobForm({ company: '', position: '', location: '' });
    setSuccessMessage('Job post published successfully.');
    setShowSuccessModal(true);
  };

  const handlePostFreelance = (event) => {
    event.preventDefault();
    if (!freelanceForm.company || !freelanceForm.position || !freelanceForm.location) {
      return;
    }

    const postedJob = {
      id: Date.now(),
      category: 'freelance',
      company: freelanceForm.company,
      position: freelanceForm.position,
      location: freelanceForm.location,
      type: freelanceForm.type,
      status: 'Open',
      description: 'Flexible opportunity suited for independent and project-based contributors.',
      applyLink: `mailto:hr@hsi.com?subject=Application%20-%20${encodeURIComponent(freelanceForm.position)}`,
    };

    setJobs((prev) => {
      const updated = [...prev, postedJob];
      localStorage.setItem(USER_POSTED_JOBS_KEY, JSON.stringify(updated));
      return updated;
    });

    setFreelanceForm({ company: '', position: '', location: '', type: 'Project-based' });
    setSuccessMessage('Freelance/project post published successfully.');
    setShowSuccessModal(true);
  };

  const exclusiveJobs = jobs.filter((job) => job.category === 'exclusive');
  const freelanceJobs = jobs.filter((job) => job.category === 'freelance');

  const cardStyle = {
    flex: 1,
    minWidth: '320px',
    background: '#fff',
    border: '1px solid #efe4d3',
    borderRadius: '12px',
    padding: '20px',
  };

  const inputStyle = {
    width: '100%',
    margin: '8px 0',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '13px',
  };

  return (
    <motion.div
      style={{ display: 'flex', minHeight: '100vh', background: '#f6f2ea' }}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      <Sidebar isOpen={sidebarOpen} toggle={() => setSidebarOpen(!sidebarOpen)} />

        <div style={{ flex: 1, padding: '30px 40px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
          <Link to="/training?category=exclusive" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '12px', fontWeight: '600' }}>
              {'< Back to Job Postings'}
            </Link>
            <h1 style={{ fontSize: '30px', marginTop: '10px', fontWeight: '800', color: '#111827' }}>Referral Job Board</h1>
            <p style={{ color: '#6b7280', marginTop: '6px', fontStyle: 'italic' }}>
              Post openings, refer alumni members, and track submissions in one place.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <div style={cardStyle}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#b07a15' }}>Post a Job Opening</h2>
            <form onSubmit={handlePostJob}>
              <input
                value={jobForm.company}
                onChange={(e) => setJobForm((prev) => ({ ...prev, company: e.target.value }))}
                placeholder="Company Name"
                style={inputStyle}
              />
              <input
                value={jobForm.position}
                onChange={(e) => setJobForm((prev) => ({ ...prev, position: e.target.value }))}
                placeholder="Position"
                style={inputStyle}
              />
              <input
                value={jobForm.location}
                onChange={(e) => setJobForm((prev) => ({ ...prev, location: e.target.value }))}
                placeholder="Location"
                style={inputStyle}
              />
              <button type="submit" style={{ marginTop: '10px', background: '#e1aa18', color: '#111827', border: 'none', borderRadius: '8px', padding: '10px 18px', fontWeight: '700' }}>
                Post Job
              </button>
            </form>
          </div>

          <div style={cardStyle}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#b07a15' }}>Post Freelance / Project Opportunity</h2>
            <form onSubmit={handlePostFreelance}>
              <input
                value={freelanceForm.company}
                onChange={(e) => setFreelanceForm((prev) => ({ ...prev, company: e.target.value }))}
                placeholder="Company Name"
                style={inputStyle}
              />
              <input
                value={freelanceForm.position}
                onChange={(e) => setFreelanceForm((prev) => ({ ...prev, position: e.target.value }))}
                placeholder="Project Role"
                style={inputStyle}
              />
              <input
                value={freelanceForm.location}
                onChange={(e) => setFreelanceForm((prev) => ({ ...prev, location: e.target.value }))}
                placeholder="Location / Remote"
                style={inputStyle}
              />
              <select
                value={freelanceForm.type}
                onChange={(e) => setFreelanceForm((prev) => ({ ...prev, type: e.target.value }))}
                style={inputStyle}
              >
                <option>Project-based</option>
                <option>Short-term</option>
              </select>
              <button type="submit" style={{ marginTop: '10px', background: '#e1aa18', color: '#111827', border: 'none', borderRadius: '8px', padding: '10px 18px', fontWeight: '700' }}>
                Post Freelance Job
              </button>
            </form>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          <div style={cardStyle}>
            <h3 style={{ fontSize: '16px', marginBottom: '10px', fontWeight: '800', color: '#111827' }}>Posted Jobs</h3>
            {exclusiveJobs.length === 0 ? (
              <p style={{ color: '#6b7280', fontStyle: 'italic', fontSize: '13px' }}>
                No job posts yet. Submit a job opening to display it here.
              </p>
            ) : (
              exclusiveJobs.map((job) => (
                <div key={job.id} style={{ borderTop: '1px solid #efe4d3', padding: '8px 0' }}>
                  <div style={{ fontWeight: '700', fontSize: '14px' }}>{job.position}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{job.company} - {job.location}</div>
                </div>
              ))
            )}
          </div>
          <div style={cardStyle}>
            <h3 style={{ fontSize: '16px', marginBottom: '10px', fontWeight: '800', color: '#111827' }}>Freelance / Project Posts</h3>
            {freelanceJobs.length === 0 ? (
              <p style={{ color: '#6b7280', fontStyle: 'italic', fontSize: '13px' }}>
                No freelance posts yet. Posted project roles will appear here.
              </p>
            ) : (
              freelanceJobs.map((job) => (
                <div key={job.id} style={{ borderTop: '1px solid #efe4d3', padding: '8px 0' }}>
                  <div style={{ fontWeight: '700', fontSize: '14px' }}>{job.position}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{job.company} - {job.location} - {job.type || 'Project-based'}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showSuccessModal ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(17, 24, 39, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 40,
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              style={{
                width: '100%',
                maxWidth: '360px',
                background: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #efe4d3',
                padding: '20px',
                textAlign: 'center',
              }}
            >
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#111827' }}>Success</h3>
              <p style={{ marginTop: '8px', fontSize: '13px', color: '#4b5563' }}>{successMessage}</p>
              <button
                onClick={() => setShowSuccessModal(false)}
                style={{
                  marginTop: '14px',
                  background: '#e1aa18',
                  color: '#111827',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 18px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                OK
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
