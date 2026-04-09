import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Link, useLocation, useParams } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import { API_URL, apiEndpoints } from './config/api';

const USER_POSTED_JOBS_KEY = 'hsi_user_job_posts';
const MAX_RESUME_BYTES = 10 * 1024 * 1024;
const ALLOWED_RESUME_EXTENSIONS = ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg'];

function getStoredJobs() {
  try {
    const raw = localStorage.getItem(USER_POSTED_JOBS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function parseJobId(jobId) {
  if (!jobId) return null;
  const numeric = Number(jobId);
  if (Number.isFinite(numeric)) return numeric;
  return jobId;
}

function validateResumeFile(file) {
  if (!file) {
    return 'Resume file is required.';
  }

  const extension = String(file.name || '').split('.').pop()?.toLowerCase() || '';
  if (!ALLOWED_RESUME_EXTENSIONS.includes(extension)) {
    return 'Resume must be a PDF, DOC, DOCX, PNG, JPG, or JPEG file.';
  }

  if (typeof file.size === 'number' && file.size > MAX_RESUME_BYTES) {
    return 'Resume file must be 10 MB or smaller.';
  }

  return '';
}

export default function JobApplicationForm() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 900;
  });
  const params = useParams();
  const location = useLocation();

  const jobId = useMemo(() => {
    const stateJobId = parseJobId(location.state && location.state.jobId ? String(location.state.jobId) : null);
    if (stateJobId !== null) return stateJobId;
    const fromParams = parseJobId(params.jobId);
    if (fromParams !== null) return fromParams;
    const search = new URLSearchParams(location.search);
    return parseJobId(search.get('id'));
  }, [location.search, location.state, params.jobId]);
  const [remoteJob, setRemoteJob] = useState(null);

  const job = useMemo(() => {
    if (jobId === null) return null;
    const stored = getStoredJobs();
    const localJob = stored.find((item) => String(item.id || item._id) === String(jobId)) || null;
    return localJob || remoteJob;
  }, [jobId, remoteJob]);

  useEffect(() => {
    let mounted = true;

    async function fetchRemoteJob() {
      if (jobId === null) return;
      const hasLocal = getStoredJobs().some((item) => String(item.id || item._id) === String(jobId));
      if (hasLocal) return;

      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const response = await fetch(apiEndpoints.jobById(encodeURIComponent(String(jobId))), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data?.job || !mounted) return;
        setRemoteJob({ ...data.job, id: data.job.id || data.job._id });
      } catch (_error) {
        // no-op
      }
    }

    fetchRemoteJob();
    return () => {
      mounted = false;
    };
  }, [jobId]);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    mobile: '',
    startDate: '',
    coverLetter: '',
    resumeFile: null,
  });
  const [touched, setTouched] = useState({});
  const [hoverButton, setHoverButton] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return undefined;
    const timeoutId = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timeoutId);
  }, [toast]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const requiredMissing = {
    name: !form.name.trim(),
    email: !form.email.trim(),
    startDate: !form.startDate,
    mobile: !form.mobile.trim(),
    resumeFile: !form.resumeFile,
  };

  const hasErrors = Object.values(requiredMissing).some(Boolean);

  const submitToBackend = async () => {
    setSubmitting(true);
    setSubmitError('');

    const resumeError = validateResumeFile(form.resumeFile);
    if (resumeError) {
      setSubmitError(resumeError);
      setSubmitting(false);
      return;
    }

    try {
      const payload = new FormData();
      payload.append('name', form.name);
      payload.append('email', form.email);
      payload.append('phone', form.phone || '');
      payload.append('mobile', form.mobile);
      payload.append('startDate', form.startDate);
      payload.append('coverLetter', form.coverLetter || '');
      if (jobId !== null) payload.append('jobId', String(jobId));
      if (job?.position) payload.append('jobTitle', job.position);
      if (job?.company) payload.append('company', job.company);
      payload.append('resume', form.resumeFile);

      const response = await fetch(apiEndpoints.submitJobApplication || `${API_URL}/api/job-applications`, {
        method: 'POST',
        body: payload,
      });

      const rawText = await response.text().catch(() => '');
      const data = rawText ? (() => {
        try {
          return JSON.parse(rawText);
        } catch (_error) {
          return null;
        }
      })() : null;

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Application service not found (404). Please restart the backend and try again.');
        }
        throw new Error(
          (data && (data.error || data.message))
            ? (data.error || data.message)
            : `Failed to submit application (HTTP ${response.status}).`,
        );
      }

      setToast({
        id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        type: 'success',
        text: 'Application submitted successfully.',
      });
      setForm({
        name: '',
        email: '',
        phone: '',
        mobile: '',
        startDate: '',
        coverLetter: '',
        resumeFile: null,
      });
      setTouched({});
    } catch (error) {
      const isNetworkError = error instanceof TypeError && /failed to fetch/i.test(String(error.message || ''));
      setSubmitError(
        isNetworkError
          ? 'Upload failed before the server responded. Check your internet connection and make sure the resume file is 10 MB or smaller.'
          : (error.message || 'Failed to submit application.'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = (event) => {
    event.preventDefault();
    setSubmitError('');
    setTouched({ name: true, email: true, startDate: true, mobile: true, resumeFile: true });
    if (hasErrors) return;
    submitToBackend();
  };

  const inputShell = {
    width: '100%',
    height: '42px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    padding: '0 14px',
    fontSize: '14px',
    outline: 'none',
    background: '#fff',
    boxShadow: '0 8px 18px rgba(17, 24, 39, 0.08)',
  };

  const labelStyle = { fontSize: '14px', fontWeight: '700', color: '#111827' };
  const helperStyle = { marginTop: '6px', fontSize: '12px', color: '#9ca3af' };
  const toastNode = toast && typeof document !== 'undefined'
    ? createPortal(
      <div
        style={{
          position: 'fixed',
          top: 16,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          zIndex: 9999,
          pointerEvents: 'none',
          padding: isMobile ? '0 20px' : '0 12px',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            background: '#dcfce7',
            border: '1px solid #bbf7d0',
            borderRadius: 12,
            boxShadow: '0 10px 18px rgba(17, 24, 39, 0.10)',
          }}
        >
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 999,
              background: '#22c55e',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#065f46' }}>
            {toast.text}
          </div>
        </div>
      </div>,
      document.body,
    )
    : null;

  return (
    <>
      {toastNode}
      <motion.div
        style={{ display: 'flex', minHeight: '100vh', background: '#ffffff' }}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.3 }}
      >
        <style>{`
          /* Matches the drop-down toast feel from Events & Community */
          @keyframes fillBounce {
            from { transform: scaleX(0); }
            to { transform: scaleX(1); }
          }
        `}</style>


        <Sidebar isOpen={sidebarOpen} toggle={() => setSidebarOpen(!sidebarOpen)} />

        <div style={{ flex: 1, padding: isMobile ? '76px 10px 18px' : '22px 30px 40px' }}>
          <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
            <div>
            <Link
              to={jobId !== null ? `/career/job-details/${encodeURIComponent(String(jobId))}` : '/training'}
              style={{ textDecoration: 'none', color: '#6b7280', fontSize: isMobile ? '12px' : '13px', fontWeight: '800', display: 'inline-block', marginBottom: '8px' }}
            >
              {'< Back'}
            </Link>

            <div style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: '900', color: '#d6a91b' }}>Job Application Form</div>
            <div style={{ height: '1px', background: '#e5e7eb', marginTop: '14px' }} />
            {job ? (
              <div style={{ marginTop: '10px', fontSize: isMobile ? '12px' : '13px', color: '#6b7280' }}>
                Applying for: <span style={{ color: '#111827', fontWeight: '800' }}>{job.position}</span> ({job.company})
              </div>
            ) : null}
          </div>

            <form onSubmit={onSubmit} style={{ marginTop: isMobile ? '18px' : '44px' }}>
              <div style={{ maxWidth: isMobile ? '100%' : '820px', margin: '0 auto', display: 'grid', gap: isMobile ? '16px' : '28px' }}>
              <div style={{ display: 'grid', gap: '10px' }}>
                <div style={labelStyle}>
                  Your Name <span style={{ color: '#ef4444' }}>*</span>
                </div>
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  onBlur={() => setTouched((p) => ({ ...p, name: true }))}
                  style={{
                    ...inputShell,
                    borderColor: touched.name && requiredMissing.name ? '#ef4444' : '#d1d5db',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '16px' : '34px' }}>
                <div style={{ display: 'grid', gap: '10px' }}>
                  <div style={labelStyle}>
                    Email <span style={{ color: '#ef4444' }}>*</span>
                  </div>
                  <input
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    onBlur={() => setTouched((p) => ({ ...p, email: true }))}
                    placeholder="yourname@gmail.com"
                    style={{
                      ...inputShell,
                      borderColor: touched.email && requiredMissing.email ? '#ef4444' : '#d1d5db',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gap: '10px' }}>
                  <div style={labelStyle}>Phone Number</div>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="(02) 0000 0000"
                    style={inputShell}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '16px' : '34px' }}>
                <div style={{ display: 'grid', gap: '10px' }}>
                  <div style={labelStyle}>
                    Earliest Possible Start Date <span style={{ color: '#ef4444' }}>*</span>
                  </div>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                    onBlur={() => setTouched((p) => ({ ...p, startDate: true }))}
                    style={{
                      ...inputShell,
                      borderColor: touched.startDate && requiredMissing.startDate ? '#ef4444' : '#d1d5db',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gap: '10px' }}>
                  <div style={labelStyle}>
                    Mobile Number <span style={{ color: '#ef4444' }}>*</span>
                  </div>
                  <input
                    value={form.mobile}
                    onChange={(e) => setForm((p) => ({ ...p, mobile: e.target.value }))}
                    onBlur={() => setTouched((p) => ({ ...p, mobile: true }))}
                    placeholder="+63 0000000000"
                    style={{
                      ...inputShell,
                      borderColor: touched.mobile && requiredMissing.mobile ? '#ef4444' : '#d1d5db',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gap: '10px' }}>
                <div style={labelStyle}>Cover Letter</div>
                <textarea
                  value={form.coverLetter}
                  onChange={(e) => setForm((p) => ({ ...p, coverLetter: e.target.value }))}
                  rows={5}
                  style={{
                    width: '100%',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    padding: '12px 14px',
                    fontSize: '14px',
                    outline: 'none',
                    background: '#fff',
                    boxShadow: '0 8px 18px rgba(17, 24, 39, 0.08)',
                    resize: 'vertical',
                  }}
                />
                <div style={helperStyle}>Please do not exceed 200 words</div>
              </div>

              <div style={{ display: 'grid', gap: '10px' }}>
                <div style={labelStyle}>
                  Upload Resume <span style={{ color: '#ef4444' }}>*</span>
                </div>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={(e) => {
                    const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
                    setForm((p) => ({ ...p, resumeFile: file }));
                    setTouched((p) => ({ ...p, resumeFile: true }));
                    setSubmitError(file ? validateResumeFile(file) : '');
                  }}
                  style={{
                    ...inputShell,
                    height: '48px',
                    padding: '10px 12px',
                    borderColor: touched.resumeFile && requiredMissing.resumeFile ? '#ef4444' : '#d1d5db',
                  }}
                />
                <div style={helperStyle}>Accepted: PDF, DOC, DOCX, PNG, JPG, JPEG. Max 10 MB.</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={submitting}
                  onMouseEnter={() => setHoverButton('submit')}
                  onMouseLeave={() => setHoverButton(null)}
                  style={{
                    height: isMobile ? '38px' : '44px',
                    padding: isMobile ? '0 18px' : '0 26px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#d6a91b',
                    color: '#ffffff',
                    fontSize: isMobile ? '12px' : '14px',
                    fontWeight: '900',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    opacity: submitting ? 0.85 : 1,
                  }}
                >
                  {hoverButton === 'submit' && !submitting ? (
                    <span
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        width: '100%',
                        height: '100%',
                        background: 'rgba(0, 0, 0, 0.15)',
                        borderRadius: '10px',
                        transform: 'scaleX(0)',
                        transformOrigin: 'left',
                        animation: 'fillBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      }}
                    />
                  ) : null}
                  <span style={{ position: 'relative', zIndex: 1 }}>{submitting ? 'Submitting...' : 'Submit'}</span>
                </button>
              </div>

              {submitError ? (
                <div style={{ color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '10px 12px', fontSize: '13px' }}>
                  {submitError}
                </div>
              ) : null}
              </div>
            </form>
          </div>
        </div>
      </motion.div>
    </>
  );
}
