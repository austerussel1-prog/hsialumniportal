import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from './components/Sidebar';
import { apiEndpoints } from './config/api';
import {
  File,
  Stack,
  Target,
  CalendarBlank,
  Folder,
  Briefcase,
  Users,
  User,
  Handshake,
  Bell,
} from '@phosphor-icons/react';

export default function AlumniManagement() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [mentorshipProfile, setMentorshipProfile] = useState(null);
  const [mentorshipSessions, setMentorshipSessions] = useState([]);

  const resolveProfileImage = (value) => {
    if (!value) return '/Logo.jpg';
    if (String(value).includes('gear-icon.svg')) return '/Logo.jpg';
    if (typeof value === 'string' && value.startsWith('/')) {
      return `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${value}`;
    }
    return value;
  };

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);


  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const quickActions = [
    { icon: File, label: 'Request a document', onClick: () => navigate('/documents') },
    { icon: Stack, label: 'Find a mentor', onClick: () => navigate('/mentorship') },
    { icon: Target, label: 'Browse jobs', onClick: () => navigate('/training') },
    { icon: CalendarBlank, label: 'View events', onClick: () => navigate('/events') },
  ];

  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    let mounted = true;
    async function fetchAnnouncements() {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(apiEndpoints.announcements, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (!res.ok) return;
        const data = await res.json();
        if (mounted) setAnnouncements(data);
      } catch (err) {
        // ignore for now
      }
    }
    fetchAnnouncements();
    return () => { mounted = false; };
  }, []);

  const [conversations, setConversations] = useState(null);
  const [activeNotificationIndex, setActiveNotificationIndex] = useState(0);
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState([]);

  const notificationStorageKey = useMemo(() => {
    const uid = String(user?.id || user?._id || user?.email || '').trim();
    return uid ? `alumniDashboardSeenNotifications_${uid}` : 'alumniDashboardSeenNotifications';
  }, [user]);

  useEffect(() => {
    let mounted = true;
    async function loadConvos() {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch(apiEndpoints.getConversations, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const data = await res.json();
        const convs = Array.isArray(data?.conversations) ? data.conversations.slice(0, 4) : [];
        if (mounted) setConversations(convs);
      } catch (err) {
        // ignore
      }
    }
    loadConvos();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadMentorshipNotifications() {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const [profileRes, sessionsRes] = await Promise.all([
          fetch(apiEndpoints.mentorshipProfile, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(apiEndpoints.mentorshipSessions, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        const profileData = await profileRes.json().catch(() => ({}));
        const sessionsData = await sessionsRes.json().catch(() => ({}));

        if (!mounted) return;
        if (profileRes.ok) {
          setMentorshipProfile(profileData?.profile || null);
        }
        if (sessionsRes.ok) {
          setMentorshipSessions(Array.isArray(sessionsData?.sessions) ? sessionsData.sessions : []);
        }
      } catch (err) {
        // ignore
      }
    }

    loadMentorshipNotifications();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem(notificationStorageKey);
    if (!raw) {
      setDismissedNotificationIds([]);
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      setDismissedNotificationIds(Array.isArray(parsed) ? parsed : []);
    } catch {
      setDismissedNotificationIds([]);
    }
  }, [notificationStorageKey]);

  useEffect(() => {
    localStorage.setItem(notificationStorageKey, JSON.stringify(dismissedNotificationIds));
  }, [dismissedNotificationIds, notificationStorageKey]);

  const dashboardNotifications = useMemo(() => {
    const items = [];

    if (mentorshipProfile?.status === 'approved') {
      items.push({
        id: `mentor-application-approved-${mentorshipProfile.reviewedAt || mentorshipProfile.updatedAt || 'latest'}`,
        text: 'Admin approved your mentor application.',
        source: 'Mentorship',
        onClick: () => navigate('/mentorship'),
      });
    }

    if (mentorshipProfile?.status === 'rejected') {
      items.push({
        id: `mentor-application-rejected-${mentorshipProfile.reviewedAt || mentorshipProfile.updatedAt || 'latest'}`,
        text: 'Admin rejected your mentor application.',
        source: 'Mentorship',
        onClick: () => navigate('/mentorship'),
      });
    }

    if (Array.isArray(mentorshipSessions)) {
      mentorshipSessions
        .filter((session) => ['accepted', 'declined'].includes(String(session?.status || '').toLowerCase()))
        .forEach((session) => {
          const mentorName = session?.mentor?.name || 'your mentor';
          const normalizedStatus = String(session?.status || '').toLowerCase();
          const decisionLabel = normalizedStatus === 'accepted' ? 'approved' : 'rejected';
          items.push({
            id: `session-${session._id || session.id}-${normalizedStatus}`,
            text: `${mentorName} ${decisionLabel} your session scheduling request.`,
            source: 'Mentorship',
            onClick: () => navigate('/mentorship'),
          });
        });
    }

    if (Array.isArray(announcements)) {
      announcements.slice(0, 6).forEach((announcement, idx) => {
        items.push({
          id: `announcement-${announcement._id || idx}`,
          text: `New announcement: ${announcement.title}`,
          source: 'Announcements',
          onClick: () => navigate(`/announcements?post=${announcement._id}`),
        });
      });
    }

    return items.filter((item) => !dismissedNotificationIds.includes(item.id));
  }, [announcements, mentorshipProfile, mentorshipSessions, dismissedNotificationIds, navigate]);

  useEffect(() => {
    setActiveNotificationIndex(0);
  }, [dashboardNotifications.length]);

  useEffect(() => {
    if (dashboardNotifications.length <= 1) {
      return;
    }

    const intervalId = setInterval(() => {
      setActiveNotificationIndex((prev) => (prev + 1) % dashboardNotifications.length);
    }, 3200);

    return () => clearInterval(intervalId);
  }, [dashboardNotifications.length]);

  const activeDashboardNotification = dashboardNotifications[activeNotificationIndex] || null;

  const dismissDashboardNotification = (notificationId) => {
    const id = String(notificationId || '').trim();
    if (!id) return;
    setDismissedNotificationIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      localStorage.setItem(notificationStorageKey, JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    const id = String(activeDashboardNotification?.id || '').trim();
    if (!id) return undefined;
    if (dismissedNotificationIds.includes(id)) return undefined;

    const timeoutId = setTimeout(() => {
      dismissDashboardNotification(id);
    }, 1800);

    return () => clearTimeout(timeoutId);
  }, [activeDashboardNotification, dismissedNotificationIds, notificationStorageKey]);

  const handleDashboardNotificationClick = (notification) => {
    if (!notification) return;
    dismissDashboardNotification(notification.id);
    setActiveNotificationIndex(0);
    if (typeof notification.onClick === 'function') {
      notification.onClick();
    }
  };

  const quickLinks = [
    { icon: Folder, title: 'Documents & records', subtitle: 'Request or view doc...', onClick: () => navigate('/documents') },
    { icon: Briefcase, title: 'Career & jobs', subtitle: 'Browse opportunities', onClick: () => navigate('/training') },
    { icon: CalendarBlank, title: 'Events', subtitle: 'Upcoming events', onClick: () => navigate('/events') },
    { icon: Users, title: 'Directory', subtitle: 'Connect with alumni', onClick: () => navigate('/directory') },
  ];

  const jumpTo = [
    { icon: User, label: 'Profile', onClick: () => navigate('/profile') },
    { icon: Folder, label: 'Documents', onClick: () => navigate('/documents') },
    { icon: Briefcase, label: 'Career', onClick: () => navigate('/training') },
    { icon: CalendarBlank, label: 'Events', onClick: () => navigate('/events') },
    { icon: Users, label: 'Directory', onClick: () => navigate('/directory') },
    { icon: Handshake, label: 'Mentorship', onClick: () => navigate('/mentorship') },
  ];
  const welcomeNameRaw = String(user?.fullName || user?.name || '').trim();
  const welcomeName = welcomeNameRaw ? welcomeNameRaw.split(/\s+/)[0] : '';

  return (
    <motion.div 
      className="am-page"
      style={{display: 'flex', minHeight: '100vh', background: '#faf8f3'}}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      <style>{`
        .am-clickable {
          transition: all 0.2s ease;
        }
        .am-clickable:hover {
          transform: translateY(-1px);
          border-color: #e0b245 !important;
          box-shadow: 0 8px 22px rgba(176, 122, 21, 0.12);
        }
        .am-link-btn {
          transition: color 0.2s ease, transform 0.2s ease;
        }
        .am-link-btn:hover {
          color: #8a5a00 !important;
          transform: translateX(2px);
        }
        .am-convo-row {
          width: 100%;
          border-radius: 10px;
          transition: background-color 0.2s ease, transform 0.2s ease;
        }
        .am-convo-row:hover {
          background: #fbf7ef;
          transform: translateX(2px);
        }
        .am-main {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .am-content {
          flex: 1;
          padding: 32px;
          display: flex;
          gap: 28px;
        }
        .am-left {
          flex: 1;
          min-width: 0;
        }
        .am-right {
          width: 300px;
          flex-shrink: 0;
        }
        @media (max-width: 1024px) {
          .am-content {
            padding: 20px !important;
            gap: 18px !important;
          }
          .am-quick-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
          .am-links-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
          .am-panels-grid {
            grid-template-columns: 1fr !important;
          }
          .am-right {
            width: 260px !important;
          }
        }
        @media (max-width: 900px) {
          .am-main {
            padding-top: 64px !important;
          }
          .am-content {
            padding: 14px !important;
            gap: 12px !important;
            overflow-x: hidden !important;
          }
          .am-welcome {
            padding: 16px !important;
            margin-bottom: 14px !important;
            overflow: visible !important;
          }
          .am-welcome-title {
            font-size: 20px !important;
            margin-bottom: 4px !important;
            display: block !important;
            line-height: 1.2 !important;
          }
          .am-welcome-subtitle {
            font-size: 12px !important;
            margin-bottom: 10px !important;
            display: block !important;
          }
          .am-quick-grid,
          .am-links-grid,
          .am-panels-grid {
            grid-template-columns: 1fr !important;
            gap: 10px !important;
          }
          .am-action-btn {
            padding: 12px !important;
            gap: 8px !important;
          }
          .am-action-icon {
            width: 34px !important;
            height: 34px !important;
          }
          .am-action-label {
            font-size: 12px !important;
            line-height: 1.2 !important;
          }
          .am-panel-card {
            padding: 12px !important;
          }
          .am-panel-title {
            font-size: 13px !important;
          }
          .am-panel-meta {
            font-size: 11px !important;
          }
          .am-right {
            display: none !important;
          }
          .am-link-card {
            padding: 12px !important;
            gap: 8px !important;
          }
          .am-link-icon {
            width: 32px !important;
            height: 32px !important;
          }
          .am-link-title {
            font-size: 12px !important;
            line-height: 1.2 !important;
          }
          .am-link-subtitle {
            font-size: 10px !important;
          }
          .am-convo-avatar {
            width: 36px !important;
            height: 36px !important;
          }
          .am-convo-date {
            font-size: 10px !important;
            white-space: nowrap !important;
          }
        }
        @media (max-width: 520px) {
          .am-quick-grid,
          .am-links-grid,
          .am-panels-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} toggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main Content */}
      <div className="am-main">
        {/* Main Content Area */}
        <div className="am-content">
          {/* Left Content */}
          <div className="am-left">
                        {/* Career & Job Opportunities section removed */}
            <div className="am-welcome" style={{background: '#fffaf2', border: '1px solid #efe4d3', borderRadius: '12px', padding: '22px 24px', marginBottom: '24px'}}>
              <h1 className="am-welcome-title" style={{fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '6px'}}>
                Welcome back{welcomeName ? `, ${welcomeName}` : ''}
              </h1>
              <p className="am-welcome-subtitle" style={{color: '#6b7280', marginBottom: '14px', fontSize: '13px'}}>Here's what's happening and quick access to everything you need.</p>
              <div style={{width: '40px', height: '3px', background: '#e0b245', borderRadius: '3px'}} />
            </div>

            {/* Quick Actions */}
            <div style={{marginBottom: '24px'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px'}}>
                <h2 style={{fontSize: '11px', fontWeight: '700', color: '#b07a15', textTransform: 'uppercase', letterSpacing: '0.08em'}}>Quick Actions</h2>
                <div style={{flex: 1, height: '1px', background: '#efe4d3'}} />
              </div>
              <div className="am-quick-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '14px'}}>
                {quickActions.map((action, index) => {
                  const IconComponent = action.icon;
                  return (
                    <button
                      key={index}
                      type="button"
                      className="am-clickable am-action-btn"
                      onClick={action.onClick}
                      style={{background: 'white', border: '1px solid #efe4d3', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer'}}
                    >
                      <div className="am-action-icon" style={{width: '44px', height: '44px', background: '#f7eddb', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                        <IconComponent size={20} color="#a86b00" />
                      </div>
                      <div className="am-action-label" style={{fontSize: '13px', fontWeight: '600', color: '#111827'}}>{action.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="am-panels-grid" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '24px'}}>
              <div
                role="button"
                className="am-clickable am-panel-card"
                onClick={() => navigate('/inbox')}
                style={{background: 'white', borderRadius: '12px', border: '1px solid #efe4d3', padding: '20px', cursor: 'pointer'}}
              >
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
                    <h2 className="am-panel-title" style={{fontSize: '16px', fontWeight: '700', color: '#111827'}}>Quick access to your inbox</h2>
                    <span style={{fontSize: '10px', color: '#b07a15', fontWeight: '700', letterSpacing: '0.08em'}}>THIS MONTH</span>
                  </div>
                  <div className="am-panel-meta" style={{fontSize: '12px', color: '#6b7280', marginBottom: '12px'}}>Quick access to your inbox - click to open</div>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                    {conversations === null ? (
                      <div style={{color: '#6b7280'}}>Loading inbox...</div>
                    ) : Array.isArray(conversations) && conversations.length > 0 ? (
                      conversations.map((c, idx) => {
                        const displayName = c.participant?.fullName || c.participant?.name || 'User';
                        const displayRole = c.participant?.jobTitle || 'Alumni member';
                        const participantId = String(
                          c.participant?.id || c.participant?._id || c.participantId || c.userId || ''
                        );
                        return (
                          <button
                            key={idx}
                            type="button"
                            className="am-convo-row"
                            onClick={(event) => {
                              event.stopPropagation();
                              if (participantId) {
                                navigate(`/inbox?recipient=${encodeURIComponent(participantId)}`);
                              } else {
                                navigate('/inbox');
                              }
                            }}
                            style={{display: 'flex', gap: '12px', alignItems: 'center', border: 'none', background: 'none', padding: 0, textAlign: 'left', cursor: 'pointer'}}
                          >
                            <div className="am-convo-avatar" style={{width: '44px', height: '44px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0}}>
                              <img
                                src={resolveProfileImage(c.participant?.profileImage)}
                                alt={displayName}
                                style={{width: '100%', height: '100%', objectFit: 'cover'}}
                                onError={(e) => { e.currentTarget.src = '/Logo.jpg'; }}
                              />
                            </div>
                            <div style={{flex: 1}}>
                              <div style={{fontWeight: '600', color: '#111827', marginBottom: '4px', fontSize: '13px'}}>{displayName}</div>
                              <div style={{fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{displayRole}</div>
                            </div>
                            <div className="am-convo-date" style={{fontSize: '12px', color: '#6b7280'}}>{new Date(c.lastMessageAt).toLocaleDateString()}</div>
                          </button>
                      )})
                    ) : (
                      <div style={{fontSize: '12px', color: '#6b7280'}}>No recent messages yet.</div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="am-link-btn"
                    onClick={() => navigate('/inbox')}
                    style={{marginTop: '12px', fontSize: '12px', color: '#b07a15', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer'}}
                  >
                    Go to Inbox -&gt;
                  </button>
                </div>

              <div className="am-panel-card" style={{background: 'white', borderRadius: '12px', border: '1px solid #efe4d3', padding: '20px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px'}}>
                  <h2 className="am-panel-title" style={{fontSize: '16px', fontWeight: '700', color: '#111827'}}>Recent announcements</h2>
                  <span style={{fontSize: '10px', color: '#b07a15', fontWeight: '700', letterSpacing: '0.08em'}}>LATEST</span>
                </div>
                <div style={{display: 'flex', flexDirection: 'column', gap: '14px'}}>
                  {announcements.map((announcement, index) => (
                    <div
                      className="am-clickable"
                      key={index}
                      onClick={() => navigate(`/announcements?post=${announcement._id}`)}
                      style={{paddingBottom: '12px', borderBottom: index < announcements.length - 1 ? '1px solid #f0e7db' : 'none', cursor: 'pointer'}}
                    >
                      <div style={{fontWeight: '600', color: '#111827', marginBottom: '6px', fontSize: '13px'}}>{announcement.title}</div>
                      <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                        <span style={{background: '#f8ead0', color: '#b07a15', padding: '3px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '600'}}>{announcement.category}</span>
                        <span style={{fontSize: '11px', color: '#6b7280'}}>{announcement.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{textAlign: 'right', marginTop: '12px'}}>
                  <button
                    type="button"
                    className="am-link-btn"
                    onClick={() => navigate('/announcements')}
                    style={{fontSize: '12px', color: '#b07a15', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer'}}
                  >
                    View all -&gt;
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px'}}>
                <h2 style={{fontSize: '11px', fontWeight: '700', color: '#b07a15', textTransform: 'uppercase', letterSpacing: '0.08em'}}>Quick Links</h2>
                <div style={{flex: 1, height: '1px', background: '#efe4d3'}} />
              </div>
              <div className="am-links-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '14px'}}>
                {quickLinks.map((link, index) => {
                  const LinkIcon = link.icon;
                  return (
                    <div key={index} style={{position: 'relative'}}>
                      <button
                        type="button"
                        className="am-clickable am-link-card"
                        onClick={link.onClick}
                        style={{background: 'white', border: '1px solid #efe4d3', borderRadius: '12px', padding: '16px', display: 'flex', gap: '12px', alignItems: 'center', cursor: 'pointer', textAlign: 'left', width: '100%'}}
                      >
                        <div className="am-link-icon" style={{width: '40px', height: '40px', background: '#f7eddb', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                          <LinkIcon size={18} color="#a86b00" />
                        </div>
                        <div>
                          <div className="am-link-title" style={{fontSize: '13px', fontWeight: '600', color: '#111827'}}>{link.title}</div>
                          <div className="am-link-subtitle" style={{fontSize: '11px', color: '#6b7280'}}>{link.subtitle}</div>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="am-right">
            <div style={{background: 'white', borderRadius: '12px', border: '1px solid #efe4d3', padding: '18px', marginBottom: '18px'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                {user?.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt="Profile"
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '999px',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <div style={{width: '44px', height: '44px', background: '#f7eddb', borderRadius: '999px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <User size={20} color="#a86b00" />
                  </div>
                )}
                <div>
                  <div style={{fontWeight: '600', color: '#111827', fontSize: '13px'}}>{user?.fullName || 'You'}</div>
                  <div style={{fontSize: '11px', color: '#6b7280'}}>{user?.jobTitle || 'Alumni member'}</div>
                </div>
              </div>
              <button
                type="button"
                className="am-link-btn"
                onClick={() => navigate('/profile')}
                style={{marginTop: '12px', fontSize: '12px', color: '#b07a15', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer'}}
              >
                View profile -&gt;
              </button>

              <div style={{marginTop: '14px', borderTop: '1px solid #f1e6d5', paddingTop: '12px'}}>
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '6px', color: '#374151', fontSize: '12px', fontWeight: '700'}}>
                    <Bell size={14} color="#d4a017" />
                    Notifications
                  </div>
                  <span style={{background: '#f8ead0', color: '#8a5a00', border: '1px solid #f2cf7c', borderRadius: '999px', padding: '2px 8px', fontSize: '11px', fontWeight: '700'}}>
                    {dashboardNotifications.length}
                  </span>
                </div>

                <div style={{minHeight: '44px', display: 'flex', alignItems: 'center'}}>
                  {activeDashboardNotification ? (
                    <motion.div
                      key={activeDashboardNotification.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                      style={{width: '100%'}}
                    >
                      <button
                        type="button"
                        onClick={() => handleDashboardNotificationClick(activeDashboardNotification)}
                        style={{
                          border: 'none',
                          background: 'none',
                          padding: 0,
                          margin: 0,
                          width: '100%',
                          textAlign: 'left',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{fontSize: '12px', color: '#1f2937', lineHeight: '1.4'}}>{activeDashboardNotification.text}</div>
                        <div style={{fontSize: '10px', color: '#8a5a00', marginTop: '2px', fontWeight: '600'}}>{activeDashboardNotification.source} • Click to view</div>
                      </button>
                    </motion.div>
                  ) : (
                    <div style={{fontSize: '12px', color: '#6b7280'}}>No notifications yet.</div>
                  )}
                </div>

                {dashboardNotifications.length > 1 && (
                  <div style={{fontSize: '10px', color: '#9ca3af', marginTop: '4px'}}>
                    Auto-rotating {activeNotificationIndex + 1}/{dashboardNotifications.length}
                  </div>
                )}
              </div>
            </div>

            <div style={{background: 'white', borderRadius: '12px', border: '1px solid #efe4d3', padding: '16px', marginBottom: '18px'}}>
              <div style={{fontSize: '10px', fontWeight: '700', color: '#6b7280', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px'}}>Jump to</div>
              <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                {jumpTo.map((item, index) => {
                  const JumpIcon = item.icon;
                  return (
                    <button
                      key={index}
                      type="button"
                      className="am-clickable"
                      onClick={item.onClick}
                      style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', border: '1px solid #efe4d3', borderRadius: '10px', color: '#6b7280', fontSize: '12px', fontWeight: '600', background: 'white', cursor: 'pointer', textAlign: 'left'}}
                    >
                      <JumpIcon size={14} color="#8b8b8b" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{background: '#fff7e6', borderRadius: '12px', border: '1px solid #f2cf7c', padding: '14px', marginBottom: '18px'}}>
              <div style={{fontSize: '10px', fontWeight: '700', color: '#b07a15', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px'}}>Tip</div>
              <div style={{fontSize: '12px', color: '#8a5a00', lineHeight: '1.5'}}>Request transcripts or certificates from Documents - usually ready in 3-5 days.</div>
            </div>

            <div style={{background: 'white', borderRadius: '12px', border: '1px solid #efe4d3', padding: '16px'}}>
              <div style={{fontSize: '13px', fontWeight: '700', color: '#111827', marginBottom: '6px'}}>Need help?</div>
              <div style={{fontSize: '12px', color: '#6b7280', lineHeight: '1.5'}}>Check Announcements for updates or Documents for request status.</div>
              <button
                type="button"
                className="am-link-btn"
                onClick={() => navigate('/announcements')}
                style={{marginTop: '10px', fontSize: '12px', color: '#b07a15', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer'}}
              >
                Announcements -&gt;
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}


