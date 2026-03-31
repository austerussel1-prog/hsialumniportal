import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from './components/Sidebar';
import { apiEndpoints, resolveApiAssetUrl } from './config/api';

const sortOptions = ['Sort By', 'Name', 'Department', 'Role'];

export default function DirectoryPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 900;
  });
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('Department');
  const [status, setStatus] = useState('Status');
  const [role, setRole] = useState('Role');
  const [tag, setTag] = useState('Tag');
  const [sortBy, setSortBy] = useState('Sort By');
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const mapUsersToProfiles = (users) => users.map((user) => {
    const userId = user.id || user._id;
    const skills = typeof user.skills === 'string'
      ? user.skills.split(',').map((item) => item.trim()).filter(Boolean)
      : [];
    const highlights = [user.bio, user.bio2].filter(Boolean);
    const departmentLabel = user.major
      ? `${user.major} Department`
      : 'Alumni Department';

    const roleLabel = user.role ? user.role.replace('_', ' ') : 'Member';
    const statusLabel = user.status === 'approved' || !user.status ? 'Active' : user.status;

    return {
      id: userId,
      name: user.name || user.fullName || user.email,
      title: user.jobTitle || roleLabel,
      department: departmentLabel,
      status: statusLabel,
      role: roleLabel,
      tag: user.company ? 'Onsite' : 'Remote',
      highlights,
      skills,
      avatar: (user.profileImage && !String(user.profileImage).includes('gear-icon.svg'))
        ? resolveApiAssetUrl(user.profileImage)
        : '/Logo.jpg',
      email: user.email || '',
    };
  });

  useEffect(() => {
    const loadDirectory = async () => {
      try {
        const token = localStorage.getItem('token');
        setLoadError('');

        let cachedUsers = null;
        const cached = sessionStorage.getItem('directoryUsers')
          || localStorage.getItem('directoryUsersCache');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
              cachedUsers = parsed;
              setProfiles(mapUsersToProfiles(parsed));
              setLoading(false);
            }
          } catch (err) {
            sessionStorage.removeItem('directoryUsers');
            localStorage.removeItem('directoryUsersCache');
          }
        }

        const directoryUrl = `${apiEndpoints.directoryUsers}?t=${Date.now()}`;
        const response = await fetch(directoryUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: 'no-store',
        });

        let data = null;
        if (response.ok) {
          data = await response.json();
        } else if (response.status === 304 && cached) {
          setLoading(false);
          return;
        } else {
          const fallbackUrl = `${apiEndpoints.allUsers}?t=${Date.now()}`;
          const fallback = await fetch(fallbackUrl, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: 'no-store',
          });

          if (fallback.ok) {
            data = await fallback.json();
          } else if (fallback.status === 304 && cached) {
            setLoading(false);
            return;
          } else {
            setProfiles([]);
            setLoadError('Unable to load directory users.');
            setLoading(false);
            return;
          }
        }

        const users = Array.isArray(data.users) ? data.users : [];
        // Exclude the current logged-in user from the directory list
        let currentUser = null;
        try {
          const raw = localStorage.getItem('user');
          if (raw) currentUser = JSON.parse(raw);
        } catch (e) {
          currentUser = null;
        }
        const filteredUsers = users.filter((u) => {
          if (!currentUser) return true;
          const userId = u.id || u._id || (u._id && u._id.toString && u._id.toString());
          const currentId = currentUser.id || currentUser._id || (currentUser._id && currentUser._id.toString && currentUser._id.toString());
          if (userId && currentId && userId.toString() === currentId.toString()) return false;
          if (u.email && currentUser.email && u.email === currentUser.email) return false;
          return true;
        });
        if (users.length === 0 && cachedUsers?.length) {
          // also filter cached users to remove current user
          const cachedFiltered = (cachedUsers || []).filter((u) => {
            if (!currentUser) return true;
            const userId = u.id || u._id || (u._id && u._id.toString && u._id.toString());
            const currentId = currentUser.id || currentUser._id || (currentUser._id && currentUser._id.toString && currentUser._id.toString());
            if (userId && currentId && userId.toString() === currentId.toString()) return false;
            if (u.email && currentUser.email && u.email === currentUser.email) return false;
            return true;
          });
          setProfiles(mapUsersToProfiles(cachedFiltered));
          setLoading(false);
          return;
        }

        setProfiles(mapUsersToProfiles(filteredUsers));

        if (users.length > 0) {
          try {
            const serialized = JSON.stringify(users);
            sessionStorage.setItem('directoryUsers', serialized);
            localStorage.setItem('directoryUsersCache', serialized);
          } catch (err) {
            // Ignore storage quota errors; keep in-memory list visible.
          }
        }
      } catch (err) {
        setProfiles([]);
        setLoadError('Unable to load directory users.');
      } finally {
        setLoading(false);
      }
    };

    loadDirectory();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 900);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const departmentOptions = useMemo(() => {
    const values = Array.from(new Set(profiles.map((item) => item.department))).sort();
    return ['Department', ...values];
  }, [profiles]);

  const statusOptions = useMemo(() => {
    const values = Array.from(new Set(profiles.map((item) => item.status))).sort();
    return ['Status', ...values];
  }, [profiles]);

  const roleOptions = useMemo(() => {
    const values = Array.from(new Set(profiles.map((item) => item.role))).sort();
    return ['Role', ...values];
  }, [profiles]);

  const tagOptions = useMemo(() => {
    const values = Array.from(new Set(profiles.map((item) => item.tag))).sort();
    return ['Tag', ...values];
  }, [profiles]);

  const filteredProfiles = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    let results = profiles.filter((profile) => {
      const matchesSearch = !normalizedSearch
        || `${profile.name} ${profile.title} ${profile.department}`.toLowerCase().includes(normalizedSearch);
      const matchesDepartment = department === 'Department' || profile.department === department;
      const matchesStatus = status === 'Status' || profile.status === status;
      const matchesRole = role === 'Role' || profile.role === role;
      const matchesTag = tag === 'Tag' || profile.tag === tag;
      return matchesSearch && matchesDepartment && matchesStatus && matchesRole && matchesTag;
    });

    if (sortBy === 'Name') {
      results = [...results].sort((a, b) => a.name.localeCompare(b.name));
    }
    if (sortBy === 'Department') {
      results = [...results].sort((a, b) => a.department.localeCompare(b.department));
    }
    if (sortBy === 'Role') {
      results = [...results].sort((a, b) => a.role.localeCompare(b.role));
    }
    return results;
  }, [search, department, status, role, tag, sortBy]);

  const hasDefaultFilters = !search
    && department === 'Department'
    && status === 'Status'
    && role === 'Role'
    && tag === 'Tag';

  const visibleProfiles = hasDefaultFilters && profiles.length > 0
    ? profiles
    : filteredProfiles;

  const handleClearFilters = () => {
    setSearch('');
    setDepartment('Department');
    setStatus('Status');
    setRole('Role');
    setTag('Tag');
    setSortBy('Sort By');
  };

  return (
    <motion.div
      style={{ display: 'flex', minHeight: '100vh', background: '#f3f4f6' }}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      <Sidebar isOpen={sidebarOpen} toggle={() => setSidebarOpen(!sidebarOpen)} />

      <div style={{ flex: 1, padding: isMobile ? '74px 10px 18px' : '28px 36px 40px' }}>
        <div style={{ marginBottom: isMobile ? '10px' : '22px' }}>
          <h1 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: '800', color: '#111827', margin: 0 }}>
            Directory &amp; <span style={{ color: '#e1aa18' }}>Networking</span>
          </h1>
          <p style={{ marginTop: isMobile ? '4px' : '6px', fontSize: isMobile ? '12px' : '13px', color: '#6b7280', fontStyle: 'italic' }}>
            Connect with colleagues and expand your professional network.
          </p>
        </div>

        <div
          style={{
            background: '#fff',
            borderRadius: '14px',
            padding: isMobile ? '10px' : '18px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
            marginBottom: isMobile ? '12px' : '24px',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1.2fr', gap: isMobile ? '8px' : '16px', marginBottom: isMobile ? '8px' : '16px' }}>
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9ca3af',
                  fontSize: '14px',
                }}
              >
                Q
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isMobile ? 'Search' : 'Search by name, position, or department...'}
                style={{
                  width: '100%',
                  padding: isMobile ? '9px 12px 9px 36px' : '12px 14px 12px 36px',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  fontSize: isMobile ? '12px' : '13px',
                }}
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                padding: isMobile ? '9px 12px' : '12px 14px',
                fontSize: isMobile ? '12px' : '13px',
                background: '#fff',
              }}
            >
              {sortOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(5, minmax(0, 1fr))', gap: isMobile ? '8px' : '12px' }}>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              style={{ borderRadius: '12px', border: '1px solid #e5e7eb', padding: isMobile ? '8px 10px' : '10px 12px', background: '#f9fafb', fontSize: isMobile ? '12px' : '13px' }}
            >
              {departmentOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ borderRadius: '12px', border: '1px solid #e5e7eb', padding: isMobile ? '8px 10px' : '10px 12px', background: '#f9fafb', fontSize: isMobile ? '12px' : '13px' }}
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{ borderRadius: '12px', border: '1px solid #e5e7eb', padding: isMobile ? '8px 10px' : '10px 12px', background: '#f9fafb', fontSize: isMobile ? '12px' : '13px' }}
            >
              {roleOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <select
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              style={{ borderRadius: '12px', border: '1px solid #e5e7eb', padding: isMobile ? '8px 10px' : '10px 12px', background: '#f9fafb', fontSize: isMobile ? '12px' : '13px' }}
            >
              {tagOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <button
              onClick={handleClearFilters}
              style={{
                gridColumn: isMobile ? '1 / -1' : 'auto',
                background: '#f4b400',
                border: 'none',
                color: '#fff',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: isMobile ? '12px' : '12px',
                minHeight: isMobile ? '36px' : 'auto',
                cursor: 'pointer',
                textTransform: 'uppercase',
              }}
            >
              Clear
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: isMobile ? '10px' : '20px' }}>
          {loading && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#6b7280' }}>
              Loading directory...
            </div>
          )}
          {!loading && loadError && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#b91c1c' }}>
              {loadError}
            </div>
          )}
          {!loading && visibleProfiles.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#6b7280' }}>
              No alumni found in the directory.
            </div>
          )}
          {!loading && visibleProfiles.map((profile) => (
            <div
              key={profile.id}
              style={{
                background: '#fff',
                borderRadius: '16px',
                border: '1px solid #e5e7eb',
                padding: isMobile ? '10px' : '18px',
                boxShadow: '0 6px 14px rgba(15, 23, 42, 0.06)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: isMobile ? '11px' : '14px', fontWeight: 700 }}>{profile.title}</div>
                <span
                  style={{
                    fontSize: isMobile ? '9px' : '10px',
                    fontWeight: 700,
                    padding: isMobile ? '3px 8px' : '4px 10px',
                    borderRadius: '999px',
                    border: '1px solid #d1d5db',
                    color: profile.status === 'Remote' ? '#2563eb' : '#16a34a',
                  }}
                >
                  {profile.status.toUpperCase()}
                </span>
              </div>

              <div style={{ display: 'flex', gap: isMobile ? '8px' : '12px', alignItems: 'center', marginTop: isMobile ? '8px' : '12px' }}>
                <img
                  src={profile.avatar}
                  alt={profile.name}
                  onError={(event) => { event.currentTarget.src = '/Logo.jpg'; }}
                  style={{ width: isMobile ? '36px' : '54px', height: isMobile ? '36px' : '54px', borderRadius: isMobile ? '10px' : '14px', objectFit: 'cover' }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: isMobile ? '12px' : '16px' }}>{profile.name}</div>
                  <div style={{ fontSize: isMobile ? '10px' : '12px', color: '#6b7280' }}>{profile.department}</div>
                </div>
              </div>

              <div style={{ marginTop: isMobile ? '8px' : '12px', display: 'grid', gap: isMobile ? '4px' : '6px', fontSize: isMobile ? '10px' : '12px', color: '#6b7280' }}>
                {(isMobile ? profile.highlights.slice(0, 2) : profile.highlights).map((item) => (
                  <div key={item} style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ color: '#e1aa18' }}>✓</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              {profile.skills.length > 0 && (
                <div style={{ marginTop: isMobile ? '8px' : '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {(isMobile ? profile.skills.slice(0, 2) : profile.skills).map((skill) => (
                    <span
                      key={skill}
                      style={{
                        fontSize: isMobile ? '10px' : '11px',
                        padding: isMobile ? '3px 7px' : '4px 8px',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        color: '#4b5563',
                        background: '#f9fafb',
                      }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}

              <div style={{ marginTop: isMobile ? '10px' : '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  onClick={() => navigate(`/directory/profile/${profile.id}`)}
                  style={{
                    background: '#f4b400',
                    border: 'none',
                    color: '#111827',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  View Profile
                </button>
                {profile.email ? (
                  <a
                    href={`mailto:${profile.email}`}
                    onClick={(e) => {
                      e.preventDefault();
                      try {
                        const email = profile.email || '';
                        const domain = (email.split('@')[1] || '').toLowerCase();
                        // Use webmail compose pages for popular providers when available
                        if (domain.includes('gmail.com') || domain.includes('googlemail.com')) {
                          const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`;
                          window.open(url, '_blank');
                          return;
                        }
                        if (domain.includes('outlook.com') || domain.includes('hotmail.com') || domain.includes('live.com') || domain.includes('msn.com')) {
                          const url = `https://outlook.live.com/owa/?path=/mail/action/compose&to=${encodeURIComponent(email)}`;
                          window.open(url, '_blank');
                          return;
                        }
                        // Fallback to mailto which will open default mail client if configured
                        window.location.href = `mailto:${email}`;
                      } catch (err) {
                        // last resort: use mailto
                        window.location.href = `mailto:${profile.email}`;
                      }
                    }}
                    style={{
                      display: 'inline-block',
                      textDecoration: 'none',
                      textAlign: 'center',
                      background: '#fff',
                      border: '1px solid #e5e7eb',
                      color: '#374151',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      fontWeight: 600,
                      fontSize: '14px',
                      cursor: 'pointer',
                    }}
                    aria-label={`Email ${profile.name}`}
                  >
                    Connect
                  </a>
                ) : (
                  <button
                    disabled
                    title="No contact email"
                    style={{
                      background: '#fff',
                      border: '1px solid #e5e7eb',
                      color: '#9ca3af',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      fontWeight: 600,
                      fontSize: '14px',
                      cursor: 'not-allowed',
                    }}
                  >
                    Connect
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
