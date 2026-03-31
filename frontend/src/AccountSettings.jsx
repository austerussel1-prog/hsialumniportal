import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle,
  ChatText,
  ClipboardText,
  GlobeHemisphereWest,
  LockKey,
  SignOut,
  ShieldCheck,
  UserCircle,
} from '@phosphor-icons/react';
import Sidebar from './components/Sidebar';
import { API_URL, apiEndpoints } from './config/api';

const TABS = {
  ACCOUNT: 'account',
  FEEDBACK: 'feedback',
  PRIVACY: 'privacy',
};

const FEEDBACK_TYPES = {
  ALUMNI: 'alumni_feedback',
  PROGRAM: 'program_evaluation',
  SUGGESTION: 'suggestion_improvement',
  WEBSITE: 'website_nps',
};

export default function AccountSettings() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(TABS.ACCOUNT);
  const [loading, setLoading] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsRangeDays, setReviewsRangeDays] = useState(30);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);
  const [showDataRemovalSubmittedModal, setShowDataRemovalSubmittedModal] = useState(false);

  const userData = localStorage.getItem('user');
  const user = userData ? JSON.parse(userData) : null;

  const [accountForm, setAccountForm] = useState({
    fullName: user?.fullName || user?.name || '',
    email: user?.email || '',
    contactNumber: user?.contactNumber || '',
  });

  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [feedbackForm, setFeedbackForm] = useState({
    feedbackType: FEEDBACK_TYPES.ALUMNI,
    subject: '',
    message: '',
    rating: '5',
    targetUserId: '',
    program: 'OJT',
    npsScore: '8',
    websiteArea: 'General Experience',
    improvementArea: 'General Improvement',
  });
  const [feedbackUsers, setFeedbackUsers] = useState([]);
  const [feedbackReviews, setFeedbackReviews] = useState([]);
  const [loadingFeedbackData, setLoadingFeedbackData] = useState(false);

  const [privacyForm, setPrivacyForm] = useState({
    twoFactorEnabled: Boolean(user?.twoFactorEnabled),
    loginAlerts: typeof user?.loginAlerts === 'boolean' ? user.loginAlerts : true,
    profileVisibility: user?.profileVisibility === 'private' ? 'private' : 'public',
  });
  const [dataRemovalNote, setDataRemovalNote] = useState('');
  const [deletionFinalAction, setDeletionFinalAction] = useState('delete');
  const [privacyActionLoading, setPrivacyActionLoading] = useState(false);

  const emitToast = (type, text) => {
    window.dispatchEvent(new CustomEvent('hsi-toast', {
      detail: { type, text },
    }));
  };

  const resetMessages = () => {
    // Toast handles transient feedback globally.
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleSaveAccount = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    if (!accountForm.fullName.trim()) {
      emitToast('error', 'Name is required.');
      return;
    }

    if (!accountForm.email.trim()) {
      emitToast('error', 'Email is required.');
      return;
    }

    if (
      passwordForm.oldPassword ||
      passwordForm.newPassword ||
      passwordForm.confirmPassword
    ) {
      if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
        emitToast('error', 'Complete all password fields to change your password.');
        return;
      }
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        emitToast('error', 'New password and confirm password do not match.');
        return;
      }
      if (passwordForm.newPassword.length < 6) {
        emitToast('error', 'New password must be at least 6 characters.');
        return;
      }
    }

    setLoading(true);
    try {
      const updateRes = await fetch(apiEndpoints.updateProfile, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: accountForm.fullName.trim(),
          email: accountForm.email.trim(),
          contactNumber: accountForm.contactNumber.trim(),
        }),
      });

      const updateBody = await updateRes.json().catch(() => ({}));
      if (!updateRes.ok) {
        throw new Error(updateBody?.message || 'Failed to update account details.');
      }

      if (passwordForm.oldPassword && passwordForm.newPassword) {
        const passRes = await fetch(apiEndpoints.changePassword, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            currentPassword: passwordForm.oldPassword,
            newPassword: passwordForm.newPassword,
          }),
        });

        const passBody = await passRes.json().catch(() => ({}));
        if (!passRes.ok) {
          throw new Error(passBody?.message || 'Failed to change password.');
        }
      }

      const updatedUser = {
        ...user,
        ...updateBody?.user,
        fullName: updateBody?.user?.fullName || updateBody?.user?.name || accountForm.fullName.trim(),
        name: updateBody?.user?.name || accountForm.fullName.trim(),
        email: updateBody?.user?.email || accountForm.email.trim(),
        contactNumber: updateBody?.user?.contactNumber || accountForm.contactNumber.trim(),
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      emitToast('success', 'Account settings updated successfully.');
    } catch (err) {
      emitToast('error', err?.message || 'Failed to save account settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFeedback = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return false;
    }

    if (feedbackForm.feedbackType === FEEDBACK_TYPES.ALUMNI && !feedbackForm.targetUserId) {
      emitToast('error', 'Please select an alumni user.');
      return false;
    }

    if (feedbackForm.feedbackType === FEEDBACK_TYPES.PROGRAM && !feedbackForm.program) {
      emitToast('error', 'Please select a program.');
      return false;
    }

    if (feedbackForm.feedbackType === FEEDBACK_TYPES.WEBSITE) {
      const nps = Number(feedbackForm.npsScore || 0);
      if (Number.isNaN(nps) || nps < 0 || nps > 10) {
        emitToast('error', 'NPS score must be from 0 to 10.');
        return false;
      }
    }

    if (!feedbackForm.message.trim()) {
      emitToast('error', 'Feedback message is required.');
      return false;
    }

    setLoading(true);
    try {
      const res = await fetch(apiEndpoints.accountFeedback, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          feedbackType: feedbackForm.feedbackType,
          subject: feedbackForm.subject.trim(),
          message: feedbackForm.message.trim(),
          rating: Number(feedbackForm.rating || 0),
          targetUserId: feedbackForm.feedbackType === FEEDBACK_TYPES.ALUMNI
            ? (feedbackForm.targetUserId || '')
            : '',
          program: feedbackForm.feedbackType === FEEDBACK_TYPES.PROGRAM
            ? (feedbackForm.program || '')
            : '',
          npsScore: feedbackForm.feedbackType === FEEDBACK_TYPES.WEBSITE
            ? Number(feedbackForm.npsScore || 0)
            : null,
          metadata: {
            websiteArea: feedbackForm.feedbackType === FEEDBACK_TYPES.WEBSITE
              ? (feedbackForm.websiteArea || '')
              : '',
            improvementArea: feedbackForm.feedbackType === FEEDBACK_TYPES.SUGGESTION
              ? (feedbackForm.improvementArea || '')
              : '',
          },
        }),
      });

      const raw = await res.text();
      let body = {};
      if (raw) {
        try {
          body = JSON.parse(raw);
        } catch {
          body = { message: raw };
        }
      }

      if (!res.ok) {
        throw new Error(body?.message || `Failed to submit feedback (HTTP ${res.status}).`);
      }

      setFeedbackForm((prev) => ({
        ...prev,
        subject: '',
        message: '',
        rating: '5',
        npsScore: '8',
      }));
      await loadFeedbackReferences();
      emitToast('success', body?.message || 'Feedback submitted successfully.');
      return true;
    } catch (err) {
      emitToast('error', err?.message || 'Failed to submit feedback.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleSavePrivacy = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(apiEndpoints.updatePrivacy, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          twoFactorEnabled: Boolean(privacyForm.twoFactorEnabled),
          loginAlerts: Boolean(privacyForm.loginAlerts),
          profileVisibility: String(privacyForm.profileVisibility || 'public'),
        }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.message || 'Failed to save privacy settings.');
      }

      const updatedUser = {
        ...user,
        ...body?.user,
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      emitToast('success', body?.message || 'Privacy settings saved successfully.');
    } catch (err) {
      emitToast('error', err?.message || 'Failed to save privacy settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestDataRemoval = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    setPrivacyActionLoading(true);
    try {
      const res = await fetch(apiEndpoints.requestDataRemoval, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          note: String(dataRemovalNote || '').trim(),
          finalAction: deletionFinalAction,
        }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.message || 'Failed to submit data removal request.');
      }

      setShowDataRemovalSubmittedModal(true);
    } catch (err) {
      emitToast('error', err?.message || 'Failed to submit data removal request.');
    } finally {
      setPrivacyActionLoading(false);
    }
  };

  const handleDeleteMyAccount = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    setShowDeleteAccountConfirm(false);

    setPrivacyActionLoading(true);
    try {
      const res = await fetch(apiEndpoints.deleteMyAccount, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          finalAction: deletionFinalAction,
          reason: String(dataRemovalNote || '').trim(),
        }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.message || 'Failed to schedule account deletion.');
      }

      emitToast('success', body?.message || 'Account scheduled for deletion.');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    } catch (err) {
      emitToast('error', err?.message || 'Failed to schedule account deletion.');
    } finally {
      setPrivacyActionLoading(false);
    }
  };

  const tabButtonStyle = (isActive) => ({
    border: 'none',
    borderBottom: isActive ? '2px solid #f4b000' : '2px solid transparent',
    background: 'transparent',
    color: isActive ? '#f4b000' : '#4b5563',
    fontSize: 14,
    fontWeight: isActive ? 700 : 500,
    cursor: 'pointer',
    padding: '9px 4px 11px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    whiteSpace: 'nowrap',
    width: '100%',
  });

  const openFeedbackTypeModal = (type) => {
    setFeedbackForm((prev) => ({ ...prev, feedbackType: type }));
    loadFeedbackReferences();
    setShowFeedbackModal(true);
  };

  const feedbackTypeLabel = (type) => {
    if (type === FEEDBACK_TYPES.ALUMNI) return 'Alumni Feedback';
    if (type === FEEDBACK_TYPES.PROGRAM) return 'Program Evaluation';
    if (type === FEEDBACK_TYPES.SUGGESTION) return 'Suggestions & Improvement';
    if (type === FEEDBACK_TYPES.WEBSITE) return 'Website Feedback & NPS';
    return 'Feedback';
  };

  const formatReviewTime = (iso) => {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString();
  };

  const feedbackChoiceCards = useMemo(() => [
    {
      key: FEEDBACK_TYPES.ALUMNI,
      label: 'Alumni Feedback',
      Icon: UserCircle,
      description: 'Send feedback about a specific alumni user.',
    },
    {
      key: FEEDBACK_TYPES.PROGRAM,
      label: 'Program Evaluation',
      Icon: CheckCircle,
      description: 'Evaluate OJT, Employment, and other HSI programs.',
    },
    {
      key: FEEDBACK_TYPES.SUGGESTION,
      label: 'Suggestions & Improvement Portal',
      Icon: ClipboardText,
      description: 'Share ideas to improve services and processes.',
    },
    {
      key: FEEDBACK_TYPES.WEBSITE,
      label: 'Website Feedback & NPS',
      Icon: GlobeHemisphereWest,
      description: 'Rate website experience and give NPS score.',
    },
  ], []);

  const REVIEWS_PER_PAGE = 5;
  const filteredFeedbackReviews = useMemo(() => {
    const now = Date.now();
    const maxAgeMs = reviewsRangeDays * 24 * 60 * 60 * 1000;

    return feedbackReviews.filter((item) => {
      const created = new Date(item.createdAt);
      if (Number.isNaN(created.getTime())) return false;
      return now - created.getTime() <= maxAgeMs;
    });
  }, [feedbackReviews, reviewsRangeDays]);

  const totalReviewPages = Math.max(1, Math.ceil(filteredFeedbackReviews.length / REVIEWS_PER_PAGE));
  const paginatedReviews = useMemo(() => {
    const start = (reviewsPage - 1) * REVIEWS_PER_PAGE;
    return filteredFeedbackReviews.slice(start, start + REVIEWS_PER_PAGE);
  }, [filteredFeedbackReviews, reviewsPage]);

  const formatCompactCount = (value) => {
    if (!Number.isFinite(value)) return '0';
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return String(value);
  };

  const ratingDistribution = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    filteredFeedbackReviews.forEach((item) => {
      const rating = Math.max(1, Math.min(5, Number(item.rating || 0)));
      if (counts[rating] !== undefined) counts[rating] += 1;
    });
    return counts;
  }, [filteredFeedbackReviews]);

  const averageRating = useMemo(() => {
    if (filteredFeedbackReviews.length === 0) return 0;
    const total = filteredFeedbackReviews.reduce((sum, item) => sum + Number(item.rating || 0), 0);
    return total / filteredFeedbackReviews.length;
  }, [filteredFeedbackReviews]);

  const reviewsDateRange = useMemo(() => {
    if (filteredFeedbackReviews.length === 0) return 'No date range';
    const dates = filteredFeedbackReviews
      .map((item) => new Date(item.createdAt))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((a, b) => a - b);
    if (dates.length === 0) return 'No date range';
    const start = dates[0].toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const end = dates[dates.length - 1].toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    return `${start} - ${end}`;
  }, [filteredFeedbackReviews]);

  const renderStars = (rating) => {
    const safe = Math.max(0, Math.min(5, Number(rating || 0)));
    const full = Math.round(safe);
    return (
      <span style={{ display: 'inline-flex', gap: 2, letterSpacing: 0 }}>
        {Array.from({ length: 5 }).map((_, idx) => (
          <span key={idx} style={{ color: idx < full ? '#f4b000' : '#d1d5db', fontSize: 18, lineHeight: 1 }}>
            ★
          </span>
        ))}
      </span>
    );
  };

  const getInitials = (name) => {
    const parts = String(name || '')
      .split(' ')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 2);
    if (parts.length === 0) return 'U';
    return parts.map((part) => part[0].toUpperCase()).join('');
  };

  const toggleTrackStyle = (checked) => ({
    display: 'inline-block',
    width: 54,
    height: 30,
    borderRadius: 999,
    border: '1px solid #d1d5db',
    background: checked ? '#f4b000' : '#e5e7eb',
    position: 'relative',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    boxShadow: checked ? 'inset 0 0 0 1px rgba(180, 120, 0, 0.15)' : 'inset 0 0 0 1px rgba(107, 114, 128, 0.08)',
  });

  const toggleThumbStyle = (checked) => ({
    position: 'absolute',
    top: 3,
    left: checked ? 27 : 3,
    width: 22,
    height: 22,
    borderRadius: '50%',
    background: '#fff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
    transition: 'left 0.2s ease',
  });

  const resolveProfileImageUrl = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (raw.startsWith('data:image/')) return raw;
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith('uploads/')) return `${API_URL}/${raw}`;
    return `${API_URL}${raw.startsWith('/') ? raw : `/${raw}`}`;
  };

  const buildInitialsAvatarDataUrl = (name) => {
    const initials = getInitials(name);
    const safeInitials = encodeURIComponent(initials);
    const bg = encodeURIComponent('#e8eef8');
    const fg = encodeURIComponent('#1f2937');
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='72' height='72'><rect width='100%' height='100%' rx='12' fill='${bg}'/><text x='50%' y='54%' text-anchor='middle' dominant-baseline='middle' font-family='Arial, sans-serif' font-size='28' font-weight='700' fill='${fg}'>${safeInitials}</text></svg>`;
    return `data:image/svg+xml,${svg}`;
  };

  const loadFeedbackReferences = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setLoadingFeedbackData(true);
    try {
      const [usersRes, reviewsRes, directoryRes] = await Promise.all([
        fetch(apiEndpoints.accountFeedbackAlumniUsers, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(apiEndpoints.accountFeedbackReviews, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(apiEndpoints.directoryUsers, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const usersBody = await usersRes.json().catch(() => ({}));
      const reviewsBody = await reviewsRes.json().catch(() => ({}));
      const directoryBody = await directoryRes.json().catch(() => ({}));

      if (usersRes.ok) {
        setFeedbackUsers(Array.isArray(usersBody?.users) ? usersBody.users : []);
      }

      if (reviewsRes.ok) {
        const directoryUsers = Array.isArray(directoryBody?.users) ? directoryBody.users : [];
        const profileImageByEmail = directoryUsers.reduce((acc, member) => {
          const emailKey = String(member?.email || '').trim().toLowerCase();
          if (emailKey && member?.profileImage) {
            acc[emailKey] = member.profileImage;
          }
          return acc;
        }, {});

        const currentUserEmail = String(user?.email || '').trim().toLowerCase();
        const currentUserImage = String(user?.profileImage || '').trim();

        const mappedReviews = (Array.isArray(reviewsBody?.reviews) ? reviewsBody.reviews : []).map((review) => {
          const reviewEmail = String(review?.authorEmail || '').trim().toLowerCase();
          const directoryImage = profileImageByEmail[reviewEmail] || '';
          const selfImage = reviewEmail && reviewEmail === currentUserEmail ? currentUserImage : '';
          return {
            ...review,
            authorProfileImage: review?.authorProfileImage || directoryImage || selfImage || '',
          };
        });

        setFeedbackReviews(mappedReviews);
      }
    } catch {
      // Keep current page usable even if references fail to load.
    } finally {
      setLoadingFeedbackData(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search || '');
    const tab = String(params.get('tab') || '').toLowerCase();

    if (tab === TABS.FEEDBACK) {
      setActiveTab(TABS.FEEDBACK);
      return;
    }
    if (tab === TABS.PRIVACY) {
      setActiveTab(TABS.PRIVACY);
      return;
    }
    if (tab === TABS.ACCOUNT) {
      setActiveTab(TABS.ACCOUNT);
    }
  }, [location.search]);

  useEffect(() => {
    if (activeTab === TABS.FEEDBACK) {
      loadFeedbackReferences();
    }
  }, [activeTab]);

  useEffect(() => {
    if (reviewsPage > totalReviewPages) {
      setReviewsPage(totalReviewPages);
    }
  }, [reviewsPage, totalReviewPages]);

  return (
    <motion.div
      style={{ display: 'flex', minHeight: '100vh', background: '#f3f4f6' }}
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ duration: 0.22 }}
    >
      <Sidebar isOpen={sidebarOpen} toggle={() => setSidebarOpen(!sidebarOpen)} />

      <div style={{ flex: 1, padding: '24px 28px', overflowY: 'auto' }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            border: 'none',
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: '#374151',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: 12,
          }}
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </button>

        <div style={{ maxWidth: 980, margin: '0 auto', background: '#f9fafb', border: '1px solid #c5ccd6', borderRadius: 14, paddingTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, marginLeft: 26, marginRight: 26, marginTop: 16 }}>
            <h1 style={{ margin: 0, color: '#111827', fontSize: 34, fontWeight: 800 }}>Settings</h1>
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              title="Log Out"
              aria-label="Log Out"
              style={{
                border: 'none',
                background: '#dc2626',
                color: '#fff',
                width: 44,
                height: 44,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <SignOut size={20} weight="bold" />
            </button>
          </div>

          <div style={{ borderBottom: '1px solid #e5e7eb', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 0, margin: '0 12px', paddingTop: 2 }}>
            <button type="button" onClick={() => { resetMessages(); setActiveTab(TABS.ACCOUNT); }} style={tabButtonStyle(activeTab === TABS.ACCOUNT)}>
              <UserCircle size={18} />
              Account Settings
            </button>
            <button type="button" onClick={() => { resetMessages(); setActiveTab(TABS.FEEDBACK); }} style={tabButtonStyle(activeTab === TABS.FEEDBACK)}>
              <ChatText size={18} />
              Feedback
            </button>
            <button type="button" onClick={() => { resetMessages(); setActiveTab(TABS.PRIVACY); }} style={tabButtonStyle(activeTab === TABS.PRIVACY)}>
              <ShieldCheck size={18} />
              Privacy Settings
            </button>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
          {activeTab === TABS.ACCOUNT && (
            <div style={{ margin: '20px 12px 0', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18 }}>
              <div style={{ marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: 26, color: '#111827' }}>Profile Information</h2>
                <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>Manage your personal details and account credentials.</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                <label style={{ fontWeight: 600, color: '#374151', fontSize: 14 }}>Name</label>
                <input
                  type="text"
                  value={accountForm.fullName}
                  onChange={(e) => setAccountForm((prev) => ({ ...prev, fullName: e.target.value }))}
                  style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: 10, fontSize: 13 }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                <label style={{ fontWeight: 600, color: '#374151', fontSize: 14 }}>Email</label>
                <input
                  type="email"
                  value={accountForm.email}
                  readOnly
                  disabled
                  style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: 10, fontSize: 13, background: '#f3f4f6', color: '#6b7280', cursor: 'not-allowed' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 12, alignItems: 'center', marginBottom: 18 }}>
                <label style={{ fontWeight: 600, color: '#374151', fontSize: 14 }}>Phone Number</label>
                <input
                  type="text"
                  value={accountForm.contactNumber}
                  onChange={(e) => setAccountForm((prev) => ({ ...prev, contactNumber: e.target.value }))}
                  style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: 10, fontSize: 13 }}
                />
              </div>

              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 16 }}>
                <h3 style={{ margin: 0, fontSize: 20, color: '#111827' }}>Security</h3>
                <p style={{ margin: '4px 0 14px', color: '#6b7280', fontSize: 14 }}>Password Management</p>
                <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                  <label style={{ fontWeight: 600, color: '#374151', fontSize: 14 }}>Old Password</label>
                  <input
                    type="password"
                    value={passwordForm.oldPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, oldPassword: e.target.value }))}
                    style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: 10, fontSize: 13 }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                  <label style={{ fontWeight: 600, color: '#374151', fontSize: 14 }}>New Password</label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                    style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: 10, fontSize: 13 }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 12, alignItems: 'center' }}>
                  <label style={{ fontWeight: 600, color: '#374151', fontSize: 14 }}>Confirm Password</label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: 10, fontSize: 13 }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
                <button
                  type="button"
                  onClick={() => {
                    resetMessages();
                    handleSaveAccount();
                  }}
                  disabled={loading}
                  style={{
                    border: 'none',
                    background: '#f4b000',
                    color: '#333',
                    borderRadius: 999,
                    padding: '10px 18px',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.75 : 1,
                  }}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {activeTab === TABS.FEEDBACK && (
            <div style={{ margin: '20px 12px 0', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18 }}>
              <h2 style={{ margin: 0, fontSize: 22, color: '#111827' }}>Feedback</h2>
              <p style={{ margin: '4px 0 14px', color: '#6b7280', fontSize: 13 }}>Choose feedback type, submit your review, and view recent reviews below.</p>

              <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
                {feedbackChoiceCards.map((choice) => {
                  const isActive = feedbackForm.feedbackType === choice.key;
                  return (
                    <button
                      key={choice.key}
                      type="button"
                      onClick={() => openFeedbackTypeModal(choice.key)}
                      style={{
                        border: isActive ? '1px solid #f4b000' : '1px solid #e5e7eb',
                        background: '#fff',
                        borderRadius: 14,
                        padding: '14px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        cursor: 'pointer',
                        boxShadow: isActive ? '0 8px 18px rgba(244, 176, 0, 0.14)' : 'none',
                        textAlign: 'left',
                      }}
                    >
                      <span
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: '50%',
                          background: '#d6b20a',
                          color: '#fff',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <choice.Icon size={22} weight="bold" />
                      </span>
                      <span>
                        <span style={{ display: 'block', fontSize: 16, fontWeight: 700, color: '#111827' }}>{choice.label}</span>
                        <span style={{ display: 'block', marginTop: 2, color: '#6b7280', fontSize: 12 }}>{choice.description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div style={{ border: '1px dashed #e5e7eb', borderRadius: 12, padding: 12, background: '#fcfcfd', color: '#6b7280', fontSize: 12 }}>
                Click a feedback type card above to open its form in a modal.
              </div>

              <div style={{ marginTop: 20, borderTop: '1px solid #e5e7eb', paddingTop: 14 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 10 }}>Recent Reviews</div>
                <button
                  type="button"
                  onClick={() => {
                    setReviewsPage(1);
                    loadFeedbackReferences();
                    setShowReviewsModal(true);
                  }}
                  style={{
                    width: '100%',
                    border: '1px solid #e5e7eb',
                    background: '#fff',
                    borderRadius: 14,
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: '50%',
                      background: '#d6b20a',
                      color: '#fff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <ClipboardText size={22} weight="bold" />
                  </span>
                  <span>
                    <span style={{ display: 'block', fontSize: 16, fontWeight: 700, color: '#111827' }}>View Recent Reviews</span>
                    <span style={{ display: 'block', marginTop: 2, color: '#6b7280', fontSize: 12 }}>
                      {loadingFeedbackData ? 'Loading reviews...' : `${feedbackReviews.length} review(s) available. Click to open modal.`}
                    </span>
                  </span>
                </button>
                {!loadingFeedbackData && feedbackReviews.length === 0 && (
                  <div style={{ color: '#6b7280', fontSize: 12, marginTop: 8 }}>No reviews yet.</div>
                )}
              </div>
            </div>
          )}

          {activeTab === TABS.PRIVACY && (
            <div style={{ margin: '20px 12px 0', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18 }}>
              <h2 style={{ margin: 0, fontSize: 26, color: '#111827' }}>Privacy Settings</h2>
              <p style={{ margin: '4px 0 16px', color: '#6b7280', fontSize: 14 }}>Adjust your privacy and security preferences.</p>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: 12, marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#111827' }}>Two-Factor Authentication</div>
                  <div style={{ color: '#6b7280', fontSize: 13 }}>Add an extra layer of security to your account.</div>
                </div>
                <button
                  type="button"
                  aria-label="Toggle Two-Factor Authentication"
                  onClick={() => setPrivacyForm((prev) => ({ ...prev, twoFactorEnabled: !prev.twoFactorEnabled }))}
                  style={{ border: 'none', background: 'transparent', padding: 0, display: 'inline-flex', alignItems: 'center' }}
                >
                  <span style={toggleTrackStyle(privacyForm.twoFactorEnabled)}>
                    <span style={toggleThumbStyle(privacyForm.twoFactorEnabled)} />
                  </span>
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: 12, marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#111827' }}>Login Alert Notification</div>
                  <div style={{ color: '#6b7280', fontSize: 13 }}>Get notified when your account is accessed from a new device.</div>
                </div>
                <button
                  type="button"
                  aria-label="Toggle Login Alert Notification"
                  onClick={() => setPrivacyForm((prev) => ({ ...prev, loginAlerts: !prev.loginAlerts }))}
                  style={{ border: 'none', background: 'transparent', padding: 0, display: 'inline-flex', alignItems: 'center' }}
                >
                  <span style={toggleTrackStyle(privacyForm.loginAlerts)}>
                    <span style={toggleThumbStyle(privacyForm.loginAlerts)} />
                  </span>
                </button>
              </div>

              <div>
                <div style={{ fontWeight: 700, color: '#111827', marginBottom: 8 }}>Profile Visibility</div>
                <select
                  value={privacyForm.profileVisibility}
                  onChange={(e) => setPrivacyForm((prev) => ({ ...prev, profileVisibility: e.target.value }))}
                  style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: 10, fontSize: 13 }}
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>

              <div style={{ marginTop: 16, borderTop: '1px solid #f3f4f6', paddingTop: 14 }}>
                <div style={{ fontWeight: 700, color: '#111827', marginBottom: 8 }}>Data Retention and Account Removal</div>
                <div style={{ color: '#6b7280', fontSize: 13, lineHeight: 1.45, marginBottom: 10 }}>
                  Allow users to delete their account and request data removal. Account deletion uses soft delete first, then scheduled permanent processing.
                </div>
                <ul style={{ margin: '0 0 10px 16px', color: '#374151', fontSize: 13, lineHeight: 1.5 }}>
                  <li>Delete their account</li>
                  <li>Request data removal</li>
                  <li>Soft delete + scheduled permanent delete</li>
                  <li>Optional anonymize final action (keep non-identifying records)</li>
                </ul>

                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontWeight: 600, color: '#111827', marginBottom: 6, fontSize: 13 }}>Request note (optional)</div>
                  <textarea
                    rows={3}
                    value={dataRemovalNote}
                    onChange={(e) => setDataRemovalNote(e.target.value)}
                    placeholder="Add a note for your request (optional)"
                    style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: 10, fontSize: 13, resize: 'vertical' }}
                  />
                </div>

                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontWeight: 600, color: '#111827', marginBottom: 6, fontSize: 13 }}>Final processing mode</div>
                  <select
                    value={deletionFinalAction}
                    onChange={(e) => setDeletionFinalAction(e.target.value === 'anonymize' ? 'anonymize' : 'delete')}
                    style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: 10, fontSize: 13 }}
                  >
                    <option value="delete">Permanent delete</option>
                    <option value="anonymize">Anonymize identity</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleRequestDataRemoval}
                    disabled={privacyActionLoading}
                    style={{
                      border: '1px solid #d1d5db',
                      background: '#fff',
                      color: '#374151',
                      borderRadius: 999,
                      padding: '10px 14px',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: privacyActionLoading ? 'not-allowed' : 'pointer',
                      opacity: privacyActionLoading ? 0.75 : 1,
                    }}
                  >
                    {privacyActionLoading ? 'Processing...' : 'Request Data Removal'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteAccountConfirm(true)}
                    disabled={privacyActionLoading}
                    style={{
                      border: 'none',
                      background: '#dc2626',
                      color: '#fff',
                      borderRadius: 999,
                      padding: '10px 14px',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: privacyActionLoading ? 'not-allowed' : 'pointer',
                      opacity: privacyActionLoading ? 0.75 : 1,
                    }}
                  >
                    {privacyActionLoading ? 'Processing...' : 'Delete My Account'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                <button
                  type="button"
                  onClick={() => {
                    resetMessages();
                    handleSavePrivacy();
                  }}
                  disabled={loading}
                  style={{
                    border: 'none',
                    background: '#f4b000',
                    color: '#333',
                    borderRadius: 999,
                    padding: '10px 18px',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.75 : 1,
                  }}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {showFeedbackModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (!loading) setShowFeedbackModal(false);
            }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1120,
              padding: 16,
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={(event) => event.stopPropagation()}
              style={{
                width: 'min(92vw, 860px)',
                maxHeight: '86vh',
                overflowY: 'hidden',
                background: '#fff',
                borderRadius: 14,
                border: '1px solid #e5e7eb',
                boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
                padding: 20,
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 12 }}>
                {feedbackTypeLabel(feedbackForm.feedbackType)}
              </div>

              <div style={{ display: 'grid', gap: 12 }}>
                {feedbackForm.feedbackType === FEEDBACK_TYPES.ALUMNI && (
                  <select
                    value={feedbackForm.targetUserId}
                    onChange={(e) => setFeedbackForm((prev) => ({ ...prev, targetUserId: e.target.value }))}
                    style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: 10, fontSize: 13 }}
                  >
                    <option value="">Select alumni user</option>
                    {feedbackUsers.length === 0 && (
                      <option value="" disabled>No alumni users found</option>
                    )}
                    {feedbackUsers.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} {item.email ? `(${item.email})` : ''}
                      </option>
                    ))}
                  </select>
                )}

                {feedbackForm.feedbackType === FEEDBACK_TYPES.PROGRAM && (
                  <select
                    value={feedbackForm.program}
                    onChange={(e) => setFeedbackForm((prev) => ({ ...prev, program: e.target.value }))}
                    style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: 10, fontSize: 13 }}
                  >
                    <option value="OJT">OJT</option>
                    <option value="Employment">Employment</option>
                    <option value="Training">Training</option>
                    <option value="Mentorship">Mentorship</option>
                    <option value="Highly Succeed Inc. Overall">Highly Succeed Inc. Overall</option>
                  </select>
                )}

                {feedbackForm.feedbackType === FEEDBACK_TYPES.SUGGESTION && (
                  <select
                    value={feedbackForm.improvementArea}
                    onChange={(e) => setFeedbackForm((prev) => ({ ...prev, improvementArea: e.target.value }))}
                    style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: 10, fontSize: 13 }}
                  >
                    <option value="General Improvement">General Improvement</option>
                    <option value="Process Optimization">Process Optimization</option>
                    <option value="User Support">User Support</option>
                    <option value="Communication">Communication</option>
                  </select>
                )}

                {feedbackForm.feedbackType === FEEDBACK_TYPES.WEBSITE && (
                  <>
                    <select
                      value={feedbackForm.websiteArea}
                      onChange={(e) => setFeedbackForm((prev) => ({ ...prev, websiteArea: e.target.value }))}
                      style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: 10, fontSize: 13 }}
                    >
                      <option value="General Experience">General Experience</option>
                      <option value="Navigation">Navigation</option>
                      <option value="Performance">Performance</option>
                      <option value="Design">Design</option>
                    </select>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={feedbackForm.npsScore}
                      onChange={(e) => setFeedbackForm((prev) => ({ ...prev, npsScore: e.target.value }))}
                      placeholder="NPS Score (0-10)"
                      style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: 10, fontSize: 13 }}
                    />
                  </>
                )}

                <input
                  type="text"
                  value={feedbackForm.subject}
                  onChange={(e) => setFeedbackForm((prev) => ({ ...prev, subject: e.target.value }))}
                  placeholder="Subject"
                  style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: 10, fontSize: 13 }}
                />
                <select
                  value={feedbackForm.rating}
                  onChange={(e) => setFeedbackForm((prev) => ({ ...prev, rating: e.target.value }))}
                  style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: 10, fontSize: 13 }}
                >
                  <option value="5">5 - Excellent</option>
                  <option value="4">4 - Good</option>
                  <option value="3">3 - Fair</option>
                  <option value="2">2 - Needs improvement</option>
                  <option value="1">1 - Poor</option>
                </select>
                <textarea
                  rows={8}
                  value={feedbackForm.message}
                  onChange={(e) => setFeedbackForm((prev) => ({ ...prev, message: e.target.value }))}
                  placeholder="Write your feedback here..."
                  style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: 10, fontSize: 13, resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                <button
                  type="button"
                  onClick={() => setShowFeedbackModal(false)}
                  disabled={loading}
                  style={{
                    border: '1px solid #d1d5db',
                    background: '#fff',
                    color: '#374151',
                    borderRadius: 999,
                    padding: '10px 18px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.75 : 1,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    resetMessages();
                    const ok = await handleSaveFeedback();
                    if (ok) setShowFeedbackModal(false);
                  }}
                  disabled={loading}
                  style={{
                    border: 'none',
                    background: '#f4b000',
                    color: '#333',
                    borderRadius: 999,
                    padding: '10px 18px',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.75 : 1,
                  }}
                >
                  {loading ? 'Sending...' : 'Send'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowLogoutConfirm(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1100,
              padding: 16,
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={(event) => event.stopPropagation()}
              style={{
                width: 'min(92vw, 420px)',
                background: '#fff',
                borderRadius: 14,
                border: '1px solid #e5e7eb',
                boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
                padding: 22,
              }}
            >
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#1f2937' }}>
                Confirm Logout
              </h2>
              <p style={{ margin: '8px 0 24px 0', color: '#6b7280', fontSize: 14 }}>
                Are you sure you want to log out?
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    background: '#fff',
                    color: '#374151',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    border: 'none',
                    borderRadius: 8,
                    background: '#dc2626',
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Logout
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showDeleteAccountConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (!privacyActionLoading) setShowDeleteAccountConfirm(false);
            }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1110,
              padding: 16,
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={(event) => event.stopPropagation()}
              style={{
                width: 'min(92vw, 520px)',
                background: '#fff',
                borderRadius: 14,
                border: '1px solid #e5e7eb',
                boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
                padding: 22,
              }}
            >
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#1f2937' }}>
                Confirm Account Deletion
              </h2>
              <p style={{ margin: '8px 0 24px 0', color: '#6b7280', fontSize: 14, lineHeight: 1.45 }}>
                Are you sure you want to delete your account? Your account will be soft-deleted first, then permanently processed by retention policy.
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowDeleteAccountConfirm(false)}
                  disabled={privacyActionLoading}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    background: '#fff',
                    color: '#374151',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: privacyActionLoading ? 'not-allowed' : 'pointer',
                    opacity: privacyActionLoading ? 0.7 : 1,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteMyAccount}
                  disabled={privacyActionLoading}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    border: 'none',
                    borderRadius: 8,
                    background: '#dc2626',
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: privacyActionLoading ? 'not-allowed' : 'pointer',
                    opacity: privacyActionLoading ? 0.7 : 1,
                  }}
                >
                  {privacyActionLoading ? 'Deleting...' : 'Delete Account'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showDataRemovalSubmittedModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDataRemovalSubmittedModal(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1110,
              padding: 16,
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={(event) => event.stopPropagation()}
              style={{
                width: 'min(92vw, 520px)',
                background: '#fff',
                borderRadius: 14,
                border: '1px solid #e5e7eb',
                boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
                padding: 22,
              }}
            >
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#1f2937' }}>
                Request Submitted
              </h2>
              <p style={{ margin: '10px 0 20px 0', color: '#6b7280', fontSize: 14, lineHeight: 1.5 }}>
                Your data removal request has been sent to the admin dashboard for review.
                Processing will only continue once an admin approves your request.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowDataRemovalSubmittedModal(false)}
                  style={{
                    minWidth: 120,
                    padding: '10px 16px',
                    border: 'none',
                    borderRadius: 8,
                    background: '#f4b000',
                    color: '#1f2937',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  OK
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showReviewsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowReviewsModal(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1110,
              padding: 16,
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={(event) => event.stopPropagation()}
              style={{
                width: 'min(92vw, 860px)',
                maxHeight: '86vh',
                overflowY: 'hidden',
                background: '#fff',
                borderRadius: 14,
                border: '1px solid #e5e7eb',
                boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
                padding: 20,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 38, fontWeight: 800, color: '#111827', lineHeight: 1 }}>Reviews</div>
                <select
                  value={String(reviewsRangeDays)}
                  onChange={(e) => {
                    setReviewsRangeDays(Number(e.target.value));
                    setReviewsPage(1);
                  }}
                  style={{
                    border: '1px solid #e5e7eb',
                    background: '#fff',
                    color: '#111827',
                    borderRadius: 12,
                    padding: '10px 14px',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <option value="7">Last 7 days</option>
                  <option value="14">Last 14 days</option>
                  <option value="30">Last 30 days</option>
                </select>
              </div>

              {loadingFeedbackData ? (
                <div style={{ color: '#6b7280', fontSize: 13 }}>Loading reviews...</div>
              ) : filteredFeedbackReviews.length === 0 ? (
                <div style={{ color: '#6b7280', fontSize: 13 }}>No reviews yet.</div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr', gap: 14, marginBottom: 14, borderBottom: '1px solid #eceff3', paddingBottom: 14 }}>
                    <div style={{ paddingRight: 10, borderRight: '1px solid #eceff3' }}>
                      <div style={{ fontSize: 30, fontWeight: 800, color: '#111827', lineHeight: 1 }}>{formatCompactCount(filteredFeedbackReviews.length)}</div>
                      <div style={{ marginTop: 6, fontSize: 13, fontWeight: 700, color: '#374151' }}>Total Reviews</div>
                      <div style={{ marginTop: 4, fontSize: 12, color: '#9ca3af' }}>{reviewsDateRange}</div>
                    </div>

                    <div style={{ paddingRight: 10, borderRight: '1px solid #eceff3' }}>
                      <div style={{ fontSize: 30, fontWeight: 800, color: '#111827', lineHeight: 1 }}>
                        {averageRating.toFixed(1)}
                      </div>
                      <div style={{ marginTop: 6 }}>{renderStars(averageRating)}</div>
                      <div style={{ marginTop: 4, fontSize: 12, color: '#9ca3af' }}>Average Rating</div>
                    </div>

                    <div style={{ display: 'grid', gap: 6, alignContent: 'start' }}>
                      {[5, 4, 3, 2, 1].map((value) => {
                        const count = ratingDistribution[value] || 0;
                        const width = filteredFeedbackReviews.length > 0 ? (count / filteredFeedbackReviews.length) * 100 : 0;
                        return (
                          <div key={value} style={{ display: 'grid', gridTemplateColumns: '18px 1fr 44px', gap: 8, alignItems: 'center' }}>
                            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 700 }}>{value}</div>
                            <div style={{ height: 6, borderRadius: 999, background: '#eef2f7', overflow: 'hidden' }}>
                              <div style={{ width: `${width}%`, height: '100%', borderRadius: 999, background: value >= 4 ? '#34bfa3' : value === 3 ? '#f4b000' : '#60a5fa' }} />
                            </div>
                            <div style={{ fontSize: 12, color: '#4b5563', textAlign: 'right' }}>{formatCompactCount(count)}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: 12, maxHeight: '45vh', overflowY: 'auto', paddingRight: 4 }}>
                    {paginatedReviews.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          borderTop: '1px solid #eceff3',
                          padding: '12px 4px 0',
                          background: '#fff',
                        }}
                      >
                        <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 14 }}>
                          <div>
                            <img
                              src={resolveProfileImageUrl(item.authorProfileImage) || buildInitialsAvatarDataUrl(item.authorName)}
                              alt={item.authorName || 'Reviewer'}
                              onError={(event) => {
                                event.currentTarget.onerror = null;
                                event.currentTarget.src = buildInitialsAvatarDataUrl(item.authorName);
                              }}
                              style={{ width: 72, height: 72, borderRadius: 12, objectFit: 'cover', border: '1px solid #e5e7eb', background: '#f3f4f6' }}
                            />
                            <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280', lineHeight: 1.25 }}>
                              {feedbackTypeLabel(item.feedbackType)}
                            </div>
                            <div style={{ marginTop: 2, fontSize: 12, color: '#111827', fontWeight: 700, whiteSpace: 'nowrap' }}>
                              Reviews: {item.rating || 0}
                            </div>
                          </div>

                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                {renderStars(item.rating)}
                                <span style={{ color: '#6b7280', fontSize: 13, fontWeight: 600 }}>{new Date(item.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>

                            <div style={{ marginTop: 8, fontSize: 14, color: '#111827', fontWeight: 700 }}>{item.authorName}</div>
                            <div style={{ marginTop: 6, fontSize: 14, color: '#374151', lineHeight: 1.5 }}>
                              {item.subject ? `${item.subject} - ` : ''}{item.message}
                            </div>

                            <div style={{ marginTop: 10, fontSize: 12, color: '#6b7280' }}>
                              {item.targetUserName ? `Alumni: ${item.targetUserName} | ` : ''}
                              {item.program ? `Program: ${item.program} | ` : ''}
                              {item.feedbackType === FEEDBACK_TYPES.WEBSITE && item.npsScore !== null && typeof item.npsScore !== 'undefined' ? `NPS: ${item.npsScore} | ` : ''}
                              Rating: {item.rating || 0}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                    <button
                      type="button"
                      onClick={() => setReviewsPage((prev) => Math.max(1, prev - 1))}
                      disabled={reviewsPage === 1}
                      style={{
                        border: '1px solid #d1d5db',
                        background: '#fff',
                        color: '#374151',
                        borderRadius: 999,
                        padding: '8px 14px',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: reviewsPage === 1 ? 'not-allowed' : 'pointer',
                        opacity: reviewsPage === 1 ? 0.6 : 1,
                      }}
                    >
                      Previous
                    </button>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>
                      Page {reviewsPage} of {totalReviewPages}
                    </div>
                    <button
                      type="button"
                      onClick={() => setReviewsPage((prev) => Math.min(totalReviewPages, prev + 1))}
                      disabled={reviewsPage >= totalReviewPages}
                      style={{
                        border: '1px solid #d1d5db',
                        background: '#fff',
                        color: '#374151',
                        borderRadius: 999,
                        padding: '8px 14px',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: reviewsPage >= totalReviewPages ? 'not-allowed' : 'pointer',
                        opacity: reviewsPage >= totalReviewPages ? 0.6 : 1,
                      }}
                    >
                      Next
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
