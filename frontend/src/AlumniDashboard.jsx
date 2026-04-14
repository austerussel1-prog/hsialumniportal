import React, { useState, useEffect } from 'react';
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
} from '@phosphor-icons/react';

export default function AlumniDashboard() {
  const RECENT_INBOX_LIMIT = 5;
  const RECENT_ANNOUNCEMENTS_LIMIT = 5;

  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const resolveProfileImage = (value) => {
    if (!value) return '/Logo.jpg';
    if (String(value).includes('gear-icon.svg')) return '/Logo.jpg';
    if (typeof value === 'string' && value.startsWith('/')) {
      return `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${value}`;
    }
    return value;
  };

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
    { icon: Target, label: 'Browse jobs' },
    { icon: CalendarBlank, label: 'View events' },
  ];

  const [conversations, setConversations] = useState(null);

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
        const convs = Array.isArray(data?.conversations)
          ? data.conversations.slice(0, RECENT_INBOX_LIMIT)
          : [];
        if (mounted) setConversations(convs);
      } catch (err) {
        // ignore
      }
    }
    loadConversations();
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
    ? announcements.slice(0, RECENT_ANNOUNCEMENTS_LIMIT)
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
                            style={{width: '100%', height: '100%', objectFit: 'cover'}}
                            onError={(e) => { e.currentTarget.src = '/Logo.jpg'; }}
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


