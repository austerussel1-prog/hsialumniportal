import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import { apiEndpoints } from './config/api';

const USER_POSTED_JOBS_KEY = 'hsi_user_job_posts';
const ADMIN_ROLES = ['super_admin', 'admin', 'hr', 'alumni_officer'];
const DEFAULT_ABOUT_COMPANY = `Highly Succeed is a Philippines-based IT servicing and product company specializing in a great variety of web-based services including graphic design, web development, custom application creation, and mobile application.

Mission
Aim High and Succeed at establishing a great culture of excellence among our associates with the purpose of providing exceptional solutions to our partners and customers.

Vision
Be successful in creating the finest technological solutions to transform and innovate lives.`;

function resolveAboutCompany(value) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) return DEFAULT_ABOUT_COMPANY;
  if (normalized.toLowerCase() === 'n/a') return DEFAULT_ABOUT_COMPANY;
  return normalized;
}

function renderAboutCompany(text) {
  const lines = String(text || '').split('\n');

  return lines.map((line, index) => {
    const trimmed = line.trim();
    const isHeading = trimmed === 'Mission' || trimmed === 'Vision';
    return (
      <React.Fragment key={`${index}-${trimmed}`}>
        {isHeading ? <strong style={{ color: '#111827' }}>{trimmed}</strong> : line}
        {index < lines.length - 1 ? '\n' : null}
      </React.Fragment>
    );
  });
}

function FacebookCircleIcon({ size = 64 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{ display: 'block' }} aria-hidden="true" focusable="false">
      <circle cx="32" cy="32" r="30" fill="#1877F2" />
      <path
        fill="#ffffff"
        d="M36.6 51V35.5h5.2l.8-6H36.6v-3.8c0-1.8.6-3 3.2-3h3.2v-5.4c-.6-.1-2.6-.3-4.9-.3-5 0-8.4 3-8.4 8.5v4.1h-5.6v6h5.6V51h7.9z"
      />
    </svg>
  );
}

function TwitterCircleIcon({ size = 64 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{ display: 'block' }} aria-hidden="true" focusable="false">
      <circle cx="32" cy="32" r="30" fill="#1DA1F2" />
      <path
        fill="#ffffff"
        d="M48.9 24.8c0 .5 0 1 0 1.5 0 15.1-11.5 23-23 23-4.6 0-8.9-1.3-12.5-3.6.6.1 1.3.1 1.9.1 3.8 0 7.2-1.3 10-3.4-3.6-.1-6.6-2.4-7.6-5.7.5.1 1 .1 1.6.1.7 0 1.5-.1 2.2-.3-3.7-.7-6.5-4-6.5-7.9v-.1c1.1.6 2.3 1 3.7 1-2.2-1.5-3.6-4-3.6-6.8 0-1.5.4-2.9 1.1-4.1 3.9 4.8 9.7 8 16.3 8.3-.1-.6-.2-1.2-.2-1.9 0-4.6 3.7-8.3 8.3-8.3 2.4 0 4.5 1 6 2.6 1.9-.4 3.7-1 5.2-2-.6 1.9-1.9 3.5-3.7 4.5 1.7-.2 3.2-.6 4.7-1.3-1.1 1.7-2.4 3.1-4 4.3z"
      />
    </svg>
  );
}

function LinkedInCircleIcon({ size = 64 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{ display: 'block' }} aria-hidden="true" focusable="false">
      <circle cx="32" cy="32" r="30" fill="#0A66C2" />
      <path fill="#ffffff" d="M21.2 27.1h7.1V49h-7.1V27.1z" />
      <path fill="#ffffff" d="M24.7 16.9c2.3 0 4.2 1.9 4.2 4.2 0 2.3-1.9 4.2-4.2 4.2-2.3 0-4.2-1.9-4.2-4.2 0-2.3 1.9-4.2 4.2-4.2z" />
      <path
        fill="#ffffff"
        d="M32.6 27.1h6.8v3h.1c.9-1.7 3.2-3.5 6.6-3.5 7.1 0 8.4 4.7 8.4 10.8V49h-7.1V38.6c0-2.5-.1-5.7-3.5-5.7-3.5 0-4 2.7-4 5.5V49h-7.1V27.1z"
      />
    </svg>
  );
}

