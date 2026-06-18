import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from './components/Sidebar';
import { apiEndpoints, resolveApiAssetUrl } from './config/api';
import {
  File,
  Stack,
  Target,
  CalendarBlank,
  Folder,
  Briefcase,
  Users,
} from '@phosphor-icons/react';

export default function AlumniDashboard() {
  const RECENT_ITEMS_LIMIT = 3;
  const fallbackProfileImage = '/Logo.jpg';

  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const resolveProfileImage = (value) => {
    const imageValue = String(value || '').trim();
    if (!imageValue) return fallbackProfileImage;
    if (imageValue.includes('gear-icon.svg')) return fallbackProfileImage;
    if (imageValue.includes('via.placeholder.com')) return fallbackProfileImage;
    if (imageValue === fallbackProfileImage) return fallbackProfileImage;
    if (['null', 'undefined'].includes(imageValue.toLowerCase())) return fallbackProfileImage;
    return resolveApiAssetUrl(imageValue);
  };
  const isFallbackProfileImage = (value) => resolveProfileImage(value) === fallbackProfileImage;

  // Get user data from localStorage
  const userData = localStorage.getItem('user');
  const user = userData ? JSON.parse(userData) : null;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  
  if (!user) {
    return (
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f3f4f6'}}>
        <div style={{textAlign: 'center', background: 'white', padding: '40px', borderRadius: '8px'}}>
          <p style={{fontSize: '18px', color: 'red'}}>No user logged in</p>
        </div>
      </div>
    );
  }

  const quickActions = [
    { icon: File, label: 'Request a document' },
    { icon: Stack, label: 'Find a mentor', onClick: () => navigate('/mentorship') },
    { icon: Target, label: 'Browse jobs', onClick: () => navigate('/training/jobs') },
    { icon: CalendarBlank, label: 'View events' },
  ];

  const [conversations, setConversations] = useState(null);
  const [recommendedJobs, setRecommendedJobs] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function loadConversations() {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch(apiEndpoints.getConversations, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const convs = Array.isArray(data?.conversations) ? data.conversations.slice(0, RECENT_ITEMS_LIMIT) : [];
        if (mounted) setConversations(convs);
      } catch (err) {
        // ignore
      }
    }
    loadConversations();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadRecommendedJobs() {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch(`${apiEndpoints.recommendedJobs}?limit=3`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          if (mounted) setRecommendedJobs([]);
          return;
        }
        const data = await res.json();
        const jobs = Array.isArray(data?.jobs) ? data.jobs : [];
        if (mounted) setRecommendedJobs(jobs);
      } catch (err) {
        if (mounted) setRecommendedJobs([]);
      }
    }
    loadRecommendedJobs();
    return () => { mounted = false; };
  }, []);

  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    let mounted = true;
    async function loadAnnouncements() {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(apiEndpoints.announcements, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (!res.ok) return;
        const data = await res.json();
        if (mounted) setAnnouncements(data);
      } catch (err) {
        // silently ignore for now
      }
    }
    loadAnnouncements();
    return () => { mounted = false; };
  }, []);

  const quickLinks = [
    { icon: Folder, title: 'Documents & records', subtitle: 'Request or view doc...' },
    { icon: Briefcase, title: 'Career & jobs', subtitle: 'Browse opportunities' },
    { icon: CalendarBlank, title: 'Events', subtitle: 'Upcoming events' },
    { icon: Users, title: 'Directory', subtitle: 'Connect with alumni' },
  ];
  const recentAnnouncements = Array.isArray(announcements)
    ? announcements.slice(0, RECENT_ITEMS_LIMIT)
    : [];

  return (
    <motion.div 
      style={{display: 'flex', height: '100vh', background: '#f3f4f6', overflow: 'hidden'}}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      <style>{`
        .ad-convo-row {
          width: 100%;
          border-radius: 10px;
          transition: background-color 0.2s ease, transform 0.2s ease;
        }
        .ad-convo-row:hover {
          background: #f9fafb;
          transform: translateX(2px);
        }
      `}</style>
     
      <Sidebar isOpen={sidebarOpen} toggle={() => setSidebarOpen(!sidebarOpen)} />

 
      <div style={{flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
       
        <div style={{background: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <h1 style={{fontSize: '20px', fontWeight: 'bold', color: '#333'}}>Welcome, {user?.name}</h1>
          <button 
            onClick={handleLogout}
            style={{padding: '8px 16px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}
          >
            Logout
          </button>
        </div>

       
        <div style={{flex: 1, overflowY: 'auto', padding: '32px'}}>
      
          <div style={{marginBottom: '32px'}}>
            <h1 style={{fontSize: '32px', fontWeight: 'bold', color: '#111827', marginBottom: '8px'}}>Welcome back</h1>
            <p style={{color: '#4b5563'}}>Here's what's happening and quick access to everything you need.</p>
            <button
              onClick={() => navigate('/mentorship')}
              style={{marginTop: '16px', padding: '10px 18px', background: '#3d4451', color: 'white', border: 'none', borderRadius: '999px', cursor: 'pointer', fontWeight: '600'}}
            >
              Jump to mentorship
            </button>
          </div>

          
          <div style={{marginBottom: '32px'}}>
            <h2 style={{fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', marginBottom: '16px'}}>QUICK ACTIONS</h2>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px'}}>
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  style={{background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '24px', textAlign: 'left', cursor: 'pointer'}}
                >
                  <div style={{width: '48px', height: '48px', background: '#fef3c7', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px'}}>
                    <action.icon size={24} color="#d97706" />
                  </div>
                  <h3 style={{fontWeight: '500', color: '#111827'}}>{action.label}</h3>
                </button>
              ))}
            </div>
          </div>

          <div style={{background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px', marginBottom: '32px'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap', marginBottom: '16px'}}>
              <div>
                <h2 style={{fontSize: '20px', fontWeight: 'bold', color: '#111827', margin: 0}}>Recommended jobs for you</h2>
                <div style={{fontSize: '12px', color: '#6b7280', marginTop: '4px'}}>Suggestions are based on your profile skills, course, role, and career keywords.</div>
              </div>
              <button onClick={() => navigate('/training/jobs')} style={{fontSize: '12px', color: '#b07a15', fontWeight: '700', background: 'none', border: 'none', cursor: 'pointer'}}>View all jobs -&gt;</button>
            </div>
            {recommendedJobs === null ? (
              <div style={{color: '#6b7280', fontSize: '13px'}}>Finding jobs that match your profile...</div>
            ) : recommendedJobs.length === 0 ? (
              <div style={{border: '1px dashed #d1d5db', borderRadius: '8px', padding: '16px', color: '#6b7280', fontSize: '13px'}}>
                No recommendations yet. Update your profile skills and career details to improve job suggestions.
              </div>
            ) : (
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '12px'}}>
                {recommendedJobs.map((job) => {
                  const jobId = String(job?._id || job?.id || '');
                  const keywords = Array.isArray(job?.matchedKeywords) ? job.matchedKeywords.slice(0, 3) : [];
                  return (
                    <button
                      key={jobId || `${job.company}-${job.position}`}
                      type="button"
                      onClick={() => navigate(jobId ? `/training/job-details/${encodeURIComponent(jobId)}` : '/training/jobs')}
                      style={{textAlign: 'left', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', cursor: 'pointer', minWidth: 0, overflow: 'hidden', boxSizing: 'border-box'}}
                    >
                      <div style={{display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start', flexWrap: 'wrap'}}>
                        <div style={{fontSize: '15px', fontWeight: '800', color: '#111827', lineHeight: 1.2, minWidth: 0, flex: '1 1 180px', overflowWrap: 'anywhere'}}>{job.position || 'Job opening'}</div>
                        <span style={{background: '#ecfdf5', color: '#047857', borderRadius: '999px', padding: '4px 8px', fontSize: '11px', fontWeight: '800', whiteSpace: 'nowrap', flex: '0 0 auto'}}>
                          {Number(job.matchScore || 0)}% match
                        </span>
                      </div>
                      <div style={{marginTop: '8px', fontSize: '13px', color: '#4b5563', lineHeight: 1.35, overflowWrap: 'anywhere'}}>{job.company || 'Company'} - {job.location || 'Location not set'}</div>
                      <div style={{marginTop: '8px', fontSize: '12px', color: '#6b7280', overflowWrap: 'anywhere'}}>{job.type || job.category || 'Opportunity'}</div>
                      {keywords.length > 0 ? (
                        <div style={{marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap'}}>
                          {keywords.map((keyword) => (
                            <span key={keyword} style={{background: '#fef3c7', color: '#92400e', borderRadius: '999px', padding: '4px 8px', fontSize: '11px', fontWeight: '700', maxWidth: '100%', overflowWrap: 'anywhere'}}>
                              {keyword}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '32px'}}>
          
            <div
              role="button"
              onClick={() => navigate('/inbox')}
              style={{background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px', cursor: 'pointer'}}
            >
              <h2 style={{fontSize: '20px', fontWeight: 'bold', color: '#111827', marginBottom: '12px'}}>Quick access to your inbox</h2>
              <div style={{fontSize: '12px', color: '#6b7280', marginBottom: '12px'}}>Quick access to your inbox - click to open</div>
              <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                {conversations === null ? (
                  <div style={{color: '#6b7280'}}>Loading inbox...</div>
                ) : conversations.length === 0 ? (
                  <div style={{fontSize: '12px', color: '#6b7280'}}>No recent messages yet.</div>
                ) : (
                  conversations.map((c, i) => {
                    const displayName = c.participant?.fullName || c.participant?.name || 'User';
                    const displayRole = c.participant?.jobTitle || 'Alumni member';
                    const participantId = String(
                      c.participant?.id || c.participant?._id || c.participantId || c.userId || ''
                    );
                    return (
                      <button
                        key={i}
                        type="button"
                        className="ad-convo-row"
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
                        <div style={{width: '46px', height: '46px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0}}>
                          <img
                            src={resolveProfileImage(c.participant?.profileImage)}
                            alt={displayName}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: isFallbackProfileImage(c.participant?.profileImage) ? 'contain' : 'cover',
                              padding: isFallbackProfileImage(c.participant?.profileImage) ? '5px' : 0,
                              background: '#f7eddb',
                            }}
                            onError={(e) => {
                              e.currentTarget.src = fallbackProfileImage;
                              e.currentTarget.style.objectFit = 'contain';
                              e.currentTarget.style.padding = '5px';
                            }}
                          />
                        </div>
                        <div style={{flex: 1}}>
                          <div style={{fontWeight: '600', color: '#111827', marginBottom: '4px', fontSize: '13px'}}>{displayName}</div>
                          <div style={{fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{displayRole}</div>
                        </div>
                        <div style={{fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap'}}>{new Date(c.lastMessageAt).toLocaleDateString()}</div>
                      </button>
                    );
                  })
                )}
              </div>
              <button onClick={() => navigate('/inbox')} style={{marginTop: '12px', fontSize: '12px', color: '#b07a15', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer'}}>Go to Inbox -&gt;</button>
            </div>

          
            <div style={{background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px'}}>
              <h2 style={{fontSize: '20px', fontWeight: 'bold', color: '#111827', marginBottom: '24px'}}>Recent announcements</h2>
              <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                {recentAnnouncements.map((announcement, index) => (
                  <div
                    key={index}
                    onClick={() => navigate(`/announcements?post=${announcement._id}`)}
                    style={{paddingBottom: '16px', borderBottom: index < recentAnnouncements.length - 1 ? '1px solid #e5e7eb' : 'none', cursor: 'pointer'}}
                  >
                    <h3 style={{fontWeight: '500', color: '#111827', marginBottom: '8px'}}>{announcement.title}</h3>
                    <div style={{display: 'flex', gap: '8px'}}>
                      <span style={{background: '#fef3c7', color: '#b45309', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '500'}}>{announcement.category}</span>
                      <span style={{fontSize: '12px', color: '#6b7280'}}>{announcement.date}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{textAlign: 'right', marginTop: '12px'}}>
                <button onClick={() => navigate('/announcements')} style={{fontSize: '12px', color: '#b07a15', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer'}}>View all -&gt;</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}


