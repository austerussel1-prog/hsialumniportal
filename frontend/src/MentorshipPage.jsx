import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Sidebar from './components/Sidebar';
import { apiEndpoints } from './config/api';

export default function MentorshipPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  ));
  const mentorScrollRef = useRef(null);
  const discoverMentorsRef = useRef(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const rawUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
  const user = rawUser ? JSON.parse(rawUser) : null;

  const authHeaders = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);

  const resolveProfileImage = (value) => {
    if (!value) return '/Logo.jpg';
    if (String(value).includes('gear-icon.svg')) return '/Logo.jpg';
    if (typeof value === 'string' && value.startsWith('/')) {
      return `${import.meta.env.VITE_API_URL}${value}`;
    }
    return value;
  };

  const [mentors, setMentors] = useState([]);
  const [mentorsLoading, setMentorsLoading] = useState(false);
  const [mentorsError, setMentorsError] = useState('');

  const [activeModal, setActiveModal] = useState(null);
  const closeModal = () => setActiveModal(null);

  const [mentorApplication, setMentorApplication] = useState({
    roles: { mentor: true, speaker: false },
    expertise: '',
    topics: '',
    yearsExperience: '',
    availabilityNote: '',
    bio: '',
  });
  const [applicationStatus, setApplicationStatus] = useState(null);
  const [applicationBusy, setApplicationBusy] = useState(false);

  const [sessionDraft, setSessionDraft] = useState({
    mentorUserId: '',
    startAt: '',
    endAt: '',
    mode: 'virtual',
    meetingLink: '',
    location: '',
    message: '',
  });
  const [sessionBusy, setSessionBusy] = useState(false);
  const [mySessions, setMySessions] = useState([]);
  const [sessionsBusy, setSessionsBusy] = useState(false);

  const [opportunities, setOpportunities] = useState([]);
  const [volunteerSummary, setVolunteerSummary] = useState(null);
  const [volunteerBusy, setVolunteerBusy] = useState(false);
  const [volunteerLog, setVolunteerLog] = useState({ title: '', category: '', date: '', hours: '', notes: '' });
  const sectionBase = {
    height: 'auto',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: 0,
    boxSizing: 'border-box',
    scrollSnapAlign: 'start',
  };
  const hasMentors = mentors.length > 0;
  const programBenefits = [
    {
      title: 'Career Growth',
      body: 'Receive personalized guidance from experienced professionals who can help you navigate career decisions, develop in-demand skills, and plan your professional growth.',
    },
    {
      title: 'Meaningful Connections',
      body: 'Build long-term relationships with alumni, mentors, and peers that go beyond sessions, creating a strong and supportive professional network within HSI.',
    },
    {
      title: 'Give Back',
      body: 'Make a positive impact by supporting interns, junior members, and community initiatives through mentorship, volunteering, and knowledge-sharing activities.',
    },
    {
      title: 'Recognition & Tracking',
      body: 'Gain recognition for your contributions with badges, certificates, and a clear record of mentorship sessions and volunteer hours, all tracked in one place.',
    },
  ];
  const scrollCarousel = (ref, direction) => {
    if (!ref.current) {
      return;
    }
    ref.current.scrollBy({ left: direction * 320, behavior: 'smooth' });
  };

  useEffect(() => {
    let mounted = true;

    async function loadMentors() {
      if (!token) return;
      setMentorsLoading(true);
      setMentorsError('');
      try {
        const res = await fetch(apiEndpoints.mentors, { headers: authHeaders });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = data?.message || 'Failed to load mentors';
          if (mounted) setMentorsError(msg);
          return;
        }
        const list = Array.isArray(data?.mentors) ? data.mentors : [];
        if (mounted) {
          setMentors(list.map((m) => ({ ...m, image: resolveProfileImage(m.image) })));
        }
      } catch (err) {
        if (mounted) setMentorsError('Failed to load mentors');
      } finally {
        if (mounted) setMentorsLoading(false);
      }
    }

    async function loadMyMentorProfile() {
      if (!token) return;
      try {
        const res = await fetch(apiEndpoints.mentorshipProfile, { headers: authHeaders });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return;
        const profile = data?.profile || null;
        if (!mounted) return;
        if (profile?.status) setApplicationStatus(profile.status);
        if (profile) {
          const roles = Array.isArray(profile.roles) ? profile.roles : [];
          setMentorApplication((prev) => ({
            ...prev,
            roles: { mentor: roles.includes('mentor'), speaker: roles.includes('speaker') },
            expertise: Array.isArray(profile.expertise) ? profile.expertise.join(', ') : '',
            topics: Array.isArray(profile.topics) ? profile.topics.join(', ') : '',
            yearsExperience: profile.yearsExperience == null ? '' : String(profile.yearsExperience),
            availabilityNote: profile.availabilityNote || '',
            bio: profile.bio || '',
          }));
        }
      } catch (err) {
        // ignore
      }
    }

    loadMentors();
    loadMyMentorProfile();

    return () => { mounted = false; };
  }, [authHeaders, token]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const scrollToDiscoverMentors = () => {
    if (discoverMentorsRef.current) {
      discoverMentorsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const mentorCardWidth = isMobile ? 190 : 280;
  const mentorCardHeight = isMobile ? 310 : 392;
  const mentorCardImageHeight = isMobile ? 168 : 240;

  const emitToast = (type, text) => {
    window.dispatchEvent(new CustomEvent('hsi-toast', {
      detail: { type, text },
    }));
  };

  const openApplicationModal = () => {
    setActiveModal({ type: 'apply' });
  };

  const openVolunteerModal = async () => {
    setActiveModal({ type: 'volunteer' });
    if (!token) return;
    setVolunteerBusy(true);
    try {
      const [oppRes, summaryRes] = await Promise.all([
        fetch(apiEndpoints.volunteerOpportunities, { headers: authHeaders }),
        fetch(apiEndpoints.volunteerSummary, { headers: authHeaders }),
      ]);
      const oppData = await oppRes.json().catch(() => ({}));
      const summaryData = await summaryRes.json().catch(() => ({}));
      if (oppRes.ok) setOpportunities(Array.isArray(oppData?.opportunities) ? oppData.opportunities : []);
      if (summaryRes.ok) setVolunteerSummary(summaryData?.totals || null);
    } catch (err) {
      // ignore
    } finally {
      setVolunteerBusy(false);
    }
  };

  const openSessionsModal = async () => {
    setActiveModal({ type: 'sessions' });
    if (!token) return;
    setSessionsBusy(true);
    try {
      const res = await fetch(apiEndpoints.mentorshipSessions, { headers: authHeaders });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setMySessions(Array.isArray(data?.sessions) ? data.sessions : []);
    } catch (err) {
      // ignore
    } finally {
      setSessionsBusy(false);
    }
  };

  const openRequestSessionModal = (mentor) => {
    setSessionDraft({
      mentorUserId: mentor?.id || '',
      startAt: '',
      endAt: '',
      mode: 'virtual',
      meetingLink: '',
      location: '',
      message: '',
    });
    setActiveModal({ type: 'requestSession', payload: { mentor } });
  };

  const submitApplication = async () => {
    if (!token) {
      emitToast('error', 'Please log in again.');
      return;
    }
    setApplicationBusy(true);
    try {
      const roles = [];
      if (mentorApplication.roles.mentor) roles.push('mentor');
      if (mentorApplication.roles.speaker) roles.push('speaker');

      const res = await fetch(apiEndpoints.mentorshipApply, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          roles,
          expertise: mentorApplication.expertise,
          topics: mentorApplication.topics,
          yearsExperience: mentorApplication.yearsExperience,
          availabilityNote: mentorApplication.availabilityNote,
          bio: mentorApplication.bio,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        emitToast('error', data?.message || 'Failed to submit application');
        return;
      }
      setApplicationStatus(data?.profile?.status || 'pending');
      closeModal();
      emitToast('success', data?.message || 'Submitted. Awaiting admin approval.');
    } catch (err) {
      emitToast('error', 'Failed to submit application');
    } finally {
      setApplicationBusy(false);
    }
  };

  const submitSessionRequest = async () => {
    if (!token) {
      emitToast('error', 'Please log in again.');
      return;
    }
    if (!sessionDraft.mentorUserId) {
      emitToast('error', 'Please select a mentor.');
      return;
    }
    if (!sessionDraft.startAt || !sessionDraft.endAt) {
      emitToast('error', 'Please select a start and end time.');
      return;
    }
    setSessionBusy(true);
    try {
      const res = await fetch(apiEndpoints.mentorshipRequestSession, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          mentorUserId: sessionDraft.mentorUserId,
          startAt: sessionDraft.startAt,
          endAt: sessionDraft.endAt,
          mode: sessionDraft.mode,
          meetingLink: sessionDraft.meetingLink,
          location: sessionDraft.location,
          message: sessionDraft.message,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        emitToast('error', data?.message || 'Failed to request session');
        return;
      }
      closeModal();
      emitToast('success', data?.message || 'Session requested');
    } catch (err) {
      emitToast('error', 'Failed to request session');
    } finally {
      setSessionBusy(false);
    }
  };

  const respondToSession = async (sessionId, action) => {
    if (!token) return;
    try {
      await fetch(apiEndpoints.mentorshipRespondSession(sessionId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ action }),
      });
      const res = await fetch(apiEndpoints.mentorshipSessions, { headers: authHeaders });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setMySessions(Array.isArray(data?.sessions) ? data.sessions : []);
    } catch (err) {
      // ignore
    }
  };

  const applyToOpportunity = async (id, role) => {
    if (!token) {
      emitToast('error', 'Please log in again.');
      return;
    }
    try {
      const res = await fetch(apiEndpoints.volunteerApply(id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        emitToast('error', data?.message || 'Failed to apply');
        return;
      }
      emitToast('success', data?.message || 'Applied. Awaiting admin approval.');
    } catch (err) {
      emitToast('error', 'Failed to apply');
    }
  };

  const submitVolunteerLog = async () => {
    if (!token) {
      emitToast('error', 'Please log in again.');
      return;
    }

    const normalizedTitle = String(volunteerLog.title || '').trim();
    const normalizedCategory = String(volunteerLog.category || '').trim();
    const normalizedDate = String(volunteerLog.date || '').trim();
    const parsedHours = Number(volunteerLog.hours);

    if (!normalizedTitle) {
      emitToast('error', 'Activity title is required.');
      return;
    }

    if (!normalizedCategory) {
      emitToast('error', 'Category is required.');
      return;
    }

    if (!normalizedDate) {
      emitToast('error', 'Date is required.');
      return;
    }

    if (!Number.isFinite(parsedHours) || parsedHours <= 0) {
      emitToast('error', 'Hours must be greater than 0.');
      return;
    }

    try {
      const res = await fetch(apiEndpoints.volunteerCreateLog, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          ...volunteerLog,
          title: normalizedTitle,
          category: normalizedCategory,
          date: normalizedDate,
          hours: parsedHours,
          notes: String(volunteerLog.notes || '').trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        emitToast('error', data?.message || 'Failed to log hours');
        return;
      }
      emitToast('success', data?.message || 'Logged. Awaiting admin approval.');
      setVolunteerLog({ title: '', category: '', date: '', hours: '', notes: '' });
    } catch (err) {
      emitToast('error', 'Failed to log hours');
    }
  };

  return (
    <motion.div
      className="mentorship-page"
      style={{ display: 'flex', minHeight: '100vh', background: '#ffffff' }}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      <style>{`
        @keyframes mentorshipFillBounce {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }

        .mentorship-page button {
          position: relative;
          overflow: hidden;
          isolation: isolate;
          transition: none;
        }

        .mentorship-page button::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          background: rgba(255, 255, 255, 0.28);
          transform: scaleX(0);
          transform-origin: left;
          pointer-events: none;
          z-index: 0;
        }

        .mentorship-page button:not(:disabled):hover::before,
        .mentorship-page button:not(:disabled):focus-visible::before {
          animation: mentorshipFillBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .mentorship-page button > * {
          position: relative;
          z-index: 1;
        }
      `}</style>
      <Sidebar isOpen={sidebarOpen} toggle={() => setSidebarOpen(!sidebarOpen)} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ ...sectionBase, justifyContent: 'flex-start' }}>
            <div
              style={{
                margin: isMobile ? '88px 14px 0 14px' : '56px 20px 0 108px',
              }}
            >
              <h1 style={{ fontSize: isMobile ? '34px' : '40px', fontWeight: '700', color: '#111827', lineHeight: isMobile ? 1.05 : 1.1 }}>
                Mentorship &amp; <span style={{ color: '#e4b118' }}>Programs</span>
              </h1>
              <p style={{ color: '#6b7280', marginTop: '6px', fontSize: isMobile ? '12px' : '13px', fontStyle: 'italic' }}>
                Grow your career through mentorship, volunteering, and community.
              </p>
            </div>
            <div
              style={{
                background: '#e9edf1',
                borderRadius: '14px 14px 20px 20px',
                padding: isMobile ? '20px 14px 24px' : '24px 32px 96px',
                margin: isMobile ? '8px 10px 12px' : '8px 32px 16px',
                display: 'grid',
                gridTemplateRows: 'auto 1fr',
                gap: isMobile ? '18px' : '28px',
                height: 'auto',
                minHeight: 'auto',
                width: isMobile ? 'calc(100% - 20px)' : 'calc(100% - 64px)',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'minmax(320px, 1.15fr) minmax(340px, 0.85fr)',
                  gap: isMobile ? '16px' : '36px',
                  alignItems: 'center',
                }}
              >
                <div>
                  <h2
                    style={{
                      fontSize: isMobile ? '34px' : '48px',
                      lineHeight: '1.06',
                      fontWeight: '800',
                      color: '#e4b118',
                      marginBottom: isMobile ? '12px' : '16px',
                    }}
                  >
                    Grow Your Career
                    <br />
                    Through Mentorship
                    <br />
                    &amp; Community
                  </h2>
                  <p style={{ color: '#111827', maxWidth: '520px', marginBottom: isMobile ? '18px' : '24px', fontSize: isMobile ? '13px' : '14px', lineHeight: 1.7 }}>
                    Support the next generation of HSI professionals through mentorship, volunteering, and advocacy.
                  </p>
                  <button
                    style={{
                      padding: '11px 26px',
                      background: '#3d4451',
                      color: '#e4b118',
                      border: 'none',
                      borderRadius: '999px',
                      fontWeight: '600',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                    onClick={scrollToDiscoverMentors}
                  >
                    Get a Mentor
                  </button>
                </div>

                <div style={{ position: 'relative', minHeight: isMobile ? '250px' : '320px' }}>
                  <div
                    style={{
                      position: 'absolute',
                      top: '0%',
                      left: '2%',
                      width: '60%',
                      height: '56%',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      boxShadow: '0 12px 24px rgba(0, 0, 0, 0.18)',
                      background: '#fff',
                    }}
                  >
                    <img
                      src="/hero.jpg"
                      alt="Mentorship session"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '0%',
                      right: '0%',
                      width: '66%',
                      height: '62%',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      boxShadow: '0 12px 24px rgba(0, 0, 0, 0.18)',
                      background: '#fff',
                    }}
                  >
                    <img
                      src="/hero.jpg"
                      alt="Community collaboration"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      top: '34%',
                      left: '18%',
                      width: '44%',
                      height: '38%',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      boxShadow: '0 10px 20px rgba(0, 0, 0, 0.16)',
                      background: '#fff',
                    }}
                  >
                    <img
                      src="/hero.jpg"
                      alt="Mentor helping student"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={sectionBase}>
            <div
              style={{
                background: '#f6edd4',
                borderRadius: '14px',
                padding: isMobile ? '26px 14px' : '64px 72px',
                margin: isMobile ? '10px' : '32px',
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'minmax(320px, 1.35fr) minmax(420px, 1fr)',
                gap: isMobile ? '22px' : '40px',
                alignItems: 'center',
                width: isMobile ? 'calc(100% - 20px)' : 'calc(100% - 64px)',
                height: 'calc(100% - 64px)',
                minHeight: 'calc(100% - 64px)',
              }}
            >
              <div>
                <h2 style={{ fontSize: isMobile ? '34px' : '38px', fontWeight: '800', color: '#e1b11c', marginBottom: '16px', lineHeight: 1.08 }}>
                  How the Program Works
                </h2>
                <p style={{ color: '#374151', maxWidth: '460px', fontSize: isMobile ? '13px' : '14px', lineHeight: 1.7 }}>
                  Connect with experienced alumni, schedule mentorship sessions, and take part in volunteer
                  initiatives designed to support career growth and community engagement.
                </p>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(2, minmax(240px, 1fr))',
                  gap: isMobile ? '12px' : '20px 22px',
                }}
              >
                {[
                  {
                    title: 'Be a Mentor',
                    body: 'Share your experience, guide juniors, and give back to the HSI community by mentoring interns and alumni.',
                  },
                  {
                    title: 'Find a Mentor',
                    body: 'Get matched with experienced professionals based on your goals, skills, and career path.',
                  },
                  {
                    title: 'Volunteer & Speak',
                    body: 'Join outreach programs, tech talks, and advocacy events as a volunteer or speaker.',
                  },
                  {
                    title: 'Schedule Sessions',
                    body: 'Book virtual or onsite mentorship sessions at a time that works for both mentor and mentee.',
                  },
                ].map((card) => (
                  <div
                    key={card.title}
                    style={{
                      background: '#ffffff',
                      borderRadius: '16px',
                      border: '1px solid #e5e7eb',
                      padding: isMobile ? '12px' : '20px 20px 18px',
                      boxShadow: '0 8px 18px rgba(0, 0, 0, 0.08)',
                      minHeight: isMobile ? '148px' : '170px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <h3 style={{ fontSize: isMobile ? '13px' : '15px', fontWeight: '700', color: '#111827', marginBottom: '8px', lineHeight: 1.25 }}>
                        {card.title}
                      </h3>
                      <p style={{ fontSize: isMobile ? '11px' : '12px', color: '#4b5563', lineHeight: 1.5 }}>{card.body}</p>
                    </div>
                    <button
                      aria-label={`${card.title} details`}
                      style={{
                        marginTop: '14px',
                        width: isMobile ? '28px' : '32px',
                        height: isMobile ? '28px' : '32px',
                        borderRadius: '999px',
                        border: 'none',
                        background: '#e1b11c',
                        color: '#1f2937',
                        fontWeight: '700',
                        fontSize: isMobile ? '12px' : '14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onClick={() => {
                        if (card.title === 'Be a Mentor') openApplicationModal();
                        if (card.title === 'Find a Mentor') scrollToDiscoverMentors();
                        if (card.title === 'Volunteer & Speak') openVolunteerModal();
                        if (card.title === 'Schedule Sessions') openSessionsModal();
                      }}
                    >
                      &gt;
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={sectionBase}>
            <div
              ref={discoverMentorsRef}
              style={{
                background: '#f3f4f6',
                borderRadius: '18px',
                padding: isMobile ? '18px 14px' : '40px',
                margin: isMobile ? '10px' : '32px',
                display: 'flex',
                flexDirection: 'column',
                gap: isMobile ? '16px' : '28px',
                width: isMobile ? 'calc(100% - 20px)' : 'calc(100% - 64px)',
                height: 'calc(100% - 64px)',
                minHeight: 'calc(100% - 64px)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ fontSize: isMobile ? '24px' : '28px', fontWeight: '800', color: '#111827' }}>Discover Mentors</h2>
                  {mentorsLoading ? (
                    <div style={{ marginTop: 6, fontSize: 12, color: '#6b7280', fontStyle: 'italic' }}>Loading mentors…</div>
                  ) : null}
                  {mentorsError ? (
                    <div style={{ marginTop: 6, fontSize: 12, color: '#b91c1c', fontStyle: 'italic' }}>{mentorsError}</div>
                  ) : null}
                </div>
                {hasMentors && !isMobile ? (
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button
                      style={{
                        padding: '8px 16px',
                        borderRadius: '999px',
                        border: '1px solid #111827',
                        background: '#ffffff',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      Explore all
                    </button>
                    <button
                      aria-label="Scroll mentors left"
                      onClick={() => scrollCarousel(mentorScrollRef, -1)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '999px',
                        border: '1px solid #111827',
                        background: '#ffffff',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '700',
                      }}
                    >
                      {'<'}
                    </button>
                    <button
                      aria-label="Scroll mentors right"
                      onClick={() => scrollCarousel(mentorScrollRef, 1)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '999px',
                        border: '1px solid #111827',
                        background: '#ffffff',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '700',
                      }}
                    >
                      {'>'}
                    </button>
                  </div>
                ) : null}
              </div>
              {hasMentors ? (
                <div
                  ref={mentorScrollRef}
                  style={{
                    display: 'flex',
                    gap: isMobile ? '12px' : '18px',
                    overflowX: 'auto',
                    paddingBottom: '8px',
                    scrollSnapType: 'x mandatory',
                    alignItems: 'stretch',
                  }}
                >
                  {mentors.map((mentor) => (
                    <div
                      key={mentor.name}
                      style={{
                        width: `${mentorCardWidth}px`,
                        minWidth: `${mentorCardWidth}px`,
                        maxWidth: `${mentorCardWidth}px`,
                        height: `${mentorCardHeight}px`,
                        minHeight: `${mentorCardHeight}px`,
                        maxHeight: `${mentorCardHeight}px`,
                        background: '#ffffff',
                        borderRadius: '16px',
                        boxShadow: '0 8px 20px rgba(0, 0, 0, 0.08)',
                        overflow: 'hidden',
                        scrollSnapAlign: 'start',
                        display: 'flex',
                        flexDirection: 'column',
                        flex: '0 0 auto',
                      }}
                      onClick={() => openRequestSessionModal(mentor)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter') openRequestSessionModal(mentor); }}
                    >
                      <div style={{ height: `${mentorCardImageHeight}px`, background: '#e5e7eb', position: 'relative', flexShrink: 0 }}>
                        <img
                          src={mentor.image}
                          alt={mentor.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        {mentor.badge ? (
                          <span
                            style={{
                              position: 'absolute',
                              top: '10px',
                              left: '10px',
                              background: '#ffffff',
                              color: '#111827',
                              padding: '4px 10px',
                              borderRadius: '999px',
                              fontSize: '11px',
                              fontWeight: '600',
                              boxShadow: '0 4px 10px rgba(0, 0, 0, 0.12)',
                            }}
                          >
                            {mentor.badge}
                          </span>
                        ) : null}
                      </div>
                      <div
                        style={{
                          padding: isMobile ? '10px 12px 12px' : '14px 16px 16px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          flex: 1,
                        }}
                      >
                        <div>
                          <h3 style={{ fontSize: isMobile ? '14px' : '16px', fontWeight: '700', color: '#111827', marginBottom: '6px' }}>
                            {mentor.name}
                          </h3>
                          <p style={{ fontSize: isMobile ? '11px' : '12px', color: '#6b7280', marginBottom: '10px' }}>
                            {mentor.title}
                          </p>
                          <div style={{ fontSize: isMobile ? '11px' : '12px', color: '#4b5563', display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span style={{ width: '16px', height: '16px', borderRadius: '50%', border: '1px solid #9ca3af' }} />
                            <span>{mentor.sessions}</span>
                          </div>
                        </div>
                        <div style={{ marginTop: '10px', borderTop: '1px solid #e5e7eb', paddingTop: '10px' }}>
                          <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>Experience</div>
                          <div style={{ fontSize: isMobile ? '11px' : '12px', fontWeight: '700', color: '#111827' }}>{mentor.experience}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    minHeight: '380px',
                    borderRadius: '16px',
                    background: '#ffffff',
                    border: '1px dashed #d1d5db',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6b7280',
                    fontSize: '13px',
                    fontWeight: '500',
                    fontStyle: 'italic',
                  }}
                >
                  {mentorsLoading ? 'Loading mentors…' : 'No mentors yet. Admins will add mentors here.'}
                </div>
              )}

            </div>
          </div>

          <div style={sectionBase}>
            <div
              style={{
                background: '#ffffff',
                borderRadius: '18px',
                border: '1px solid #e5e7eb',
                padding: isMobile ? '22px 14px' : '48px',
                margin: isMobile ? '10px 10px 16px' : '32px',
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'minmax(320px, 1fr) minmax(420px, 1.2fr)',
                gap: isMobile ? '18px' : '40px',
                alignItems: 'center',
                width: isMobile ? 'calc(100% - 20px)' : 'calc(100% - 64px)',
                height: 'calc(100% - 64px)',
                minHeight: 'calc(100% - 64px)',
              }}
            >
              <div>
                <h2 style={{ fontSize: isMobile ? '34px' : '38px', fontWeight: '800', color: '#e4b118', marginBottom: '20px', lineHeight: 1.08 }}>
                  Why Join the Program
                </h2>
                {!isMobile ? (
                  <div
                    style={{
                      borderRadius: '22px',
                      overflow: 'hidden',
                      boxShadow: '0 12px 28px rgba(0, 0, 0, 0.16)',
                      maxWidth: '520px',
                      height: '420px',
                    }}
                  >
                    <img
                      src="/hero.jpg"
                      alt="Alumni collaboration"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  </div>
                ) : null}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(300px, 1fr))',
                  gap: isMobile ? '12px' : '22px',
                }}
              >
                {programBenefits.map((benefit) => (
                  <div
                    key={benefit.title}
                    style={{
                      border: '1.5px solid #e4b118',
                      borderRadius: '16px',
                      padding: isMobile ? '14px' : '22px',
                      background: '#ffffff',
                      boxShadow: '0 10px 22px rgba(0, 0, 0, 0.07)',
                      minHeight: isMobile ? 'unset' : '170px',
                    }}
                  >
                    <h3 style={{ fontSize: isMobile ? '14px' : '16px', fontWeight: '700', color: '#111827', marginBottom: '10px' }}>
                      {benefit.title}
                    </h3>
                    <p style={{ fontSize: isMobile ? '12px' : '13px', color: '#4b5563' }}>{benefit.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {activeModal ? (
        <MentorshipModal
          type={activeModal.type}
          payload={activeModal.payload}
          onClose={closeModal}
          application={mentorApplication}
          setApplication={setMentorApplication}
          applicationStatus={applicationStatus}
          applicationBusy={applicationBusy}
          onSubmitApplication={submitApplication}
          sessionDraft={sessionDraft}
          setSessionDraft={setSessionDraft}
          sessionBusy={sessionBusy}
          onSubmitSession={submitSessionRequest}
          mySessions={mySessions}
          sessionsBusy={sessionsBusy}
          onRespondSession={respondToSession}
          opportunities={opportunities}
          volunteerBusy={volunteerBusy}
          onApplyOpportunity={applyToOpportunity}
          volunteerSummary={volunteerSummary}
          volunteerLog={volunteerLog}
          setVolunteerLog={setVolunteerLog}
          onSubmitVolunteerLog={submitVolunteerLog}
          currentUserId={user?.id}
        />
      ) : null}
    </motion.div>
  );
}

function MentorshipModal({
  type,
  payload,
  onClose,
  application,
  setApplication,
  applicationStatus,
  applicationBusy,
  onSubmitApplication,
  sessionDraft,
  setSessionDraft,
  sessionBusy,
  onSubmitSession,
  mySessions,
  sessionsBusy,
  onRespondSession,
  opportunities,
  volunteerBusy,
  onApplyOpportunity,
  volunteerSummary,
  volunteerLog,
  setVolunteerLog,
  onSubmitVolunteerLog,
  currentUserId,
}) {
  const [isMobile, setIsMobile] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  ));

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const title = type === 'apply'
    ? 'Sign-up as mentor or speaker'
    : type === 'volunteer'
      ? 'Community outreach & volunteer tracking'
      : type === 'sessions'
        ? 'Mentor scheduling'
        : 'Request mentorship session';

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(17,24,39,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 60,
        padding: isMobile ? 10 : 18,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: isMobile ? '94vw' : 'min(920px, 96vw)',
          maxHeight: isMobile ? '90vh' : '88vh',
          background: '#ffffff',
          borderRadius: isMobile ? 16 : 18,
          boxShadow: '0 18px 48px rgba(0,0,0,0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: isMobile ? '14px 14px' : '18px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div>
            <div style={{ fontSize: isMobile ? 14 : 16, fontWeight: 800, color: '#111827', lineHeight: 1.2 }}>{title}</div>
            {type === 'apply' && applicationStatus ? (
              <div style={{ marginTop: 4, fontSize: isMobile ? 11 : 12, color: '#6b7280', fontStyle: 'italic' }}>
                Current status: {applicationStatus}
              </div>
            ) : null}
          </div>
          <button
            onClick={onClose}
            style={{
              width: isMobile ? 30 : 34,
              height: isMobile ? 30 : 34,
              borderRadius: 999,
              border: '1px solid #d1d5db',
              background: '#ffffff',
              cursor: 'pointer',
              fontWeight: 800,
              color: '#111827',
            }}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <div style={{ padding: isMobile ? 12 : 20, overflowY: 'auto' }}>
          {type === 'apply' ? (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 10 : 16 }}>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 14, padding: isMobile ? 12 : 16, background: '#fafafa' }}>
                <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 800, color: '#111827', marginBottom: 12 }}>Roles</div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: isMobile ? 12 : 13, color: '#111827', marginBottom: 10 }}>
                  <input
                    type="checkbox"
                    checked={!!application.roles.mentor}
                    onChange={(e) => setApplication((prev) => ({ ...prev, roles: { ...prev.roles, mentor: e.target.checked } }))}
                  />
                  Mentor
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: isMobile ? 12 : 13, color: '#111827' }}>
                  <input
                    type="checkbox"
                    checked={!!application.roles.speaker}
                    onChange={(e) => setApplication((prev) => ({ ...prev, roles: { ...prev.roles, speaker: e.target.checked } }))}
                  />
                  Speaker
                </label>
              </div>

              <div style={{ border: '1px solid #e5e7eb', borderRadius: 14, padding: isMobile ? 12 : 16 }}>
                <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 800, color: '#111827', marginBottom: 12 }}>Experience</div>
                <div style={{ display: 'grid', gap: 10 }}>
                  <input
                    value={application.yearsExperience}
                    onChange={(e) => setApplication((prev) => ({ ...prev, yearsExperience: e.target.value }))}
                    placeholder="Years of experience (e.g. 5)"
                    type="number"
                    min="0"
                    style={inputStyle}
                  />
                  <input
                    value={application.expertise}
                    onChange={(e) => setApplication((prev) => ({ ...prev, expertise: e.target.value }))}
                    placeholder="Expertise (comma-separated)"
                    style={inputStyle}
                  />
                  <input
                    value={application.topics}
                    onChange={(e) => setApplication((prev) => ({ ...prev, topics: e.target.value }))}
                    placeholder="Topics you can mentor/speak on (comma-separated)"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ gridColumn: '1 / -1', border: '1px solid #e5e7eb', borderRadius: 14, padding: isMobile ? 12 : 16 }}>
                <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 800, color: '#111827', marginBottom: 12 }}>Availability & Bio</div>
                <div style={{ display: 'grid', gap: 10 }}>
                  <input
                    value={application.availabilityNote}
                    onChange={(e) => setApplication((prev) => ({ ...prev, availabilityNote: e.target.value }))}
                    placeholder="Availability (e.g. Weeknights 7-9pm, Sat mornings)"
                    style={inputStyle}
                  />
                  <textarea
                    value={application.bio}
                    onChange={(e) => setApplication((prev) => ({ ...prev, bio: e.target.value }))}
                    placeholder="Short bio / how you want to help"
                    style={{ ...inputStyle, minHeight: 110, resize: 'vertical' }}
                  />
                </div>
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 10 : 0 }}>
                <div style={{ fontSize: isMobile ? 11 : 12, color: '#6b7280', fontStyle: 'italic' }}>
                  Applications are reviewed by admins.
                </div>
                <button
                  onClick={onSubmitApplication}
                  disabled={applicationBusy}
                  style={{
                    padding: isMobile ? '9px 14px' : '10px 18px',
                    borderRadius: 10,
                    border: 'none',
                    background: '#e1b11c',
                    color: '#111827',
                    fontWeight: 500,
                    fontSize: isMobile ? 12 : 14,
                    cursor: applicationBusy ? 'not-allowed' : 'pointer',
                    opacity: applicationBusy ? 0.65 : 1,
                    width: isMobile ? '100%' : 'auto',
                  }}
                >
                  {applicationBusy ? 'Submitting…' : 'Submit'}
                </button>
              </div>
            </div>
          ) : null}

          {type === 'requestSession' ? (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 10 : 16 }}>
              <div style={{ gridColumn: '1 / -1', border: '1px solid #e5e7eb', borderRadius: 14, padding: isMobile ? 12 : 16, background: '#fafafa' }}>
                <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 800, color: '#111827', marginBottom: 6 }}>Mentor</div>
                <div style={{ fontSize: isMobile ? 12 : 13, color: '#111827' }}>{payload?.mentor?.name || 'Selected mentor'}</div>
                <div style={{ marginTop: 4, fontSize: isMobile ? 11 : 12, color: '#6b7280' }}>{payload?.mentor?.title || ''}</div>
              </div>

              <div>
                <div style={{ fontSize: isMobile ? 11 : 12, fontWeight: 800, color: '#111827', marginBottom: 6 }}>Start</div>
                <input
                  type="datetime-local"
                  value={sessionDraft.startAt}
                  onChange={(e) => setSessionDraft((prev) => ({ ...prev, startAt: e.target.value }))}
                  style={inputStyle}
                />
              </div>
              <div>
                <div style={{ fontSize: isMobile ? 11 : 12, fontWeight: 800, color: '#111827', marginBottom: 6 }}>End</div>
                <input
                  type="datetime-local"
                  value={sessionDraft.endAt}
                  onChange={(e) => setSessionDraft((prev) => ({ ...prev, endAt: e.target.value }))}
                  style={inputStyle}
                />
              </div>

              <div>
                <div style={{ fontSize: isMobile ? 11 : 12, fontWeight: 800, color: '#111827', marginBottom: 6 }}>Mode</div>
                <select
                  value={sessionDraft.mode}
                  onChange={(e) => setSessionDraft((prev) => ({ ...prev, mode: e.target.value }))}
                  style={inputStyle}
                >
                  <option value="virtual">Virtual</option>
                  <option value="onsite">Onsite</option>
                </select>
              </div>

              <div>
                <div style={{ fontSize: isMobile ? 11 : 12, fontWeight: 800, color: '#111827', marginBottom: 6 }}>
                  {sessionDraft.mode === 'virtual' ? 'Meeting link' : 'Location'}
                </div>
                <input
                  value={sessionDraft.mode === 'virtual' ? sessionDraft.meetingLink : sessionDraft.location}
                  onChange={(e) => setSessionDraft((prev) => (
                    sessionDraft.mode === 'virtual'
                      ? { ...prev, meetingLink: e.target.value }
                      : { ...prev, location: e.target.value }
                  ))}
                  placeholder={sessionDraft.mode === 'virtual' ? 'https://…' : 'Address / room'}
                  style={inputStyle}
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: isMobile ? 11 : 12, fontWeight: 800, color: '#111827', marginBottom: 6 }}>Message</div>
                <textarea
                  value={sessionDraft.message}
                  onChange={(e) => setSessionDraft((prev) => ({ ...prev, message: e.target.value }))}
                  placeholder="What do you want to discuss?"
                  style={{ ...inputStyle, minHeight: 110, resize: 'vertical' }}
                />
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 10 : 0 }}>
                <div style={{ fontSize: isMobile ? 11 : 12, color: '#6b7280', fontStyle: 'italic' }}>
                  Mentors can accept/decline in the scheduling panel.
                </div>
                <button
                  onClick={onSubmitSession}
                  disabled={sessionBusy}
                  style={{
                    padding: isMobile ? '9px 14px' : '10px 18px',
                    borderRadius: 10,
                    border: 'none',
                    background: '#3d4451',
                    color: '#e4b118',
                    fontWeight: 500,
                    fontSize: isMobile ? 12 : 14,
                    cursor: sessionBusy ? 'not-allowed' : 'pointer',
                    opacity: sessionBusy ? 0.65 : 1,
                    width: isMobile ? '100%' : 'auto',
                  }}
                >
                  {sessionBusy ? 'Requesting…' : 'Request session'}
                </button>
              </div>
            </div>
          ) : null}

          {type === 'sessions' ? (
            <div style={{ display: 'grid', gap: 12 }}>
              {sessionsBusy ? (
                <div style={{ fontSize: 12, color: '#6b7280', fontStyle: 'italic' }}>Loading sessions…</div>
              ) : null}
              {!sessionsBusy && (!Array.isArray(mySessions) || mySessions.length === 0) ? (
                <div style={{ fontSize: 12, color: '#6b7280', fontStyle: 'italic' }}>No sessions yet.</div>
              ) : null}
              {Array.isArray(mySessions) ? mySessions.map((s) => {
                const mentorId = String(s?.mentor?._id || s?.mentor || '');
                const menteeId = String(s?.mentee?._id || s?.mentee || '');
                const isMentor = String(currentUserId || '') && mentorId === String(currentUserId);
                const other = isMentor ? s.mentee : s.mentor;
                const canAcceptDecline = isMentor && s.status === 'requested';
                const canCancel = (mentorId === String(currentUserId) || menteeId === String(currentUserId)) && (s.status === 'requested' || s.status === 'accepted');
                const canComplete = isMentor && s.status === 'accepted';
                return (
                  <div key={s._id} style={{ border: '1px solid #e5e7eb', borderRadius: 14, padding: isMobile ? 12 : 14, background: '#ffffff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexDirection: isMobile ? 'column' : 'row' }}>
                      <div>
                        <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 800, color: '#111827' }}>
                          {isMentor ? 'Mentee' : 'Mentor'}: {other?.name || '—'}
                        </div>
                        <div style={{ marginTop: 4, fontSize: isMobile ? 11 : 12, color: '#6b7280' }}>
                          {new Date(s.startAt).toLocaleString()} → {new Date(s.endAt).toLocaleString()}
                        </div>
                        <div style={{ marginTop: 6, fontSize: isMobile ? 11 : 12, color: '#111827' }}>
                          Status: <span style={{ fontWeight: 800 }}>{s.status}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        {canAcceptDecline ? (
                          <>
                            <button onClick={() => onRespondSession(s._id, 'accept')} style={smallAction('#e1b11c', '#111827')}>Accept</button>
                            <button onClick={() => onRespondSession(s._id, 'decline')} style={smallAction('#ffffff', '#111827', true)}>Decline</button>
                          </>
                        ) : null}
                        {canComplete ? (
                          <button onClick={() => onRespondSession(s._id, 'complete')} style={smallAction('#3d4451', '#e4b118')}>Complete</button>
                        ) : null}
                        {canCancel ? (
                          <button onClick={() => onRespondSession(s._id, 'cancel')} style={smallAction('#ffffff', '#111827', true)}>Cancel</button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              }) : null}
            </div>
          ) : null}

          {type === 'volunteer' ? (
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 14, padding: isMobile ? 12 : 14, background: '#fafafa', display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexDirection: isMobile ? 'column' : 'row' }}>
                <div>
                  <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 800, color: '#111827' }}>Volunteer tracking</div>
                  <div style={{ marginTop: 4, fontSize: isMobile ? 11 : 12, color: '#6b7280' }}>
                    Total hours: {volunteerSummary?.totalVolunteerHours ?? 0}
                  </div>
                </div>
                {volunteerBusy ? (
                  <div style={{ fontSize: 12, color: '#6b7280', fontStyle: 'italic' }}>Loading…</div>
                ) : null}
              </div>

              <div style={{ border: '1px solid #e5e7eb', borderRadius: 14, padding: isMobile ? 12 : 14 }}>
                <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 800, color: '#111827', marginBottom: 10 }}>Community outreach & advocacy opportunities</div>
                {!volunteerBusy && (!Array.isArray(opportunities) || opportunities.length === 0) ? (
                  <div style={{ fontSize: 12, color: '#6b7280', fontStyle: 'italic' }}>No opportunities available right now.</div>
                ) : null}
                <div style={{ display: 'grid', gap: 10 }}>
                  {Array.isArray(opportunities) ? opportunities.map((o) => (
                    <div key={o._id} style={{ border: '1px solid #e5e7eb', borderRadius: 14, padding: isMobile ? 10 : 12, background: '#ffffff' }}>
                      <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 800, color: '#111827' }}>{o.title}</div>
                      <div style={{ marginTop: 4, fontSize: isMobile ? 11 : 12, color: '#6b7280' }}>
                        {[o.category, o.location].filter(Boolean).join(' • ')}
                      </div>
                      {o.description ? (
                        <div style={{ marginTop: 8, fontSize: isMobile ? 11 : 12, color: '#111827' }}>{o.description}</div>
                      ) : null}
                      <div style={{ marginTop: 10, display: 'flex', gap: 8, flexDirection: isMobile ? 'column' : 'row' }}>
                        <button onClick={() => onApplyOpportunity(o._id, 'volunteer')} style={smallAction('#e1b11c', '#111827')}>Apply as volunteer</button>
                        <button onClick={() => onApplyOpportunity(o._id, 'speaker')} style={smallAction('#3d4451', '#e4b118')}>Apply as speaker</button>
                      </div>
                    </div>
                  )) : null}
                </div>
              </div>

              <div style={{ border: '1px solid #e5e7eb', borderRadius: 14, padding: isMobile ? 12 : 14 }}>
                <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 800, color: '#111827', marginBottom: 10 }}>Log volunteer hours</div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
                  <input value={volunteerLog.title} onChange={(e) => setVolunteerLog((p) => ({ ...p, title: e.target.value }))} placeholder="Activity title" style={inputStyle} />
                  <input value={volunteerLog.category} onChange={(e) => setVolunteerLog((p) => ({ ...p, category: e.target.value }))} placeholder="Category (outreach/advocacy/etc.)" style={inputStyle} />
                  <input type="date" value={volunteerLog.date} onChange={(e) => setVolunteerLog((p) => ({ ...p, date: e.target.value }))} style={inputStyle} />
                  <input type="number" min="0" value={volunteerLog.hours} onChange={(e) => setVolunteerLog((p) => ({ ...p, hours: e.target.value }))} placeholder="Hours" style={inputStyle} />
                  <textarea value={volunteerLog.notes} onChange={(e) => setVolunteerLog((p) => ({ ...p, notes: e.target.value }))} placeholder="Notes (optional)" style={{ ...inputStyle, gridColumn: '1 / -1', minHeight: 90, resize: 'vertical' }} />
                </div>
                <div style={{ marginTop: 12, display: 'flex', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 10 : 0 }}>
                  <div style={{ fontSize: isMobile ? 11 : 12, color: '#6b7280', fontStyle: 'italic' }}>
                    Logs are reviewed by admins.
                  </div>
                  <button onClick={onSubmitVolunteerLog} style={{ ...smallAction('#e1b11c', '#111827'), width: isMobile ? '100%' : 'auto' }}>Submit log</button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 12,
  border: '1px solid #d1d5db',
  outline: 'none',
  fontSize: 13,
  background: '#ffffff',
  color: '#111827',
  boxSizing: 'border-box',
};

function smallAction(bg, color, outlined = false) {
  return {
    padding: '10px 16px',
    borderRadius: 10,
    border: outlined ? '1px solid #111827' : 'none',
    background: bg,
    color,
    fontWeight: 500,
    fontSize: 14,
    cursor: 'pointer',
  };
}