function GmailMIcon({ size = 64 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{ display: 'block' }} aria-hidden="true" focusable="false">
      <circle cx="32" cy="32" r="32" fill="#ffffff" />
      <g fill="none" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 44V22" stroke="#4285F4" />
        <path d="M20 22L32 30" stroke="#EA4335" />
        <path d="M32 30L44 22" stroke="#FBBC05" />
        <path d="M44 22V44" stroke="#34A853" />
      </g>
    </svg>
  );
}

function HoverFill({ active, radius = '10px', alpha = 0.15 }) {
  if (!active) return null;
  return (
    <span
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        background: `rgba(0, 0, 0, ${alpha})`,
        borderRadius: radius,
        transform: 'scaleX(0)',
        transformOrigin: 'left',
        animation: 'fillBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    />
  );
}

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

function toLineList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function toMultiline(value) {
  return toLineList(value).join('\n');
}

export default function JobDetailsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 900;
  });
  const [jobVersion, setJobVersion] = useState(0);
  const [remoteJob, setRemoteJob] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editDraft, setEditDraft] = useState(null);
  const [hoverButton, setHoverButton] = useState(null);
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!editOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [editOpen]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const jobId = useMemo(() => {
    const fromParams = parseJobId(params.jobId);
    if (fromParams !== null) return fromParams;
    const search = new URLSearchParams(location.search);
    return parseJobId(search.get('id'));
  }, [location.search, params.jobId]);

  const job = useMemo(() => {
    if (jobId === null) return null;
    const stored = getStoredJobs();
    const localJob = stored.find((item) => String(item.id || item._id) === String(jobId)) || null;
    return localJob || remoteJob;
  }, [jobId, jobVersion, remoteJob]);

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

  const jobTitle = job?.position || 'Full stack developer';
  const company = job?.company || 'Highly Succeed Inc.';
  const jobLocation = job?.location || 'Mandaluyong City, Metro Manila';
  const jobType = job?.type
    || (job?.category === 'freelance'
      ? 'Project-based'
      : job?.category === 'internship'
        ? 'Internship/OJT'
        : job?.category === 'part-time'
          ? 'Part-time'
          : job?.category === 'contract'
            ? 'Contract'
            : 'Full-time');

  const workMode = job?.workMode || 'N/A';
  const experience = job?.experience || 'N/A';
  const vacancies = job?.vacancies || 'N/A';
  const salary = job?.salary || 'N/A';
  const aboutCompany = resolveAboutCompany(job?.aboutCompany);
  const description = job?.jobDescription || 'N/A';
  const requirements = Array.isArray(job?.requirements) && job.requirements.length ? job.requirements : ['N/A'];
  const responsibilities = Array.isArray(job?.responsibilities) && job.responsibilities.length ? job.responsibilities : ['N/A'];

  const canEdit = useMemo(() => {
    try {
      const rawUser = localStorage.getItem('user');
      const user = rawUser ? JSON.parse(rawUser) : null;
      return Boolean(user && ADMIN_ROLES.includes(user.role));
    } catch (_error) {
      return false;
    }
  }, []);

  const openEdit = () => {
    if (!canEdit || !job) return;

    setEditDraft({
      company: job.company || company,
      position: job.position || jobTitle,
      location: job.location || jobLocation,
      workMode: job.workMode || workMode,
      type: job.type || jobType,
      experience: job.experience ?? '',
      vacancies: job.vacancies ?? '',
      salary: job.salary ?? '',
      jobDescription: job.jobDescription ?? '',
      requirementsText: Array.isArray(job.requirements) ? toMultiline(job.requirements) : '',
      responsibilitiesText: Array.isArray(job.responsibilities) ? toMultiline(job.responsibilities) : '',
    });
    setEditOpen(true);
  };

  const saveEdit = () => {
    if (!canEdit || !job || !editDraft) return;

    const nextExperience = editDraft.experience?.trim() || '';
    const nextVacancies = editDraft.vacancies?.trim() || '';
    const nextSalary = editDraft.salary?.trim() || '';
    const nextDescription = editDraft.jobDescription?.trim() || '';
    const nextRequirements = toLineList(editDraft.requirementsText);
    const nextResponsibilities = toLineList(editDraft.responsibilitiesText);

    const token = localStorage.getItem('token');
    const jobKey = String(job.id || job._id || '');
    const applyLocalUpdate = () => {
      const stored = getStoredJobs();
      const updated = stored.map((item) => {
        if (String(item.id || item._id) !== jobKey) return item;

        const merged = { ...item };
        if (nextExperience) merged.experience = nextExperience; else delete merged.experience;
        if (nextVacancies) merged.vacancies = nextVacancies; else delete merged.vacancies;
        if (nextSalary) merged.salary = nextSalary; else delete merged.salary;
        if (nextDescription) merged.jobDescription = nextDescription; else delete merged.jobDescription;
        if (nextRequirements.length) merged.requirements = nextRequirements; else delete merged.requirements;
        if (nextResponsibilities.length) merged.responsibilities = nextResponsibilities; else delete merged.responsibilities;
        return merged;
      });

      localStorage.setItem(USER_POSTED_JOBS_KEY, JSON.stringify(updated));
      setEditOpen(false);
      setEditDraft(null);
      setJobVersion((prev) => prev + 1);
    };

    if (!token || !job?._id) {
      applyLocalUpdate();
      return;
    }

    fetch(apiEndpoints.jobById(encodeURIComponent(String(job._id))), {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        category: job.category,
        company: job.company || company,
        position: job.position || jobTitle,
        location: job.location || jobLocation,
        type: job.type || jobType,
        status: job.status || 'Open',
        applyLink: job.applyLink || '',
        description: job.description || '',
        department: job.department || 'General',
        role: job.role || 'Staff',
        tag: job.tag || 'Standard',
        workMode: job.workMode || workMode,
        experience: nextExperience,
        vacancies: nextVacancies,
        salary: nextSalary,
        aboutCompany: job.aboutCompany || '',
        jobDescription: nextDescription,
        requirements: nextRequirements,
        responsibilities: nextResponsibilities,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          applyLocalUpdate();
          return;
        }

        return response.json().then((data) => {
          const nextJob = data?.job ? { ...data.job, id: data.job.id || data.job._id } : null;
          if (nextJob) {
            setRemoteJob(nextJob);
            const stored = getStoredJobs();
            const exists = stored.some((item) => String(item.id || item._id) === String(nextJob.id));
            const updated = exists
              ? stored.map((item) => (String(item.id || item._id) === String(nextJob.id) ? nextJob : item))
              : [nextJob, ...stored];
            localStorage.setItem(USER_POSTED_JOBS_KEY, JSON.stringify(updated));
          }

          setEditOpen(false);
          setEditDraft(null);
          setJobVersion((prev) => prev + 1);
        }).catch(() => {
          applyLocalUpdate();
        });
      })
      .catch(() => {
        applyLocalUpdate();
      });
  };

  const shareUrl = useMemo(() => {
    const base = `${window.location.origin}${location.pathname}`;
    if (jobId === null) return base;
    if (location.pathname.endsWith(String(jobId))) return `${window.location.origin}${location.pathname}`;
    return `${base}${base.endsWith('/') ? '' : '/'}${encodeURIComponent(String(jobId))}`;
  }, [jobId, location.pathname]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch (_error) {
      // no-op
    }
  };

  const goToApplicationForm = () => {
    if (jobId !== null) {
      navigate(`/job-application?id=${encodeURIComponent(String(jobId))}`, { state: { jobId: String(jobId) } });
      return;
    }
    navigate('/job-application', { state: {} });
  };
  const mapEmbed = `https://www.google.com/maps?q=${encodeURIComponent(jobLocation)}&output=embed`;

  const cardStyle = {
    background: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 8px 18px rgba(17, 24, 39, 0.10)',
    border: '1px solid #ececec',
  };

  const gold = '#d6a91b';

  return (
    <motion.div
      style={{ display: 'flex', minHeight: '100vh', background: '#f3f4f6' }}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      <style>{`
        @keyframes fillBounce {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
      `}</style>
      <Sidebar isOpen={sidebarOpen} toggle={() => setSidebarOpen(!sidebarOpen)} />

      <div style={{ flex: 1, padding: isMobile ? '76px 10px 16px' : '26px 34px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ marginBottom: '12px' }}>
            <Link
              to="/training"
              style={{
                color: '#6b7280',
                textDecoration: 'none',
                fontSize: '12px',
                fontWeight: '700',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
              aria-label="Back to Career & Job Opportunities"
            >
              {'< Back to Career & Job Opportunities'}
            </Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: isMobile ? '12px' : '26px', alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                ...cardStyle,
                padding: isMobile ? '12px' : '18px 22px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: isMobile ? 'wrap' : 'nowrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <img src="/Lion.png" alt="HSI logo" style={{ width: isMobile ? '44px' : '56px', height: isMobile ? '44px' : '56px', objectFit: 'contain' }} />
                <div>
                  <div style={{ fontWeight: '900', color: '#111827', fontSize: isMobile ? '14px' : '18px' }}>{company}</div>
                  <div style={{ marginTop: '2px', color: '#6b7280', fontSize: '12px' }}>IT Solutions</div>
                  <div style={{ marginTop: '2px', color: '#9ca3af', fontSize: '12px' }}>33+ jobs</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'flex-end' : 'flex-start' }}>
                {canEdit && job ? (
                  <button
                    type="button"
                    onClick={openEdit}
                    onMouseEnter={() => setHoverButton('edit')}
                    onMouseLeave={() => setHoverButton(null)}
                    style={{
                      height: isMobile ? '36px' : '40px',
                      padding: '0 14px',
                      borderRadius: '10px',
                      border: '1px solid #e5e7eb',
                      background: '#ffffff',
                      color: '#111827',
                      fontWeight: '900',
                      fontSize: isMobile ? '11px' : '12px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <HoverFill active={hoverButton === 'edit'} radius="10px" alpha={0.08} />
                    <span style={{ position: 'relative', zIndex: 1 }}>Edit</span>
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={goToApplicationForm}
                  onMouseEnter={() => setHoverButton('applyNow')}
                  onMouseLeave={() => setHoverButton(null)}
                  style={{
                    height: isMobile ? '36px' : '40px',
                    padding: '0 18px',
                    borderRadius: '10px',
                    background: gold,
                    color: '#ffffff',
                    fontWeight: '900',
                    fontSize: isMobile ? '10px' : '11px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    whiteSpace: 'nowrap',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <HoverFill active={hoverButton === 'applyNow'} radius="10px" alpha={0.15} />
                  <span style={{ position: 'relative', zIndex: 1 }}>Apply Now</span>
                </button>
              </div>
            </div>

            <div
              style={{
                ...cardStyle,
                padding: isMobile ? '12px' : '18px 22px 16px',
              }}
            >
              <div style={{ fontSize: isMobile ? '18px' : '22px', fontWeight: '900', color: '#111827' }}>
                {job?.position || 'Full stack developer'}
              </div>
              <div style={{ marginTop: '6px', color: '#6b7280', fontSize: '12px' }}>Basic Job Information</div>

              <div
                style={{
                  marginTop: '10px',
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '120px 10px 1fr' : '160px 16px 1fr',
                  rowGap: '6px',
                  columnGap: '6px',
                  fontSize: isMobile ? '12px' : '13.5px',
                  color: '#4b5563',
                }}
              >
                {[
                  ['Work Mode', workMode],
                  ['Experience', experience],
                  ['No. of vacancy', vacancies],
                  ['Job type', jobType],
                  ['Location', jobLocation],
                  ['Offered Salary', salary],
                ].map(([label, value]) => (
                  <React.Fragment key={label}>
                    <div style={{ color: '#111827' }}>{label}</div>
                    <div style={{ color: '#111827' }}>:</div>
                    <div>{value}</div>
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div
              style={{
                ...cardStyle,
                padding: isMobile ? '12px' : '18px 22px',
              }}
            >
              <div style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: '900', color: '#111827' }}>Job Description</div>
              <div style={{ marginTop: '10px', color: '#4b5563', lineHeight: 1.7, fontSize: isMobile ? '12px' : '13.5px' }}>{description}</div>

              <div style={{ marginTop: '16px', fontSize: isMobile ? '14px' : '15px', fontWeight: '900', color: '#111827' }}>Requirements:</div>
              <ol style={{ marginTop: '10px', paddingLeft: '18px', color: '#4b5563', lineHeight: 1.75, fontSize: isMobile ? '12px' : '13.5px' }}>
                {requirements.map((item) => <li key={item}>{item}</li>)}
              </ol>

              <div style={{ marginTop: '14px', fontSize: isMobile ? '14px' : '15px', fontWeight: '900', color: '#111827' }}>Responsibilities:</div>
              <ol style={{ marginTop: '10px', paddingLeft: '18px', color: '#4b5563', lineHeight: 1.75, fontSize: isMobile ? '12px' : '13.5px' }}>
                {responsibilities.map((item) => <li key={item}>{item}</li>)}
              </ol>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px' }}>
                <button
                  type="button"
                  onClick={goToApplicationForm}
                  onMouseEnter={() => setHoverButton('applyBottom')}
                  onMouseLeave={() => setHoverButton(null)}
                  style={{
                    height: isMobile ? '38px' : '42px',
                    padding: '0 24px',
                    borderRadius: '10px',
                    background: gold,
                    color: '#ffffff',
                    fontWeight: '900',
                    fontSize: isMobile ? '11px' : '12px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <HoverFill active={hoverButton === 'applyBottom'} radius="10px" alpha={0.15} />
                  <span style={{ position: 'relative', zIndex: 1 }}>Apply</span>
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '900', color: '#111827' }}>About Company</div>
                <div
                  style={{
                    marginTop: '10px',
                    color: '#4b5563',
                    fontSize: '13.5px',
                    lineHeight: 1.65,
                    whiteSpace: 'pre-line',
                  }}
                >
                  {renderAboutCompany(aboutCompany)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '15px', fontWeight: '900', color: '#111827', marginBottom: '10px' }}>Location</div>
                <div style={{ borderRadius: '12px', overflow: 'hidden', background: '#fff', border: '1px solid #ececec' }}>
                  <iframe
                    title="job-location"
                    src={mapEmbed}
                    style={{ border: 0, width: '100%', height: isMobile ? '180px' : '250px' }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>

              <div>
                <div style={{ fontSize: '15px', fontWeight: '900', color: '#111827' }}>Refer to a Friend</div>
                <div style={{ display: 'flex', gap: isMobile ? '8px' : '14px', marginTop: '12px', flexWrap: 'wrap' }}>
                  {[
                    { key: 'facebook', icon: FacebookCircleIcon },
                    { key: 'twitter', icon: TwitterCircleIcon },
                    { key: 'linkedin', icon: LinkedInCircleIcon },
                    { key: 'email', icon: GmailMIcon },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        if (item.key === 'email') {
                          const subject = `Job Opportunity - ${jobTitle}`;
                          const body = `Check this job: ${shareUrl}`;
                          window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                          return;
                        }
                        window.open(shareUrl, '_blank', 'noopener,noreferrer');
                      }}
                      style={{
                        width: isMobile ? '52px' : '72px',
                        height: isMobile ? '52px' : '72px',
                        borderRadius: '12px',
                        border: 'none',
                        background: 'transparent',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: 'none',
                        padding: 0,
                      }}
                      aria-label={item.key === 'email' ? 'email' : item.key}
                    >
                      <item.icon size={isMobile ? 46 : 64} />
                    </button>
                  ))}
                </div>

                <div style={{ marginTop: '18px', fontSize: '14px', fontWeight: '900', color: '#111827' }}>Copy job URL Link</div>
                <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                  <input
                    value={shareUrl}
                    readOnly
                    style={{
                      flex: 1,
                      height: '44px',
                      borderRadius: '10px',
                      border: '1px solid #e5e7eb',
                      padding: '0 12px',
                      fontSize: '12.5px',
                      color: '#374151',
                      background: '#ffffff',
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    onMouseEnter={() => setHoverButton('copyUrl')}
                    onMouseLeave={() => setHoverButton(null)}
                  style={{
                    height: '44px',
                    padding: '0 18px',
                    borderRadius: '10px',
                    border: 'none',
                    background: gold,
                    color: '#ffffff',
                    fontWeight: '900',
                    cursor: 'pointer',
                    fontSize: isMobile ? '11px' : '12px',
                    minWidth: '88px',
                    position: 'relative',
                    overflow: 'hidden',
                    }}
                  >
                    <HoverFill active={hoverButton === 'copyUrl'} radius="10px" alpha={0.15} />
                    <span style={{ position: 'relative', zIndex: 1 }}>Copy</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {editOpen && canEdit && editDraft ? (
        <div
          role="presentation"
          onClick={() => setEditOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(17, 24, 39, 0.55)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            zIndex: 60,
            padding: isMobile ? '10px' : '18px',
            overflowY: 'auto',
            overscrollBehavior: 'contain',
          }}
        >
          <div
            role="presentation"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: isMobile ? '94vw' : '860px',
              maxHeight: isMobile ? 'calc(100vh - 20px)' : 'calc(100vh - 36px)',
              overflowY: 'auto',
              background: '#ffffff',
              borderRadius: isMobile ? '12px' : '16px',
              border: '1px solid #ececec',
              boxShadow: '0 20px 50px rgba(17, 24, 39, 0.25)',
              padding: isMobile ? '12px' : '18px',
              overflowX: 'hidden',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
              <div style={{ minWidth: isMobile ? '100%' : 'auto' }}>
                <div style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: '900', color: '#111827' }}>Edit Job Details</div>
                <div style={{ marginTop: '4px', fontSize: isMobile ? '11px' : '12px', color: '#6b7280' }}>
                  Update description, requirements, responsibilities, and other details.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                onMouseEnter={() => setHoverButton('editModalClose')}
                onMouseLeave={() => setHoverButton(null)}
                style={{
                  height: isMobile ? '32px' : '36px',
                  padding: isMobile ? '0 10px' : '0 12px',
                  borderRadius: '10px',
                  border: '1px solid #e5e7eb',
                  background: '#ffffff',
                  color: '#111827',
                  fontWeight: '900',
                  fontSize: isMobile ? '11px' : '12px',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                <HoverFill active={hoverButton === 'editModalClose'} radius="10px" alpha={0.08} />
                <span style={{ position: 'relative', zIndex: 1 }}>Close</span>
              </button>
            </div>

            <div style={{ height: '1px', background: '#eeeeee', margin: '14px 0' }} />

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
              {[
                { label: 'Job Title', key: 'position', placeholder: 'Full stack developer', disabled: true },
                { label: 'Company', key: 'company', placeholder: 'Highly Succeed Inc.', disabled: true },
                { label: 'Location', key: 'location', placeholder: 'Mandaluyong City, Metro Manila', disabled: true },
                { label: 'Job Type', key: 'type', placeholder: 'Full-time', disabled: true },
                { label: 'Work Mode', key: 'workMode', placeholder: 'Hybrid', disabled: true },
                { label: 'Experience', key: 'experience', placeholder: '2+ years' },
                { label: 'No. of vacancy', key: 'vacancies', placeholder: '[6]' },
                { label: 'Offered Salary', key: 'salary', placeholder: 'PHP 50,000/month (negotiable)' },
              ].map((field) => (
                <label key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '900', color: '#111827' }}>{field.label}</span>
                  <input
                    value={editDraft[field.key] ?? ''}
                    onChange={field.disabled ? undefined : (e) => setEditDraft((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    disabled={Boolean(field.disabled)}
                    style={{
                      height: '42px',
                      borderRadius: '10px',
                      border: '1px solid #e5e7eb',
                      padding: '0 12px',
                      fontSize: '13px',
                      outline: 'none',
                      background: field.disabled ? '#f3f4f6' : '#ffffff',
                      color: field.disabled ? '#6b7280' : '#111827',
                    }}
                  />
                </label>
              ))}
            </div>

            <div style={{ display: 'grid', gap: '12px', marginTop: '12px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: '900', color: '#111827' }}>Job Description</span>
                <textarea
                  value={editDraft.jobDescription ?? ''}
                  onChange={(e) => setEditDraft((prev) => ({ ...prev, jobDescription: e.target.value }))}
                  rows={5}
                  style={{
                    borderRadius: '10px',
                    border: '1px solid #e5e7eb',
                    padding: '10px 12px',
                    fontSize: '13px',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '900', color: '#111827' }}>Requirements (1 per line)</span>
                  <textarea
                    value={editDraft.requirementsText ?? ''}
                    onChange={(e) => setEditDraft((prev) => ({ ...prev, requirementsText: e.target.value }))}
                    rows={6}
                    style={{
                      borderRadius: '10px',
                      border: '1px solid #e5e7eb',
                      padding: '10px 12px',
                      fontSize: '13px',
                      outline: 'none',
                      resize: 'vertical',
                    }}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '900', color: '#111827' }}>Responsibilities (1 per line)</span>
                  <textarea
                    value={editDraft.responsibilitiesText ?? ''}
                    onChange={(e) => setEditDraft((prev) => ({ ...prev, responsibilitiesText: e.target.value }))}
                    rows={6}
                    style={{
                      borderRadius: '10px',
                      border: '1px solid #e5e7eb',
                      padding: '10px 12px',
                      fontSize: '13px',
                      outline: 'none',
                      resize: 'vertical',
                    }}
                  />
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                onMouseEnter={() => setHoverButton('editModalCancel')}
                onMouseLeave={() => setHoverButton(null)}
                style={{
                  height: isMobile ? '36px' : '42px',
                  padding: isMobile ? '0 12px' : '0 16px',
                  borderRadius: '10px',
                  border: '1px solid #e5e7eb',
                  background: '#ffffff',
                  color: '#111827',
                  fontWeight: '900',
                  fontSize: isMobile ? '11px' : '12px',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <HoverFill active={hoverButton === 'editModalCancel'} radius="10px" alpha={0.08} />
                <span style={{ position: 'relative', zIndex: 1 }}>Cancel</span>
              </button>
              <button
                type="button"
                onClick={saveEdit}
                onMouseEnter={() => setHoverButton('editModalSave')}
                onMouseLeave={() => setHoverButton(null)}
                style={{
                  height: isMobile ? '36px' : '42px',
                  padding: isMobile ? '0 14px' : '0 18px',
                  borderRadius: '10px',
                  border: 'none',
                  background: gold,
                  color: '#ffffff',
                  fontWeight: '900',
                  fontSize: isMobile ? '11px' : '12px',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <HoverFill active={hoverButton === 'editModalSave'} radius="10px" alpha={0.15} />
                <span style={{ position: 'relative', zIndex: 1 }}>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </motion.div>
  );
}
