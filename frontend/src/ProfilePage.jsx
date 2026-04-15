import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, LinkedinLogo, TwitterLogo, InstagramLogo, PencilSimple, UploadSimple, X, Phone, EnvelopeSimple, ChatCircleText, GraduationCap, Star, Plus, Gear, SignOut, User, BookOpen, Briefcase, Bell } from '@phosphor-icons/react';
import Sidebar from './components/Sidebar';
import { apiEndpoints, resolveApiAssetUrl } from './config/api';

const formatRelativeNotificationTime = (iso) => {
  if (!iso) return 'Now';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Now';
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'Now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const fallbackProfileImage = '/Logo.jpg';
  const notificationAvatarCacheRef = useRef({});
  const normalizeCareerDocument = (file, fallbackId = Date.now()) => {
    if (!file) return null;
    if (typeof file === 'string') {
      return { id: fallbackId, name: file, url: '', contentType: '' };
    }

    return {
      ...file,
      id: file.id || fallbackId,
      name: file.name || file.filename || file.originalName || 'Document',
      url: file.url || file.link || '',
      contentType: file.contentType || file.type || '',
    };
  };
  const resolveProfileImage = (value) => {
    if (!value) return fallbackProfileImage;
    if (String(value).includes('gear-icon.svg')) return fallbackProfileImage;
    if (value.includes('via.placeholder.com')) return fallbackProfileImage;
    return resolveApiAssetUrl(value);
  };
  const [isEditing, setIsEditing] = useState(false);
  const [isMobile, setIsMobile] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth <= 900 : false
  ));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hoverButton, setHoverButton] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState(() => {
    const userData = localStorage.getItem('user');
    const user = userData ? JSON.parse(userData) : null;
    const saved = localStorage.getItem(`careerDocuments_${user?.email}`);
    return saved ? JSON.parse(saved).map((file, index) => normalizeCareerDocument(file, Date.now() + index)).filter(Boolean) : [];
  });
  const [isDragging, setIsDragging] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMoreDetailsModal, setShowMoreDetailsModal] = useState(false);
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [profileImagePreview, setProfileImagePreview] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [openNotificationItemMenuId, setOpenNotificationItemMenuId] = useState(null);
  const [showAllNotificationsModal, setShowAllNotificationsModal] = useState(false);
  const [notificationView, setNotificationView] = useState('all');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const notificationPanelRef = useRef(null);
  const userMenuRef = useRef(null);
  const [hoverMenuItem, setHoverMenuItem] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [projects, setProjects] = useState(() => {
    const userData = localStorage.getItem('user');
    const user = userData ? JSON.parse(userData) : null;
    const saved = localStorage.getItem(`projects_${user?.email}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [projectForm, setProjectForm] = useState({
    name: '',
    link: '',
    industry: '',
    role: '',
  });

  const userData = localStorage.getItem('user');
  const user = userData ? JSON.parse(userData) : null;
  const notificationReadMapKey = useMemo(() => {
    const emailKey = String(user?.email || '').trim().toLowerCase();
    return emailKey ? `profileNotificationReadMap_${emailKey}` : 'profileNotificationReadMap';
  }, [user?.email]);
  const notificationReadIdsKey = useMemo(() => {
    const emailKey = String(user?.email || '').trim().toLowerCase();
    return emailKey ? `profileNotificationReadIds_${emailKey}` : 'profileNotificationReadIds';
  }, [user?.email]);
  const notificationItemsKey = useMemo(() => {
    const emailKey = String(user?.email || '').trim().toLowerCase();
    return emailKey ? `profileNotifications_${emailKey}` : 'profileNotifications';
  }, [user?.email]);
  const notificationDismissedIdsKey = useMemo(() => {
    const emailKey = String(user?.email || '').trim().toLowerCase();
    return emailKey ? `profileNotificationDismissedIds_${emailKey}` : 'profileNotificationDismissedIds';
  }, [user?.email]);
  const legacyNotificationReadMapKeys = useMemo(() => {
    const keys = [];
    const idKey = String(user?.id || '').trim();
    const objectIdKey = String(user?._id || '').trim();
    if (idKey) keys.push(`profileNotificationReadMap_${idKey}`);
    if (objectIdKey) keys.push(`profileNotificationReadMap_${objectIdKey}`);
    return keys.filter((k) => k && k !== notificationReadMapKey);
  }, [notificationReadMapKey, user?.id, user?._id]);

  // Empty by default. Real notifications can come from API (messages, mentorship status, etc.).
  const [notifications, setNotifications] = useState([]);
  const [notificationReadMap, setNotificationReadMap] = useState({});
  const [notificationReadIds, setNotificationReadIds] = useState({});
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState({});
  const notificationExamples = [
    'Fiona has sent a message.',
    'Admin approved your mentor application.',
    'A mentor accepted your request.',
  ];
  const unreadNotificationCount = notifications.filter((item) => item.unread).length;
  const visibleNotifications = notificationView === 'unread'
    ? notifications.filter((item) => item.unread)
    : [...notifications].sort((a, b) => {
      if (Number(b.unread) !== Number(a.unread)) return Number(b.unread) - Number(a.unread);
      return Number(b.sortTs || 0) - Number(a.sortTs || 0);
    });

  const isNotificationMarkedRead = (item, readIds = notificationReadIds, readMap = notificationReadMap) => {
    const id = String(item?.id || '').trim();
    if (id && readIds?.[id]) return true;

    const recipientId = String(item?.action?.recipientId || '').trim();
    const lastMessageAt = String(item?.lastMessageAt || '').trim();
    if (!recipientId || !lastMessageAt) return false;

    const readMarker = String(readMap?.[recipientId] || '').trim();
    if (!readMarker) return false;
    if (readMarker === lastMessageAt) return true;

    const messageTs = new Date(lastMessageAt).getTime();
    const markerTs = new Date(readMarker).getTime();
    return Number.isFinite(messageTs) && Number.isFinite(markerTs) && messageTs <= markerTs;
  };

  const markNotificationsAsRead = (items = []) => {
    const nextMap = { ...notificationReadMap };
    const nextReadIds = { ...notificationReadIds };
    let hasMapChanges = false;
    let hasReadIdChanges = false;

    items.forEach((item) => {
      const notificationId = String(item?.id || '').trim();
      const recipientId = String(item?.action?.recipientId || '').trim();
      const lastMessageAt = String(item?.lastMessageAt || '').trim();

      if (notificationId && !nextReadIds[notificationId]) {
        nextReadIds[notificationId] = true;
        hasReadIdChanges = true;
      }

      if (recipientId && lastMessageAt && nextMap[recipientId] !== lastMessageAt) {
        nextMap[recipientId] = lastMessageAt;
        hasMapChanges = true;
      }
    });

    if (hasMapChanges) {
      setNotificationReadMap(nextMap);
    }
    if (hasReadIdChanges) {
      setNotificationReadIds(nextReadIds);
    }

    if (hasMapChanges || hasReadIdChanges) {
      try {
        localStorage.setItem(notificationReadMapKey, JSON.stringify(nextMap));
        localStorage.setItem(notificationReadIdsKey, JSON.stringify(nextReadIds));
      } catch {
        // ignore storage write issues
      }
    }

    if (items.length > 0) {
      const readIdsSet = new Set(items.map((item) => String(item?.id || '').trim()).filter(Boolean));
      const readRecipientSet = new Set(items.map((item) => String(item?.action?.recipientId || '').trim()).filter(Boolean));
      setNotifications((prev) => prev.map((item) => {
        const notificationId = String(item?.id || '').trim();
        const recipientId = String(item?.action?.recipientId || '').trim();
        if (readIdsSet.has(notificationId) || (recipientId && readRecipientSet.has(recipientId))) {
          return { ...item, unread: false };
        }
        return item;
      }));
    }
  };

  const handleOpenNotification = (notification) => {
    const notificationId = typeof notification === 'string' ? notification : notification?.id;
    if (!notificationId) return;

    const item = typeof notification === 'object' ? notification : notifications.find((n) => n.id === notificationId);
    if (item) {
      markNotificationsAsRead([item]);
    }

    if (item?.action?.type === 'message' && item?.action?.recipientId) {
      navigate(`/inbox?recipient=${encodeURIComponent(item.action.recipientId)}`);
      setShowNotifications(false);
      setShowAllNotificationsModal(false);
      return;
    }

    if (item?.action?.type === 'announcement' && item?.action?.postId) {
      navigate(`/announcements?post=${encodeURIComponent(item.action.postId)}`);
      setShowNotifications(false);
      setShowAllNotificationsModal(false);
      return;
    }

    if (item?.action?.type === 'route' && item?.action?.path) {
      navigate(item.action.path);
      setShowNotifications(false);
      setShowAllNotificationsModal(false);
    }
  };

  const handleDeleteNotification = (notificationId) => {
    const id = String(notificationId || '').trim();
    if (!id) return;

    setNotifications((prev) => prev.filter((item) => String(item?.id || '').trim() !== id));
    setDismissedNotificationIds((prev) => {
      const next = { ...prev, [id]: true };
      try {
        localStorage.setItem(notificationDismissedIdsKey, JSON.stringify(next));
      } catch {
        // ignore storage write issues
      }
      return next;
    });
    setOpenNotificationItemMenuId((current) => (current === id ? null : current));
  };

  useEffect(() => {
    const parseMap = (raw) => {
      if (!raw) return {};
      try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
      } catch {
        return {};
      }
    };

    const currentMap = parseMap(localStorage.getItem(notificationReadMapKey));
    const mergedMap = { ...currentMap };
    let hasLegacyData = false;

    legacyNotificationReadMapKeys.forEach((key) => {
      const legacyMap = parseMap(localStorage.getItem(key));
      if (Object.keys(legacyMap).length > 0) {
        hasLegacyData = true;
        Object.assign(mergedMap, legacyMap);
      }
    });

    if (hasLegacyData) {
      try {
        localStorage.setItem(notificationReadMapKey, JSON.stringify(mergedMap));
        legacyNotificationReadMapKeys.forEach((key) => localStorage.removeItem(key));
      } catch {
        // ignore migration write issues
      }
    }

    const nextReadIds = parseMap(localStorage.getItem(notificationReadIdsKey));
    const nextDismissedIds = parseMap(localStorage.getItem(notificationDismissedIdsKey));
    setNotificationReadMap(mergedMap);
    setNotificationReadIds(nextReadIds);
    setDismissedNotificationIds(nextDismissedIds);
    const storedNotifications = parseMap(localStorage.getItem(notificationItemsKey));
    const notificationList = Array.isArray(storedNotifications?.items)
      ? storedNotifications.items
      : (Array.isArray(storedNotifications) ? storedNotifications : []);
    setNotifications(
      notificationList
        .filter((item) => !nextDismissedIds?.[String(item?.id || '').trim()])
        .map((item) => ({
          ...item,
          unread: !isNotificationMarkedRead(item, nextReadIds, mergedMap),
        }))
    );
  }, [legacyNotificationReadMapKeys, notificationDismissedIdsKey, notificationItemsKey, notificationReadIdsKey, notificationReadMapKey]);

  useEffect(() => {
    localStorage.setItem(notificationReadMapKey, JSON.stringify(notificationReadMap));
  }, [notificationReadMapKey, notificationReadMap]);

  useEffect(() => {
    try {
      localStorage.setItem(notificationItemsKey, JSON.stringify({ items: notifications }));
    } catch {
      // ignore storage write issues
    }
  }, [notificationItemsKey, notifications]);

  useEffect(() => {
    setNotifications((prev) => {
      let changed = false;
      const next = prev.map((item) => {
        const computedUnread = !isNotificationMarkedRead(item);
        if (Boolean(item?.unread) !== computedUnread) {
          changed = true;
          return { ...item, unread: computedUnread };
        }
        return item;
      });
      return changed ? next : prev;
    });
  }, [notificationReadIds, notificationReadMap]);

  useEffect(() => {
    let mounted = true;

    const getTokenUserId = (token) => {
      try {
        const payloadPart = String(token || '').split('.')[1] || '';
        if (!payloadPart) return '';
        const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized + '==='.slice((normalized.length + 3) % 4);
        const decoded = JSON.parse(window.atob(padded));
        return String(decoded?.id || decoded?._id || '').trim();
      } catch {
        return '';
      }
    };

    const normalizeAvatarUrl = (raw) => {
      const value = String(raw || '').trim();
      if (!value) return '';
      return resolveApiAssetUrl(value);
    };

    const normalizeAnnouncementNotification = (announcement) => {
      const postId = String(announcement?._id || '').trim();
      if (!postId) return null;

      const createdAt = String(announcement?.createdAt || '').trim();
      const sortTs = new Date(createdAt).getTime();
      const authorName = String(
        announcement?.author?.fullName
        || announcement?.author?.name
        || 'HSI Alumni Portal'
      ).trim();
      const title = String(announcement?.title || 'an announcement').trim() || 'an announcement';

      return {
        id: `ann-${postId}`,
        name: authorName,
        avatar: normalizeAvatarUrl(announcement?.author?.profileImage || ''),
        message: `posted "${title}".` ,
        time: formatRelativeNotificationTime(createdAt),
        lastMessageAt: createdAt,
        sortTs: Number.isFinite(sortTs) ? sortTs : Date.now(),
        context: 'Announcements',
        accent: '#B07A15',
        unread: !notificationReadIds?.[`ann-${postId}`],
        action: { type: 'announcement', postId },
      };
    };

    const normalizeUserNotification = (notification) => {
      const id = String(notification?._id || notification?.id || '').trim();
      if (!id) return null;

      const createdAt = String(notification?.createdAt || notification?.updatedAt || '').trim();
      const sortTs = new Date(createdAt).getTime();
      const actionPath = String(notification?.actionPath || '').trim();

      return {
        id,
        name: String(notification?.title || notification?.source || 'Highly Succeed Portal').trim() || 'Highly Succeed Portal',
        avatar: '/Lion.png',
        message: String(notification?.message || '').trim() || 'You have a new notification.',
        time: formatRelativeNotificationTime(createdAt),
        lastMessageAt: createdAt,
        sortTs: Number.isFinite(sortTs) ? sortTs : Date.now(),
        context: String(notification?.source || 'System').trim() || 'System',
        accent: notification?.level === 'error' ? '#dc2626' : notification?.level === 'success' ? '#16a34a' : '#B07A15',
        unread: !notificationReadIds?.[id],
        action: actionPath ? { type: 'route', path: actionPath } : null,
      };
    };

    const normalizeEventDecisionNotification = (registration) => {
      const status = String(registration?.status || '').trim().toLowerCase();
      if (status !== 'approved' && status !== 'rejected') return null;

      const eventId = String(registration?.eventId || '').trim();
      const registrationId = String(registration?.registrationId || '').trim();
      if (!eventId || !registrationId) return null;

      const createdAt = String(registration?.decisionAt || registration?.registeredAt || '').trim();
      const sortTs = new Date(createdAt).getTime();
      const eventTitle = String(registration?.eventTitle || 'the event').trim() || 'the event';
      const rejectionReason = String(registration?.rejectionReason || '').trim();
      const id = `event-decision-${eventId}-${registrationId}-${status}-${createdAt}`;

      return {
        id,
        name: status === 'approved' ? 'Event registration approved' : 'Event registration rejected',
        avatar: '/Lion.png',
        message: status === 'approved'
          ? `Admin approved your registration for ${eventTitle}.`
          : rejectionReason
            ? `Admin rejected your registration for ${eventTitle}. Reason: ${rejectionReason}`
            : `Admin rejected your registration for ${eventTitle}.`,
        time: formatRelativeNotificationTime(createdAt),
        lastMessageAt: createdAt,
        sortTs: Number.isFinite(sortTs) ? sortTs : Date.now(),
        context: 'Events',
        accent: status === 'approved' ? '#16a34a' : '#dc2626',
        unread: !notificationReadIds?.[id],
        action: { type: 'route', path: '/events' },
      };
    };

    const loadNotifications = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const authUserId = getTokenUserId(token) || String(user?.id || user?._id || '').trim();

        const [conversationsRes, announcementsRes, notificationsRes, eventRegistrationsRes] = await Promise.all([
          fetch(apiEndpoints.getConversations, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(apiEndpoints.announcements, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(apiEndpoints.notifications, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(apiEndpoints.myEventRegistrations, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const conversationsBody = conversationsRes.ok
          ? await conversationsRes.json().catch(() => ({}))
          : {};
        const conversations = Array.isArray(conversationsBody?.conversations)
          ? conversationsBody.conversations
          : [];
        const announcementsBody = announcementsRes.ok
          ? await announcementsRes.json().catch(() => ([]))
          : [];
        const notificationsBody = notificationsRes.ok
          ? await notificationsRes.json().catch(() => ({}))
          : {};
        const eventRegistrationsBody = eventRegistrationsRes.ok
          ? await eventRegistrationsRes.json().catch(() => ({}))
          : {};
        const announcementNotifications = (Array.isArray(announcementsBody) ? announcementsBody : [])
          .filter((announcement) => announcement?.autoGenerated && String(announcement?.sourceType || '').toLowerCase() === 'event')
          .slice(0, 12)
          .map(normalizeAnnouncementNotification)
          .filter(Boolean);
        const rawUserNotifications = Array.isArray(notificationsBody?.notifications) ? notificationsBody.notifications : [];
        const existingEventDecisionKeys = new Set(
          rawUserNotifications
            .map((notification) => {
              const kind = String(notification?.kind || '').trim();
              const eventId = String(notification?.metadata?.eventId || '').trim();
              const registrationId = String(notification?.metadata?.registrationId || '').trim();
              if (!kind || !eventId || !registrationId) return '';
              return `${kind}|${eventId}|${registrationId}`;
            })
            .filter(Boolean)
        );
        const userNotifications = rawUserNotifications
          .map(normalizeUserNotification)
          .filter(Boolean);
        const eventDecisionNotifications = (Array.isArray(eventRegistrationsBody?.registrations) ? eventRegistrationsBody.registrations : [])
          .filter((registration) => {
            const status = String(registration?.status || '').trim().toLowerCase();
            const kind = status === 'approved'
              ? 'event-registration-approved'
              : status === 'rejected'
                ? 'event-registration-rejected'
                : '';
            if (!kind) return false;
            const eventId = String(registration?.eventId || '').trim();
            const registrationId = String(registration?.registrationId || '').trim();
            return !existingEventDecisionKeys.has(`${kind}|${eventId}|${registrationId}`);
          })
          .map(normalizeEventDecisionNotification)
          .filter(Boolean);

        const messageNotifications = await Promise.all(conversations
          .filter((conv) => {
            const senderId = String(conv?.lastMessageSenderId || '').trim();
            if (!senderId || !authUserId) return true;
            return senderId !== authUserId;
          })
          .map(async (conv) => {
          const recipientId = String(conv?.participant?.id || '').trim();
          const lastMessageAt = String(conv?.lastMessageAt || '').trim();
          const id = `msg-${recipientId}-${lastMessageAt}`;
          const fullName = conv?.participant?.fullName || conv?.participant?.name || 'Someone';
          const rawAvatar = conv?.participant?.profileImage;
          const readMarker = String(notificationReadMap?.[recipientId] || '').trim();
          const isReadById = Boolean(notificationReadIds?.[id]);
          const senderId = String(conv?.lastMessageSenderId || '').trim();
          const isIncoming = !authUserId || senderId !== authUserId;
          const messageTs = new Date(lastMessageAt).getTime();
          const markerTs = new Date(readMarker).getTime();
          const isReadByMarker = Boolean(readMarker) && (
            (Number.isFinite(messageTs) && Number.isFinite(markerTs) && messageTs <= markerTs)
            || readMarker === lastMessageAt
          );
          const unread = isIncoming && !(isReadById || isReadByMarker);

          let avatar = normalizeAvatarUrl(rawAvatar);
          if (!avatar && recipientId) {
            if (notificationAvatarCacheRef.current[recipientId]) {
              avatar = notificationAvatarCacheRef.current[recipientId];
            } else {
              try {
                const profileRes = await fetch(apiEndpoints.directoryUser(recipientId), {
                  headers: { Authorization: `Bearer ${token}` },
                });
                if (profileRes.ok) {
                  const profileBody = await profileRes.json().catch(() => ({}));
                  const profileImage = profileBody?.user?.profileImage
                    || profileBody?.profileImage
                    || profileBody?.data?.profileImage
                    || '';
                  avatar = normalizeAvatarUrl(profileImage);
                  if (avatar) {
                    notificationAvatarCacheRef.current[recipientId] = avatar;
                  }
                }
              } catch {
                // ignore avatar fallback errors
              }
            }
          }

          return {
            id,
            name: fullName,
            avatar,
            message: isIncoming ? 'sent you a message.' : 'received your message.',
            time: formatRelativeNotificationTime(conv?.lastMessageAt),
            lastMessageAt,
            sortTs: Number.isFinite(messageTs) ? messageTs : Date.now(),
            context: 'Inbox',
            accent: '#1877F2',
            unread,
            action: recipientId ? { type: 'message', recipientId } : null,
          };
        }));

        const nextNotifications = [...messageNotifications, ...userNotifications, ...eventDecisionNotifications, ...announcementNotifications]
          .filter((item) => !dismissedNotificationIds?.[String(item?.id || '').trim()]);

        if (mounted) {
          setNotifications((prev) => {
            const merged = new Map();

            prev.forEach((item) => {
              if (item?.id) merged.set(item.id, item);
            });

            nextNotifications.forEach((item) => {
              const existing = merged.get(item.id);
              const nextItem = existing ? { ...existing, ...item } : item;
              nextItem.unread = !isNotificationMarkedRead(nextItem);
              merged.set(item.id, nextItem);
            });

            return [...merged.values()]
              .sort((a, b) => Number(b.sortTs || 0) - Number(a.sortTs || 0));
          });
        }
      } catch (err) {
        // ignore notification fetch failures
      }
    };

    loadNotifications();
    const intervalId = setInterval(loadNotifications, 15000);
    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [dismissedNotificationIds, notificationReadIds, notificationReadMap]);
  const profileStorageKey = user?.email ? `profileData_${user.email}` : null;
  const savedProfileData = profileStorageKey ? localStorage.getItem(profileStorageKey) : null;
  const savedProfile = savedProfileData ? JSON.parse(savedProfileData) : null;

  const [profileData, setProfileData] = useState({
    fullName: savedProfile?.fullName || user?.fullName || user?.name || 'User',
    jobTitle: savedProfile?.jobTitle || user?.jobTitle || 'Alumni Member',
    email: savedProfile?.email || user?.email || 'user@example.com',
    phone: savedProfile?.contactNumber || user?.contactNumber || '+1 (555) 123-4567',
    graduationYear: savedProfile?.graduationYear || user?.graduationYear || '',
    major: savedProfile?.major || user?.major || '',
    company: savedProfile?.company || user?.company || '',
    languages: savedProfile?.languages || user?.languages || 'EN',
    education: savedProfile?.education || user?.education || 'Not specified',
    skills: savedProfile?.skills || user?.skills || 'Not specified',
    bio: savedProfile?.bio || user?.bio || 'Welcome to my profile!',
    bio2: savedProfile?.bio2 || user?.bio2 || 'Looking forward to connecting with alumni community.',
    profileImage: resolveProfileImage(savedProfile?.profileImage || user?.profileImage),
    linkedinUrl: savedProfile?.linkedinUrl || user?.linkedinUrl || '',
    twitterUrl: savedProfile?.twitterUrl || user?.twitterUrl || '',
    instagramUrl: savedProfile?.instagramUrl || user?.instagramUrl || '',
  });

  const [formData, setFormData] = useState(profileData);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const updateProfileExtras = async (nextProjects, nextDocuments) => {
    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }

    try {
      await fetch(apiEndpoints.updateProfile, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          projects: nextProjects,
          careerDocuments: nextDocuments,
        }),
      });
    } catch (err) {
      console.error('Error saving profile extras', err);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }

    const loadProfile = async () => {
      try {
        const response = await fetch(apiEndpoints.getProfile, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        if (!data?.user) {
          return;
        }

        const removalStatus = String(data.user.dataRemovalRequestStatus || '').trim().toLowerCase();
        const reviewedAtRaw = String(data.user.dataRemovalRequestReviewedAt || '').trim();
        if ((removalStatus === 'approved' || removalStatus === 'rejected') && reviewedAtRaw) {
          const reviewedAtMs = new Date(reviewedAtRaw).getTime();
          const safeTs = Number.isFinite(reviewedAtMs) ? reviewedAtMs : Date.now();
          const decisionId = `data-removal-${removalStatus}-${reviewedAtRaw}`;
          const note = String(data.user.dataRemovalRequestDecisionNote || '').trim();
          const decisionText = removalStatus === 'approved'
            ? 'Admin approved your data removal request.'
            : 'Admin rejected your data removal request.';
          const fullText = note ? `${decisionText} Note: ${note}` : decisionText;

          const parseMap = (raw) => {
            if (!raw) return {};
            try {
              const parsed = JSON.parse(raw);
              return parsed && typeof parsed === 'object' ? parsed : {};
            } catch {
              return {};
            }
          };
          const storedReadIds = parseMap(localStorage.getItem(notificationReadIdsKey));
          const storedReadMap = parseMap(localStorage.getItem(notificationReadMapKey));

          setNotifications((prev) => {
            const existingIndex = prev.findIndex((item) => item.id === decisionId);
            if (dismissedNotificationIds?.[decisionId]) {
              return prev;
            }
            const nextItem = {
              id: decisionId,
              name: 'Highly Succeed Portal',
              avatar: '/Lion.png',
              message: fullText,
              time: formatRelativeNotificationTime(reviewedAtRaw),
              lastMessageAt: reviewedAtRaw,
              sortTs: safeTs,
              context: 'Privacy',
              accent: removalStatus === 'approved' ? '#16a34a' : '#dc2626',
              unread: !isNotificationMarkedRead(
                { id: decisionId, action: null, lastMessageAt: reviewedAtRaw },
                storedReadIds,
                storedReadMap
              ),
              action: null,
            };
            if (existingIndex >= 0) {
              return prev.map((item, index) => (
                index === existingIndex
                  ? { ...item, ...nextItem }
                  : item
              ));
            }
            return [nextItem, ...prev];
          });
        }

        const serverProfile = {
          fullName: data.user.fullName || data.user.name || 'User',
          jobTitle: data.user.jobTitle || 'Alumni Member',
          email: data.user.email || 'user@example.com',
          phone: data.user.contactNumber || '+1 (555) 123-4567',
          graduationYear: data.user.graduationYear || '',
          major: data.user.major || '',
          company: data.user.company || '',
          languages: data.user.languages || 'EN',
          education: data.user.education || 'Not specified',
          skills: data.user.skills || 'Not specified',
          bio: data.user.bio || 'Welcome to my profile!',
          bio2: data.user.bio2 || 'Looking forward to connecting with alumni community.',
          profileImage: resolveProfileImage(data.user.profileImage),
          linkedinUrl: data.user.linkedinUrl || '',
          twitterUrl: data.user.twitterUrl || '',
          instagramUrl: data.user.instagramUrl || '',
        };

        // If we have a saved local profile and it contains a profileImage,
        // prefer it when the server returned no image (or a shorter placeholder).
        if (savedProfile?.profileImage) {
          const serverImgLen = data.user.profileImage ? String(data.user.profileImage).length : 0;
          const localImgLen = savedProfile.profileImage ? String(savedProfile.profileImage).length : 0;
          if (localImgLen > 0 && serverImgLen === 0) {
            serverProfile.profileImage = resolveProfileImage(savedProfile.profileImage);
          }
        }

        setProfileData(serverProfile);
        setFormData(serverProfile);

        if (Array.isArray(data.user.projects)) {
          setProjects(data.user.projects);
        }
        if (Array.isArray(data.user.careerDocuments)) {
          setUploadedFiles(data.user.careerDocuments.map((file, index) => normalizeCareerDocument(file, Date.now() + index)).filter(Boolean));
        }

        localStorage.setItem('user', JSON.stringify(data.user));
        if (data.user.email) {
          localStorage.setItem(`profileData_${data.user.email}`, JSON.stringify({
            fullName: serverProfile.fullName,
            jobTitle: serverProfile.jobTitle,
            email: serverProfile.email,
            contactNumber: serverProfile.phone,
            graduationYear: serverProfile.graduationYear,
            major: serverProfile.major,
            company: serverProfile.company,
            languages: serverProfile.languages,
            education: serverProfile.education,
            skills: serverProfile.skills,
            bio: serverProfile.bio,
            bio2: serverProfile.bio2,
            profileImage: serverProfile.profileImage,
            linkedinUrl: serverProfile.linkedinUrl,
            twitterUrl: serverProfile.twitterUrl,
            instagramUrl: serverProfile.instagramUrl,
          }));
          if (Array.isArray(data.user.projects)) {
            localStorage.setItem(`projects_${data.user.email}`, JSON.stringify(data.user.projects));
          }
          if (Array.isArray(data.user.careerDocuments)) {
            localStorage.setItem(`careerDocuments_${data.user.email}`, JSON.stringify(data.user.careerDocuments.map((file, index) => normalizeCareerDocument(file, Date.now() + index)).filter(Boolean)));
          }
        }
      } catch (err) {
        console.error('Error loading profile', err);
      }
    };

    loadProfile();
  }, [dismissedNotificationIds, notificationReadIdsKey, notificationReadMapKey]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (notificationPanelRef.current && !notificationPanelRef.current.contains(event.target)) {
        setShowNotifications(false);
        setShowNotificationMenu(false);
        setOpenNotificationItemMenuId(null);
      }
      if (!(event.target instanceof Element) || !event.target.closest('[data-notification-item-menu]')) {
        setOpenNotificationItemMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const showSuccessToast = (text) => {
    window.dispatchEvent(
      new CustomEvent('hsi-toast', {
        detail: { type: 'success', text },
      }),
    );
  };

  const handleSave = async () => {
    setProfileData(formData);
    setIsEditing(false);
    setShowEditModal(false);
    setShowMoreDetailsModal(false);

    const profileSnapshot = {
      fullName: formData.fullName,
      jobTitle: formData.jobTitle,
      email: formData.email,
      contactNumber: formData.phone,
      graduationYear: formData.graduationYear,
      major: formData.major,
      company: formData.company,
      languages: formData.languages,
      education: formData.education,
      skills: formData.skills,
      bio: formData.bio,
      bio2: formData.bio2,
      profileImage: formData.profileImage,
      linkedinUrl: formData.linkedinUrl,
      twitterUrl: formData.twitterUrl,
      instagramUrl: formData.instagramUrl,
    };
    
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    const existingUser = userData ? JSON.parse(userData) : null;

    let responseOk = false;
    if (token) {
      try {
        const response = await fetch(apiEndpoints.updateProfile, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            fullName: formData.fullName,
            email: formData.email,
            jobTitle: formData.jobTitle,
            contactNumber: formData.phone,
            graduationYear: formData.graduationYear,
            major: formData.major,
            company: formData.company,
            languages: formData.languages,
            education: formData.education,
            skills: formData.skills,
            bio: formData.bio,
            bio2: formData.bio2,
            profileImage: formData.profileImage,
            linkedinUrl: formData.linkedinUrl,
            twitterUrl: formData.twitterUrl,
            instagramUrl: formData.instagramUrl,
            projects,
            careerDocuments: uploadedFiles,
          }),
        });

        if (response.ok) {
          responseOk = true;
          const data = await response.json();
          if (data?.user) {
            // persist returned authoritative user object
            localStorage.setItem('user', JSON.stringify(data.user));
            const serverProfile = {
              fullName: data.user.fullName || data.user.name || 'User',
              jobTitle: data.user.jobTitle || 'Alumni Member',
              email: data.user.email || 'user@example.com',
              phone: data.user.contactNumber || '+1 (555) 123-4567',
              graduationYear: data.user.graduationYear || '',
              major: data.user.major || '',
              company: data.user.company || '',
              languages: data.user.languages || 'EN',
              education: data.user.education || 'Not specified',
              skills: data.user.skills || 'Not specified',
              bio: data.user.bio || 'Welcome to my profile!',
              bio2: data.user.bio2 || 'Looking forward to connecting with alumni community.',
              profileImage: resolveProfileImage(data.user.profileImage),
              linkedinUrl: data.user.linkedinUrl || '',
              twitterUrl: data.user.twitterUrl || '',
              instagramUrl: data.user.instagramUrl || '',
            };

            setProfileData(serverProfile);
            setFormData(serverProfile);
            if (data.user.email) {
              localStorage.setItem(`profileData_${data.user.email}`, JSON.stringify(serverProfile));
            }
          }
          showSuccessToast('Profile updated successfully.');
        }
      } catch (err) {
        console.error('Error saving profile', err);
      }
    }

    // If server successfully updated the profile, stop here to avoid
    // overwriting the authoritative server values with client-side form data.
    if (responseOk) return;

    const updatedUser = {
      ...existingUser,
      fullName: formData.fullName,
      name: formData.fullName,
      jobTitle: formData.jobTitle,
      email: formData.email,
      contactNumber: formData.phone,
      graduationYear: formData.graduationYear,
      major: formData.major,
      company: formData.company,
      languages: formData.languages,
      education: formData.education,
      skills: formData.skills,
      bio: formData.bio,
      bio2: formData.bio2,
      profileImage: formData.profileImage,
      linkedinUrl: formData.linkedinUrl,
      twitterUrl: formData.twitterUrl,
      instagramUrl: formData.instagramUrl,
    };

    localStorage.setItem('user', JSON.stringify(updatedUser));

    const oldProfileKey = user?.email;
    const profileKey = formData.email || oldProfileKey;
    if (profileKey) {
      localStorage.setItem(`profileData_${profileKey}`, JSON.stringify(profileSnapshot));
      localStorage.setItem(`projects_${profileKey}`, JSON.stringify(projects));
      localStorage.setItem(`careerDocuments_${profileKey}`, JSON.stringify(uploadedFiles));
    }
    if (oldProfileKey && formData.email && oldProfileKey !== formData.email) {
      localStorage.removeItem(`profileData_${oldProfileKey}`);
      localStorage.removeItem(`projects_${oldProfileKey}`);
      localStorage.removeItem(`careerDocuments_${oldProfileKey}`);
    }

    showSuccessToast('Profile updated successfully.');
  };

  const handleProfileImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Upload avatar to server as multipart/form-data
    const token = localStorage.getItem('token');
    const fd = new FormData();
    fd.append('avatar', file);

    try {
      const resp = await fetch(apiEndpoints.uploadAvatar, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!resp.ok) {
        console.error('Avatar upload failed', resp.status);
        return;
      }
      const data = await resp.json();
      const url = data?.url
        ? resolveApiAssetUrl(data.url)
        : (data?.user?.profileImage ? resolveApiAssetUrl(data.user.profileImage) : null);
      if (url) {
        setProfileImagePreview(url);
        setFormData({ ...formData, profileImage: url });
      }
    } catch (err) {
      console.error('Error uploading avatar', err);
    }
    // reset input value if present
    try { event.target.value = ''; } catch (e) {}
  };

  const handleProfileImageDrop = async (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (!file) return;

    const token = localStorage.getItem('token');
    const fd = new FormData();
    fd.append('avatar', file);

    try {
      const resp = await fetch(apiEndpoints.uploadAvatar, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!resp.ok) {
        console.error('Avatar upload failed', resp.status);
        return;
      }
      const data = await resp.json();
      const url = data?.url
        ? resolveApiAssetUrl(data.url)
        : (data?.user?.profileImage ? resolveApiAssetUrl(data.user.profileImage) : null);
      if (url) {
        setProfileImagePreview(url);
        setFormData({ ...formData, profileImage: url });
      }
    } catch (err) {
      console.error('Error uploading avatar', err);
    }
  };

  const uploadCareerDocumentFile = async (file) => {
    if (!file) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    const fd = new FormData();
    fd.append('document', file);

    try {
      const response = await fetch(apiEndpoints.uploadCareerDocument, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || 'Career document upload failed');
      }

      const nextDocuments = Array.isArray(data?.user?.careerDocuments)
        ? data.user.careerDocuments.map((item, index) => normalizeCareerDocument(item, Date.now() + index)).filter(Boolean)
        : [...uploadedFiles, normalizeCareerDocument(data?.document, Date.now())].filter(Boolean);

      setUploadedFiles(nextDocuments);
      if (user?.email) {
        localStorage.setItem(`careerDocuments_${user.email}`, JSON.stringify(nextDocuments));
      }
      showSuccessToast('Career document uploaded successfully.');
    } catch (err) {
      console.error('Error uploading career document', err);
      window.dispatchEvent(new CustomEvent('hsi-toast', {
        detail: { type: 'error', text: err?.message || 'Failed to upload career document.' },
      }));
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      await uploadCareerDocumentFile(file);
    }
    event.target.value = '';
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) {
      await uploadCareerDocumentFile(file);
    }
  };

  const handleRemoveFile = (fileId) => {
    const newFiles = uploadedFiles.filter(f => f.id !== fileId);
    setUploadedFiles(newFiles);
    localStorage.setItem(`careerDocuments_${user?.email}`, JSON.stringify(newFiles));
    updateProfileExtras(projects, newFiles);
  };

  const handleAddProject = () => {
    if (projectForm.name && projectForm.link && projectForm.industry && projectForm.role) {
      const newProject = { ...projectForm, id: Date.now() };
      const newProjects = [...projects, newProject];
      setProjects(newProjects);
      localStorage.setItem(`projects_${user?.email}`, JSON.stringify(newProjects));
      updateProfileExtras(newProjects, uploadedFiles);
      setProjectForm({ name: '', link: '', industry: '', role: '' });
      setShowAddProjectModal(false);
    }
  };

  const handleRemoveProject = (projectId) => {
    const newProjects = projects.filter(p => p.id !== projectId);
    setProjects(newProjects);
    localStorage.setItem(`projects_${user?.email}`, JSON.stringify(newProjects));
    updateProfileExtras(newProjects, uploadedFiles);
  };

  return (
    <>
      <style>{`
        @keyframes fillBounce {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
        .modal-no-scrollbar {
          scrollbar-width: none; /* Firefox */
        }
        .modal-no-scrollbar::-webkit-scrollbar {
          display: none; /* Chrome, Safari, Edge */
        }
        .profile-header {
          background: #d4a017;
        }
        @media (max-width: 900px) {
          html,
          body,
          #root {
            max-width: 100vw !important;
            overflow-x: hidden !important;
          }
          .profile-page-root {
            width: 100%;
            max-width: 100vw;
            overflow-x: hidden;
          }
          .profile-main {
            width: 100%;
            max-width: 100%;
            overflow-x: hidden;
          }
          .profile-topbar {
            gap: 14px;
          }
          .profile-content-grid {
            grid-template-columns: 1fr !important;
            gap: 18px !important;
            max-width: 100% !important;
          }
          .profile-header {
            padding: 18px 14px !important;
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 16px !important;
            overflow: hidden;
            box-sizing: border-box !important;
          }
          .profile-header-stack {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            gap: 16px !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .profile-image {
            width: 72px !important;
            height: 72px !important;
            align-self: center !important;
          }
          .profile-identity {
            width: 100% !important;
            min-width: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .profile-name,
          .profile-job {
            text-align: center !important;
            max-width: 100% !important;
            overflow-wrap: anywhere !important;
          }
          .profile-name {
            font-size: 20px !important;
            line-height: 1.15 !important;
          }
          .profile-socials {
            display: flex !important;
            flex-direction: column !important;
            width: 100% !important;
            gap: 10px !important;
          }
          .profile-social-button,
          .profile-edit-button,
          .profile-socials button {
            width: 100% !important;
            min-width: 0 !important;
            justify-content: center !important;
            box-sizing: border-box !important;
          }
          .profile-edit-wrap {
            width: 100% !important;
            align-self: stretch !important;
            padding-bottom: 0 !important;
          }
          .profile-edit-wrap button {
            width: 100% !important;
          }
          .profile-card {
            padding: 18px 14px !important;
          }
          .profile-projects-wrap,
          .profile-career-docs {
            overflow-x: auto;
          }
        }
        @media (max-width: 480px) {
          .profile-main {
            padding: 14px 10px !important;
          }
          .profile-topbar button {
            font-size: 14px !important;
          }
          .profile-header {
            padding: 16px 12px !important;
            border-radius: 14px !important;
          }
          .profile-image {
            width: 68px !important;
            height: 68px !important;
          }
          .profile-name {
            font-size: 18px !important;
          }
          .profile-job {
            font-size: 14px !important;
          }
          .profile-card {
            padding: 16px 12px !important;
          }
        }
      `}</style>
      <motion.div 
        className="profile-page-root"
        style={{ display: 'flex', minHeight: '100vh', background: '#f6f1e7', overflowX: 'hidden', width: '100%', maxWidth: '100vw' }}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.3 }}
      >
      <Sidebar isOpen={sidebarOpen} toggle={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="profile-main" style={{ flex: 1, minWidth: 0, width: '100%', maxWidth: '100%', overflowX: 'hidden', padding: isMobile ? '16px 12px' : '24px' }}>
    
      <div className="profile-topbar" style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', gap: isMobile ? '14px' : 0, marginBottom: '24px' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#333',
            fontSize: '16px',
            fontWeight: '500',
          }}
        >
          <ArrowLeft size={20} />
          Back to Dashboard
        </button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'space-between' : 'flex-end', gap: '10px' }}>
          <div ref={notificationPanelRef} style={{ position: 'relative' }}>
            <button
              onClick={() => {
                setShowNotifications((prev) => {
                  const next = !prev;
                  if (next) {
                    markNotificationsAsRead(notifications);
                  }
                  return next;
                });
                setShowNotificationMenu(false);
                setNotificationView('all');
                setShowUserMenu(false);
              }}
              style={{
                background: 'white',
                border: '1px solid #efe4d3',
                borderRadius: '999px',
                width: '44px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 6px 14px rgba(0,0,0,0.08)',
                position: 'relative',
                overflow: 'visible',
              }}
              aria-label="Open notifications"
            >
              <Bell size={20} color="#334155" weight="duotone" />
              {unreadNotificationCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-2px',
                    right: '-2px',
                    minWidth: '18px',
                    height: '18px',
                    borderRadius: '999px',
                    background: '#1877F2',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #f6f1e7',
                    padding: '0 4px',
                    zIndex: 5,
                    pointerEvents: 'none',
                  }}
                >
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: 6 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  style={{
                    position: isMobile ? 'fixed' : 'absolute',
                    top: isMobile ? '74px' : '54px',
                    right: isMobile ? '12px' : 0,
                    left: isMobile ? '12px' : 'auto',
                    width: isMobile ? 'auto' : '390px',
                    maxWidth: isMobile ? 'none' : 'calc(100vw - 40px)',
                    maxHeight: isMobile ? 'min(70vh, 520px)' : '460px',
                    overflowY: 'auto',
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '16px',
                    boxShadow: '0 20px 45px rgba(2, 6, 23, 0.2)',
                    zIndex: 80,
                  }}
                >
                  <div style={{ padding: '16px 16px 10px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                      <h3 style={{ margin: 0, fontSize: '24px', color: '#111827', fontWeight: '800' }}>Notifications</h3>
                      <button
                        style={{ border: 'none', background: 'transparent', color: '#6b7280', cursor: 'pointer', fontSize: '18px' }}
                        onClick={() => setShowNotificationMenu((prev) => !prev)}
                        aria-label="Open notification menu"
                      >
                        •••
                      </button>
                      <AnimatePresence>
                        {showNotificationMenu && (
                          <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 2 }}
                            transition={{ duration: 0.12 }}
                            style={{
                              position: 'absolute',
                              top: '38px',
                              right: 0,
                              width: '260px',
                              borderRadius: '12px',
                              background: 'white',
                              border: '1px solid #e5e7eb',
                              boxShadow: '0 14px 30px rgba(15, 23, 42, 0.18)',
                              overflow: 'hidden',
                              zIndex: 40,
                            }}
                          >
                            <button
                              style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                border: 'none',
                                background: 'white',
                                padding: '12px 14px',
                                fontSize: '16px',
                                color: '#111827',
                                cursor: 'pointer',
                                textAlign: 'left',
                              }}
                              onClick={() => {
                                markNotificationsAsRead(notifications);
                                setShowNotificationMenu(false);
                              }}
                            >
                              <span style={{ width: '16px', fontWeight: '700', textAlign: 'center' }}>✓</span>
                              Mark all as read
                            </button>
                            <button
                              style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                border: 'none',
                                background: 'white',
                                padding: '12px 14px',
                                fontSize: '16px',
                                color: '#111827',
                                cursor: 'pointer',
                                textAlign: 'left',
                              }}
                              onClick={() => {
                                markNotificationsAsRead(notifications);
                                setShowNotificationMenu(false);
                                setShowNotifications(false);
                                setNotificationView('all');
                                setShowAllNotificationsModal(true);
                              }}
                            >
                              <Bell size={18} color="#111827" />
                              Open Notifications
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                      <button
                        type="button"
                        onClick={() => setNotificationView('all')}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '999px',
                          background: notificationView === 'all' ? '#E7F1FF' : '#f3f4f6',
                          color: notificationView === 'all' ? '#1d4ed8' : '#111827',
                          fontWeight: '700',
                          fontSize: '14px',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setNotificationView('unread')}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '999px',
                          background: notificationView === 'unread' ? '#E7F1FF' : '#f3f4f6',
                          color: notificationView === 'unread' ? '#1d4ed8' : '#111827',
                          fontWeight: '700',
                          fontSize: '14px',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        Unread
                      </button>
                    </div>
                  </div>

                  <div style={{ padding: '0 14px 14px 14px' }}>
                    {visibleNotifications.length === 0 ? (
                      <div
                        style={{
                          border: '1px dashed #d1d5db',
                          borderRadius: '12px',
                          padding: '18px 16px',
                          background: '#f9fafb',
                        }}
                      >
                        <p style={{ margin: 0, color: '#111827', fontWeight: '700', fontSize: '15px' }}>No notifications yet</p>
                        <p style={{ margin: '8px 0 0 0', color: '#4b5563', fontSize: '14px', lineHeight: 1.5 }}>
                          This area will show updates like new messages and mentorship status changes.
                        </p>
                        <div style={{ marginTop: '12px', color: '#374151', fontSize: '14px', lineHeight: 1.6 }}>
                          <div>Example:</div>
                          {notificationExamples.map((example, index) => (
                            <div key={index}>• {example}</div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      visibleNotifications.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleOpenNotification(item)}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '52px 1fr auto 10px',
                            gap: '10px',
                            alignItems: 'center',
                            padding: '10px 6px',
                            borderRadius: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          <div
                            style={{
                              width: '52px',
                              height: '52px',
                              borderRadius: '999px',
                              background: '#e5e7eb',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#111827',
                              fontWeight: '700',
                              fontSize: '18px',
                              position: 'relative',
                              overflow: 'hidden',
                            }}
                          >
                            {item.avatar ? (
                              <img
                                src={item.avatar}
                                alt={item.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const next = e.currentTarget.nextSibling;
                                  if (next && next.style) next.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <span
                              style={{
                                display: item.avatar ? 'none' : 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '100%',
                                height: '100%',
                              }}
                            >
                              {item.name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <div style={{ color: '#111827', fontSize: '15px', lineHeight: 1.35 }}>
                              <span style={{ fontWeight: '700' }}>{item.name}</span> {item.message}
                            </div>
                            <div style={{ marginTop: '4px', color: '#2563eb', fontWeight: item.unread ? '600' : '400', fontSize: '14px' }}>
                              {item.time} • {item.context}
                            </div>
                          </div>
                          <div data-notification-item-menu style={{ position: 'relative' }}>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setOpenNotificationItemMenuId((current) => (current === item.id ? null : item.id));
                              }}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: '#6b7280',
                                cursor: 'pointer',
                                fontSize: '18px',
                                lineHeight: 1,
                                padding: '4px 6px',
                                borderRadius: '999px',
                              }}
                              aria-label={`Open options for ${item.name} notification`}
                            >
                              •••
                            </button>
                            <AnimatePresence>
                              {openNotificationItemMenuId === item.id && (
                                <motion.div
                                  initial={{ opacity: 0, y: 4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 2 }}
                                  transition={{ duration: 0.12 }}
                                  style={{
                                    position: 'absolute',
                                    top: '34px',
                                    right: 0,
                                    minWidth: '120px',
                                    borderRadius: '12px',
                                    background: 'white',
                                    border: '1px solid #e5e7eb',
                                    boxShadow: '0 14px 30px rgba(15, 23, 42, 0.18)',
                                    overflow: 'hidden',
                                    zIndex: 45,
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleDeleteNotification(item.id);
                                    }}
                                    style={{
                                      width: '100%',
                                      border: 'none',
                                      background: 'white',
                                      padding: '10px 12px',
                                      fontSize: '14px',
                                      color: '#b91c1c',
                                      cursor: 'pointer',
                                      textAlign: 'left',
                                    }}
                                  >
                                    Delete
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                          <div
                            style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '999px',
                              background: item.unread ? '#1877F2' : 'transparent',
                            }}
                          />
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div ref={userMenuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => {
                setShowUserMenu((prev) => !prev);
                setShowNotifications(false);
                setShowNotificationMenu(false);
              }}
              style={{
                background: 'white',
                border: '1px solid #efe4d3',
                borderRadius: '999px',
                width: '44px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 6px 14px rgba(0,0,0,0.08)',
              }}
            >
              <img
                src={profileData?.profileImage || '/Logo.jpg'}
                alt="Profile"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '999px',
                  objectFit: 'cover',
                }}
              />
            </button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: 6 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  style={{
                    position: isMobile ? 'fixed' : 'absolute',
                    top: isMobile ? '74px' : '54px',
                    right: isMobile ? '12px' : 0,
                    left: isMobile ? 'auto' : 'auto',
                    width: '220px',
                    background: 'white',
                    border: '1px solid #efe4d3',
                    borderRadius: '14px',
                    boxShadow: '0 16px 30px rgba(0,0,0,0.12)',
                    overflow: 'hidden',
                    zIndex: 80,
                  }}
                >
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#111827' }}>
                    {profileData?.fullName || 'Account'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{profileData?.email || ''}</div>
                </div>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate('/account');
                  }}
                  onMouseEnter={() => setHoverMenuItem('settings')}
                  onMouseLeave={() => setHoverMenuItem(null)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 16px',
                    background: hoverMenuItem === 'settings' ? '#f9fafb' : 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: '#111827',
                    transition: 'background 0.2s ease, color 0.2s ease',
                  }}
                >
                  <Gear size={16} color="#4b5563" />
                  Settings & Privacy
                </button>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    setShowLogoutConfirm(true);
                  }}
                  onMouseEnter={() => setHoverMenuItem('logout')}
                  onMouseLeave={() => setHoverMenuItem(null)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 16px',
                    background: hoverMenuItem === 'logout' ? '#fef2f2' : 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: '#b91c1c',
                    transition: 'background 0.2s ease, color 0.2s ease',
                  }}
                >
                  <SignOut size={16} color="#b91c1c" />
                  Logout
                </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="profile-content-grid" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: isMobile ? '18px' : '28px', maxWidth: '1400px', width: '100%', minWidth: 0 }}>
        {/* Main Content */}
        <div style={{ minWidth: 0 }}>
          {/* Profile Header */}
          <div
            className="profile-header"
            style={{
              borderRadius: '16px',
              padding: isMobile ? '18px' : '28px',
              color: '#111827',
              marginBottom: '24px',
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '16px' : '24px',
              alignItems: isMobile ? 'stretch' : 'center',
              border: '1px solid #f0d27a',
              boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
              width: '100%',
              maxWidth: '100%',
              overflow: 'hidden',
              boxSizing: 'border-box',
            }}
          >
            <div className="profile-header-stack" style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'center' : 'center', gap: isMobile ? '18px' : '24px', width: '100%', maxWidth: '100%' }}>
              <img
                className="profile-image"
                src={resolveProfileImage(formData.profileImage)}
                alt="Profile"
                style={{
                  width: isMobile ? '88px' : '120px',
                  height: isMobile ? '88px' : '120px',
                  borderRadius: '12px',
                  border: '4px solid white',
                  objectFit: 'cover',
                  boxShadow: '0 6px 18px rgba(0,0,0,0.2)',
                  alignSelf: isMobile ? 'center' : 'auto',
                }}
                onError={(event) => {
                  event.currentTarget.src = fallbackProfileImage;
                }}
              />
              <div className="profile-identity" style={{ flex: 1, minWidth: 0, width: '100%' }}>
                {isEditing ? (
                  <div>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => handleInputChange('fullName', e.target.value)}
                      style={{
                        fontSize: '28px',
                        fontWeight: '700',
                        width: '100%',
                        padding: '8px',
                        border: '1px solid white',
                        borderRadius: '4px',
                        marginBottom: '8px',
                        color: '#333',
                      }}
                    />
                    <input
                      type="text"
                      value={formData.jobTitle}
                      onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                      style={{
                        fontSize: '16px',
                        width: '100%',
                        padding: '8px',
                        border: '1px solid white',
                        borderRadius: '4px',
                        color: '#333',
                      }}
                    />
                  </div>
                ) : (
                  <div>
                    <h1 className="profile-name" style={{ fontSize: isMobile ? '24px' : '28px', fontWeight: '800', margin: '0 0 8px 0', color: '#111827', wordBreak: 'break-word', textAlign: isMobile ? 'center' : 'left' }}>
                      {profileData.fullName}
                    </h1>
                    <p className="profile-job" style={{ fontSize: isMobile ? '15px' : '16px', margin: 0, color: '#7a5b00', fontWeight: '600', wordBreak: 'break-word', textAlign: isMobile ? 'center' : 'left' }}>
                      {profileData.jobTitle}
                    </p>
                  </div>
                )}
                <div className="profile-socials" style={{ marginTop: '12px', display: isMobile ? 'grid' : 'flex', gridTemplateColumns: isMobile ? '1fr' : 'none', alignItems: 'center', gap: '10px', flexWrap: 'wrap', width: '100%' }}>
              <button
                className="profile-social-button"
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
                  justifyContent: 'center',
                  minWidth: 0,
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
                    transform: 'scaleX(0)',
                    transformOrigin: 'left',
                    animation: 'fillBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }} />
                )}
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  position: 'relative',
                  zIndex: 1,
                }}>
                  <LinkedinLogo size={16} />
                  Linkedin
                </span>
              </button>
              <button
                className="profile-social-button"
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
                  justifyContent: 'center',
                  minWidth: 0,
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
                    transform: 'scaleX(0)',
                    transformOrigin: 'left',
                    animation: 'fillBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }} />
                )}
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  position: 'relative',
                  zIndex: 1,
                }}>
                  <TwitterLogo size={16} />
                  Twitter
                </span>
              </button>
              <button
                className="profile-social-button"
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
                  justifyContent: 'center',
                  minWidth: 0,
                  gridColumn: isMobile ? '1 / -1' : 'auto',
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
                    transform: 'scaleX(0)',
                    transformOrigin: 'left',
                    animation: 'fillBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }} />
                )}
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  position: 'relative',
                  zIndex: 1,
                }}>
                  <InstagramLogo size={16} />
                  Instagram
                </span>
              </button>
                </div>
              </div>
              <div className="profile-edit-wrap" style={{ display: 'flex', alignItems: 'center', alignSelf: isMobile ? 'stretch' : 'flex-end', width: isMobile ? '100%' : 'auto', paddingBottom: '6px' }}>
                <button
                onClick={() => {
                  setFormData(profileData);
                  setProfileImagePreview(null);
                  setShowEditModal(true);
                }}
                className="profile-edit-button"
                onMouseEnter={() => setHoverButton('edit')}
                onMouseLeave={() => setHoverButton(null)}
                style={{
                  background: '#ffffff',
                  color: '#b07a15',
                  border: '2px solid #d49a00',
                  borderRadius: '999px',
                  padding: '8px 18px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: '700',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.12)',
                  width: isMobile ? '100%' : 'auto',
                  justifyContent: 'center',
                }}
              >
                {hoverButton === 'edit' && (
                  <span style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: '100%',
                    height: '100%',
                    background: 'rgba(0, 0, 0, 0.12)',
                    borderRadius: '999px',
                    transform: 'scaleX(0)',
                    transformOrigin: 'left',
                    animation: 'fillBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }} />
                )}
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  position: 'relative',
                  zIndex: 1,
                }}>
                  <PencilSimple size={16} />
                  Edit Profile
                </span>
              </button>
              </div>
            </div>
          </div>

          {/* About Me */}
          <div
            className="profile-card"
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: isMobile ? '18px' : '24px',
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
              <p style={{ color: '#6b7280', lineHeight: '1.6' }}>
                {profileData.bio2}
              </p>
            </div>
          </div>

          {/* Project Table */}
          <div
            className="profile-card"
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: isMobile ? '18px' : '24px',
              border: '1px solid #efe5d7',
              boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: isMobile ? '12px' : 0, marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0, color: '#111827' }}>
                Project Table
              </h2>
              <button
                onClick={() => setShowAddProjectModal(true)}
                onMouseEnter={() => setHoverButton('addProjectBtn')}
                onMouseLeave={() => setHoverButton(null)}
                style={{
                  background: '#ffffff',
                  color: '#b07a15',
                  border: '2px solid #d49a00',
                  borderRadius: '999px',
                  padding: '8px 18px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: '700',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.12)',
                  width: isMobile ? '100%' : 'auto',
                  justifyContent: 'center',
                }}
              >
                {hoverButton === 'addProjectBtn' && (
                  <span style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: '100%',
                    height: '100%',
                    background: 'rgba(0, 0, 0, 0.12)',
                    borderRadius: '999px',
                    transform: 'scaleX(0)',
                    transformOrigin: 'left',
                    animation: 'fillBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }} />
                )}
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  position: 'relative',
                  zIndex: 1,
                }}>
                  <Plus size={16} weight="bold" />
                  Add Project
                </span>
              </button>
            </div>
            
            {projects.length === 0 ? (
              <p style={{ color: '#9ca3af' }}>No projects added yet.</p>
            ) : (
              <div className="profile-projects-wrap" style={{ overflowX: 'auto', maxWidth: '100%' }}>
                <table style={{ width: '100%', minWidth: isMobile ? '560px' : '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                      <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '12px', fontWeight: '700', color: '#d97706', textTransform: 'uppercase' }}>PROJECT</th>
                      <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '12px', fontWeight: '700', color: '#d97706', textTransform: 'uppercase' }}>LINK</th>
                      <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '12px', fontWeight: '700', color: '#d97706', textTransform: 'uppercase' }}>INDUSTRY</th>
                      <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '12px', fontWeight: '700', color: '#d97706', textTransform: 'uppercase' }}>ROLE</th>
                      <th style={{ textAlign: 'center', padding: '12px 8px', fontSize: '12px', fontWeight: '700', color: '#d97706', textTransform: 'uppercase' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((project) => (
                      <tr key={project.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '16px 8px' }}>
                          <span style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>{project.name}</span>
                        </td>
                        <td style={{ padding: '16px 8px' }}>
                          <a href={project.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: '14px', color: '#3b82f6', textDecoration: 'none', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                            {project.link}
                          </a>
                        </td>
                        <td style={{ padding: '16px 8px', fontSize: '14px', color: '#6b7280' }}>{project.industry}</td>
                        <td style={{ padding: '16px 8px', fontSize: '14px', color: '#6b7280' }}>{project.role}</td>
                        <td style={{ padding: '16px 8px', textAlign: 'center' }}>
                          <button
                            onClick={() => handleRemoveProject(project.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              color: '#6b7280',
                            }}
                          >
                            <X size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div style={{ minWidth: 0 }}>
          {/* More Details */}
          <div
            className="profile-card"
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: isMobile ? '18px' : '24px',
              marginBottom: '24px',
              border: '1px solid #efe5d7',
              boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0, color: '#111827' }}>
                More Details
              </h2>
              <button
                onClick={() => setShowMoreDetailsModal(true)}
                style={{
                  padding: '6px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <PencilSimple size={16} color="#6b7280" weight="bold" />
              </button>
            </div>

            {/* Number */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <Phone size={18} color="#b07a15" />
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>Number</span>
              </div>
              <p style={{ color: '#6b7280', margin: 0, fontSize: '14px' }}>{profileData.phone}</p>
            </div>

            {/* Email */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <EnvelopeSimple size={18} color="#b07a15" />
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>Email</span>
              </div>
              <p style={{ color: '#6b7280', margin: 0, fontSize: '14px' }}>{profileData.email}</p>
            </div>

            {/* Languages */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <ChatCircleText size={18} color="#b07a15" />
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>Languages</span>
              </div>
              <p style={{ color: '#6b7280', margin: 0, fontSize: '14px' }}>{profileData.languages}</p>
            </div>

            {/* Graduation Year */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <GraduationCap size={18} color="#b07a15" />
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>Graduation Year</span>
              </div>
              <p style={{ color: '#6b7280', margin: 0, fontSize: '14px' }}>{profileData.graduationYear || '-'}</p>
            </div>

            {/* Major */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <BookOpen size={18} color="#b07a15" />
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>Major</span>
              </div>
              <p style={{ color: '#6b7280', margin: 0, fontSize: '14px' }}>{profileData.major || '-'}</p>
            </div>

            {/* Company */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <Briefcase size={18} color="#b07a15" />
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>Company</span>
              </div>
              <p style={{ color: '#6b7280', margin: 0, fontSize: '14px' }}>{profileData.company || '-'}</p>
            </div>

            {/* Education */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <GraduationCap size={18} color="#b07a15" />
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>Education</span>
              </div>
              <p style={{ color: '#6b7280', margin: 0, fontSize: '14px' }}>{profileData.education}</p>
            </div>

            {/* Skills */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <Star size={18} color="#b07a15" />
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>Skills</span>
              </div>
              <p style={{ color: '#6b7280', margin: 0, fontSize: '14px' }}>{profileData.skills}</p>
            </div>
          </div>

          {/* Career Documents */}
          <div
            className="profile-card profile-career-docs"
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: isMobile ? '18px' : '24px',
              border: '1px solid #efe5d7',
              boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: '#111827' }}>
              Career Documents
            </h2>
            
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById('fileInput').click()}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: isMobile ? '20px 16px' : '32px',
                border: isDragging ? '2px dashed #3b82f6' : '2px dashed #d1d5db',
                borderRadius: '12px',
                background: isDragging ? '#eff6ff' : '#f9fafb',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                marginBottom: uploadedFiles.length > 0 ? '16px' : '0',
              }}
            >
              <UploadSimple size={48} color={isDragging ? '#3b82f6' : '#9ca3af'} style={{ marginBottom: '12px' }} />
              <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
                <span style={{ color: '#3b82f6' }}>Click to upload</span> or drag and drop
              </p>
            </div>
            
            {uploadedFiles.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {uploadedFiles.map((file) => (
                  <a
                    key={file.id}
                    href={file.url ? resolveApiAssetUrl(file.url) : undefined}
                    target={file.url ? '_blank' : undefined}
                    rel={file.url ? 'noopener noreferrer' : undefined}
                    onClick={(event) => {
                      if (!file.url) {
                        event.preventDefault();
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '16px',
                      background: '#f9fafb',
                      borderRadius: '12px',
                      border: '1px solid #e5e7eb',
                      textDecoration: 'none',
                      cursor: file.url ? 'pointer' : 'default',
                      transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                    }}
                    onMouseEnter={(event) => {
                      if (!file.url) return;
                      event.currentTarget.style.borderColor = '#93c5fd';
                      event.currentTarget.style.boxShadow = '0 8px 18px rgba(37, 99, 235, 0.08)';
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.borderColor = '#e5e7eb';
                      event.currentTarget.style.boxShadow = 'none';
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
                      {file.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ 
                        margin: 0, 
                        fontSize: '14px', 
                        fontWeight: '600', 
                        color: file.url ? '#2563eb' : '#111827',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {file.name}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleRemoveFile(file.id);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        color: '#6b7280',
                      }}
                    >
                      <X size={20} />
                    </button>
                  </a>
                ))}
              </div>
            )}
            
            <input
              id="fileInput"
              type="file"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showAllNotificationsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 60,
              padding: '16px',
            }}
            onClick={() => setShowAllNotificationsModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 6 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="modal-no-scrollbar"
              style={{
                width: '100%',
                maxWidth: '760px',
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '16px',
                boxShadow: '0 20px 50px rgba(2, 6, 23, 0.25)',
                maxHeight: '88vh',
                overflowY: 'auto',
                scrollbarWidth: 'none',
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <div style={{ padding: '18px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ margin: 0, fontSize: '24px', color: '#111827', fontWeight: '800' }}>All Notifications</h2>
                <button
                  onClick={() => setShowAllNotificationsModal(false)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: '#475569',
                    fontSize: '20px',
                    lineHeight: 1,
                    cursor: 'pointer',
                  }}
                  aria-label="Close all notifications"
                >
                  ×
                </button>
              </div>

              <div style={{ padding: '14px' }}>
                {visibleNotifications.length === 0 ? (
                  <div
                    style={{
                      border: '1px dashed #d1d5db',
                      borderRadius: '12px',
                      padding: '18px 16px',
                      background: '#f9fafb',
                    }}
                  >
                    <p style={{ margin: 0, color: '#111827', fontWeight: '700', fontSize: '15px' }}>No notifications yet</p>
                    <p style={{ margin: '8px 0 0 0', color: '#4b5563', fontSize: '14px', lineHeight: 1.5 }}>
                      New updates will appear here as they arrive.
                    </p>
                    <div style={{ marginTop: '12px', color: '#374151', fontSize: '14px', lineHeight: 1.6 }}>
                      <div>Example:</div>
                      {notificationExamples.map((example, index) => (
                        <div key={index}>• {example}</div>
                      ))}
                    </div>
                  </div>
                ) : (
                  visibleNotifications.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleOpenNotification(item)}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '52px 1fr auto 10px',
                        gap: '10px',
                        alignItems: 'center',
                        padding: '10px 6px',
                        borderRadius: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      <div
                        style={{
                          width: '52px',
                          height: '52px',
                          borderRadius: '999px',
                          background: '#e5e7eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#111827',
                          fontWeight: '700',
                          fontSize: '18px',
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      >
                        {item.avatar ? (
                          <img
                            src={item.avatar}
                            alt={item.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const next = e.currentTarget.nextSibling;
                              if (next && next.style) next.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <span
                          style={{
                            display: item.avatar ? 'none' : 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '100%',
                            height: '100%',
                          }}
                        >
                          {item.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div style={{ color: '#111827', fontSize: '15px', lineHeight: 1.35 }}>
                          <span style={{ fontWeight: '700' }}>{item.name}</span> {item.message}
                        </div>
                        <div style={{ marginTop: '4px', color: '#2563eb', fontWeight: item.unread ? '600' : '400', fontSize: '14px' }}>
                          {item.time} • {item.context}
                        </div>
                      </div>
                      <div data-notification-item-menu style={{ position: 'relative' }}>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenNotificationItemMenuId((current) => (current === item.id ? null : item.id));
                          }}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: '#6b7280',
                            cursor: 'pointer',
                            fontSize: '18px',
                            lineHeight: 1,
                            padding: '4px 6px',
                            borderRadius: '999px',
                          }}
                          aria-label={`Open options for ${item.name} notification`}
                        >
                          •••
                        </button>
                        <AnimatePresence>
                          {openNotificationItemMenuId === item.id && (
                            <motion.div
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 2 }}
                              transition={{ duration: 0.12 }}
                              style={{
                                position: 'absolute',
                                top: '34px',
                                right: 0,
                                minWidth: '120px',
                                borderRadius: '12px',
                                background: 'white',
                                border: '1px solid #e5e7eb',
                                boxShadow: '0 14px 30px rgba(15, 23, 42, 0.18)',
                                overflow: 'hidden',
                                zIndex: 45,
                              }}
                            >
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleDeleteNotification(item.id);
                                }}
                                style={{
                                  width: '100%',
                                  border: 'none',
                                  background: 'white',
                                  padding: '10px 12px',
                                  fontSize: '14px',
                                  color: '#b91c1c',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                }}
                              >
                                Delete
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      <div
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '999px',
                          background: item.unread ? '#1877F2' : 'transparent',
                        }}
                      />
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 50,
              padding: '16px',
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              style={{
                background: 'white',
                borderRadius: '24px',
                padding: '32px',
                width: '100%',
                maxWidth: '448px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
                position: 'relative',
              }}
            >
            <button
              onClick={() => setShowLogoutConfirm(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '8px',
              }}
              aria-label="Close"
            >
              <X size={22} />
            </button>

            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#1f2937' }}>
              Confirm Logout
            </h2>
            <p style={{ margin: '8px 0 24px 0', color: '#6b7280', fontSize: '14px' }}>
              Are you sure you want to log out?
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  background: 'white',
                  color: '#374151',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease, color 0.2s ease',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('token');
                  localStorage.removeItem('user');
                  navigate('/login');
                }}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  border: 'none',
                  borderRadius: '8px',
                  background: '#dc2626',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease, color 0.2s ease',
                }}
              >
                Logout
              </button>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <motion.div 
            className="modal-no-scrollbar" 
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
              position: 'relative',
            }}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
            }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Edit Profile</h2>
              <button
                onClick={() => setShowEditModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px',
                }}
              >
                <X size={24} color="#666" />
              </button>
            </div>

            {/* Form Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Name and Position */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                    Position
                  </label>
                  <input
                    type="text"
                    value={formData.jobTitle}
                    onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                    }}
                  />
                </div>
              </div>

              {/* Profile Picture */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                  Profile picture
                </label>
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleProfileImageDrop}
                  onClick={() => document.getElementById('profileImageInput').click()}
                  style={{
                    border: '2px dashed #d1d5db',
                    borderRadius: '8px',
                    padding: '24px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: '#f9fafb',
                  }}
                >
                  {profileImagePreview || !!formData.profileImage ? (
                    <img
                      src={profileImagePreview || formData.profileImage}
                      alt="Profile"
                      style={{
                        width: '100px',
                        height: '100px',
                        borderRadius: '8px',
                        objectFit: 'cover',
                        margin: '0 auto 12px',
                      }}
                    />
                  ) : null}
                  <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                    Click or drag a new image to replace
                  </p>
                  <input
                    id="profileImageInput"
                    type="file"
                    accept="image/*"
                    onChange={handleProfileImageUpload}
                    style={{ display: 'none' }}
                  />
                </div>
              </div>

              {/* About Me */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                  About Me
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    minHeight: '100px',
                    marginBottom: '12px',
                  }}
                />
                <textarea
                  value={formData.bio2}
                  onChange={(e) => handleInputChange('bio2', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    minHeight: '100px',
                  }}
                />
              </div>

              {/* Social Links */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
                  Social Links
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>
                      LinkedIn URL
                    </label>
                    <input
                      type="url"
                      value={formData.linkedinUrl}
                      onChange={(e) => handleInputChange('linkedinUrl', e.target.value)}
                      placeholder="https://linkedin.com/in/username"
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>
                      Twitter URL
                    </label>
                    <input
                      type="url"
                      value={formData.twitterUrl}
                      onChange={(e) => handleInputChange('twitterUrl', e.target.value)}
                      placeholder="https://twitter.com/username"
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>
                      Instagram URL
                    </label>
                    <input
                      type="url"
                      value={formData.instagramUrl}
                      onChange={(e) => handleInputChange('instagramUrl', e.target.value)}
                      placeholder="https://instagram.com/username"
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '24px',
              paddingTop: '24px',
              borderTop: '1px solid #e5e7eb',
            }}>
              <button
                className="hsi-btn hsi-btn-secondary"
                onMouseEnter={() => setHoverButton('cancel')}
                onMouseLeave={() => setHoverButton(null)}
                onClick={() => setShowEditModal(false)}
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {hoverButton === 'cancel' && (
                  <span style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: '100%',
                    height: '100%',
                    background: 'rgba(0, 0, 0, 0.1)',
                    borderRadius: '6px',
                    transform: 'scaleX(0)',
                    transformOrigin: 'left',
                    animation: 'fillBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }} />
                )}
                <span style={{ position: 'relative', zIndex: 1 }}>Cancel</span>
              </button>
              <button
                className="hsi-btn hsi-btn-primary"
                onMouseEnter={() => setHoverButton('save')}
                onMouseLeave={() => setHoverButton(null)}
                onClick={handleSave}
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {hoverButton === 'save' && (
                  <span style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: '100%',
                    height: '100%',
                    background: 'rgba(0, 0, 0, 0.15)',
                    borderRadius: '6px',
                    transform: 'scaleX(0)',
                    transformOrigin: 'left',
                    animation: 'fillBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }} />
                )}
                <span style={{ position: 'relative', zIndex: 1 }}>Save changes</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* More Details Edit Modal */}
      {showMoreDetailsModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <motion.div
            className="modal-no-scrollbar"
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '32px',
              width: '90%',
              maxWidth: '500px',
              maxHeight: '80vh',
              overflowY: 'auto',
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
            }}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: 0 }}>
                Edit Details
              </h2>
              <button
                onClick={() => setShowMoreDetailsModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={24} color="#6b7280" />
              </button>
            </div>

            {/* Number */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                Number
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Enter phone number"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Email */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter email"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Languages */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                Languages
              </label>
              <input
                type="text"
                value={formData.languages}
                onChange={(e) => handleInputChange('languages', e.target.value)}
                placeholder="e.g., EN, ES, FR"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Graduation Year */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                Graduation Year
              </label>
              <input
                type="text"
                value={formData.graduationYear}
                onChange={(e) => handleInputChange('graduationYear', e.target.value)}
                placeholder="e.g., 2026"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Major */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                Major
              </label>
              <input
                type="text"
                value={formData.major}
                onChange={(e) => handleInputChange('major', e.target.value)}
                placeholder="Enter your major"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Company */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                Company
              </label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => handleInputChange('company', e.target.value)}
                placeholder="Enter your company"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Education */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                Education
              </label>
              <input
                type="text"
                value={formData.education}
                onChange={(e) => handleInputChange('education', e.target.value)}
                placeholder="Enter education background"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Skills */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                Skills
              </label>
              <input
                type="text"
                value={formData.skills}
                onChange={(e) => handleInputChange('skills', e.target.value)}
                placeholder="Enter your skills"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                className="hsi-btn hsi-btn-secondary"
                onMouseEnter={() => setHoverButton('cancelDetails')}
                onMouseLeave={() => setHoverButton(null)}
                onClick={() => {
                  setShowMoreDetailsModal(false);
                  setFormData(profileData);
                }}
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {hoverButton === 'cancelDetails' && (
                  <span style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: '100%',
                    height: '100%',
                    background: 'rgba(0, 0, 0, 0.1)',
                    borderRadius: '6px',
                    transform: 'scaleX(0)',
                    transformOrigin: 'left',
                    animation: 'fillBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }} />
                )}
                <span style={{ position: 'relative', zIndex: 1 }}>Cancel</span>
              </button>
              <button
                className="hsi-btn hsi-btn-primary"
                onMouseEnter={() => setHoverButton('saveDetails')}
                onMouseLeave={() => setHoverButton(null)}
                onClick={handleSave}
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {hoverButton === 'saveDetails' && (
                  <span style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: '100%',
                    height: '100%',
                    background: 'rgba(0, 0, 0, 0.15)',
                    borderRadius: '6px',
                    transform: 'scaleX(0)',
                    transformOrigin: 'left',
                    animation: 'fillBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }} />
                )}
                <span style={{ position: 'relative', zIndex: 1 }}>Save changes</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showAddProjectModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <motion.div
            className="modal-no-scrollbar"
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '32px',
              width: '90%',
              maxWidth: '500px',
              maxHeight: '80vh',
              overflowY: 'auto',
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
            }}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: 0 }}>
                Add Project
              </h2>
              <button
                onClick={() => {
                  setShowAddProjectModal(false);
                  setProjectForm({ name: '', link: '', industry: '', role: '' });
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={24} color="#6b7280" />
              </button>
            </div>


            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                Project Name
              </label>
              <input
                type="text"
                value={projectForm.name}
                onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                placeholder="Enter project name"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

          
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                Link
              </label>
              <input
                type="url"
                value={projectForm.link}
                onChange={(e) => setProjectForm({ ...projectForm, link: e.target.value })}
                placeholder="https://example.com"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                Industry
              </label>
              <input
                type="text"
                value={projectForm.industry}
                onChange={(e) => setProjectForm({ ...projectForm, industry: e.target.value })}
                placeholder="e.g., Health Tech, E-commerce"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                Role
              </label>
              <input
                type="text"
                value={projectForm.role}
                onChange={(e) => setProjectForm({ ...projectForm, role: e.target.value })}
                placeholder="e.g., Web Developer, UI Designer"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onMouseEnter={() => setHoverButton('cancelProject')}
                onMouseLeave={() => setHoverButton(null)}
                onClick={() => {
                  setShowAddProjectModal(false);
                  setProjectForm({ name: '', link: '', industry: '', role: '' });
                }}
                style={{
                  background: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 20px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {hoverButton === 'cancelProject' && (
                  <span style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: '100%',
                    height: '100%',
                    background: 'rgba(0, 0, 0, 0.1)',
                    borderRadius: '6px',
                    transform: 'scaleX(0)',
                    transformOrigin: 'left',
                    animation: 'fillBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }} />
                )}
                <span style={{ position: 'relative', zIndex: 1 }}>Cancel</span>
              </button>
              <button
                onMouseEnter={() => setHoverButton('addProject')}
                onMouseLeave={() => setHoverButton(null)}
                onClick={handleAddProject}
                style={{
                  background: '#FFED4E',
                  color: '#333',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 20px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {hoverButton === 'addProject' && (
                  <span style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: '100%',
                    height: '100%',
                    background: 'rgba(0, 0, 0, 0.15)',
                    borderRadius: '6px',
                    transform: 'scaleX(0)',
                    transformOrigin: 'left',
                    animation: 'fillBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }} />
                )}
                <span style={{ position: 'relative', zIndex: 1 }}>Add Project</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
      </div>
    </motion.div>
    </>
  );
}
