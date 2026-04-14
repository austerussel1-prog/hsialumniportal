import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { createProfileBackLink } from './config/profileNavigation';
import Sidebar from './components/Sidebar';
import { apiEndpoints, resolveApiAssetUrl } from './config/api';

// Small inline SVG icons
const PhotoIcon = () => (
  <svg className="inline align-middle mr-1" width="18" height="18" fill="none" stroke="#6b7280" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="12.5" r="1.5"/></svg>
);
const VideoIcon = () => (
  <svg className="inline align-middle mr-1" width="18" height="18" fill="none" stroke="#6b7280" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="5" width="15" height="14" rx="2"/><polygon points="16 7 22 12 16 17 16 7"/></svg>
);
const EventIcon = () => (
  <svg className="inline align-middle mr-1" width="18" height="18" fill="none" stroke="#6b7280" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
);

const ReactionHeartIcon = ({ liked, size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={liked ? '#ff173d' : 'none'}
    stroke={liked ? '#ff173d' : '#f472b6'}
    strokeWidth={liked ? '1.2' : '1.9'}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={{
      display: 'block',
      filter: liked ? 'drop-shadow(0 2px 4px rgba(255, 23, 61, 0.28))' : 'none',
      transition: 'fill 160ms ease, stroke 160ms ease, transform 160ms ease',
      transform: liked ? 'scale(1.02)' : 'scale(1)',
    }}
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const resolveProfileImage = (value) => {
  if (!value) return '/Logo.jpg';
  if (String(value).includes('gear-icon.svg')) return '/Logo.jpg';
  return resolveApiAssetUrl(value);
};

const inferAttachmentKind = (attachmentUrl, attachment = {}) => {
  const explicitKind = String(attachment?.kind || '').trim().toLowerCase();
  if (explicitKind === 'image' || explicitKind === 'video') return explicitKind;

  const mimeType = String(attachment?.mimeType || attachment?.type || '').trim().toLowerCase();
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';

  const normalizedUrl = String(attachmentUrl || '').trim().toLowerCase().split('?')[0];
  if (/\.(png|jpe?g|gif|bmp|webp|avif|svg)$/i.test(normalizedUrl)) return 'image';
  if (/\.(mp4|webm|ogg|mov|m4v|avi)$/i.test(normalizedUrl)) return 'video';

  return 'image';
};

const normalizeAnnouncementAttachments = (announcement) => {
  const attachments = Array.isArray(announcement?.attachments) ? announcement.attachments : [];

  return attachments
    .map((attachment) => {
      if (!attachment) return null;

      const rawUrl = [
        attachment.url,
        attachment.src,
        attachment.mediaUrl,
        attachment.imageUrl,
        attachment.videoUrl,
        attachment.attachmentUrl,
      ].find((value) => typeof value === 'string' && value.trim());

      if (!rawUrl) return null;

      return {
        ...attachment,
        kind: inferAttachmentKind(rawUrl, attachment),
        resolvedUrl: resolveApiAssetUrl(rawUrl),
      };
    })
    .filter((attachment) => Boolean(attachment?.resolvedUrl));
};

const resolveDisplayName = (person, fallback = 'User') => {
  if (!person) return fallback;
  return person.fullName || person.name || fallback;
};

const resolveProfileSubtitle = (person) => {
  if (!person) return 'Alumni member';
  if (person.jobTitle && String(person.jobTitle).trim()) return person.jobTitle;

  const role = String(person.role || '').toLowerCase();
  if (role === 'super_admin') return 'Super Admin';
  if (role === 'admin') return 'Admin';
  if (role === 'alumni_officer') return 'Alumni Officer';
  if (role === 'hr') return 'HR';
  if (role === 'alumni') return 'Alumni';
  if (role === 'user') return 'Alumni member';
  return 'Alumni member';
};

const MAX_ANNOUNCEMENT_VIDEO_BYTES = 100 * 1024 * 1024;

const showToast = (type, text) => {
  window.dispatchEvent(new CustomEvent('hsi-toast', {
    detail: {
      type,
      message: text,
      text,
    },
  }));
};

export default function AnnouncementsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Company News');
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('Newest');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [openCommentId, setOpenCommentId] = useState(null);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmDeleteTitle, setConfirmDeleteTitle] = useState('');
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [mediaPreview, setMediaPreview] = useState('');
  const [mediaType, setMediaType] = useState('');
  const [sideRailTop, setSideRailTop] = useState(16);
  const [useFixedRails, setUseFixedRails] = useState(false);
  const fileInputRef = useRef(null);
  const searchRowRef = useRef(null);

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) setUser(JSON.parse(u));
    fetchAnnouncements();
  }, []);

  useEffect(() => {
    const updateRails = () => {
      if (typeof window === 'undefined') return;
      const wide = window.matchMedia('(min-width: 1024px)').matches;
      setUseFixedRails(wide);

      if (!wide || !searchRowRef.current) {
        setSideRailTop(16);
        return;
      }

      const searchTop = searchRowRef.current.getBoundingClientRect().top;
      setSideRailTop(Math.max(16, Math.round(searchTop)));
    };

    updateRails();
    window.addEventListener('scroll', updateRails, { passive: true });
    window.addEventListener('resize', updateRails);
    return () => {
      window.removeEventListener('scroll', updateRails);
      window.removeEventListener('resize', updateRails);
    };
  }, []);

  // If a query param 'post' is present (e.g. /announcements?post=<id>), open that announcement after load
  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const postId = params.get('post');
    if (!postId) return;
    // wait until announcements are loaded then open
    if (announcements && announcements.length > 0) {
      const found = announcements.find(x => x._id === postId);
      if (found) setSelectedAnnouncement(found);
    }
  }, [location.search, announcements]);

  // derive filtered announcements by active category
  const filteredAnnouncements = announcements.filter(a => {
    if (!activeCategory || activeCategory === 'All') return true;
    // some docs might have no category
    return (a.category || 'Company News') === activeCategory;
  });

  // apply search and sort
  const displayedAnnouncements = filteredAnnouncements
    .filter(a => {
      if (!searchQuery || !searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const title = (a.title || '').toLowerCase();
      const content = (a.content || '').toLowerCase();
      const author = (a.author && (a.author.name || a.author.fullName)) ? String(a.author.name || a.author.fullName).toLowerCase() : '';
      return title.includes(q) || content.includes(q) || author.includes(q);
    })
    .sort((x, y) => {
      const dx = new Date(x.createdAt).getTime() || 0;
      const dy = new Date(y.createdAt).getTime() || 0;
      if (sortOrder === 'Oldest') return dx - dy;
      // default Newest
      return dy - dx;
    });

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const res = await fetch(apiEndpoints.announcements, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const msg = errBody.message || res.statusText || `HTTP ${res.status}`;
        console.error('Announcements fetch failed:', res.status, msg);
        setError(`Failed to fetch announcements: ${msg}`);
        setAnnouncements([]);
        return;
      }
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [];
      setAnnouncements(arr);
      if (selectedAnnouncement) {
        const updated = arr.find(x => x._id === selectedAnnouncement._id);
        if (updated) setSelectedAnnouncement(updated);
      }
    } catch (e) {
      console.error('Announcements fetch error:', e);
      setError(`Failed to fetch announcements: ${e.message || e}`);
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = user && ['super_admin', 'admin', 'hr', 'alumni_officer'].includes(user.role);
  const currentUserId = user?._id || user?.id;
  const navigate = useNavigate();

  const toggleMenu = (id) => {
    setMenuOpenId(prev => (prev === id ? null : id));
  };

  const handlePost = async () => {
    if (!title.trim() && !content.trim()) {
      showToast('error', 'Title or content required.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      let res;
      if (selectedMedia) {
        const fd = new FormData();
        fd.append('title', title);
        fd.append('content', content);
        fd.append('category', category);
        fd.append('media', selectedMedia);
        fd.append('mediaType', mediaType || (selectedMedia.type && selectedMedia.type.startsWith('video') ? 'video' : 'image'));
        res = await fetch(apiEndpoints.announcements, {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: fd
        });
      } else {
        res = await fetch(apiEndpoints.announcements, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ title, content, category })
        });
      }

      // surface backend error messages for easier debugging
      const resBody = await res.json().catch(() => null);
      if (!res.ok) {
        const message = resBody?.message || resBody?.error || `Post failed (HTTP ${res.status})`;
        console.error('Announcement POST failed', res.status, resBody);
        showToast('error', message);
        return;
      }
      setTitle('');
      setContent('');
      setSelectedMedia(null);
      setMediaPreview('');
      setMediaType('');
      window.dispatchEvent(new CustomEvent('hsi-toast', {
        detail: {
          type: 'success',
          message: 'Announcement posted successfully.',
        },
      }));
      fetchAnnouncements();
    } catch (e) {
      showToast('error', 'Failed to post announcement.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleHeart = async (id) => {
    if (!currentUserId) {
      setError('Please sign in to react');
      return;
    }

    // Optimistically update UI
    setAnnouncements(prev => prev.map(a => {
      if (a._id !== id) return a;
      const liked = (a.hearts || []).some(h => String(h) === String(currentUserId));
      const newHearts = liked ? (a.hearts || []).filter(h => String(h) !== String(currentUserId)) : [...(a.hearts || []), currentUserId];
      return { ...a, hearts: newHearts };
    }));

    if (selectedAnnouncement && selectedAnnouncement._id === id) {
      const liked = (selectedAnnouncement.hearts || []).some(h => String(h) === String(currentUserId));
      const newHearts = liked ? (selectedAnnouncement.hearts || []).filter(h => String(h) !== String(currentUserId)) : [...(selectedAnnouncement.hearts || []), currentUserId];
      setSelectedAnnouncement({ ...selectedAnnouncement, hearts: newHearts });
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(apiEndpoints.heartAnnouncement(id), {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || res.statusText || 'Failed to heart');
      }
      // do not refresh; server state assumed consistent
    } catch (e) {
      console.error('Heart error', e);
      setError('Failed to update reaction');
      // revert optimistic update on error
      fetchAnnouncements();
    }
  };

  const handleOpenComment = (id) => {
    setOpenCommentId(prev => (prev === id ? null : id));
  };

  const handleDraftChange = (id, value) => {
    setCommentDrafts(prev => ({ ...prev, [id]: value }));
  };

  const submitComment = async (id, textParam) => {
    const text = (typeof textParam === 'string' ? textParam : (commentDrafts[id] || '')).trim();
    if (!text) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(apiEndpoints.commentAnnouncement(id), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ text })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || res.statusText || 'Failed to comment');
      }
      setCommentDrafts(prev => ({ ...prev, [id]: '' }));
      setOpenCommentId(null);
      fetchAnnouncements();
    } catch (e) {
      console.error('Comment error', e);
      setError('Failed to add comment');
    }
  };

  // show confirmation modal for delete
  const handleDeleteAnnouncement = (id) => {
    const ann = announcements.find(a => a._id === id);
    setConfirmDeleteId(id);
    setConfirmDeleteTitle(ann?.title || 'this announcement');
    setMenuOpenId(null);
  };

  // perform delete after confirmation
  const deleteAnnouncementConfirmed = async (id) => {
    if (!id) return;
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please sign in to delete');
      setConfirmDeleteId(null);
      return;
    }

    const ann = announcements.find(a => a._id === id);
    const isAuthor = ann && ann.author && String(ann.author._id || ann.author) === String(currentUserId);
    if (!isAuthor && !isAdmin) {
      setError('You do not have permission to delete this announcement');
      setConfirmDeleteId(null);
      return;
    }

    try {
      const res = await fetch(apiEndpoints.announcement(id), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error('Delete failed', res.status, body);
        setError(body.message || res.statusText || `Failed to delete (HTTP ${res.status})`);
        setConfirmDeleteId(null);
        return;
      }
      // remove from UI
      setAnnouncements(prev => prev.filter(a => a._id !== id));
      if (selectedAnnouncement && selectedAnnouncement._id === id) setSelectedAnnouncement(null);
      setMenuOpenId(null);
      setError('');
      window.dispatchEvent(new CustomEvent('hsi-toast', {
        detail: {
          type: 'success',
          message: body.message || 'Announcement deleted successfully.',
        },
      }));
    } catch (e) {
      console.error('Delete error', e);
      setError('Failed to delete announcement: ' + (e.message || e));
    } finally {
      setConfirmDeleteId(null);
      setConfirmDeleteTitle('');
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <main className="flex-1 p-4 pt-20 sm:p-6 sm:pt-20 md:pt-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-[#111827] leading-tight mb-2 sm:text-4xl">
            Announcements <span className="text-[#F2C94C]">&Updates</span>
          </h1>
          <p className="text-sm text-[#6b7280] italic font-normal mb-2">Stay informed with company news, policy changes, and community stories.</p>
        </div>

        <div className="mt-4 grid w-full grid-cols-1 items-start gap-6 lg:grid-cols-[16rem_minmax(0,1fr)_20rem]">
          {/* Left categories */}
          <aside className="w-full self-start">
            <div
              className={`bg-white rounded-2xl p-4 border border-gray-200 ${useFixedRails ? 'announcements-rail-fixed announcements-rail-left' : ''}`}
              style={useFixedRails ? { top: `${sideRailTop}px`, '--rail-top': `${sideRailTop}px` } : undefined}
            >
              <div className="font-bold text-sm mb-2">Announcements</div>
              <ul className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 xl:grid-cols-1">
                <li>
                  <button onClick={() => setActiveCategory('All')} className={`w-full text-left px-3 py-2 rounded-md ${activeCategory==='All' ? 'bg-[#F2C94C] text-[#222] font-bold' : 'hover:bg-gray-100'}`}>
                    All Announcements
                  </button>
                </li>
                <li>
                  <button onClick={() => setActiveCategory('Company News')} className={`w-full text-left px-3 py-2 rounded-md ${activeCategory==='Company News' ? 'bg-[#F2C94C] text-[#222] font-bold' : 'hover:bg-gray-100'}`}>
                    Company News
                  </button>
                </li>
                <li>
                  <button onClick={() => setActiveCategory('Policy Changes')} className={`w-full text-left px-3 py-2 rounded-md ${activeCategory==='Policy Changes' ? 'bg-[#F2C94C] text-[#222] font-bold' : 'hover:bg-gray-100'}`}>
                    Policy Changes
                  </button>
                </li>
                <li>
                  <button onClick={() => setActiveCategory('Partnerships & Advocacies')} className={`w-full text-left px-3 py-2 rounded-md ${activeCategory==='Partnerships & Advocacies' ? 'bg-[#F2C94C] text-[#222] font-bold' : 'hover:bg-gray-100'}`}>
                    Partnerships & Advocacies
                  </button>
                </li>
                <li>
                  <button onClick={() => setActiveCategory('Alumni Success Stories')} className={`w-full text-left px-3 py-2 rounded-md ${activeCategory==='Alumni Success Stories' ? 'bg-[#F2C94C] text-[#222] font-bold' : 'hover:bg-gray-100'}`}>
                    Alumni Success Stories
                  </button>
                </li>
              </ul>
            </div>
          </aside>

          {/* Center feed */}
          <section className="min-w-0 w-full">
            {/* Search / sort row */}
            <div ref={searchRowRef} className="mb-4 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="hidden flex-1 sm:block sm:mr-4" />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-nowrap">
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  type="text"
                  placeholder="Q Search"
                  className="min-w-0 w-full rounded-lg border border-gray-200 px-4 py-2 text-sm sm:w-52 md:w-64"
                  style={{ fontFamily: 'inherit' }}
                />
                <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm sm:w-auto sm:flex-shrink-0">
                  <option>Newest</option>
                  <option>Oldest</option>
                </select>
              </div>
            </div>

            {/* Create announcement box */}
            <div className="bg-white rounded-2xl p-4 mb-4 border border-gray-200">
              {isAdmin ? (
                <div>
                  <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    <input type="text" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} disabled={loading} className="mb-0 flex-1 rounded-lg border border-gray-200 px-4 py-3 text-sm" style={{fontFamily: 'inherit'}} />
                    <select value={category} onChange={e => setCategory(e.target.value)} className="mb-0 w-full rounded-lg border border-gray-200 px-3 py-3 text-sm md:w-auto md:min-w-[220px]" disabled={loading}>
                      <option>Company News</option>
                      <option>Policy Changes</option>
                      <option>Partnerships & Advocacies</option>
                      <option>Alumni Success Stories</option>
                    </select>
                  </div>
                  <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center">
                    <input type="text" placeholder="Create Announcement" value={content} onChange={e => setContent(e.target.value)} disabled={loading} className="flex-1 rounded-lg border border-gray-200 px-4 py-3 text-sm" style={{fontFamily: 'inherit'}} />
                    <button className="rounded-lg bg-[#F2C94C] px-4 py-3 text-sm font-bold text-[#222] md:px-4 md:py-2" onClick={handlePost} disabled={loading}>{loading ? 'Posting...' : 'Post'}</button>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-[#6b7280]">
                    <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={(e) => {
                      const f = e.target.files && e.target.files[0];
                      if (!f) return;
                      setSelectedMedia(f);
                      const inferred = f.type && f.type.startsWith('video') ? 'video' : 'image';
                      if (inferred === 'video' && Number(f.size || 0) > MAX_ANNOUNCEMENT_VIDEO_BYTES) {
                        setSelectedMedia(null);
                        setMediaPreview('');
                        setMediaType('');
                        showToast('error', 'Video is too large. Please choose one smaller than 100 MB.');
                        if (fileInputRef.current) fileInputRef.current.value = '';
                        return;
                      }
                      setError('');
                      setMediaType(inferred);
                      const url = URL.createObjectURL(f);
                      setMediaPreview(url);
                    }} style={{ display: 'none' }} />

                    <button onClick={() => { setMediaType('image'); fileInputRef.current && (fileInputRef.current.accept = 'image/*'); fileInputRef.current && fileInputRef.current.click(); }} className="flex items-center gap-2"> <PhotoIcon /> Photo</button>
                    <button onClick={() => { setMediaType('video'); fileInputRef.current && (fileInputRef.current.accept = 'video/*'); fileInputRef.current && fileInputRef.current.click(); }} className="flex items-center gap-2"> <VideoIcon /> Video</button>
                    <button
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('hsi-toast', {
                          detail: {
                            type: 'warning',
                            message: 'Event creation coming soon!',
                          },
                        }));
                      }}
                      className="flex items-center gap-2"
                    >
                      <EventIcon /> Event
                    </button>
                    {selectedMedia && (
                      <div className="ml-3">
                        {mediaType === 'image' ? (
                          <img src={mediaPreview} alt="preview" className="w-20 h-20 object-cover rounded-lg" />
                        ) : (
                          <video src={mediaPreview} className="w-28 h-20 rounded-lg" controls />
                        )}
                        <div className="text-xs mt-1 text-[#6b7280]"><button onClick={() => { setSelectedMedia(null); setMediaPreview(''); setMediaType(''); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="text-red-500">Remove</button></div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <input type="text" placeholder="Create Announcement" disabled className="w-full px-4 py-3 rounded border border-gray-200 mb-3 bg-[#f6f6f6] text-sm" style={{fontFamily: 'inherit'}} />
                </div>
              )}
            </div>

            {/* Results count */}
            <div className="text-sm text-[#6b7280] mb-3">Found {displayedAnnouncements.length} Matches</div>

            {/* Announcements list */}
            <div className="space-y-4">
              {loading ? (
                <div className="bg-white rounded-lg border border-dashed border-gray-300 p-7 text-center text-[#b3b3b3] italic">Loading announcements...</div>
              ) : announcements.length === 0 ? (
                <div className="bg-white rounded-lg border border-dashed border-gray-300 p-7 text-center text-[#b3b3b3] italic">No announcements yet. Admins will post updates here.</div>
              ) : displayedAnnouncements.length === 0 ? (
                <div className="bg-white rounded-lg border border-dashed border-gray-300 p-7 text-center text-[#b3b3b3] italic">No announcements match your current search or category filter.</div>
              ) : (
                displayedAnnouncements.map(a => (
                  <div key={a._id} onClick={() => setSelectedAnnouncement(a)} className="relative cursor-pointer rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:bg-gray-50 sm:p-6">
                    <div className="flex items-start gap-4">
                      <img src={resolveProfileImage(a.author?.profileImage)} alt="avatar" onClick={(e) => { e.stopPropagation(); a.author?._id && navigate(`/directory/profile/${a.author._id}`, { state: createProfileBackLink('/announcements', 'Announcements') }); }} className="h-11 w-11 flex-shrink-0 rounded-full object-cover cursor-pointer sm:h-12 sm:w-12" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <div onClick={(e) => { e.stopPropagation(); a.author?._id && navigate(`/directory/profile/${a.author._id}`, { state: createProfileBackLink('/announcements', 'Announcements') }); }} className="text-sm font-semibold cursor-pointer hover:underline">{resolveDisplayName(a.author, 'Admin')}</div>
                            <div className="text-xs text-[#888]">{new Date(a.createdAt).toLocaleString()}</div>
                          </div>
                          <div className="relative">
                            <button onClick={(e) => { e.stopPropagation(); toggleMenu(a._id); }} className="p-2 rounded hover:bg-gray-100">
                              <svg width="18" height="6" viewBox="0 0 24 6" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="4" cy="3" r="1.2"/><circle cx="12" cy="3" r="1.2"/><circle cx="20" cy="3" r="1.2"/></svg>
                            </button>
                            {menuOpenId === a._id && (
                              <div onClick={(e) => e.stopPropagation()} className="absolute right-0 mt-2 w-44 bg-white border rounded shadow-md z-10">
                                <button onClick={(e) => { e.stopPropagation(); setSelectedAnnouncement(a); setMenuOpenId(null); }} className="w-full text-left px-4 py-2 hover:bg-gray-50">View Full Post</button>
                                {(isAdmin || (a.author && String(a.author._id || a.author) === String(currentUserId))) && (
                                  <button onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); handleDeleteAnnouncement(a._id); }} className="w-full text-left px-4 py-2 text-red-600 hover:bg-gray-50">Delete</button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <h3 className="mt-3 mb-2 text-lg font-extrabold text-[#111827] sm:text-xl">{a.title}</h3>
                        <div className="text-sm text-[#6b7280] mb-4">{a.content}</div>
                        {normalizeAnnouncementAttachments(a).length > 0 && (
                          <div className="mt-3">
                            {normalizeAnnouncementAttachments(a).map((att, idx) => (
                              <div key={idx} className="mb-2">
                                {att.kind === 'image' ? (
                                  <img src={att.resolvedUrl} alt={`attachment-${idx}`} className="w-full max-w-sm rounded object-cover" />
                                ) : (
                                  <video src={att.resolvedUrl} controls className="w-full max-w-md rounded" />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center text-sm text-[#6b7280]">
                          <div className="flex items-center gap-4">
                            <button onClick={(e) => { e.stopPropagation(); handleToggleHeart(a._id); }} className="flex items-center gap-2 text-[#6b7280] hover:text-[#111827]">
                              <ReactionHeartIcon liked={(a.hearts || []).some((h) => String(h) === String(currentUserId))} />
                              {a.hearts?.length > 0 && <span>{a.hearts.length}</span>}
                            </button>

                            <button onClick={(e) => { e.stopPropagation(); handleOpenComment(a._id); }} className="flex items-center gap-2 text-[#6b7280] hover:text-[#111827]">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                              {a.comments?.length > 0 && <span>({a.comments.length})</span>}
                            </button>
                          </div>
                        </div>

                        {/* Comments list and composer */}
                        <div className="mt-3">
                          {a.comments && a.comments.length > 0 && (
                            <div className="space-y-2 mb-2">
                              {a.comments.map((c) => (
                                <div key={c._id || c.createdAt} className="text-sm text-[#374151] bg-gray-50 p-2 rounded">
                                  <div className="flex items-center gap-2 mb-1">
                                    <img
                                      src={resolveProfileImage(c.user?.profileImage)}
                                      alt={resolveDisplayName(c.user)}
                                      className="w-7 h-7 rounded-full object-cover"
                                    />
                                    <div>
                                      <div className="font-semibold text-xs">{resolveDisplayName(c.user)}</div>
                                      <div className="text-[11px] text-[#9ca3af]">{resolveProfileSubtitle(c.user)}</div>
                                    </div>
                                  </div>
                                  <div className="text-sm text-[#6b7280]">{c.text}</div>
                                </div>
                              ))}
                            </div>
                          )}

                          <AnimatePresence>
                            {openCommentId === a._id && (
                              <motion.div
                                key={`composer-${a._id}`}
                                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                                transition={{ duration: 0.18, ease: 'easeOut' }}
                                className="mt-2"
                              >
                                <div className="flex items-center gap-2">
                                  <input
                                    value={commentDrafts[a._id] || ''}
                                    onChange={(e) => handleDraftChange(a._id, e.target.value)}
                                    className="flex-1 px-3 py-2 rounded border border-gray-200 text-sm"
                                    placeholder="Write a comment..."
                                  />
                                  <button onClick={() => submitComment(a._id)} className="px-3 py-2 bg-[#F2C94C] text-[#222] rounded text-sm font-semibold">Comment</button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Right pinned + spotlight */}
          <aside className="w-full self-start">
            <div
              className={`bg-white rounded-2xl overflow-hidden mb-4 border border-gray-200 ${useFixedRails ? 'announcements-rail-fixed announcements-rail-right' : ''}`}
              style={useFixedRails ? { top: `${sideRailTop}px`, '--rail-top': `${sideRailTop}px` } : undefined}
            >
              <div className="bg-[#6B8A2E] px-5 py-3 text-white font-bold">Recent Announcements</div>
              <div className="p-4 space-y-3">
                {(() => {
                  // show announcements that have pinned=true; otherwise show latest two
                  const pinned = announcements.filter(a => a.pinned);
                  const list = (pinned && pinned.length > 0) ? pinned.slice(0, 2) : announcements.slice(0, 2);
                  if (!list || list.length === 0) return <div className="text-sm text-[#6b7280]">No announcements yet.</div>;
                  return list.map(a => (
                    <div key={a._id}>
                      <div className="font-semibold">{a.title || 'Untitled'}</div>
                      <div className="text-sm text-[#6b7280] mt-1 line-clamp-3">{a.content}</div>
                      <div className="text-sm text-[#F2C94C] mt-2 cursor-pointer" onClick={() => setSelectedAnnouncement(a)}>View Post &gt;</div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </aside>
        </div>
      </main>
      {selectedAnnouncement && (
        <FullPostModal post={selectedAnnouncement} onClose={() => setSelectedAnnouncement(null)} onHeart={handleToggleHeart} onCommentSubmit={submitComment} currentUserId={currentUserId} />
      )}
      {confirmDeleteId && (
        <motion.div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.18 }} className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
            <h3 className="text-lg font-semibold mb-2">Delete announcement</h3>
            <p className="text-sm text-gray-600 mb-6">Delete "{confirmDeleteTitle}"? This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setConfirmDeleteId(null); setConfirmDeleteTitle(''); }} className="px-4 py-2 rounded-md border">Cancel</button>
              <button onClick={() => deleteAnnouncementConfirmed(confirmDeleteId)} className="px-4 py-2 rounded-md bg-red-600 text-white">Delete</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

function FullPostModal({ post, onClose, onHeart, onCommentSubmit, currentUserId }) {
  const commentRef = useRef(null);
  const navigate = useNavigate();
  const liked = (post?.hearts || []).some((heartId) => String(heartId) === String(currentUserId || ''));
  useEffect(() => { if (commentRef.current) commentRef.current.focus(); }, [post]);
  if (!post) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 8 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto scrollbar-hide"
      >
        <button onClick={onClose} aria-label="Close" className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-lg transition">✕</button>
        <div className="flex gap-4">
          <img src={resolveProfileImage(post.author?.profileImage)} alt="avatar" className="w-14 h-14 rounded-full object-cover" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <div onClick={() => post.author?._id && navigate(`/directory/profile/${post.author._id}`, { state: createProfileBackLink('/announcements', 'Announcements') })} className="font-semibold cursor-pointer hover:underline">{resolveDisplayName(post.author, 'Admin')}</div>
                <div className="text-xs text-[#888]">{new Date(post.createdAt).toLocaleString()}</div>
              </div>
            </div>
            <h3 className="text-2xl font-extrabold mt-4 mb-2">{post.title}</h3>
            <div className="text-sm text-[#6b7280] mb-4">{post.content}</div>

            {normalizeAnnouncementAttachments(post).length > 0 && (
              <div className="mb-4">
                {normalizeAnnouncementAttachments(post).map((att, i) => (
                  <div key={i} className="mb-3">
                    {att.kind === 'image' ? (
                      <img src={att.resolvedUrl} alt={`att-${i}`} className="w-full max-w-md rounded object-cover" />
                    ) : (
                      <video src={att.resolvedUrl} controls className="w-full rounded" />
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-4 mb-4">
              <button onClick={() => onHeart(post._id)} className="flex items-center gap-2 text-[#6b7280] hover:text-[#111827]">
                <ReactionHeartIcon liked={liked} />
                {post.hearts?.length > 0 && <span>{post.hearts.length}</span>}
              </button>
              <div className="text-sm text-[#6b7280]">Comments {post.comments?.length ? `(${post.comments.length})` : ''}</div>
            </div>

            <div className="space-y-3 max-h-64 overflow-auto mb-4">
              {post.comments && post.comments.map(c => (
                <div key={c._id || c.createdAt} className="p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2 mb-1">
                    <img
                      src={resolveProfileImage(c.user?.profileImage)}
                      alt={resolveDisplayName(c.user)}
                      className="w-7 h-7 rounded-full object-cover"
                    />
                    <div>
                      <div className="text-xs font-semibold">{resolveDisplayName(c.user)}</div>
                      <div className="text-[11px] text-[#9ca3af]">{resolveProfileSubtitle(c.user)}</div>
                    </div>
                  </div>
                  <div className="text-sm text-[#374151]">{c.text}</div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input ref={commentRef} placeholder="Write a comment..." className="flex-1 px-3 py-2 rounded border border-gray-200 text-sm" id="fullpost-comment" />
              <button onClick={async () => {
                const el = document.getElementById('fullpost-comment');
                const val = el?.value?.trim();
                if (!val) return;
                await onCommentSubmit(post._id, val);
                if (el) el.value = '';
              }} className="px-3 py-2 bg-[#F2C94C] text-[#222] rounded text-sm font-semibold">Comment</button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

