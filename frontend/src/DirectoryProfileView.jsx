import React, { useEffect, useState } from 'react';
import ChatPopup from './components/ChatPopup';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LinkedinLogo, TwitterLogo, InstagramLogo, Phone, EnvelopeSimple, ChatCircleText, GraduationCap, Star, BookOpen, Briefcase } from '@phosphor-icons/react';
import Sidebar from './components/Sidebar';
import { apiEndpoints, resolveApiAssetUrl } from './config/api';

export default function DirectoryProfileView() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userId } = useParams();
  const fallbackProfileImage = '/Logo.jpg';
  const resolveProfileImage = (value) => {
    if (!value) return fallbackProfileImage;
    if (String(value).includes('gear-icon.svg')) return fallbackProfileImage;
    if (value.includes('via.placeholder.com')) return fallbackProfileImage;
    return value;
  };
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth <= 900 : false
  ));
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [profileState, setProfileState] = useState('ok');
  const [hoverButton, setHoverButton] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [minimizedChat, setMinimizedChat] = useState(false);

  const isFromAchievementsBadges = location?.state?.from === 'achievements-badges';
  const isFromAchievementsFeatured = location?.state?.from === 'achievements-featured';
  const explicitBackLink = location?.state?.backLink && typeof location.state.backLink === 'object'
    ? location.state.backLink
    : null;

  const resolvedBackLink = explicitBackLink || (isFromAchievementsBadges
    ? { pathname: '/achievements', label: 'Alumni Badges', state: { activeTab: 'badges' } }
    : isFromAchievementsFeatured
      ? { pathname: '/achievements', label: 'Featured Alumni', state: { activeTab: 'featured' } }
      : { pathname: '/directory', label: 'Directory' });

  const handleBack = () => {
    const targetPath = `${resolvedBackLink.pathname || '/directory'}${resolvedBackLink.search || ''}`;
    navigate(targetPath, resolvedBackLink.state ? { state: resolvedBackLink.state } : undefined);
  };

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const profileUrl = `${apiEndpoints.directoryUser(userId)}?t=${Date.now()}`;
        const response = await fetch(profileUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: 'no-store',
        });

        if (!response.ok) {
          setProfile(null);
          setProfileState(response.status === 403 ? 'private' : 'notfound');
          setLoading(false);
          return;
        }

        const data = await response.json();
        setProfile(data?.user || null);
        setProfileState(data?.user ? 'ok' : 'notfound');
      } catch (err) {
        setProfile(null);
        setProfileState('notfound');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [userId]);

  const profileData = profile ? {
    fullName: profile.fullName || profile.name || 'User',
    jobTitle: profile.jobTitle || profile.role || 'Member',
    email: profile.email || 'user@example.com',
    phone: profile.contactNumber || '+1 (555) 123-4567',
    graduationYear: profile.graduationYear || '',
    major: profile.major || '',
    company: profile.company || '',
    languages: profile.languages || 'EN',
    education: profile.education || 'Not specified',
    skills: profile.skills || 'Not specified',
    bio: profile.bio || 'No bio available.',
    bio2: profile.bio2 || '',
    profileImage: resolveProfileImage(profile.profileImage),
    linkedinUrl: profile.linkedinUrl || '',
    twitterUrl: profile.twitterUrl || '',
    instagramUrl: profile.instagramUrl || '',
    projects: Array.isArray(profile.projects) ? profile.projects : [],
    careerDocuments: Array.isArray(profile.careerDocuments) ? profile.careerDocuments : [],
  } : null;

  return (
    <motion.div
      style={{ display: 'flex', minHeight: '100vh', background: '#f6f2ea', overflowX: 'hidden' }}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      <style>{`
        @keyframes sweepRight {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0%);
          }
        }
      `}</style>
      <Sidebar isOpen={sidebarOpen} toggle={() => setSidebarOpen(!sidebarOpen)} />

      <div style={{ flex: 1, minWidth: 0, width: '100%', maxWidth: '100%', overflowX: 'hidden', padding: isMobile ? '16px 12px' : '28px 36px' }}>
        <button
          onClick={handleBack}
          style={{
            background: 'none',
            border: 'none',
            color: '#8a5a00',
            fontWeight: 600,
            fontSize: isMobile ? '14px' : '15px',
            cursor: 'pointer',
            marginBottom: '18px',
            textAlign: 'left',
          }}
        >
          {`<- Back to ${resolvedBackLink.label || 'Directory'}`}
        </button>

        {loading && (
          <div style={{ textAlign: 'center', color: '#6b7280' }}>Loading profile...</div>
        )}

        {!loading && !profile && profileState === 'private' && (
          <div
            style={{
              maxWidth: '760px',
              margin: '24px auto 0',
              background: '#fff',
              border: '1px solid #f59e0b',
              borderRadius: 14,
              padding: '24px 22px',
              textAlign: 'center',
              boxShadow: '0 4px 10px rgba(0, 0, 0, 0.08)',
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 8 }}>Private Profile</div>
            <div style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.5 }}>
              This user has set their profile visibility to private, so profile details are hidden in Directory &amp; Networking.
            </div>
            <button
              type="button"
              onClick={handleBack}
              style={{
                marginTop: 16,
                border: 'none',
                borderRadius: 999,
                background: '#f4b000',
                color: '#1f2937',
                fontWeight: 700,
                fontSize: 13,
                padding: '8px 14px',
                cursor: 'pointer',
              }}
            >
              {`Back to ${resolvedBackLink.label || 'Directory'}`}
            </button>
          </div>
        )}

        {!loading && !profile && profileState !== 'private' && (
          <div style={{ textAlign: 'center', color: '#6b7280' }}>Profile not found.</div>
        )}

        {!loading && profileData && (
          <div
            style={{
              maxWidth: '1400px',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: isMobile ? '18px' : '28px' }}>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    borderRadius: '16px',
                    padding: isMobile ? '18px 14px' : '28px',
                    color: '#111827',
                    marginBottom: '24px',
                    display: 'flex',
                    gap: isMobile ? '16px' : '24px',
                    alignItems: 'center',
                    border: '1px solid #d49a00',
                    boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
                    background: '#d9a520',
                    overflow: 'hidden',
                    boxSizing: 'border-box',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'center' : 'center', gap: isMobile ? '16px' : '24px', width: '100%' }}>
                    <img
                      src={profileData.profileImage}
                      alt="Profile"
                      style={{
                        width: isMobile ? '86px' : '120px',
                        height: isMobile ? '86px' : '120px',
                        borderRadius: '12px',
                        border: '4px solid white',
                        objectFit: 'cover',
                        boxShadow: '0 6px 18px rgba(0,0,0,0.2)',
                      }}
                      onError={(event) => {
                        event.currentTarget.src = fallbackProfileImage;
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
                      <h1 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: '800', margin: '0 0 8px 0', color: '#111827', textAlign: isMobile ? 'center' : 'left', overflowWrap: 'anywhere' }}>
                        {profileData.fullName}
                      </h1>
                      <p style={{ fontSize: isMobile ? '15px' : '16px', margin: 0, color: '#7a5b00', fontWeight: '600', textAlign: isMobile ? 'center' : 'left', overflowWrap: 'anywhere' }}>
                        {profileData.jobTitle}
                      </p>
                      <div style={{ marginTop: '12px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', width: '100%' }}>
                        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', gap: '10px', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
                          <button
                            onMouseEnter={() => setHoverButton('linkedin')}
                            onMouseLeave={() => setHoverButton(null)}
                            onClick={() => profileData.linkedinUrl && window.open(profileData.linkedinUrl, '_blank')}
                            style={{
                              background: '#0A66C2',
                              color: 'white',
                              border: 'none',
                              borderRadius: '999px',
                              padding: '8px 14px',
                              cursor: profileData.linkedinUrl ? 'pointer' : 'default',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '13px',
                              fontWeight: '600',
                              position: 'relative',
                              overflow: 'hidden',
                              opacity: profileData.linkedinUrl ? 1 : 0.5,
                              boxShadow: '0 4px 10px rgba(0,0,0,0.12)',
                              width: isMobile ? '100%' : 'auto',
                              minWidth: 0,
                              justifyContent: 'center',
                            }}
                          >
                            {hoverButton === 'linkedin' && (
                              <span style={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                width: '100%',
                                height: '100%',
                                background: 'rgba(255, 255, 255, 0.3)',
                                borderRadius: '999px',
                                transform: 'translateX(-100%)',
                                animation: 'sweepRight 0.5s ease forwards',
                              }} />
                            )}
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative', zIndex: 1 }}>
                              <LinkedinLogo size={16} />
                              Linkedin
                            </span>
                          </button>
                          <button
                            onMouseEnter={() => setHoverButton('twitter')}
                            onMouseLeave={() => setHoverButton(null)}
                            onClick={() => profileData.twitterUrl && window.open(profileData.twitterUrl, '_blank')}
                            style={{
                              background: '#1DA1F2',
                              color: 'white',
                              border: 'none',
                              borderRadius: '999px',
                              padding: '8px 14px',
                              cursor: profileData.twitterUrl ? 'pointer' : 'default',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '13px',
                              fontWeight: '600',
                              position: 'relative',
                              overflow: 'hidden',
                              opacity: profileData.twitterUrl ? 1 : 0.5,
                              boxShadow: '0 4px 10px rgba(0,0,0,0.12)',
                              width: isMobile ? '100%' : 'auto',
                              minWidth: 0,
                              justifyContent: 'center',
                            }}
                          >
                            {hoverButton === 'twitter' && (
                              <span style={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                width: '100%',
                                height: '100%',
                                background: 'rgba(255, 255, 255, 0.3)',
                                borderRadius: '999px',
                                transform: 'translateX(-100%)',
                                animation: 'sweepRight 0.5s ease forwards',
                              }} />
                            )}
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative', zIndex: 1 }}>
                              <TwitterLogo size={16} />
                              Twitter
                            </span>
                          </button>
                          <button
                            onMouseEnter={() => setHoverButton('instagram')}
                            onMouseLeave={() => setHoverButton(null)}
                            onClick={() => profileData.instagramUrl && window.open(profileData.instagramUrl, '_blank')}
                            style={{
                              background: '#E1306C',
                              color: 'white',
                              border: 'none',
                              borderRadius: '999px',
                              padding: '8px 14px',
                              cursor: profileData.instagramUrl ? 'pointer' : 'default',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '13px',
                              fontWeight: '600',
                              position: 'relative',
                              overflow: 'hidden',
                              opacity: profileData.instagramUrl ? 1 : 0.5,
                              boxShadow: '0 4px 10px rgba(0,0,0,0.12)',
                              width: isMobile ? '100%' : 'auto',
                              minWidth: 0,
                              justifyContent: 'center',
                            }}
                          >
                            {hoverButton === 'instagram' && (
                              <span style={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                width: '100%',
                                height: '100%',
                                background: 'rgba(255, 255, 255, 0.3)',
                                borderRadius: '999px',
                                transform: 'translateX(-100%)',
                                animation: 'sweepRight 0.5s ease forwards',
                              }} />
                            )}
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative', zIndex: 1 }}>
                              <InstagramLogo size={16} />
                              Instagram
                            </span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onMouseEnter={() => setHoverButton('message')}
                          onMouseLeave={() => setHoverButton(null)}
                          onClick={() => setShowChat(true)}
                          style={{
                            background: '#f3ede3',
                            color: '#8a5a00',
                            border: '1px solid #e4d6c4',
                            borderRadius: '999px',
                            padding: '8px 16px',
                            fontSize: '13px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.12)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            position: 'relative',
                            overflow: 'hidden',
                            flexShrink: 0,
                            width: isMobile ? '100%' : 'auto',
                            minWidth: 0,
                            justifyContent: 'center',
                          }}
                        >
                                <style>{`
                                  .chat-popup-animate {
                                    animation: chatPopupIn 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
                                  }
                                  .chat-popup-minimize {
                                    animation: chatPopupOut 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
                                  }
                                  @keyframes chatPopupIn {
                                    from { transform: translateY(60px) scale(0.95); opacity: 0; }
                                    to { transform: translateY(0) scale(1); opacity: 1; }
                                  }
                                  @keyframes chatPopupOut {
                                    from { transform: translateY(0) scale(1); opacity: 1; }
                                    to { transform: translateY(60px) scale(0.95); opacity: 0; }
                                  }
                                  .chat-popup-bar-animate {
                                    animation: chatBarIn 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
                                  }
                                  @keyframes chatBarIn {
                                    from { transform: translateY(60px); opacity: 0; }
                                    to { transform: translateY(0); opacity: 1; }
                                  }
                                `}</style>
                                {showChat && profileData && !minimizedChat && (
                                  <div className="chat-popup-animate">
                                    <ChatPopup
                                      recipientId={userId}
                                      recipientName={profileData.fullName}
                                      onClose={() => {
                                        setMinimizedChat(true);
                                      }}
                                    />
                                  </div>
                                )}
                                {showChat && profileData && minimizedChat && (
                                  <div
                                    className="chat-popup-bar-animate"
                                    style={{
                                      position: 'fixed',
                                      bottom: isMobile ? '16px' : '32px',
                                      right: isMobile ? '12px' : '32px',
                                      left: isMobile ? '12px' : 'auto',
                                      width: isMobile ? 'auto' : '220px',
                                      height: '48px',
                                      background: '#fff',
                                      borderRadius: '18px',
                                      boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                                      border: '1px solid #efe5d7',
                                      zIndex: 9999,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      cursor: 'pointer',
                                      transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                    }}
                                    onClick={() => {
                                      // Add fade out for bar, fade in for popup
                                      const bar = document.querySelector('.chat-popup-bar-animate');
                                      if (bar) {
                                        bar.style.animation = 'chatPopupOut 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)';
                                        setTimeout(() => {
                                          setMinimizedChat(false);
                                        }, 180);
                                      } else {
                                        setMinimizedChat(false);
                                      }
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '16px', fontWeight: 700 }}>
                                      <ChatCircleText size={20} color="#8a5a00" />
                                      {profileData.fullName}
                                    </div>
                                    <div style={{ paddingRight: '16px', color: '#8a5a00', fontSize: '18px' }}>▲</div>
                                  </div>
                                )}
                          {hoverButton === 'message' && (
                            <span style={{
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              width: '100%',
                              height: '100%',
                              background: 'rgba(255, 255, 255, 0.3)',
                              borderRadius: '999px',
                              transform: 'translateX(-100%)',
                              animation: 'sweepRight 0.5s ease forwards',
                            }} />
                          )}
                          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative', zIndex: 1 }}>
                            <ChatCircleText size={16} />
                            Message
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: isMobile ? '18px 14px' : '24px',
                    marginBottom: '24px',
                    border: '1px solid #efe5d7',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                  }}
                >
                  <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px', color: '#111827' }}>
                    About Me
                  </h2>
                  <div>
                    <p style={{ color: '#6b7280', lineHeight: '1.6', marginBottom: '12px' }}>
                      {profileData.bio}
                    </p>
                    {profileData.bio2 && (
                      <p style={{ color: '#6b7280', lineHeight: '1.6' }}>
                        {profileData.bio2}
                      </p>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: isMobile ? '18px 14px' : '24px',
                    border: '1px solid #efe5d7',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0, color: '#111827' }}>
                      Project Table
                    </h2>
                  </div>

                  {profileData.projects.length === 0 ? (
                    <p style={{ color: '#9ca3af' }}>No projects added yet.</p>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', minWidth: isMobile ? '560px' : '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                            <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '12px', fontWeight: '700', color: '#d97706', textTransform: 'uppercase' }}>Project</th>
                            <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '12px', fontWeight: '700', color: '#d97706', textTransform: 'uppercase' }}>Link</th>
                            <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '12px', fontWeight: '700', color: '#d97706', textTransform: 'uppercase' }}>Industry</th>
                            <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '12px', fontWeight: '700', color: '#d97706', textTransform: 'uppercase' }}>Role</th>
                          </tr>
                        </thead>
                        <tbody>
                          {profileData.projects.map((project) => (
                            <tr key={project.id || project._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                              <td style={{ padding: '16px 8px' }}>
                                <span style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>{project.name}</span>
                              </td>
                              <td style={{ padding: '16px 8px' }}>
                                <a href={project.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: '14px', color: '#3b82f6', textDecoration: 'none' }}>
                                  {project.link}
                                </a>
                              </td>
                              <td style={{ padding: '16px 8px', fontSize: '14px', color: '#6b7280' }}>{project.industry || '-'}</td>
                              <td style={{ padding: '16px 8px', fontSize: '14px', color: '#6b7280' }}>{project.role || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: isMobile ? '18px 14px' : '24px',
                    marginBottom: '24px',
                    border: '1px solid #efe5d7',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0, color: '#111827' }}>
                      More Details
                    </h2>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <Phone size={18} color="#b07a15" />
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>Number</span>
                    </div>
                    <p style={{ color: '#6b7280', margin: 0, fontSize: '14px' }}>{profileData.phone}</p>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <EnvelopeSimple size={18} color="#b07a15" />
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>Email</span>
                    </div>
                    <p style={{ color: '#6b7280', margin: 0, fontSize: '14px' }}>{profileData.email}</p>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <ChatCircleText size={18} color="#b07a15" />
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>Languages</span>
                    </div>
                    <p style={{ color: '#6b7280', margin: 0, fontSize: '14px' }}>{profileData.languages}</p>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <GraduationCap size={18} color="#b07a15" />
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>Graduation Year</span>
                    </div>
                    <p style={{ color: '#6b7280', margin: 0, fontSize: '14px' }}>{profileData.graduationYear || '-'}</p>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <BookOpen size={18} color="#b07a15" />
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>Major</span>
                    </div>
                    <p style={{ color: '#6b7280', margin: 0, fontSize: '14px' }}>{profileData.major || '-'}</p>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <Briefcase size={18} color="#b07a15" />
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>Company</span>
                    </div>
                    <p style={{ color: '#6b7280', margin: 0, fontSize: '14px' }}>{profileData.company || '-'}</p>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <GraduationCap size={18} color="#b07a15" />
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>Education</span>
                    </div>
                    <p style={{ color: '#6b7280', margin: 0, fontSize: '14px' }}>{profileData.education}</p>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <Star size={18} color="#b07a15" />
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>Skills</span>
                    </div>
                    <p style={{ color: '#6b7280', margin: 0, fontSize: '14px' }}>{profileData.skills}</p>
                  </div>
                </div>

                <div
                  style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: isMobile ? '18px 14px' : '24px',
                    border: '1px solid #efe5d7',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                  }}
                >
                  <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: '#111827' }}>
                    Career Documents
                  </h2>

                  {profileData.careerDocuments.length === 0 ? (
                    <p style={{ color: '#9ca3af' }}>No documents uploaded.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {profileData.careerDocuments.map((file) => {
                        const name = typeof file === 'string'
                          ? file
                          : (file.name || file.filename || file.originalName || 'Document');
                        const url = typeof file === 'object' ? resolveApiAssetUrl(file.url || file.link || '') : null;
                        return (
                          <div
                            key={file.id || file._id || name}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '16px',
                              padding: '16px',
                              background: '#f9fafb',
                              borderRadius: '12px',
                              border: '1px solid #e5e7eb',
                            }}
                          >
                            <div style={{
                              width: '48px',
                              height: '48px',
                              borderRadius: '50%',
                              background: '#10b981',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontSize: '20px',
                              fontWeight: '700',
                              flexShrink: 0,
                            }}>
                              {name.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              {url ? (
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    margin: 0,
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    color: '#2563eb',
                                    textDecoration: 'none',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    display: 'block',
                                  }}
                                >
                                  {name}
                                </a>
                              ) : (
                                <p style={{
                                  margin: 0,
                                  fontSize: '14px',
                                  fontWeight: '600',
                                  color: '#111827',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}>
                                  {name}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
