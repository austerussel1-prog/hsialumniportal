import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CaretDown, MagnifyingGlass } from '@phosphor-icons/react';
import Sidebar from './components/Sidebar';
import { apiEndpoints } from './config/api';

const USER_POSTED_JOBS_KEY = 'hsi_user_job_posts';
const ADMIN_ROLES = ['super_admin', 'superadmin', 'admin', 'hr', 'alumni_officer'];

function getStoredJobs() {
  try {
    const raw = localStorage.getItem(USER_POSTED_JOBS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function resolveSortTimestamp(job) {
  const fromCreatedAt = Date.parse(job?.createdAt || '');
  if (Number.isFinite(fromCreatedAt)) return fromCreatedAt;
  const fromUpdatedAt = Date.parse(job?.updatedAt || '');
  if (Number.isFinite(fromUpdatedAt)) return fromUpdatedAt;
  const asNumber = Number(job?.id);
  if (Number.isFinite(asNumber)) return asNumber;
  return 0;
}

const categoryMeta = {
  all: {
    title: 'Career & Job Opportunities',
    subtitle: 'Explore available departments and current openings within the company.',
  },
  exclusive: {
    title: 'Exclusive HSI Job Postings',
    subtitle: 'Direct openings shared for alumni members.',
  },
  freelance: {
    title: 'Freelance & Project-based Opportunities',
    subtitle: 'Flexible contracts and short-term projects.',
  },
  internship: {
    title: 'Internship & OJT Opportunities',
    subtitle: 'Student-ready internships and practical training roles.',
  },
  'part-time': {
    title: 'Part-time Opportunities',
    subtitle: 'Flexible part-time roles and short shift-based work.',
  },
  contract: {
    title: 'Contract Opportunities',
    subtitle: 'Fixed-term roles for contractual and seasonal hires.',
  },
};

export default function JobListingsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 900;
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const location = useLocation();
  const navigate = useNavigate();
  const [jobsVersion, setJobsVersion] = useState(0);
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [deleteModalJob, setDeleteModalJob] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [postQueryHandled, setPostQueryHandled] = useState(false);
  const [hoverButton, setHoverButton] = useState(null);
  const [serverJobs, setServerJobs] = useState([]);
  const [postForm, setPostForm] = useState({
    category: 'exclusive',
    company: '',
    position: '',
    location: '',
    type: 'Project-based',
  });

  const category = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('category') || 'all';
  }, [location.search]);

  const currentUser = useMemo(() => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch (_error) {
      return null;
    }
  }, []);

  const isAdminUser = Boolean(currentUser && ADMIN_ROLES.includes(currentUser.role));

  const showToast = (type, text) => {
    window.dispatchEvent(new CustomEvent('hsi-toast', { detail: { type, text } }));
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const shouldOpen = params.get('post') === '1';
    if (!shouldOpen || postQueryHandled) return;

    if (!isAdminUser) {
      params.delete('post');
      const nextSearch = params.toString();
      navigate(
        { pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : '' },
        { replace: true },
      );
      setPostQueryHandled(true);
      return;
    }

    setPostQueryHandled(true);
    setPostModalOpen(true);
    setPostForm((prev) => ({
      ...prev,
      category: params.get('category') || 'exclusive',
      type: prev.type || 'Project-based',
    }));

    params.delete('post');
    const nextSearch = params.toString();
    navigate(
      { pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : '' },
      { replace: true },
    );
  }, [isAdminUser, location.pathname, location.search, navigate, postQueryHandled]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const hasModalOpen = postModalOpen || Boolean(deleteModalJob);
    if (!hasModalOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [postModalOpen, deleteModalJob]);

  useEffect(() => {
    let mounted = true;

    async function fetchJobs() {
      const token = localStorage.getItem('token');
      if (!token) {
        if (mounted) setServerJobs([]);
        return;
      }

      try {
        const response = await fetch(apiEndpoints.jobs, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) return;

        let jobs = Array.isArray(data?.jobs) ? data.jobs : [];

        if (jobs.length === 0) {
          const localJobs = getStoredJobs();
          if (localJobs.length > 0) {
            const migratedResults = await Promise.all(localJobs.map(async (item) => {
              const category = String(item?.category || 'exclusive').trim() || 'exclusive';
              const company = String(item?.company || '').trim();
              const position = String(item?.position || '').trim();
              const postingLocation = String(item?.location || '').trim();
              if (!company || !position || !postingLocation) return null;

              const postRes = await fetch(apiEndpoints.jobs, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  category,
                  company,
                  position,
                  location: postingLocation,
                  type: item?.type || '',
                  status: item?.status || 'Open',
                  applyLink: item?.applyLink || '',
                  description: item?.description || '',
                  department: item?.department || 'General',
                  role: item?.role || 'Staff',
                  tag: item?.tag || 'Standard',
                }),
              });
              const postData = await postRes.json().catch(() => ({}));
              if (!postRes.ok || !postData?.job) return null;
              return postData.job;
            }));

            jobs = migratedResults.filter(Boolean);
          }
        }

        if (!mounted) return;

        setServerJobs(jobs);
        if (jobs.length > 0) {
          localStorage.setItem(USER_POSTED_JOBS_KEY, JSON.stringify(jobs));
        }
        setJobsVersion((prev) => prev + 1);
      } catch (_error) {
        // Keep local fallback data when API is unavailable.
      }
    }

    fetchJobs();
    return () => {
      mounted = false;
    };
  }, []);

  const openPostModal = () => {
    if (!isAdminUser) {
      showToast('error', 'Admin access required to post jobs.');
      return;
    }
    setPostModalOpen(true);
    setPostForm((prev) => ({
      ...prev,
      category: category === 'all' ? 'exclusive' : (category || 'exclusive'),
      company: '',
      position: '',
      location: '',
      type: 'Project-based',
    }));
  };

  const handlePostOpportunity = (event) => {
    event.preventDefault();
    if (!isAdminUser) {
      showToast('error', 'Admin access required to post jobs.');
      return;
    }

    const nextCategory = (postForm.category || 'exclusive').trim();
    const company = postForm.company.trim();
    const position = postForm.position.trim();
    const jobLocation = postForm.location.trim();

    if (!company || !position || !jobLocation) return;

    const resolvedType = nextCategory === 'freelance'
      ? (postForm.type || 'Project-based')
      : undefined;

    const postedJob = {
      id: Date.now(),
      category: nextCategory,
      company,
      position,
      location: jobLocation,
      type: resolvedType,
      status: 'Open',
      applyLink: `mailto:hr@hsi.com?subject=Application%20-%20${encodeURIComponent(position)}`,
    };

    const token = localStorage.getItem('token');
    const fallbackPost = () => {
      const existing = getStoredJobs();
      localStorage.setItem(USER_POSTED_JOBS_KEY, JSON.stringify([...existing, postedJob]));
      setJobsVersion((prev) => prev + 1);
      setPostModalOpen(false);
      showToast('success', 'Job posted successfully.');
      navigate(`/training?category=${encodeURIComponent(nextCategory)}`);
    };

    if (!token) {
      fallbackPost();
      return;
    }

    fetch(apiEndpoints.jobs, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        category: nextCategory,
        company,
        position,
        location: jobLocation,
        type: resolvedType,
        status: 'Open',
        applyLink: `mailto:hr@hsi.com?subject=Application%20-%20${encodeURIComponent(position)}`,
      }),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data?.job) {
          fallbackPost();
          return;
        }

        const latest = [data.job, ...serverJobs];
        setServerJobs(latest);
        localStorage.setItem(USER_POSTED_JOBS_KEY, JSON.stringify(latest));
        setJobsVersion((prev) => prev + 1);
        setPostModalOpen(false);
        showToast('success', 'Job posted successfully.');
        navigate(`/training?category=${encodeURIComponent(nextCategory)}`);
      })
      .catch(() => {
        fallbackPost();
      });
  };

  const canDeleteJob = (job) => {
    if (!job) return false;
    return isAdminUser;
  };

  const requestDeleteJob = (job) => {
    if (!isAdminUser) {
      showToast('error', 'Admin access required to delete jobs.');
      return;
    }
    setDeleteModalJob(job || null);
  };

  const handleDeleteJob = async (job) => {
    const jobKey = String(job?.id || job?._id || '');
    if (!jobKey || deleteBusy) return;

    setDeleteBusy(true);

    const removeFromLocalState = () => {
      const nextLocal = getStoredJobs().filter((item) => String(item.id || item._id) !== jobKey);
      localStorage.setItem(USER_POSTED_JOBS_KEY, JSON.stringify(nextLocal));
      setServerJobs((prev) => prev.filter((item) => String(item.id || item._id) !== jobKey));
      setJobsVersion((prev) => prev + 1);
      setDeleteModalJob(null);
    };

    if (!job._id) {
      removeFromLocalState();
      showToast('success', 'Job deleted successfully.');
      setDeleteBusy(false);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      removeFromLocalState();
      showToast('success', 'Job deleted successfully.');
      setDeleteBusy(false);
      return;
    }

    try {
      const response = await fetch(apiEndpoints.jobById(encodeURIComponent(String(job._id))), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        showToast('error', data?.message || 'Failed to delete job.');
        setDeleteBusy(false);
        return;
      }

      removeFromLocalState();
      showToast('success', 'Job deleted successfully.');
    } catch (_error) {
      showToast('error', 'Failed to delete job.');
    } finally {
      setDeleteBusy(false);
    }
  };

  const jobs = useMemo(() => {
    const localJobs = getStoredJobs();
    const sourceJobs = serverJobs.length > 0 ? serverJobs : localJobs;

    return sourceJobs
      .map((job) => ({
        ...job,
        id: job.id || job._id,
        status: job.status || 'Open',
        type: job.type || ({
          freelance: 'Project-based',
          internship: 'Internship/OJT',
          'part-time': 'Part-time',
          contract: 'Contract',
          exclusive: 'Full-time',
        }[job.category] || 'Full-time'),
        description: job.description || (job.category === 'freelance'
          ? 'Flexible short-term work for project-based contributors.'
          : job.category === 'internship'
            ? 'Gain real-world experience with guided internship and OJT work.'
            : 'Learn and grow your skills with hands-on mentoring.'),
        department: job.department || 'General',
        role: job.role || 'Staff',
        tag: job.tag || (job.category === 'freelance' ? 'Short-term' : 'Standard'),
      }))
      .filter((job) => (category === 'all' ? true : job.category === category));
  }, [category, jobsVersion, serverJobs]);

  const filteredJobs = useMemo(() => {
    const lowerSearch = searchTerm.trim().toLowerCase();
    const filtered = jobs.filter((job) => {
      const matchesSearch = !lowerSearch
        || job.position.toLowerCase().includes(lowerSearch)
        || job.company.toLowerCase().includes(lowerSearch)
        || job.location.toLowerCase().includes(lowerSearch);
      const matchesDepartment = departmentFilter === 'all' || job.department === departmentFilter;
      const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
      const matchesRole = roleFilter === 'all' || job.role === roleFilter;
      const matchesTag = tagFilter === 'all' || job.tag === tagFilter;
      return matchesSearch && matchesDepartment && matchesStatus && matchesRole && matchesTag;
    });

    return [...filtered].sort((a, b) => (
      sortOrder === 'newest'
        ? resolveSortTimestamp(b) - resolveSortTimestamp(a)
        : resolveSortTimestamp(a) - resolveSortTimestamp(b)
    ));
  }, [jobs, searchTerm, sortOrder, departmentFilter, statusFilter, roleFilter, tagFilter]);

  const activeMeta = categoryMeta[category] || categoryMeta.exclusive;

  const clearFilters = () => {
    setSearchTerm('');
    setSortOrder('newest');
    setDepartmentFilter('all');
    setStatusFilter('all');
    setRoleFilter('all');
    setTagFilter('all');
  };

  const derivedPostType = ({
    exclusive: 'Full-time',
    internship: 'Internship/OJT',
    'part-time': 'Part-time',
    contract: 'Contract',
  }[postForm.category] || 'Full-time');

  return (
    <motion.div
      style={{ display: 'flex', minHeight: '100vh', background: '#f6f2ea' }}
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

        <div style={{ flex: 1, padding: isMobile ? '76px 10px 16px' : '30px 40px', display: 'flex', flexDirection: 'column', gap: isMobile ? '12px' : '20px' }}>
        <div>
          {location.pathname !== '/training' ? (
            <Link to="/training" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '12px', fontWeight: '600' }}>
              {'< Back to Career & Job Opportunities'}
            </Link>
          ) : null}
          <h1 style={{ marginTop: isMobile ? '4px' : '10px', fontSize: isMobile ? '24px' : '34px', fontWeight: '900', color: '#111827', lineHeight: 1.1 }}>
            Career &amp; Job <span style={{ color: '#e1aa18' }}>Opportunities</span>
          </h1>
          <p style={{ color: '#6b7280', marginTop: '6px', fontStyle: 'italic', fontSize: isMobile ? '12px' : '13px' }}>{activeMeta.subtitle}</p>
        </div>

        <div style={{ background: '#fff', border: '1px solid #efe4d3', borderRadius: '14px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: isMobile ? '8px' : '14px', alignItems: 'center', padding: isMobile ? '10px' : '14px 16px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: isMobile ? '100%' : '320px', position: 'relative' }}>
              <MagnifyingGlass size={15} color="#9ca3af" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search"
                style={{
                  width: '100%',
                  height: isMobile ? '38px' : '40px',
                  padding: isMobile ? '0 10px 0 34px' : '0 12px 0 36px',
                  border: '1px solid #d9dde5',
                  borderRadius: '10px',
                  fontSize: '12px',
                  color: '#374151',
                  outline: 'none',
                }}
              />
            </div>
            <div style={{ minWidth: isMobile ? 'calc(50% - 4px)' : '190px', position: 'relative' }}>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                style={{
                  width: '100%',
                  height: isMobile ? '38px' : '40px',
                  padding: '0 30px 0 12px',
                  border: '1px solid #d9dde5',
                  borderRadius: '10px',
                  fontSize: '12px',
                  color: '#6b7280',
                  background: '#f9fafb',
                  appearance: 'none',
                }}
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
              </select>
              <CaretDown size={13} color="#9ca3af" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
            {isAdminUser ? (
              <button
                type="button"
                onClick={openPostModal}
                onMouseEnter={() => setHoverButton('postJobTop')}
                onMouseLeave={() => setHoverButton(null)}
                style={{
                  height: isMobile ? '38px' : '40px',
                  padding: isMobile ? '0 12px' : '0 16px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#e1aa18',
                  color: '#ffffff',
                  borderRadius: '10px',
                  fontSize: isMobile ? '10px' : '11px',
                  fontWeight: '400',
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {hoverButton === 'postJobTop' ? (
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
                <span style={{ position: 'relative', zIndex: 1 }}>Post a Job</span>
              </button>
            ) : null}
          </div>

          <div style={{ height: '1px', background: '#efe4d3' }} />

          <div style={{ display: 'flex', gap: isMobile ? '8px' : '12px', alignItems: 'center', flexWrap: 'wrap', padding: isMobile ? '10px' : '14px 16px' }}>
            {[
              { label: 'Department', value: departmentFilter, setter: setDepartmentFilter, options: ['all', 'General'] },
              { label: 'Status', value: statusFilter, setter: setStatusFilter, options: ['all', 'Open'] },
              { label: 'Role', value: roleFilter, setter: setRoleFilter, options: ['all', 'Staff'] },
              { label: 'Tag', value: tagFilter, setter: setTagFilter, options: ['all', 'Standard'] },
            ].map((item) => (
              <div key={item.label} style={{ minWidth: isMobile ? 'calc(50% - 4px)' : '150px', position: 'relative' }}>
                <select
                  value={item.value}
                  onChange={(e) => item.setter(e.target.value)}
                  style={{
                    width: '100%',
                    height: isMobile ? '36px' : '34px',
                    padding: '0 26px 0 12px',
                    border: '1px solid #d9dde5',
                    borderRadius: '10px',
                    fontSize: '12px',
                    color: '#6b7280',
                    background: '#f9fafb',
                    appearance: 'none',
                  }}
                >
                  {item.options.map((option) => (
                    <option key={option} value={option}>
                      {option === 'all' ? item.label : option}
                    </option>
                  ))}
                </select>
                <CaretDown size={12} color="#9ca3af" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            ))}
            <button
              onClick={clearFilters}
              onMouseEnter={() => setHoverButton('clearFilters')}
              onMouseLeave={() => setHoverButton(null)}
              style={{
                height: isMobile ? '36px' : '34px',
                padding: isMobile ? '0 14px' : '0 16px',
                background: '#e1aa18',
                color: '#ffffff',
                borderRadius: '10px',
                border: 'none',
                fontSize: isMobile ? '11px' : '12px',
                fontWeight: '400',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                marginLeft: isMobile ? 'auto' : 0,
              }}
            >
              {hoverButton === 'clearFilters' ? (
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
              <span style={{ position: 'relative', zIndex: 1 }}>CLEAR</span>
            </button>
          </div>
        </div>

        {filteredJobs.length === 0 ? (
          <div
            style={{
              background: '#fff',
              border: '1px dashed #d6c6a3',
              borderRadius: '14px',
              padding: '24px',
              textAlign: 'center',
              color: '#6b7280',
              fontStyle: 'italic',
              fontSize: '14px',
            }}
          >
            <div>No job opportunities yet. You can post openings here.</div>
            {isAdminUser ? (
              <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={openPostModal}
                  onMouseEnter={() => setHoverButton('postJobEmpty')}
                  onMouseLeave={() => setHoverButton(null)}
                  style={{
                    height: '38px',
                    padding: '0 18px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#e1aa18',
                    color: '#ffffff',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: '400',
                    border: 'none',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {hoverButton === 'postJobEmpty' ? (
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
                  <span style={{ position: 'relative', zIndex: 1 }}>Post a Job</span>
                </button>
              </div>
            ) : null}
          </div>
        ) : (['all', 'exclusive', 'freelance', 'internship', 'part-time', 'contract'].includes(category)) ? (
          <div style={{ display: 'grid', gap: isMobile ? '10px' : '16px', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(460px, 1fr))' }}>
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                style={{
                  background: '#fff',
                  border: '2px solid #efe4d3',
                  borderRadius: '16px',
                  padding: isMobile ? '10px' : '18px 20px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: isMobile ? '7px' : '10px',
                  boxShadow: isMobile ? '0 6px 14px rgba(17, 24, 39, 0.08)' : '0 10px 24px rgba(17, 24, 39, 0.08)',
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '44px 1fr' : '96px 1fr', gap: '8px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <img src="/Lion.png" alt="HSI logo" style={{ width: isMobile ? '34px' : '72px', height: isMobile ? '34px' : '72px', objectFit: 'contain' }} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <h2 style={{ fontSize: isMobile ? '14px' : '20px', fontWeight: '800', color: '#111827', lineHeight: 1.15 }}>
                      {job.position}
                    </h2>
                    {!isMobile && (
                      <p style={{ marginTop: '3px', fontSize: '11px', color: '#6b7280', fontStyle: 'italic' }}>
                        {job.description}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: '7px', marginTop: '6px' }}>
                      <span
                        style={{
                          border: '1px solid #86efac',
                          background: '#dcfce7',
                          color: '#15803d',
                          padding: '2px 10px',
                          borderRadius: '999px',
                          fontSize: isMobile ? '9px' : '10px',
                          fontWeight: '700',
                        }}
                      >
                        {job.status}
                      </span>
                      <span
                        style={{
                          border: '1px solid #d1d5db',
                          background: '#f3f4f6',
                          color: '#374151',
                          padding: '2px 10px',
                          borderRadius: '999px',
                          fontSize: isMobile ? '9px' : '10px',
                          fontWeight: '700',
                        }}
                      >
                        {job.type}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '800', color: '#111827', fontSize: isMobile ? '10px' : '13px' }}>{job.company}</div>
                    <div style={{ color: '#6b7280', fontStyle: 'italic', fontSize: isMobile ? '9px' : '11px' }}>{job.location}</div>
                  </div>
                  <img src="/Lion.png" alt="HSI logo small" style={{ width: isMobile ? '20px' : '34px', height: isMobile ? '20px' : '34px', opacity: 0.9 }} />
                </div>

                <div style={{ marginTop: '2px', display: 'grid', gridTemplateColumns: canDeleteJob(job) ? '1fr auto' : '1fr', gap: '8px', alignItems: 'center' }}>
                  <Link
                    to={`/career/job-details/${encodeURIComponent(String(job.id))}`}
                    onMouseEnter={() => setHoverButton(`view-details-${String(job.id)}`)}
                    onMouseLeave={() => setHoverButton(null)}
                    style={{
                      width: '100%',
                      background: '#e1aa18',
                      color: '#ffffff',
                      textDecoration: 'none',
                      borderRadius: isMobile ? '10px' : '12px',
                      fontWeight: '700',
                      fontSize: isMobile ? '9px' : '10px',
                      textAlign: 'center',
                      padding: isMobile ? '8px 10px' : '10px 12px',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {hoverButton === `view-details-${String(job.id)}` ? (
                      <span
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          width: '100%',
                          height: '100%',
                          background: 'rgba(0, 0, 0, 0.15)',
                          borderRadius: '12px',
                          transform: 'scaleX(0)',
                          transformOrigin: 'left',
                          animation: 'fillBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        }}
                      />
                    ) : null}
                    <span style={{ position: 'relative', zIndex: 1 }}>
                      {job.category === 'freelance' ? 'View Project Details' : 'View Job Details'}
                    </span>
                  </Link>
                  {canDeleteJob(job) ? (
                    <button
                      type="button"
                      onClick={() => requestDeleteJob(job)}
                      onMouseEnter={() => setHoverButton(`delete-${String(job.id)}`)}
                      onMouseLeave={() => setHoverButton(null)}
                      title="Delete job"
                      aria-label="Delete job"
                      style={{
                        width: isMobile ? '34px' : '36px',
                        height: isMobile ? '34px' : '36px',
                        border: 'none',
                        background: 'transparent',
                        color: '#b91c1c',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        position: 'relative',
                        overflow: 'hidden',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {hoverButton === `delete-${String(job.id)}` ? (
                        <span
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            width: '100%',
                            height: '100%',
                            background: 'rgba(185, 28, 28, 0.08)',
                            borderRadius: '8px',
                            transform: 'scaleX(0)',
                            transformOrigin: 'left',
                            animation: 'fillBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                          }}
                        />
                      ) : null}
                      <span style={{ position: 'relative', zIndex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width={isMobile ? 16 : 17} height={isMobile ? 16 : 17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                          <path d="M3 6h18" />
                          <path d="M8 6V4h8v2" />
                          <path d="M19 6l-1 14H6L5 6" />
                          <path d="M10 11v6" />
                          <path d="M14 11v6" />
                        </svg>
                      </span>
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '14px', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                style={{
                  background: '#fff',
                  border: '2px solid #efe4d3',
                  borderRadius: '16px',
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxShadow: '0 10px 22px rgba(17, 24, 39, 0.08)',
                }}
              >
                <div style={{ fontSize: '12px', color: '#b07a15', fontWeight: '700' }}>{job.company}</div>
                <div style={{ fontSize: '19px', color: '#111827', fontWeight: '800' }}>{job.position}</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>{job.location}</div>
                <div style={{ marginTop: '6px', display: 'grid', gridTemplateColumns: canDeleteJob(job) ? '1fr auto' : '1fr', gap: '8px', alignItems: 'center' }}>
                  <Link
                    to={`/career/job-details/${encodeURIComponent(String(job.id))}`}
                    onMouseEnter={() => setHoverButton(`view-details-small-${String(job.id)}`)}
                    onMouseLeave={() => setHoverButton(null)}
                    style={{
                      background: '#e1aa18',
                      color: '#111827',
                      textDecoration: 'none',
                      borderRadius: '10px',
                      fontWeight: '800',
                      fontSize: isMobile ? '10px' : '11px',
                      textAlign: 'center',
                      padding: '10px 12px',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {hoverButton === `view-details-small-${String(job.id)}` ? (
                      <span
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          width: '100%',
                          height: '100%',
                          background: 'rgba(0, 0, 0, 0.12)',
                          borderRadius: '10px',
                          transform: 'scaleX(0)',
                          transformOrigin: 'left',
                          animation: 'fillBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        }}
                      />
                    ) : null}
                    <span style={{ position: 'relative', zIndex: 1 }}>View Details</span>
                  </Link>
                  {canDeleteJob(job) ? (
                    <button
                      type="button"
                      onClick={() => requestDeleteJob(job)}
                      title="Delete job"
                      aria-label="Delete job"
                      style={{
                        width: isMobile ? '34px' : '36px',
                        height: isMobile ? '34px' : '36px',
                        border: 'none',
                        background: 'transparent',
                        color: '#b91c1c',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg width={isMobile ? 16 : 17} height={isMobile ? 16 : 17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                        <path d="M3 6h18" />
                        <path d="M8 6V4h8v2" />
                        <path d="M19 6l-1 14H6L5 6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                      </svg>
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {postModalOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setPostModalOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(17, 24, 39, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 50,
              padding: isMobile ? '10px' : '18px',
            }}
          >
            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: isMobile ? '94vw' : '620px',
                background: '#fff',
                borderRadius: isMobile ? '12px' : '16px',
                border: '1px solid #efe4d3',
                boxShadow: '0 18px 40px rgba(17, 24, 39, 0.18)',
                padding: isMobile ? '12px' : '18px',
                overflowX: 'hidden',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                <div style={{ minWidth: isMobile ? '100%' : 'auto' }}>
                  <div style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: '900', color: '#111827' }}>Post an Opportunity</div>
                  <div style={{ marginTop: '4px', fontSize: isMobile ? '11px' : '12px', color: '#6b7280' }}>
                    Post OJT, project-based, part-time, contract, and full-time openings.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPostModalOpen(false)}
                  onMouseEnter={() => setHoverButton('postModalClose')}
                  onMouseLeave={() => setHoverButton(null)}
                  style={{
                    border: '1px solid #e5e7eb',
                    background: '#fff',
                    borderRadius: '10px',
                    height: isMobile ? '32px' : '34px',
                    padding: '0 12px',
                    fontSize: isMobile ? '10px' : '11px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    color: '#374151',
                    position: 'relative',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  {hoverButton === 'postModalClose' ? (
                    <span
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        width: '100%',
                        height: '100%',
                        background: 'rgba(0, 0, 0, 0.08)',
                        borderRadius: '10px',
                        transform: 'scaleX(0)',
                        transformOrigin: 'left',
                        animation: 'fillBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      }}
                    />
                  ) : null}
                  <span style={{ position: 'relative', zIndex: 1 }}>Close</span>
                </button>
              </div>

              <div style={{ height: '1px', background: '#efe4d3', margin: '14px 0' }} />

              <form onSubmit={handlePostOpportunity} style={{ display: 'grid', gap: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: '#374151' }}>Category</div>
                    <select
                      value={postForm.category}
                      onChange={(e) => setPostForm((prev) => ({ ...prev, category: e.target.value }))}
                      style={{
                        height: '40px',
                        borderRadius: '10px',
                        border: '1px solid #d9dde5',
                        padding: '0 12px',
                        fontSize: '12px',
                        background: '#f9fafb',
                        color: '#374151',
                      }}
                    >
                      <option value="exclusive">Full-time / Exclusive</option>
                      <option value="part-time">Part-time</option>
                      <option value="contract">Contract</option>
                      <option value="freelance">Freelance / Project-based</option>
                      <option value="internship">Internship / OJT</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: '#374151' }}>Type</div>
                    <select
                      value={postForm.category === 'freelance' ? postForm.type : derivedPostType}
                      onChange={(e) => setPostForm((prev) => ({ ...prev, type: e.target.value }))}
                      disabled={postForm.category !== 'freelance'}
                      style={{
                        height: '40px',
                        borderRadius: '10px',
                        border: '1px solid #d9dde5',
                        padding: '0 12px',
                        fontSize: '12px',
                        background: postForm.category === 'freelance' ? '#f9fafb' : '#f3f4f6',
                        color: '#374151',
                        opacity: postForm.category === 'freelance' ? 1 : 0.8,
                      }}
                    >
                      {postForm.category === 'freelance' ? (
                        <>
                          <option value="Project-based">Project-based</option>
                          <option value="Freelance">Freelance</option>
                          <option value="Contract">Contract</option>
                        </>
                      ) : (
                        <option value={derivedPostType}>{derivedPostType}</option>
                      )}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: '#374151' }}>Company Name</div>
                    <input
                      value={postForm.company}
                      onChange={(e) => setPostForm((prev) => ({ ...prev, company: e.target.value }))}
                      placeholder="Company Name"
                      style={{
                        height: '40px',
                        borderRadius: '10px',
                        border: '1px solid #d9dde5',
                        padding: '0 12px',
                        fontSize: '12px',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '800', color: '#374151' }}>Position / Role</div>
                      <input
                        value={postForm.position}
                        onChange={(e) => setPostForm((prev) => ({ ...prev, position: e.target.value }))}
                        placeholder="Position"
                        style={{
                          height: '40px',
                          borderRadius: '10px',
                          border: '1px solid #d9dde5',
                          padding: '0 12px',
                          fontSize: '12px',
                          outline: 'none',
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '800', color: '#374151' }}>Location</div>
                      <input
                        value={postForm.location}
                        onChange={(e) => setPostForm((prev) => ({ ...prev, location: e.target.value }))}
                        placeholder="Location / Remote"
                        style={{
                          height: '40px',
                          borderRadius: '10px',
                          border: '1px solid #d9dde5',
                          padding: '0 12px',
                          fontSize: '12px',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                  <button
                    type="button"
                    onClick={() => setPostModalOpen(false)}
                    onMouseEnter={() => setHoverButton('postModalCancel')}
                    onMouseLeave={() => setHoverButton(null)}
                    style={{
                      height: isMobile ? '36px' : '40px',
                      padding: isMobile ? '0 12px' : '0 14px',
                      borderRadius: '10px',
                      border: '1px solid #d9dde5',
                      background: '#fff',
                      color: '#374151',
                      fontSize: isMobile ? '10px' : '11px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {hoverButton === 'postModalCancel' ? (
                      <span
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          width: '100%',
                          height: '100%',
                          background: 'rgba(0, 0, 0, 0.08)',
                          borderRadius: '10px',
                          transform: 'scaleX(0)',
                          transformOrigin: 'left',
                          animation: 'fillBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        }}
                      />
                    ) : null}
                    <span style={{ position: 'relative', zIndex: 1 }}>Cancel</span>
                  </button>
                  <button
                    type="submit"
                    onMouseEnter={() => setHoverButton('postModalSubmit')}
                    onMouseLeave={() => setHoverButton(null)}
                    style={{
                      height: isMobile ? '36px' : '40px',
                      padding: isMobile ? '0 14px' : '0 16px',
                      borderRadius: '10px',
                      border: 'none',
                      background: '#e1aa18',
                      color: '#111827',
                      fontSize: isMobile ? '10px' : '11px',
                      fontWeight: '900',
                      cursor: 'pointer',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {hoverButton === 'postModalSubmit' ? (
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
                    <span style={{ position: 'relative', zIndex: 1 }}>Post</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        ) : null}
        {deleteModalJob ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => {
              if (!deleteBusy) setDeleteModalJob(null);
            }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(17, 24, 39, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 60,
              padding: isMobile ? '12px' : '18px',
            }}
          >
            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: isMobile ? '94vw' : '448px',
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 18px 40px rgba(17, 24, 39, 0.18)',
                padding: isMobile ? '16px' : '24px',
              }}
            >
              <div style={{ fontSize: isMobile ? '18px' : '18px', fontWeight: '600', color: '#111827', lineHeight: 1.2 }}>
                Delete job post
              </div>
              <div style={{ marginTop: '8px', color: '#4b5563', fontSize: '14px', lineHeight: 1.35 }}>
                Delete "{deleteModalJob.position}"? This cannot be undone.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '14px', marginTop: isMobile ? '18px' : '24px' }}>
                <button
                  type="button"
                  onClick={() => setDeleteModalJob(null)}
                  disabled={deleteBusy}
                  style={{
                    height: '44px',
                    minWidth: '112px',
                    padding: '0 16px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    background: '#fff',
                    color: '#111827',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: deleteBusy ? 'not-allowed' : 'pointer',
                    opacity: deleteBusy ? 0.7 : 1,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteJob(deleteModalJob)}
                  disabled={deleteBusy}
                  style={{
                    height: '44px',
                    minWidth: '112px',
                    padding: '0 16px',
                    borderRadius: '8px',
                    border: '1px solid #dc2626',
                    background: '#e02424',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: deleteBusy ? 'not-allowed' : 'pointer',
                    opacity: deleteBusy ? 0.7 : 1,
                  }}
                >
                  {deleteBusy ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
