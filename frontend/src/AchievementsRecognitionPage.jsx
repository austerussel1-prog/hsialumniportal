import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Star,
  Medal,
  CrownSimple,
  Heart,
  Eye,
  UsersThree,
  Trophy,
  SealCheck,
  Clock,
  CaretLeft,
  CaretRight,
  ArrowUpRight,
  ArrowRight,
  CaretDown,
  Cpu,
  Target,
  Lightning,
  CheckCircle,
  MagnifyingGlass,
  GridFour,
  ListBullets,
  TrendUp,
  X,
  Plus,
} from '@phosphor-icons/react';
import Sidebar from './components/Sidebar';
import { API_URL, apiEndpoints } from './config/api';

const tabItems = [
  { id: 'overview', label: 'Overview', icon: Star },
  { id: 'badges', label: 'Alumni Badges', icon: Medal },
  { id: 'featured', label: 'Featured Alumni', icon: CrownSimple },
  { id: 'posts', label: 'Appreciation Posts', icon: Heart },
];

const badgePalette = [
  { color: '#f8ead0', text: '#b07a15' },
  { color: '#fde8e8', text: '#d14646' },
  { color: '#e7f0ff', text: '#3570d4' },
  { color: '#f0e8ff', text: '#7b45d3' },
];

const badgeChoices = [
  { id: 'Promotion', icon: TrendUp, bg: '#e8f7ee', color: '#16a34a' },
  { id: 'Leadership Award', icon: CrownSimple, bg: '#f0e8ff', color: '#7b45d3' },
  { id: 'Developer of the Year', icon: Cpu, bg: '#e7f0ff', color: '#3570d4' },
  { id: 'Technical Excellence', icon: Star, bg: '#fff3e5', color: '#f97316' },
  { id: 'Project Completion', icon: Target, bg: '#e6fbff', color: '#06b6d4' },
  { id: 'Team Player Award', icon: UsersThree, bg: '#fde8f2', color: '#e44d93' },
  { id: 'Innovation Award', icon: Lightning, bg: '#ffe8e8', color: '#ef4444' },
  { id: 'Employee of the Month', icon: Medal, bg: '#fff7db', color: '#d4a009' },
  { id: 'Certification Achievement', icon: CheckCircle, bg: '#e6fff6', color: '#10b981' },
];

const badgeChoiceById = badgeChoices.reduce((acc, item) => {
  acc[item.id] = item;
  return acc;
}, {});

const ADMIN_ROLES = ['super_admin', 'superadmin', 'admin', 'hr', 'alumni_officer'];

const emptyAchievements = {
  featured: null,
  featuredAlumni: [],
  badgeCatalog: [],
  milestones: [],
  recentAchievements: [],
  appreciationPosts: [],
  awardEvents: [],
  certificationEvents: [],
  stats: {
    totalBadgesAwarded: 0,
    featuredAlumni: 0,
    appreciationPosts: 0,
    activeAlumni: 0,
    trends: {
      totalBadgesAwarded: null,
      featuredAlumni: null,
      appreciationPosts: null,
      activeAlumni: null,
    },
  },
};

const normalizeAchievements = (body) => ({
  featured: body?.featured || null,
  featuredAlumni: Array.isArray(body?.featuredAlumni) ? body.featuredAlumni : [],
  badgeCatalog: Array.isArray(body?.badgeCatalog) ? body.badgeCatalog : [],
  milestones: Array.isArray(body?.milestones) ? body.milestones : [],
  recentAchievements: Array.isArray(body?.recentAchievements) ? body.recentAchievements : [],
  appreciationPosts: Array.isArray(body?.appreciationPosts) ? body.appreciationPosts : [],
  awardEvents: Array.isArray(body?.awardEvents) ? body.awardEvents : [],
  certificationEvents: Array.isArray(body?.certificationEvents) ? body.certificationEvents : [],
  stats: {
    totalBadgesAwarded: body?.stats?.totalBadgesAwarded || 0,
    featuredAlumni: body?.stats?.featuredAlumni || 0,
    appreciationPosts: body?.stats?.appreciationPosts || 0,
    activeAlumni: body?.stats?.activeAlumni || 0,
    trends: {
      totalBadgesAwarded: body?.stats?.trends?.totalBadgesAwarded ?? null,
      featuredAlumni: body?.stats?.trends?.featuredAlumni ?? null,
      appreciationPosts: body?.stats?.trends?.appreciationPosts ?? null,
      activeAlumni: body?.stats?.trends?.activeAlumni ?? null,
    },
  },
});

const formatInt = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(num);
};

const truncateLabel = (value, max = 42) => {
  const text = String(value || '').trim();
  if (!text) return '';
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 3)).trimEnd()}...`;
};

const formatMemberOptionLabel = (member) => {
  const name = String(member?.name || '').trim();
  const email = String(member?.email || '').trim();
  const full = email ? `${name} â€¢ ${email}` : name;
  return truncateLabel(full, 40);
};

const getInitials = (name) => {
  const text = String(name || '').trim();
  if (!text) return 'NA';
  return text
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
};

const toBadgeKey = (value) => String(value || '').trim().toLowerCase();

const POST_META_PREFIX = '[HSI_META]';
const POST_META_SUFFIX = '[/HSI_META]';

const parsePostExcerpt = (value) => {
  const raw = String(value || '');
  if (!raw.startsWith(POST_META_PREFIX)) {
    return { meta: {}, body: raw.trim() };
  }

  const endIndex = raw.indexOf(POST_META_SUFFIX);
  if (endIndex === -1) {
    return { meta: {}, body: raw.trim() };
  }

  const jsonText = raw.slice(POST_META_PREFIX.length, endIndex);
  const body = raw.slice(endIndex + POST_META_SUFFIX.length).trim();

  try {
    const meta = JSON.parse(jsonText);
    return { meta: meta && typeof meta === 'object' ? meta : {}, body };
  } catch {
    return { meta: {}, body: raw.trim() };
  }
};

const buildPostExcerpt = (meta, description) => {
  const safeMeta = meta && typeof meta === 'object' ? meta : {};
  const desc = String(description || '').trim();
  return `${POST_META_PREFIX}${JSON.stringify(safeMeta)}${POST_META_SUFFIX}\n${desc}`;
};

const getPostBodyText = (post) => parsePostExcerpt(post?.excerpt).body;

const inferPostType = (post) => {
  const text = `${String(post?.title || '')} ${String(getPostBodyText(post) || '')}`.toLowerCase();
  if (text.includes('promotion') || text.includes('promoted')) return 'promotion';
  if (text.includes('leadership') || text.includes('lead')) return 'leadership';
  if (text.includes('innovation') || text.includes('innovator')) return 'innovation';
  if (text.includes('technical') || text.includes('developer') || text.includes('excellence')) return 'technical';
  return 'featured';
};

const postTypeMeta = {
  all: { label: 'All Types', chip: 'All' },
  featured: { label: 'Featured', chip: 'Featured' },
  promotion: { label: 'Promotion', chip: 'Promotion' },
  leadership: { label: 'Leadership', chip: 'Leadership Award' },
  technical: { label: 'Technical', chip: 'Technical Excellence' },
  innovation: { label: 'Innovation', chip: 'Innovation Award' },
};

const formatPostDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const resolvePostImage = (post) => {
  const meta = parsePostExcerpt(post?.excerpt).meta || {};
  const raw = String(
    post?.imageUrl
    || post?.image
    || post?.mediaUrl
    || post?.thumbnail
    || post?.coverImage
    || meta.imageUrl
    || ''
  ).trim();
  if (!raw) return '';
  if (raw.startsWith('data:image/')) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/')) return `${API_URL}${raw}`;
  return raw;
};

const resolveProfileImage = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.startsWith('data:image/')) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/')) return `${API_URL}${raw}`;
  return raw;
};

const normalizeAchievementType = (raw) => {
  const type = String(raw || '').trim().toLowerCase();
  if (!type) return '';
  if (type.includes('hall')) return 'hall_of_fame';
  if (type.includes('badge')) return 'badge';
  if (type.includes('milestone')) return 'milestone';
  if (type.includes('feature')) return 'featured';
  return type.replace(/\s+/g, '_');
};

const CACHE_KEY = 'hsi_achievements_overview_cache_v1';
const FEATURED_ACTIVE_KEY = 'hsi_achievements_featured_active_v1';
const readCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return { featuredHistory: [], recentAchievements: [] };
    const parsed = JSON.parse(raw);
    return {
      featuredHistory: Array.isArray(parsed?.featuredHistory) ? parsed.featuredHistory : [],
      recentAchievements: Array.isArray(parsed?.recentAchievements) ? parsed.recentAchievements : [],
    };
  } catch {
    return { featuredHistory: [], recentAchievements: [] };
  }
};

const writeCache = (next) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(next));
  } catch {
    // ignore quota / storage errors
  }
};

const stableAwardKey = (award) => {
  const month = String(award?.monthLabel || award?.month || '').trim();
  const name = String(award?.fullName || award?.name || '').trim();
  const roleTitle = String(award?.roleTitle || award?.jobTitle || '').trim();
  const company = String(award?.company || '').trim();
  return `${month}|${name}|${roleTitle}|${company}`.toLowerCase();
};

const stableAchievementKey = (item, idx = 0) => {
  const explicitId = item?._id || item?.id;
  if (explicitId) return `id:${String(explicitId)}`;
  const createdAt = item?.createdAt || item?.timestamp;
  if (createdAt) return `ts:${String(createdAt)}|${normalizeAchievementType(item?.type)}|${String(item?.name || '')}`.toLowerCase();

  const type = normalizeAchievementType(item?.type);
  const name = String(item?.name || '').trim();
  const title = String(item?.title || '').trim();
  const date = String(item?.date || '').trim();
  const badge = String(item?.badge || '').trim();
  const subtitle = String(item?.subtitle || '').trim();
  const description = String(item?.description || '').trim();
  return `fallback:${type}|${name}|${title}|${subtitle}|${badge}|${date}|${description}|${idx}`.toLowerCase();
};

const uniqBy = (list, keyFn) => {
  const seen = new Set();
  const out = [];
  list.forEach((item) => {
    const key = keyFn(item);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(item);
  });
  return out;
};

const upsertFront = (list, item, keyFn) => {
  const key = keyFn(item);
  const next = [item, ...(Array.isArray(list) ? list : []).filter((x) => keyFn(x) !== key)];
  return next;
};

const looksLikeHtml = (text) => {
  const value = String(text || '').trim().toLowerCase();
  return value.startsWith('<!doctype') || value.startsWith('<html') || value.includes('<body');
};

const safeErrorText = (fallback, raw) => {
  const text = String(raw || '').trim();
  if (!text) return fallback;
  if (/cannot\s+delete/i.test(text)) return fallback;
  if (looksLikeHtml(text)) return fallback;
  if (text.length > 160) return `${text.slice(0, 160)}â€¦`;
  return text;
};

export default function AchievementsRecognitionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState(emptyAchievements);
  const [loading, setLoading] = useState(true);
  const [directoryMembers, setDirectoryMembers] = useState([]);
  const [activeAlumniMembers, setActiveAlumniMembers] = useState([]);
  const [user, setUser] = useState(null);
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [awardSubmitting, setAwardSubmitting] = useState(false);
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [likeBusyPostId, setLikeBusyPostId] = useState('');
  const [awardError, setAwardError] = useState('');
  const [postError, setPostError] = useState('');
  const [awardForm, setAwardForm] = useState({
    memberId: '',
    fullName: '',
    roleTitle: '',
    company: '',
    monthLabel: '',
    awardeeCategory: 'alumni',
    quote: '',
    badges: [],
  });
  const [postForm, setPostForm] = useState({
    recognitionType: '',
    companyName: '',
    honoreeId: '',
    honoreeName: '',
    alumniType: 'employee',
    currentRole: '',
    hsiRole: '',
    startYear: '',
    endYear: '',
    title: '',
    description: '',
    imageUrl: '',
  });
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [achievementTypeFilter, setAchievementTypeFilter] = useState('all');
  const [showAllAchievements, setShowAllAchievements] = useState(false);
  const [showBadgeDropdown, setShowBadgeDropdown] = useState(false);
  const badgeButtonRef = useRef(null);
  const [badgeDropdownRect, setBadgeDropdownRect] = useState(null);
  const [badgeSearchQuery, setBadgeSearchQuery] = useState('');
  const [badgeFilter, setBadgeFilter] = useState('all');
  const [badgeViewMode, setBadgeViewMode] = useState('grid');
  const [clickedBadgePriority, setClickedBadgePriority] = useState([]);
  const [postSearchQuery, setPostSearchQuery] = useState('');
  const [postTypeFilter, setPostTypeFilter] = useState('all');
  const [hoveredPostCardId, setHoveredPostCardId] = useState('');
  const [postImageFileName, setPostImageFileName] = useState('');
  const hasRestoredFeaturedRef = useRef(false);

  const isAdmin = useMemo(() => ADMIN_ROLES.includes(user?.role), [user]);
  const appreciationYearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 26 }, (_, idx) => String(currentYear - idx));
  }, []);

  const postHonoreeOptions = useMemo(() => {
    const list = Array.isArray(directoryMembers) ? directoryMembers.slice() : [];
    return list
      .filter((member) => String(member?.name || '').trim())
      .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
  }, [directoryMembers]);

  const loadAchievements = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setData(emptyAchievements);
        setDirectoryMembers([]);
        setActiveAlumniMembers([]);
        setLoading(false);
        return;
      }

      const [achievementRes, directoryRes] = await Promise.all([
        fetch(apiEndpoints.achievements, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(apiEndpoints.directoryUsers, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (achievementRes.ok) {
        const body = await achievementRes.json();
        const normalized = normalizeAchievements(body);

         const cache = readCache();

         // Avoid showing stale local cached awards after an admin deletes the last entry.
         // `awardEvents` is the source of truth for history; `featured` is the current highlight.
         const awardEvents = Array.isArray(normalized.awardEvents) ? normalized.awardEvents.filter(Boolean) : [];
         const featuredHistory = awardEvents.length > 0
           ? []
           : normalized.featured
             ? [normalized.featured]
             : [];

         const serverRecent = Array.isArray(normalized.recentAchievements) ? normalized.recentAchievements : [];
         const mergedRecent = serverRecent.slice(0, 60);

         const next = {
           ...normalized,
           featuredAlumni: featuredHistory,
           recentAchievements: mergedRecent,
         };

         setData(next);
         writeCache({ ...cache, featuredHistory, recentAchievements: mergedRecent });
       }

      if (directoryRes.ok) {
        const directoryBody = await directoryRes.json();
        const users = Array.isArray(directoryBody?.users) ? directoryBody.users : [];
        const directoryList = users.map((member, index) => ({
          id: member?.id || member?._id || `${member?.email || 'member'}-${index}`,
          name: member?.name || member?.fullName || member?.email || 'Portal user',
          email: member?.email || '',
          role: member?.role || '',
          status: member?.status || '',
          jobTitle: member?.jobTitle || member?.roleTitle || '',
          company: member?.company || '',
          profileImage: resolveProfileImage(member?.profileImage),
        }));
        setDirectoryMembers(directoryList);
        const members = users
          .filter((member) => {
            const role = String(member?.role || '').toLowerCase();
            const status = String(member?.status || '').toLowerCase();
            if (role === 'alumni') return true;
            return role === 'user' && status === 'approved';
          })
          .map((member, index) => ({
            id: member?.id || member?._id || `${member?.email || 'member'}-${index}`,
            name: member?.name || member?.fullName || member?.email || 'Alumni member',
            email: member?.email || '',
          }));
        setActiveAlumniMembers(members);
      }

      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      const rawUser = localStorage.getItem('user');
      setUser(rawUser ? JSON.parse(rawUser) : null);
    } catch {
      setUser(null);
    }

    loadAchievements();
  }, [loadAchievements]);

  useEffect(() => {
    const nextTab = location?.state?.activeTab;
    if (!nextTab) return;
    if (tabItems.some((tab) => tab.id === nextTab)) {
      setActiveTab(nextTab);
    }
  }, [location?.state]);

  const handleAwardSubmit = async (e) => {
    e.preventDefault();
    setAwardError('');

    const selectedMember = directoryMembers.find((m) => String(m.id) === String(awardForm.memberId));
    if (!selectedMember) {
      setAwardError('Please select a registered portal user to award.');
      return;
    }

    if (!awardForm.roleTitle || !awardForm.company || !awardForm.monthLabel) {
      setAwardError('Role title, company, and month are required.');
      return;
    }

    const badges = (Array.isArray(awardForm.badges) ? awardForm.badges : [])
      .map((item) => String(item).trim())
      .filter(Boolean);

    setAwardSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(apiEndpoints.awardAchievement, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          memberId: selectedMember.id,
          fullName: String(selectedMember.name || '').trim(),
          roleTitle: awardForm.roleTitle.trim(),
          company: awardForm.company.trim(),
          monthLabel: awardForm.monthLabel.trim(),
          awardeeCategory: awardForm.awardeeCategory,
          quote: awardForm.quote.trim(),
          badges,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      const body = contentType.includes('application/json')
        ? await res.json()
        : { message: await res.text() };
      if (!res.ok) {
        setAwardError(body?.message || `Failed to save award (${res.status}).`);
        setAwardSubmitting(false);
        return;
      }

      const createdAward = {
        memberId: selectedMember.id,
        fullName: String(selectedMember.name || '').trim(),
        roleTitle: awardForm.roleTitle.trim(),
        company: awardForm.company.trim(),
        monthLabel: awardForm.monthLabel.trim(),
        awardeeCategory: awardForm.awardeeCategory,
        quote: awardForm.quote.trim(),
        badges,
        createdAt: new Date().toISOString(),
      };

      const cache = readCache();
      const featuredHistory = upsertFront(cache.featuredHistory, createdAward, stableAwardKey).slice(0, 24);
      const recentAchievements = uniqBy([
        {
          type: 'featured',
          name: createdAward.fullName,
          title: 'Featured',
          subtitle: createdAward.monthLabel,
          description: createdAward.quote,
          date: createdAward.monthLabel,
          badges,
          badge: (badges && badges[0]) || null,
          createdAt: createdAward.createdAt,
        },
        ...(cache.recentAchievements || []),
      ], stableAchievementKey).slice(0, 60);

      writeCache({ featuredHistory, recentAchievements });

      setShowAwardModal(false);
      setAwardForm({
        memberId: '',
        fullName: '',
        roleTitle: '',
        company: '',
        monthLabel: '',
        awardeeCategory: 'alumni',
        quote: '',
        badges: [],
      });
      setShowBadgeDropdown(false);

      window.dispatchEvent(new CustomEvent('hsi-toast', { detail: { type: 'success', text: 'Award posted successfully.' } }));
      await loadAchievements();
    } catch (err) {
      setAwardError(err?.message || 'Failed to save award.');
    } finally {
      setAwardSubmitting(false);
    }
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    setPostError('');

    if (!postForm.recognitionType || !postForm.companyName || !postForm.honoreeId || !postForm.currentRole || !postForm.hsiRole || !postForm.startYear || !postForm.endYear || !postForm.title || !postForm.description) {
      setPostError('Please complete all required fields.');
      return;
    }

    if (String(postForm.title).trim().length < 10) {
      setPostError('Post title must be at least 10 characters.');
      return;
    }

    if (String(postForm.description).trim().length < 50) {
      setPostError('Description must be at least 50 characters.');
      return;
    }

    setPostSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const selectedHonoree = directoryMembers.find((member) => String(member?.id || '') === String(postForm.honoreeId || ''));
      const honoreeName = String(selectedHonoree?.name || postForm.honoreeName || '').trim();

      if (!honoreeName) {
        setPostError('Please select a valid alumni honoree.');
        setPostSubmitting(false);
        return;
      }

      const payloadMeta = {
        recognitionType: String(postForm.recognitionType || '').trim(),
        companyName: String(postForm.companyName || '').trim(),
        honoreeId: String(postForm.honoreeId || '').trim(),
        honoreeName,
        alumniType: String(postForm.alumniType || '').trim(),
        currentRole: String(postForm.currentRole || '').trim(),
        hsiRole: String(postForm.hsiRole || '').trim(),
        startYear: String(postForm.startYear || '').trim(),
        endYear: String(postForm.endYear || '').trim(),
        imageUrl: String(postForm.imageUrl || '').trim(),
      };

      const res = await fetch(apiEndpoints.addAppreciationPost, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: postForm.title.trim(),
          author: honoreeName,
          excerpt: buildPostExcerpt(payloadMeta, postForm.description),
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      const body = contentType.includes('application/json')
        ? await res.json()
        : { message: await res.text() };

      if (!res.ok) {
        setPostError(body?.message || `Failed to add appreciation post (${res.status}).`);
        setPostSubmitting(false);
        return;
      }

      setShowPostModal(false);
      setPostForm({
        recognitionType: '',
        companyName: '',
        honoreeId: '',
        honoreeName: '',
        alumniType: 'employee',
        currentRole: '',
        hsiRole: '',
        startYear: '',
        endYear: '',
        title: '',
        description: '',
        imageUrl: '',
      });
      setPostImageFileName('');
      window.dispatchEvent(new CustomEvent('hsi-toast', { detail: { type: 'success', text: 'Appreciation post published successfully.' } }));
      await loadAchievements();
    } catch (err) {
      setPostError(err?.message || 'Failed to add appreciation post.');
    } finally {
      setPostSubmitting(false);
    }
  };

  const handlePostImageFileChange = (e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;

    if (!String(file.type || '').startsWith('image/')) {
      setPostError('Please select an image file.');
      e.target.value = '';
      return;
    }

    const maxSize = 4 * 1024 * 1024;
    if (file.size > maxSize) {
      setPostError('Image file is too large. Please choose one under 4MB.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPostForm((prev) => ({ ...prev, imageUrl: String(reader.result || '') }));
      setPostImageFileName(file.name || 'selected-image');
      setPostError('');
    };
    reader.onerror = () => {
      setPostError('Failed to read image file. Please try another file.');
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!showAwardModal) {
      setShowBadgeDropdown(false);
    }
  }, [showAwardModal]);

  useEffect(() => {
    if (!showBadgeDropdown) return undefined;

    const update = () => {
      const el = badgeButtonRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setBadgeDropdownRect({
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
      });
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [showBadgeDropdown]);

  const handleDeleteAwardEvent = async (eventId, options = {}) => {
    if (!isAdmin) return;
    if (!eventId) return;
    if (!options?.skipConfirm) {
      // eslint-disable-next-line no-alert
      if (!window.confirm('Delete this award entry?')) return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(apiEndpoints.deleteAwardEvent(eventId), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const contentType = res.headers.get('content-type') || '';
      const body = contentType.includes('application/json') ? await res.json().catch(() => ({})) : { message: await res.text().catch(() => '') };
      if (!res.ok) {
        const fallback = `Failed to delete award (HTTP ${res.status}).`;
        const msg = safeErrorText(fallback, body?.message);
        window.dispatchEvent(new CustomEvent('hsi-toast', { detail: { type: 'error', text: msg } }));
        return;
      }

      window.dispatchEvent(new CustomEvent('hsi-toast', { detail: { type: 'success', text: 'Award deleted successfully.' } }));
      await loadAchievements();
    } catch {
      window.dispatchEvent(new CustomEvent('hsi-toast', { detail: { type: 'error', text: 'Failed to delete award.' } }));
    }
  };

  const removeFromLocalRecent = (item) => {
    const cache = readCache();
    const nextRecent = (Array.isArray(cache.recentAchievements) ? cache.recentAchievements : [])
      .filter((x, idx) => stableAchievementKey(x, idx) !== stableAchievementKey(item, 0));
    writeCache({ ...cache, recentAchievements: nextRecent });

    setData((prev) => ({
      ...prev,
      recentAchievements: Array.isArray(prev.recentAchievements)
        ? prev.recentAchievements.filter((x, idx) => stableAchievementKey(x, idx) !== stableAchievementKey(item, 0))
        : prev.recentAchievements,
    }));
  };

  const handleDeleteRecentAchievement = async (item) => {
    if (!isAdmin || !item) return;
    // eslint-disable-next-line no-alert
    if (!window.confirm('Delete this achievement entry?')) return;

    if (item?.deleteId) {
      await handleDeleteAwardEvent(item.deleteId, { skipConfirm: true });
      return;
    }

    removeFromLocalRecent(item);
    window.dispatchEvent(new CustomEvent('hsi-toast', { detail: { type: 'success', text: 'Entry removed.' } }));
  };

  const handleDeleteAppreciationPost = async (post, index) => {
    if (!isAdmin) return;
    const postId = post?._id || String(index);
    // eslint-disable-next-line no-alert
    if (!window.confirm('Delete this appreciation post?')) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(apiEndpoints.deleteAppreciationPost(postId), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const contentType = res.headers.get('content-type') || '';
      const body = contentType.includes('application/json') ? await res.json().catch(() => ({})) : { message: await res.text().catch(() => '') };
      if (!res.ok) {
        const fallback = `Failed to delete post (HTTP ${res.status}).`;
        const msg = safeErrorText(fallback, body?.message);
        window.dispatchEvent(new CustomEvent('hsi-toast', { detail: { type: 'error', text: msg } }));
        return;
      }

      window.dispatchEvent(new CustomEvent('hsi-toast', { detail: { type: 'success', text: 'Post deleted successfully.' } }));
      await loadAchievements();
    } catch {
      window.dispatchEvent(new CustomEvent('hsi-toast', { detail: { type: 'error', text: 'Failed to delete post.' } }));
    }
  };

  const handleTogglePostLike = async (post, index) => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !post) return;

      const postId = post._id || String(index);
      setLikeBusyPostId(String(postId));

      const res = await fetch(apiEndpoints.likeAppreciationPost(postId), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        setLikeBusyPostId('');
        return;
      }

      const body = await res.json();
      const likes = Number(body?.likes || 0);
      const liked = Boolean(body?.liked);
      const userId = String(user?.id || user?._id || '');

      setData((prev) => {
        const updated = (prev.appreciationPosts || []).map((item, idx) => {
          const isTarget = String(item?._id || idx) === String(postId);
          if (!isTarget) return item;

          const currentLikedBy = Array.isArray(item.likedBy) ? item.likedBy.map((id) => String(id)) : [];
          const nextLikedBy = liked
            ? Array.from(new Set([...currentLikedBy, userId]))
            : currentLikedBy.filter((id) => id !== userId);

          return { ...item, likes, likedBy: nextLikedBy };
        });

        return {
          ...prev,
          appreciationPosts: updated,
          stats: {
            ...prev.stats,
            appreciationPosts: updated.length,
          },
        };
      });
    } finally {
      setLikeBusyPostId('');
    }
  };

  const featured = data.featured;
  const badgeItems = (data.badgeCatalog || []).map((name, idx) => ({
    id: idx + 1,
    name,
    color: badgePalette[idx % badgePalette.length].color,
    text: badgePalette[idx % badgePalette.length].text,
  }));
  const appreciationPosts = data.appreciationPosts || [];
  const milestones = data.milestones || [];
  const activeAlumniCount = activeAlumniMembers.length;

  const awardCandidates = useMemo(() => {
    const list = Array.isArray(directoryMembers) ? directoryMembers.slice() : [];
    const category = String(awardForm.awardeeCategory || 'alumni');
    const filtered = list.filter((member) => {
      const role = String(member?.role || '').toLowerCase();
      const status = String(member?.status || '').toLowerCase();

      const isAlumni = role === 'alumni' || (role === 'user' && status === 'approved');
      if (category === 'alumni') return isAlumni;

      return !isAlumni;
    });

    filtered.sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''), 'en', { sensitivity: 'base' }));
    return filtered;
  }, [awardForm.awardeeCategory, directoryMembers]);

  const featuredSlides = useMemo(() => {
    const awardEvents = Array.isArray(data.awardEvents) ? data.awardEvents.filter(Boolean) : [];
    if (awardEvents.length > 0) {
      return awardEvents
        .slice()
        .map((ev, index) => ({ ...ev, __index: index }))
        .sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0))
        .map((ev) => {
          const monthLabel = String(ev?.monthLabel || '').trim();
          const badges = Array.isArray(ev?.badges) ? ev.badges.map((x) => String(x).trim()).filter(Boolean) : [];
          return {
            deleteId: ev?._id ? String(ev._id) : `index-${ev.__index}`,
            _id: ev?._id,
            memberId: ev?.memberId ? String(ev.memberId) : null,
            createdAt: ev?.createdAt,
            type: 'featured',
            title: 'Alumni of the Month',
            name: ev?.fullName || 'Featured Alumni',
            fullName: ev?.fullName || 'Featured Alumni',
            subtitle: monthLabel,
            monthLabel,
            date: monthLabel,
            roleTitle: ev?.roleTitle || '',
            company: ev?.company || '',
            quote: ev?.quote || '',
            badges,
            badge: badges[0] || null,
            description: monthLabel ? `Selected as Featured Alumni of the Month for ${monthLabel}` : 'Selected as Featured Alumni of the Month',
          };
        });
    }

    const cached = Array.isArray(data.featuredAlumni) ? data.featuredAlumni.filter(Boolean) : [];
    if (cached.length > 0) {
      return cached.map((item) => {
        const monthLabel = String(item?.monthLabel || item?.month || '').trim();
        const badges = Array.isArray(item?.badges) ? item.badges.map((x) => String(x).trim()).filter(Boolean) : [];
        return {
          ...item,
          memberId: item?.memberId ? String(item.memberId) : null,
          type: 'featured',
          title: 'Alumni of the Month',
          name: item?.fullName || item?.name || 'Featured Alumni',
          fullName: item?.fullName || item?.name || 'Featured Alumni',
          subtitle: monthLabel,
          date: monthLabel,
          monthLabel,
          badges,
          badge: badges[0] || null,
          description: monthLabel ? `Selected as Featured Alumni of the Month for ${monthLabel}` : 'Selected as Featured Alumni of the Month',
        };
      });
    }

    if (!data.featured) return [];
    const monthLabel = String(data.featured?.monthLabel || '').trim();
    const badges = Array.isArray(data.featured?.badges) ? data.featured.badges.map((x) => String(x).trim()).filter(Boolean) : [];
    return [
      {
        ...data.featured,
        memberId: data.featured?.memberId ? String(data.featured.memberId) : null,
        type: 'featured',
        title: 'Alumni of the Month',
        name: data.featured?.fullName || data.featured?.name || 'Featured Alumni',
        subtitle: monthLabel,
        date: monthLabel,
        badges,
        badge: badges[0] || null,
        description: monthLabel ? `Selected as Featured Alumni of the Month for ${monthLabel}` : 'Selected as Featured Alumni of the Month',
      },
    ];
  }, [data.awardEvents, data.featured, data.featuredAlumni]);

  useEffect(() => {
    if (featuredIndex === 0) return;
    if (featuredIndex < featuredSlides.length) return;
    setFeaturedIndex(0);
  }, [featuredIndex, featuredSlides.length]);

  const activeFeatured = featuredSlides[featuredIndex] || featured || null;

  const allBadgeHolders = useMemo(() => {
    const rows = featuredSlides
      .map((item, idx) => {
        const badges = (Array.isArray(item?.badges) ? item.badges : [])
          .map((name) => String(name).trim())
          .filter(Boolean);

        if (badges.length === 0) return null;

        const itemName = String(item?.fullName || item?.name || 'Featured Alumni').trim();
        const itemMemberId = item?.memberId ? String(item.memberId) : '';
        const directoryMatch = directoryMembers.find((member) => {
          const memberId = String(member?.id || '');
          if (itemMemberId && memberId && itemMemberId === memberId) return true;
          return toBadgeKey(member?.name) === toBadgeKey(itemName);
        });
        const monthLabel = String(item?.monthLabel || '').trim();
        const fallbackYear = item?.createdAt ? new Date(item.createdAt).getFullYear() : null;
        const displayName = String(directoryMatch?.name || itemName).trim() || 'Featured Alumni';
        const profileRoleTitle = String(directoryMatch?.jobTitle || '').trim();
        const profileCompany = String(directoryMatch?.company || '').trim();
        const snapshotRoleTitle = String(item?.roleTitle || item?.jobTitle || 'Alumni Member').trim();

        return {
          id: String(item?._id || item?.deleteId || `badge-holder-${idx}`),
          memberId: itemMemberId || String(directoryMatch?.id || ''),
          name: displayName,
          initials: getInitials(displayName),
          profileImage: resolveProfileImage(directoryMatch?.profileImage || item?.profileImage),
          roleTitle: profileRoleTitle || snapshotRoleTitle,
          company: profileCompany || String(item?.company || '').trim(),
          subtitle: String(item?.category || 'Featured Alumni').toLowerCase() === 'employee' ? 'Former Employee' : 'Former Alumni',
          period: monthLabel || (Number.isFinite(fallbackYear) ? String(fallbackYear) : 'N/A'),
          badges,
          profileId: directoryMatch?.id || null,
        };
      })
      .filter(Boolean);

    return uniqBy(rows, (item) => `${toBadgeKey(item?.name)}|${toBadgeKey(item?.roleTitle)}|${toBadgeKey(item?.period)}`);
  }, [directoryMembers, featuredSlides]);

  const receivedBadgeItems = useMemo(() => {
    const holderBadgeNames = Array.from(
      new Set(
        allBadgeHolders
          .flatMap((holder) => (Array.isArray(holder.badges) ? holder.badges : []))
          .map((name) => String(name || '').trim())
          .filter(Boolean)
      )
    );

    return holderBadgeNames.map((name, idx) => {
      const fromCatalog = badgeItems.find((item) => toBadgeKey(item.name) === toBadgeKey(name));
      const fallbackPalette = badgePalette[idx % badgePalette.length];
      return {
        id: fromCatalog?.id || idx + 1,
        name,
        color: fromCatalog?.color || fallbackPalette.color,
        text: fromCatalog?.text || fallbackPalette.text,
      };
    });
  }, [allBadgeHolders, badgeItems]);

  const badgeSummaryCards = useMemo(
    () => {
      const cards = receivedBadgeItems.map((badge, idx) => ({
        ...badge,
        icon: idx % 2 === 0 ? SealCheck : badgeChoiceById[badge.name]?.icon || Medal,
        holders: allBadgeHolders.filter((holder) => holder.badges.some((name) => toBadgeKey(name) === toBadgeKey(badge.name))).length,
      }));

      const getPriority = (name) => {
        const index = clickedBadgePriority.findIndex((value) => toBadgeKey(value) === toBadgeKey(name));
        return index === -1 ? Number.MAX_SAFE_INTEGER : index;
      };

      return cards.sort((a, b) => {
        const priorityDiff = getPriority(a.name) - getPriority(b.name);
        if (priorityDiff !== 0) return priorityDiff;

        if (b.holders !== a.holders) return b.holders - a.holders;
        return a.name.localeCompare(b.name);
      });
    },
    [allBadgeHolders, clickedBadgePriority, receivedBadgeItems]
  );

  const filteredBadgeHolders = useMemo(() => {
    const query = toBadgeKey(badgeSearchQuery);
    const selectedBadge = toBadgeKey(badgeFilter);

    const filtered = allBadgeHolders.filter((holder) => {
      const matchesQuery = !query
        || toBadgeKey(holder.name).includes(query)
        || toBadgeKey(holder.roleTitle).includes(query)
        || toBadgeKey(holder.subtitle).includes(query)
        || holder.badges.some((badge) => toBadgeKey(badge).includes(query));

      const matchesBadge = selectedBadge === 'all'
        || holder.badges.some((badge) => toBadgeKey(badge) === selectedBadge);

      return matchesQuery && matchesBadge;
    });

    const getHolderPriority = (holder) => {
      const indexes = holder.badges
        .map((name) => clickedBadgePriority.findIndex((value) => toBadgeKey(value) === toBadgeKey(name)))
        .filter((index) => index >= 0);
      return indexes.length ? Math.min(...indexes) : Number.MAX_SAFE_INTEGER;
    };

    return filtered.sort((a, b) => {
      const priorityDiff = getHolderPriority(a) - getHolderPriority(b);
      if (priorityDiff !== 0) return priorityDiff;
      return a.name.localeCompare(b.name);
    });
  }, [allBadgeHolders, badgeFilter, badgeSearchQuery, clickedBadgePriority]);

  const handleBadgeCardClick = (badgeName) => {
    const normalized = toBadgeKey(badgeName);
    const isSelected = toBadgeKey(badgeFilter) === normalized;

    setClickedBadgePriority((prev) => [badgeName, ...prev.filter((item) => toBadgeKey(item) !== normalized)]);
    setBadgeFilter(isSelected ? 'all' : badgeName);
  };

  const activeFeaturedProfile = useMemo(() => {
    if (!activeFeatured) return null;

    const activeMemberId = String(activeFeatured?.memberId || '').trim();
    const activeName = String(activeFeatured?.fullName || activeFeatured?.name || '').trim();

    return directoryMembers.find((member) => {
      const memberId = String(member?.id || '').trim();
      if (activeMemberId && memberId && activeMemberId === memberId) return true;
      return toBadgeKey(member?.name) === toBadgeKey(activeName);
    }) || null;
  }, [activeFeatured, directoryMembers]);

  const awardCountByMember = useMemo(() => {
    const counts = {};
    featuredSlides.forEach((item) => {
      const key = String(item?.memberId || toBadgeKey(item?.fullName || item?.name || '')).trim();
      if (!key) return;
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [featuredSlides]);

  const topAwardedEntry = useMemo(() => {
    const entries = Object.entries(awardCountByMember);
    if (entries.length === 0) return null;
    entries.sort((a, b) => b[1] - a[1]);
    return { key: entries[0][0], count: entries[0][1] };
  }, [awardCountByMember]);

  const activeFeaturedMemberKey = String(activeFeatured?.memberId || toBadgeKey(activeFeatured?.fullName || activeFeatured?.name || '')).trim();
  const activeFeaturedAwardCount = awardCountByMember[activeFeaturedMemberKey] || 0;

  const featuredSlidesWithIndex = useMemo(
    () => featuredSlides.map((item, idx) => ({ ...item, __idx: idx })),
    [featuredSlides]
  );

  const getFeaturedSlideKey = useCallback(
    (item) => {
      if (!item) return '';
      const explicit = String(item?._id || item?.deleteId || '').trim();
      if (explicit) return `id:${explicit}`;

      const memberId = String(item?.memberId || '').trim();
      const fullName = String(item?.fullName || item?.name || '').trim().toLowerCase();
      const monthLabel = String(item?.monthLabel || item?.date || '').trim().toLowerCase();
      return `fallback:${memberId}|${fullName}|${monthLabel}`;
    },
    []
  );

  useEffect(() => {
    if (hasRestoredFeaturedRef.current) return;
    if (!featuredSlides.length) return;

    let raw = '';
    try {
      raw = localStorage.getItem(FEATURED_ACTIVE_KEY) || '';
    } catch {
      raw = '';
    }

    if (raw) {
      const idx = featuredSlides.findIndex((item) => getFeaturedSlideKey(item) === raw);
      if (idx >= 0) {
        setFeaturedIndex(idx);
      }
    }

    hasRestoredFeaturedRef.current = true;
  }, [featuredSlides, getFeaturedSlideKey]);

  useEffect(() => {
    if (!featuredSlides.length) return;
    const current = featuredSlides[featuredIndex] || featuredSlides[0];
    if (!current) return;

    try {
      localStorage.setItem(FEATURED_ACTIVE_KEY, getFeaturedSlideKey(current));
    } catch {
      // ignore storage errors
    }
  }, [featuredIndex, featuredSlides, getFeaturedSlideKey]);

  const featuredKeyAchievements = useMemo(() => {
    const badges = Array.isArray(activeFeatured?.badges) ? activeFeatured.badges.filter(Boolean) : [];
    if (badges.length > 0) {
      return badges.slice(0, 3).map((badge) => `Awarded ${badge}`);
    }

    const fallback = [];
    if (activeFeatured?.roleTitle) fallback.push(`Served as ${activeFeatured.roleTitle}`);
    if (activeFeatured?.company) fallback.push(`Contributed at ${activeFeatured.company}`);
    if (activeFeatured?.monthLabel) fallback.push(`Featured in ${activeFeatured.monthLabel}`);
    return fallback.slice(0, 3);
  }, [activeFeatured]);

  const appreciationPostCards = useMemo(() => {
    const bannerGradients = [
      'linear-gradient(135deg, #2d6a4f 0%, #1b4332 100%)',
      'linear-gradient(135deg, #4c1d95 0%, #6d28d9 100%)',
      'linear-gradient(135deg, #0f766e 0%, #0e7490 100%)',
      'linear-gradient(135deg, #9a3412 0%, #c2410c 100%)',
      'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
    ];

    return appreciationPosts.map((post, idx) => {
      const type = inferPostType(post);
      const typeInfo = postTypeMeta[type] || postTypeMeta.featured;
      const decoded = parsePostExcerpt(post?.excerpt);
      const meta = decoded.meta || {};
      const metaHonoreeId = String(meta.honoreeId || '').trim();
      const metaHonoreeName = String(meta.honoreeName || '').trim();
      const honoreeProfile = directoryMembers.find((member) => {
        const memberId = String(member?.id || '').trim();
        if (metaHonoreeId && memberId && metaHonoreeId === memberId) return true;
        return !metaHonoreeId && metaHonoreeName && toBadgeKey(member?.name) === toBadgeKey(metaHonoreeName);
      });
      const resolvedAuthor = String(honoreeProfile?.name || metaHonoreeName || post?.author || '').trim() || 'Author';
      const resolvedRole = String(meta.currentRole || honoreeProfile?.jobTitle || post?.roleTitle || '').trim();
      const resolvedCompany = String(meta.companyName || honoreeProfile?.company || post?.company || '').trim();
      const profileImage = resolveProfileImage(honoreeProfile?.profileImage);

      return {
        ...post,
        _idx: idx,
        type,
        typeLabel: typeInfo.chip,
        banner: bannerGradients[idx % bannerGradients.length],
        dateLabel: formatPostDate(post?.createdAt || post?.updatedAt),
        author: resolvedAuthor,
        initials: getInitials(resolvedAuthor || post?.title || 'AP'),
        excerptBody: decoded.body,
        company: resolvedCompany,
        roleLabel: resolvedRole,
        alumniType: String(meta.alumniType || '').trim(),
        imageUrl: resolvePostImage(post),
        profileImage,
        honoreeId: metaHonoreeId || String(honoreeProfile?.id || ''),
      };
    });
  }, [appreciationPosts, directoryMembers]);

  const filteredAppreciationPostCards = useMemo(() => {
    const query = String(postSearchQuery || '').trim().toLowerCase();
    return appreciationPostCards.filter((post) => {
      const matchesType = postTypeFilter === 'all' || post.type === postTypeFilter;
      const blob = `${String(post.title || '')} ${String(post.author || '')} ${String(post.excerptBody || '')} ${String(post.company || '')}`.toLowerCase();
      const matchesQuery = !query || blob.includes(query);
      return matchesType && matchesQuery;
    });
  }, [appreciationPostCards, postSearchQuery, postTypeFilter]);

  const selectedPostDisplay = useMemo(() => {
    const post = selectedPost?.post || null;
    if (!post) return null;

    const type = inferPostType(post);
    const typeInfo = postTypeMeta[type] || postTypeMeta.featured;
    const decoded = parsePostExcerpt(post?.excerpt);
    const meta = decoded.meta || {};
    const metaHonoreeId = String(meta.honoreeId || '').trim();
    const metaHonoreeName = String(meta.honoreeName || '').trim();
    const honoreeProfile = directoryMembers.find((member) => {
      const memberId = String(member?.id || '').trim();
      if (metaHonoreeId && memberId && metaHonoreeId === memberId) return true;
      return !metaHonoreeId && metaHonoreeName && toBadgeKey(member?.name) === toBadgeKey(metaHonoreeName);
    });
    const resolvedAuthor = String(honoreeProfile?.name || metaHonoreeName || post?.author || 'Author').trim() || 'Author';
    const resolvedRole = String(meta.currentRole || honoreeProfile?.jobTitle || post?.roleTitle || '').trim();
    const resolvedCompany = String(meta.companyName || honoreeProfile?.company || post?.company || '').trim();
    const imageUrl = resolvePostImage(post);
    const initials = getInitials(resolvedAuthor || post?.title || 'AP');
    const profileImage = resolveProfileImage(honoreeProfile?.profileImage);

    return {
      post,
      type,
      typeLabel: typeInfo.chip,
      title: String(post?.title || 'Post').trim() || 'Post',
      author: resolvedAuthor,
      excerpt: decoded.body,
      dateLabel: formatPostDate(post?.createdAt || post?.updatedAt),
      company: resolvedCompany,
      imageUrl,
      hasImage: Boolean(imageUrl),
      initials,
      roleLabel: resolvedRole,
      alumniType: String(meta.alumniType || '').trim(),
      hsiRole: String(meta.hsiRole || '').trim(),
      hsiYears: [meta.startYear, meta.endYear].filter(Boolean).join('-'),
      banner: post?.banner || 'linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 100%)',
      profileImage,
      honoreeId: metaHonoreeId || String(honoreeProfile?.id || ''),
    };
  }, [selectedPost, directoryMembers]);

  const recentAchievements = useMemo(() => {
    const combined = [];
    const awardEvents = Array.isArray(data.awardEvents) ? data.awardEvents.filter(Boolean) : [];
    awardEvents
      .slice()
      .map((ev, index) => ({ ...ev, __index: index }))
      .sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0))
      .slice(0, 20)
      .forEach((ev) => {
        const monthLabel = String(ev?.monthLabel || '').trim();
        const badges = Array.isArray(ev?.badges) ? ev.badges.map((x) => String(x).trim()).filter(Boolean) : [];
        combined.push({
          deleteId: ev?._id ? String(ev._id) : `index-${ev.__index}`,
          _id: ev?._id,
          createdAt: ev?.createdAt,
          type: 'featured',
          name: ev?.fullName || 'Featured Alumni',
          title: 'Featured',
          subtitle: monthLabel,
          description: monthLabel ? `Selected as Featured Alumni of the Month for ${monthLabel}` : 'Selected as Featured Alumni of the Month',
          date: monthLabel || '',
          roleTitle: ev?.roleTitle || '',
          company: ev?.company || '',
          quote: ev?.quote || '',
          badges,
          badge: badges[0] || null,
        });
      });

    const manualList = Array.isArray(data.recentAchievements) ? data.recentAchievements.filter(Boolean) : [];
    combined.push(...manualList);

    const unique = uniqBy(combined, stableAchievementKey);
    if (unique.length > 0) return unique;

    const fallback = [];
    if (activeFeatured) {
      fallback.push({
        type: 'featured',
        name: activeFeatured?.fullName || activeFeatured?.name || 'Featured Alumni',
        title: 'Featured',
        subtitle: activeFeatured?.monthLabel || '',
        description: activeFeatured?.quote || '',
        date: activeFeatured?.monthLabel || activeFeatured?.date || '',
        badges: Array.isArray(activeFeatured?.badges) ? activeFeatured.badges : [],
        badge: Array.isArray(activeFeatured?.badges) ? activeFeatured.badges[0] : null,
      });
    }

    (milestones || []).slice(0, 10).forEach((m) => {
      fallback.push({
        type: 'milestone',
        name: m?.name || 'Milestone',
        title: 'Milestone',
        subtitle: m?.label || '',
        description: m?.description || '',
        date: m?.date || '',
        badge: m?.badge || null,
      });
    });

    return fallback;
  }, [activeFeatured, data.awardEvents, data.recentAchievements, milestones]);

  const filteredRecentAchievements = useMemo(() => {
    if (achievementTypeFilter === 'all') return recentAchievements;
    return recentAchievements.filter((item) => normalizeAchievementType(item?.type) === achievementTypeFilter);
  }, [achievementTypeFilter, recentAchievements]);

  const statCards = useMemo(
    () => [
      { key: 'totalBadgesAwarded', title: 'Total Badges Awarded', value: formatInt(data.stats.totalBadgesAwarded || 0), icon: Medal, color: '#d4af0d', bg: '#f8f0d7' },
      { key: 'featuredAlumni', title: 'Featured Alumni', value: formatInt(data.stats.featuredAlumni || 0), icon: CrownSimple, color: '#8b44d2', bg: '#efe3fb' },
      { key: 'appreciationPosts', title: 'Appreciation Posts', value: formatInt(data.stats.appreciationPosts || 0), icon: Heart, color: '#e44d93', bg: '#fbe8f2' },
      { key: 'activeAlumni', title: 'Active Alumni', value: formatInt(activeAlumniCount), icon: UsersThree, color: '#2f74db', bg: '#e3eefb' },
    ],
    [data, activeAlumniCount]
  );

  return (
    <motion.div
      className="hsi-achievements-page"
      style={{ display: 'flex', minHeight: '100vh', background: '#ececec' }}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.25 }}
    >
      <style>{`
        @keyframes hsiSweepRight {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
        @keyframes hsiBadgeScroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }

        .hsi-achievements-page .hsi-hide-scrollbar {
          scrollbar-width: none;
        }
        .hsi-achievements-page .hsi-hide-scrollbar::-webkit-scrollbar {
          display: none;
        }

        .hsi-achievements-page {
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
        }
        html, body {
          overflow-x: hidden;
        }

        .hsi-achievements-page main,
        .hsi-achievements-page section,
        .hsi-achievements-page div {
          min-width: 0;
        }

        .hsi-achievements-page button {
          position: relative;
          overflow: hidden;
          isolation: isolate;
          transition: transform 0.16s ease, box-shadow 0.2s ease;
        }

        .hsi-achievements-page button::before {
          content: '';
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.12);
          transform: scaleX(0);
          transform-origin: left;
          pointer-events: none;
          z-index: 0;
        }

        .hsi-achievements-page button:not(:disabled):hover::before,
        .hsi-achievements-page button:not(:disabled):focus-visible::before {
          animation: hsiSweepRight 0.65s ease-out forwards;
        }

        .hsi-achievements-page button:not(:disabled):hover {
          transform: none;
        }

        @media (max-width: 1024px) {
          .hsi-achievements-page .hsi-ach-main {
            padding: 22px 26px !important;
          }

          .hsi-achievements-page .hsi-ach-stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 12px !important;
          }

          .hsi-achievements-page .hsi-ach-featured-metrics {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .hsi-achievements-page .hsi-ach-posts-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 768px) {
          .hsi-achievements-page {
            transform: none !important;
          }

          .hsi-achievements-page .hsi-ach-modal-overlay {
            padding: 8px !important;
            overflow-x: hidden !important;
          }

          .hsi-achievements-page .hsi-ach-post-modal,
          .hsi-achievements-page .hsi-ach-award-modal {
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
          .hsi-achievements-page .hsi-ach-post-view-modal {
            width: 100% !important;
            max-width: 100% !important;
            max-height: calc(100vh - 74px) !important;
            box-sizing: border-box !important;
            overflow-x: hidden !important;
          }
          .hsi-achievements-page .hsi-ach-post-view-overlay {
            padding: 8px !important;
            overflow-x: hidden !important;
          }
          .hsi-achievements-page .hsi-ach-post-view-content {
            padding: 12px !important;
          }
          .hsi-achievements-page .hsi-ach-post-view-title {
            font-size: 22px !important;
            line-height: 1.15 !important;
          }
          .hsi-achievements-page .hsi-ach-post-view-author {
            font-size: 18px !important;
            line-height: 1.2 !important;
          }
          .hsi-achievements-page .hsi-ach-post-view-xbtn {
            width: 28px !important;
            height: 28px !important;
          }
          .hsi-achievements-page .hsi-ach-post-view-actions button {
            height: 32px !important;
            min-width: 0 !important;
            padding: 0 10px !important;
            font-size: 12px !important;
            border-radius: 9px !important;
          }

          .hsi-achievements-page .hsi-ach-award-category {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 6px !important;
            width: 100% !important;
            min-width: 0 !important;
          }

          .hsi-achievements-page .hsi-ach-award-category button {
            width: 100% !important;
            min-width: 0 !important;
            box-sizing: border-box !important;
            font-size: 12px !important;
            padding: 0 6px !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }

          .hsi-achievements-page .hsi-ach-award-grid > input,
          .hsi-achievements-page .hsi-ach-award-grid > select,
          .hsi-achievements-page .hsi-ach-award-grid > textarea {
            width: 100% !important;
            min-width: 0 !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
          .hsi-achievements-page .hsi-ach-award-grid > select {
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }

          .hsi-achievements-page .hsi-ach-main {
            padding: 14px 12px !important;
            gap: 12px !important;
          }

          .hsi-achievements-page .hsi-ach-title {
            font-size: 28px !important;
          }

          .hsi-achievements-page .hsi-ach-head-row {
            flex-direction: column !important;
            align-items: flex-start !important;
          }

          .hsi-achievements-page .hsi-ach-admin-actions {
            width: 100%;
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .hsi-achievements-page .hsi-ach-tabs-row {
            overflow-x: auto;
            overflow-y: hidden;
            scrollbar-width: none;
          }
          .hsi-achievements-page .hsi-ach-tabs-row::-webkit-scrollbar {
            display: none;
          }

          .hsi-achievements-page .hsi-ach-tab-btn {
            flex: 0 0 auto !important;
            min-width: max-content;
            padding: 10px 12px !important;
            font-size: 11px !important;
          }

          .hsi-achievements-page .hsi-ach-stats-grid {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 10px !important;
          }
          .hsi-achievements-page .hsi-ach-stats-grid > .hsi-ach-stat-card {
            min-width: 0;
            padding: 12px !important;
          }
          .hsi-achievements-page .hsi-ach-stats-grid > .hsi-ach-stat-card > div:nth-child(2) {
            font-size: 28px !important;
            margin-top: 6px !important;
          }

          .hsi-achievements-page .hsi-ach-featured-header {
            flex-direction: column !important;
            align-items: flex-start !important;
          }

          .hsi-achievements-page .hsi-ach-featured-profile {
            flex-direction: column !important;
            gap: 12px !important;
          }

          .hsi-achievements-page .hsi-ach-featured-metrics {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 10px !important;
          }
          .hsi-achievements-page .hsi-ach-featured-metrics > div {
            min-width: 0;
            min-height: 68px !important;
            padding: 8px 6px !important;
          }
          .hsi-achievements-page .hsi-ach-featured-metrics > div > div:first-child {
            font-size: 30px !important;
          }

          .hsi-achievements-page .hsi-ach-recent-header {
            flex-direction: column !important;
            align-items: flex-start !important;
          }

          .hsi-achievements-page .hsi-ach-recent-item {
            grid-template-columns: 1fr !important;
            gap: 10px !important;
            padding: 12px 0 !important;
          }

          .hsi-achievements-page .hsi-ach-recent-side {
            align-items: flex-start !important;
            padding-top: 0 !important;
            white-space: normal !important;
          }

          .hsi-achievements-page .hsi-ach-badges-controls,
          .hsi-achievements-page .hsi-ach-posts-controls {
            width: 100%;
          }

          .hsi-achievements-page .hsi-ach-badges-search,
          .hsi-achievements-page .hsi-ach-posts-search {
            min-width: 0 !important;
            width: 100%;
          }
          .hsi-achievements-page .hsi-ach-posts-create-btn {
            height: 36px !important;
            padding: 0 12px !important;
            font-size: 12px !important;
            border-radius: 10px !important;
            gap: 6px !important;
          }
          .hsi-achievements-page .hsi-ach-posts-create-btn svg {
            width: 14px !important;
            height: 14px !important;
          }

          .hsi-achievements-page .hsi-ach-badge-summary-grid {
            grid-template-columns: 1fr !important;
          }

          .hsi-achievements-page .hsi-ach-holders-grid {
            grid-template-columns: 1fr !important;
            gap: 10px !important;
          }
          .hsi-achievements-page .hsi-ach-holders-grid > article {
            padding: 10px !important;
          }

          .hsi-achievements-page .hsi-ach-holder-list-item {
            display: grid !important;
            grid-template-columns: 42px minmax(0, 1fr) !important;
            gap: 8px !important;
          }
          .hsi-achievements-page .hsi-ach-holder-main {
            min-width: 0 !important;
          }
          .hsi-achievements-page .hsi-ach-holder-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
          }
          .hsi-achievements-page .hsi-ach-holder-name {
            font-size: 13px !important;
            white-space: normal !important;
            overflow: visible !important;
            text-overflow: clip !important;
          }
          .hsi-achievements-page .hsi-ach-holder-meta {
            white-space: normal !important;
            overflow: visible !important;
            text-overflow: clip !important;
          }
          .hsi-achievements-page .hsi-ach-holder-badges-strip {
            margin-top: 6px;
            overflow: hidden;
            width: 100%;
          }
          .hsi-achievements-page .hsi-ach-holder-badges-track {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            width: max-content;
            white-space: nowrap;
            animation: hsiBadgeScroll 14s linear infinite;
          }
          .hsi-achievements-page .hsi-ach-holder-badge-chip {
            white-space: nowrap !important;
            flex: 0 0 auto;
          }
          .hsi-achievements-page .hsi-ach-holder-eye-btn {
            width: 28px !important;
            height: 28px !important;
            border-radius: 8px !important;
            border: 1px solid #e5e7eb !important;
            background: #fff !important;
            color: #667085 !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 0 !important;
            flex-shrink: 0;
          }

          .hsi-achievements-page .hsi-ach-form-grid-2,
          .hsi-achievements-page .hsi-ach-form-grid-mixed,
          .hsi-achievements-page .hsi-ach-form-grid-3,
          .hsi-achievements-page .hsi-ach-award-grid,
          .hsi-achievements-page .hsi-ach-badge-options-grid {
            grid-template-columns: 1fr !important;
          }

          .hsi-achievements-page .hsi-ach-modal-footer {
            flex-direction: column !important;
            align-items: stretch !important;
          }
        }

        @media (max-width: 480px) {
          .hsi-achievements-page .hsi-ach-modal-overlay {
            padding: 8px !important;
          }

          .hsi-achievements-page .hsi-ach-main {
            padding-top: 74px !important;
          }

          .hsi-achievements-page .hsi-ach-subtitle {
            width: 100%;
            white-space: normal !important;
            overflow-wrap: anywhere;
          }

          .hsi-achievements-page .hsi-ach-admin-actions {
            width: auto !important;
            margin-left: auto;
            display: flex !important;
            grid-template-columns: none !important;
            gap: 6px !important;
          }

          .hsi-achievements-page .hsi-ach-admin-actions .hsi-btn {
            height: 34px !important;
            min-width: 0 !important;
            padding: 0 10px !important;
            font-size: 11px !important;
            border-radius: 10px !important;
          }

          .hsi-achievements-page .hsi-ach-tabs-row {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            overflow: visible !important;
          }

          .hsi-achievements-page .hsi-ach-tab-btn {
            min-width: 0 !important;
            justify-content: center !important;
            font-size: 11px !important;
            gap: 6px !important;
            padding: 10px 8px !important;
          }

          .hsi-achievements-page .hsi-ach-posts-heading {
            font-size: 16px !important;
            line-height: 1.15 !important;
            gap: 6px !important;
            white-space: nowrap;
          }
          .hsi-achievements-page .hsi-ach-posts-heading svg {
            width: 20px !important;
            height: 20px !important;
          }
          .hsi-achievements-page .hsi-ach-posts-subtitle {
            font-size: 12px !important;
          }

          .hsi-achievements-page .hsi-ach-overview-posts-title {
            font-size: 14px !important;
          }
          .hsi-achievements-page .hsi-ach-overview-posts-viewall {
            font-size: 12px !important;
          }
          .hsi-achievements-page .hsi-ach-overview-post-item-title {
            font-size: 16px !important;
            line-height: 1.25 !important;
          }
          .hsi-achievements-page .hsi-ach-overview-post-item-author {
            font-size: 11px !important;
          }

          .hsi-achievements-page .hsi-ach-badges-title {
            font-size: 16px !important;
            line-height: 1.1 !important;
            white-space: nowrap;
          }

          .hsi-achievements-page .hsi-ach-title {
            font-size: 24px !important;
            line-height: 1.1 !important;
          }

          .hsi-achievements-page .hsi-ach-stat-card {
            padding: 14px !important;
          }

          .hsi-achievements-page .hsi-ach-post-modal,
          .hsi-achievements-page .hsi-ach-award-modal {
            width: 100% !important;
            max-width: 100% !important;
            max-height: calc(100vh - 74px) !important;
            border-radius: 14px !important;
            box-sizing: border-box !important;
            margin: 0 auto !important;
          }

          .hsi-achievements-page .hsi-ach-post-modal > div:first-child,
          .hsi-achievements-page .hsi-ach-post-modal > div:nth-child(2),
          .hsi-achievements-page .hsi-ach-post-modal > div:last-child,
          .hsi-achievements-page .hsi-ach-award-modal {
            padding-left: 12px !important;
            padding-right: 12px !important;
          }

          .hsi-achievements-page .hsi-ach-award-modal > div,
          .hsi-achievements-page .hsi-ach-award-modal input,
          .hsi-achievements-page .hsi-ach-award-modal select,
          .hsi-achievements-page .hsi-ach-award-modal textarea {
            box-sizing: border-box !important;
            max-width: 100% !important;
          }

          .hsi-achievements-page .hsi-ach-award-category {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 6px !important;
            min-width: 0 !important;
          }
          .hsi-achievements-page .hsi-ach-award-category button {
            width: 100% !important;
            min-width: 0 !important;
            padding: 0 8px !important;
            font-size: 11px !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            box-sizing: border-box !important;
          }

          .hsi-achievements-page .hsi-ach-modal-footer {
            justify-content: flex-end !important;
          }
          .hsi-achievements-page .hsi-ach-modal-footer > div:first-child {
            display: none !important;
          }
          .hsi-achievements-page .hsi-ach-modal-footer > div:last-child {
            width: auto !important;
            margin-left: auto !important;
            gap: 6px !important;
          }
          .hsi-achievements-page .hsi-ach-modal-footer button,
          .hsi-achievements-page .hsi-ach-award-actions button {
            height: 34px !important;
            padding: 0 10px !important;
            font-size: 12px !important;
            border-radius: 10px !important;
          }
          .hsi-achievements-page .hsi-ach-award-actions {
            margin-top: 12px !important;
            justify-content: flex-end !important;
            gap: 6px !important;
          }
        }
      `}</style>
      <Sidebar isOpen={sidebarOpen} toggle={() => setSidebarOpen(!sidebarOpen)} />

      <main className="hsi-ach-main" style={{ flex: 1, padding: '28px 48px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h1 className="hsi-ach-title" style={{ margin: 0, fontSize: 36, fontWeight: 800, color: '#0f172a', lineHeight: 1.04 }}>
          Achievements & <span style={{ color: '#d4a009' }}>Recognition</span>
        </h1>
        <div className="hsi-ach-head-row" style={{ marginTop: 7, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <p className="hsi-ach-subtitle" style={{ margin: 0, fontSize: 12, color: '#566273', fontStyle: 'italic' }}>
            Celebrate your milestones, badges, and featured alumni spotlights.
          </p>
          {isAdmin ? (
            <div className="hsi-ach-admin-actions" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                className="hsi-btn hsi-btn-secondary"
                type="button"
                onClick={() => setShowPostModal(true)}
                style={{
                  fontSize: 12,
                  padding: '0 18px',
                }}
              >
                Add Post
              </button>
              <button
                className="hsi-btn hsi-btn-primary"
                type="button"
                onClick={() => setShowAwardModal(true)}
                style={{
                  fontSize: 12,
                  padding: '0 18px',
                }}
              >
                Add Award
              </button>
            </div>
          ) : null}
        </div>

        <section style={{ marginTop: 6, border: '1px solid #e5e7eb', borderRadius: 14, background: '#fff', overflow: 'hidden' }}>
          <div className="hsi-ach-tabs-row" style={{ display: 'flex' }}>
            {tabItems.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  className="hsi-ach-tab-btn"
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    border: 'none',
                    borderBottom: isActive ? '2px solid #d4af0d' : '2px solid transparent',
                    background: isActive ? '#f8f6ef' : '#fff',
                    color: isActive ? '#b07a15' : '#667085',
                    fontWeight: isActive ? 700 : 600,
                    fontSize: 12,
                    padding: '14px 18px',
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    cursor: 'pointer',
                  }}
                >
                  <Icon size={15} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </section>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`achievements-tab-${activeTab}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
        {activeTab === 'overview' && (
          <section className="hsi-ach-stats-grid" style={{ marginTop: 2, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
            {statCards.map((card) => {
              const Icon = card.icon;
              const trend = data?.stats?.trends?.[card.key];
              return (
                <article className="hsi-ach-stat-card" key={card.title} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18, boxShadow: '0 6px 14px rgba(17,24,39,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ fontSize: 13, color: '#475467', fontWeight: 600 }}>{card.title}</div>
                    <div style={{ width: 46, height: 46, borderRadius: 12, background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={22} color={card.color} weight="fill" />
                    </div>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 34, color: card.color, fontWeight: 900, letterSpacing: -0.5, lineHeight: 1.1 }}>
                    {loading ? '-' : card.value}
                  </div>
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, color: '#16a34a', fontSize: 12, fontWeight: 800 }}>
                    <ArrowUpRight size={16} weight="bold" />
                    {typeof trend === 'number' ? `${trend >= 0 ? '+' : ''}${trend}%` : '+0%'} <span style={{ color: '#64748b', fontWeight: 600 }}>from last month</span>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {activeTab === 'overview' && (
          <section style={{ marginTop: 6, border: '1px solid #d8b119', borderRadius: 14, overflow: 'hidden', background: '#fff' }}>
            <header className="hsi-ach-featured-header" style={{ background: '#d4af0d', padding: '14px 18px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Trophy size={18} weight="fill" />
                <div>
                  <div style={{ fontSize: 18, fontWeight: 900, lineHeight: 1.05 }}>Alumni of the Month</div>
                  <div style={{ fontSize: 12, opacity: 0.95 }}>{activeFeatured?.monthLabel || 'No award yet'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button"
                  onClick={() => setFeaturedIndex((idx) => (featuredSlides.length ? (idx - 1 + featuredSlides.length) % featuredSlides.length : 0))}
                  disabled={featuredSlides.length <= 1}
                  aria-label="Previous featured alumni"
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 999,
                    border: 'none',
                    background: 'rgba(255,255,255,0.22)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: featuredSlides.length <= 1 ? 'not-allowed' : 'pointer',
                    opacity: featuredSlides.length <= 1 ? 0.6 : 1,
                  }}
                >
                  <CaretLeft size={16} weight="bold" />
                </button>
                <button type="button"
                  onClick={() => setFeaturedIndex((idx) => (featuredSlides.length ? (idx + 1) % featuredSlides.length : 0))}
                  disabled={featuredSlides.length <= 1}
                  aria-label="Next featured alumni"
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 999,
                    border: 'none',
                    background: 'rgba(255,255,255,0.22)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: featuredSlides.length <= 1 ? 'not-allowed' : 'pointer',
                    opacity: featuredSlides.length <= 1 ? 0.6 : 1,
                  }}
                >
                  <CaretRight size={16} weight="bold" />
                </button>
              </div>
            </header>

              <div style={{ padding: 18 }}>
                {!activeFeatured ? (
                  <div style={{ border: '1px dashed #e5e7eb', borderRadius: 12, padding: 16, color: '#64748b', fontSize: 13 }}>
                    No featured alumni yet. This section will populate once an admin awards an alumni.
                  </div>
                ) : (
                  <>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedAchievement(activeFeatured)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') setSelectedAchievement(activeFeatured);
                      }}
                      style={{ cursor: 'pointer' }}
                      aria-label="View featured alumni details"
                    >
                      <div className="hsi-ach-featured-profile" style={{ display: 'flex', gap: 18, alignItems: 'start' }}>
                        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#d4af0d', color: '#fff', fontSize: 22, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 22px rgba(17,24,39,0.12)', overflow: 'hidden' }}>
                          {activeFeaturedProfile?.profileImage ? (
                            <img
                              src={activeFeaturedProfile.profileImage}
                              alt={`${activeFeaturedProfile?.name || activeFeatured?.name || 'Alumni'} avatar`}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            (activeFeatured.fullName || activeFeatured.name || 'NA')
                              .split(' ')
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((part) => part[0])
                              .join('')
                              .toUpperCase()
                          )}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 20, color: '#0f172a', fontWeight: 900 }}>
                            {activeFeatured.fullName || activeFeatured.name}
                          </div>
                          <div style={{ color: '#b07a15', fontWeight: 800, fontSize: 13, marginTop: 2 }}>
                            {activeFeatured.roleTitle || activeFeatured.jobTitle || ''}
                          </div>
                          <div style={{ color: '#667085', fontSize: 13, marginTop: 2 }}>
                            {activeFeatured.company || ''}
                          </div>
                          <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {(activeFeatured.badges || []).map((name, idx) => {
                              const style = badgePalette[idx % badgePalette.length];
                              return (
                                <span key={`${name}-${idx}`} style={{ fontSize: 11, fontWeight: 500, color: style.text, background: style.color, borderRadius: 999, padding: '4px 10px' }}>
                                  {name}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {activeFeatured.quote ? (
                        <blockquote style={{ margin: '14px 0 0 0', background: '#f8fafc', borderRadius: 12, padding: '14px 16px', color: '#334155', fontStyle: 'italic', fontSize: 13, position: 'relative' }}>
                          <span style={{ position: 'absolute', left: 14, top: 10, color: '#d4af0d', fontSize: 28, lineHeight: 1, fontWeight: 900 }}>"</span>
                          <div style={{ paddingLeft: 22 }}>"{activeFeatured.quote}"</div>
                        </blockquote>
                      ) : null}

                      <div className="hsi-ach-featured-metrics" style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, textAlign: 'center' }}>
                        {[
                          { label: 'Total Awards', value: activeFeaturedAwardCount },
                          { label: 'Badges This Feature', value: (activeFeatured?.badges || []).length },
                          { label: 'Featured Entries', value: featuredSlides.length },
                        ].map((m) => (
                          <div key={m.label} style={{ minHeight: 78, padding: '12px 8px', borderRadius: 14, background: '#f8fafc', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ fontWeight: 800, color: '#d4af0d', fontSize: 40, lineHeight: 1 }}>{formatInt(m.value || 0)}</div>
                            <div style={{ marginTop: 4, fontSize: 13, color: '#667085' }}>{m.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </section>
        )}

        {activeTab === 'overview' && (
          <section style={{ marginTop: 6, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden' }}>
            <div className="hsi-ach-recent-header" style={{ padding: '14px 18px', borderBottom: '1px solid #eef2f7', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Clock size={18} color="#d4af0d" weight="bold" />
                <div style={{ fontWeight: 900, color: '#111827', fontSize: 16 }}>Recent Achievements</div>
              </div>
              <select
                value={achievementTypeFilter}
                onChange={(e) => setAchievementTypeFilter(e.target.value)}
                style={{
                  height: 36,
                  borderRadius: 10,
                  border: '1px solid #e5e7eb',
                  padding: '0 12px',
                  background: '#fff',
                  color: '#111827',
                  fontWeight: 700,
                  fontSize: 13,
                  outline: 'none',
                }}
                aria-label="Filter achievement types"
              >
                <option value="all">All Types</option>
                <option value="badge">Badge Earned</option>
                <option value="featured">Featured</option>
                <option value="hall_of_fame">Hall of Fame</option>
                <option value="milestone">Milestone</option>
              </select>
            </div>

            <div style={{ padding: 18 }}>
              {filteredRecentAchievements.length === 0 ? (
                <div style={{ border: '1px dashed #e5e7eb', borderRadius: 12, padding: 16, color: '#64748b', fontSize: 13 }}>
                  No recent achievements yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {filteredRecentAchievements.slice(0, 8).map((item, idx) => {
                    const type = normalizeAchievementType(item?.type);
                    const iconBg = type === 'featured' ? '#f0e8ff'
                      : type === 'milestone' ? '#e7f0ff'
                        : type === 'hall_of_fame' ? '#dcfce7'
                          : '#f8ead0';
                    const iconColor = type === 'featured' ? '#7b45d3'
                      : type === 'milestone' ? '#3570d4'
                        : type === 'hall_of_fame' ? '#16a34a'
                          : '#b07a15';
                    const label = item?.title
                      || (type === 'featured' ? 'Featured' : type === 'milestone' ? 'Milestone' : type === 'hall_of_fame' ? 'Hall of Fame' : 'Badge Earned');
                    const extraBadgesRaw = Array.isArray(item?.badges) ? item.badges : [];
                    const extraBadges = extraBadgesRaw.map((b) => String(b).trim()).filter(Boolean);
                    const badge = item?.badge || item?.earned || extraBadges[0] || null;
                    const badgeMeta = badge ? badgeChoiceById[String(badge)] : null;

                    const Icon = badgeMeta?.icon || (type === 'featured' ? CrownSimple
                      : type === 'milestone' ? Star
                        : type === 'hall_of_fame' ? Medal
                          : Trophy);
                    const finalIconBg = badgeMeta?.bg || iconBg;
                    const finalIconColor = badgeMeta?.color || iconColor;

                    return (
                      <div
                        key={`${item?.id || item?._id || idx}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedAchievement(item)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') setSelectedAchievement(item);
                        }}
                        className="hsi-ach-recent-item"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '46px 1fr auto',
                          gap: 14,
                          padding: '16px 0',
                          borderTop: idx === 0 ? 'none' : '1px solid #f1f5f9',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <div style={{ width: 34, height: 34, borderRadius: 999, background: finalIconBg, border: '1px solid #eef2f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon size={16} color={finalIconColor} weight="bold" />
                          </div>
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <div style={{ fontWeight: 900, color: '#111827', fontSize: 14 }}>{item?.name || 'Alumni'}</div>
                            <span style={{ fontSize: 11, fontWeight: 500, color: '#b07a15', background: '#f8ead0', borderRadius: 999, padding: '3px 8px' }}>
                              {label}
                            </span>
                            {badge ? (
                              <span style={{ fontSize: 11, fontWeight: 500, color: '#7b45d3', background: '#f0e8ff', borderRadius: 999, padding: '3px 8px' }}>
                                {badge}
                              </span>
                            ) : null}
                            {extraBadges.slice(1, 3).map((b) => (
                              <span key={b} style={{ fontSize: 11, fontWeight: 500, color: '#7b45d3', background: '#f0e8ff', borderRadius: 999, padding: '3px 8px' }}>
                                {b}
                              </span>
                            ))}
                          </div>
                          {item?.subtitle ? (
                            <div style={{ marginTop: 4, color: '#667085', fontSize: 12 }}>
                              {item.subtitle}
                            </div>
                          ) : null}
                          {item?.description ? (
                            <div style={{ marginTop: 6, color: '#334155', fontSize: 13 }}>
                              {item.description}
                            </div>
                          ) : null}
                        </div>
                        <div className="hsi-ach-recent-side" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, paddingTop: 2, whiteSpace: 'nowrap' }}>
                          <div style={{ color: '#98a2b3', fontSize: 12 }}>
                            {item?.date || ''}
                          </div>
                          {isAdmin ? (
                            <button type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteRecentAchievement(item);
                              }}
                              style={{ border: 'none', background: 'transparent', color: '#b91c1c', fontSize: 12, fontWeight: 800, cursor: 'pointer', padding: 0 }}
                            >
                              Delete
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {filteredRecentAchievements.length > 8 ? (
                <button type="button"
                  onClick={() => setShowAllAchievements(true)}
                  style={{ marginTop: 12, width: '100%', border: 'none', background: 'transparent', color: '#d4a009', fontWeight: 900, cursor: 'pointer', padding: 10 }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    View All Achievements <ArrowRight size={16} weight="bold" />
                  </span>
                </button>
              ) : null}
            </div>
          </section>
        )}

        {activeTab === 'badges' && (
          <>
            <section style={{ marginTop: 12, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Medal size={20} color="#d4a009" weight="fill" />
                    <h2 className="hsi-ach-badges-title" style={{ margin: 0, fontSize: 22, lineHeight: 1.1, color: '#111827', letterSpacing: -0.2 }}>Alumni Badges Showcase</h2>
                  </div>
                  <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 14 }}>
                    Explore badges earned by our distinguished employee and intern alumni
                  </p>
                </div>

                <div className="hsi-ach-badges-controls" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div className="hsi-ach-badges-search" style={{
                    height: 40,
                    minWidth: 260,
                    borderRadius: 10,
                    border: '1px solid #d1d5db',
                    background: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '0 12px',
                  }}>
                    <MagnifyingGlass size={18} color="#98a2b3" />
                    <input
                      value={badgeSearchQuery}
                      onChange={(e) => setBadgeSearchQuery(e.target.value)}
                      placeholder="Search alumni..."
                      style={{
                        border: 'none',
                        outline: 'none',
                        width: '100%',
                        fontSize: 13,
                        color: '#1f2937',
                        background: 'transparent',
                      }}
                    />
                  </div>

                  <select
                    value={badgeFilter}
                    onChange={(e) => {
                      const value = e.target.value;
                      setBadgeFilter(value);
                      if (toBadgeKey(value) !== 'all') {
                        setClickedBadgePriority((prev) => [value, ...prev.filter((item) => toBadgeKey(item) !== toBadgeKey(value))]);
                      }
                    }}
                    style={{
                      height: 40,
                      minWidth: 150,
                      borderRadius: 10,
                      border: '1px solid #d1d5db',
                      padding: '0 12px',
                      background: '#fff',
                      color: '#111827',
                      fontWeight: 600,
                      fontSize: 13,
                      outline: 'none',
                    }}
                    aria-label="Filter by badge"
                  >
                    <option value="all">All Badges</option>
                    {receivedBadgeItems.map((badge) => (
                      <option key={badge.id} value={badge.name}>
                        {badge.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section style={{ marginTop: 10, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 14 }}>
              {badgeSummaryCards.length === 0 ? (
                <div style={{ border: '1px dashed #e5e7eb', borderRadius: 10, padding: 14, color: '#64748b', fontSize: 13 }}>
                  No badges yet.
                </div>
              ) : (
                <div className="hsi-ach-badge-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 10 }}>
                  {badgeSummaryCards.map((badge) => {
                    const BadgeIcon = badge.icon;
                    const isSelected = toBadgeKey(badgeFilter) === toBadgeKey(badge.name);
                    return (
                      <button
                        key={badge.id}
                        type="button"
                        onClick={() => handleBadgeCardClick(badge.name)}
                        style={{
                          border: isSelected ? '1px solid #d4af0d' : '1px solid #eef2f7',
                          borderRadius: 12,
                          padding: 12,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          background: isSelected ? '#fffdf5' : '#f9fafb',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: badge.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <BadgeIcon size={18} color={badge.text} weight="fill" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, color: '#0f172a', fontSize: 13 }}>{badge.name}</div>
                          <div style={{ color: '#667085', fontSize: 12 }}>
                            <span style={{ color: badge.text, fontWeight: 900 }}>{badge.holders}</span> holders
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            <section style={{ marginTop: 12, marginBottom: 22, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: 18, color: '#111827' }}>
                  Badge Holders ({filteredBadgeHolders.length})
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button type="button"
                    onClick={() => setBadgeViewMode('grid')}
                    aria-label="Grid view"
                    style={{
                      width: 38,
                      height: 34,
                      borderRadius: 9,
                      border: 'none',
                      background: badgeViewMode === 'grid' ? '#d4af0d' : '#f3f4f6',
                      color: badgeViewMode === 'grid' ? '#fff' : '#6b7280',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'background 220ms ease, color 220ms ease',
                    }}
                  >
                    <GridFour size={16} weight="fill" />
                  </button>
                  <button type="button"
                    onClick={() => setBadgeViewMode('list')}
                    aria-label="List view"
                    style={{
                      width: 38,
                      height: 34,
                      borderRadius: 9,
                      border: 'none',
                      background: badgeViewMode === 'list' ? '#d4af0d' : '#f3f4f6',
                      color: badgeViewMode === 'list' ? '#fff' : '#6b7280',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'background 220ms ease, color 220ms ease',
                    }}
                  >
                    <ListBullets size={16} weight="bold" />
                  </button>
                </div>
              </div>

              {filteredBadgeHolders.length === 0 ? (
                <div style={{ marginTop: 12, border: '1px dashed #e5e7eb', borderRadius: 10, padding: 14, color: '#64748b', fontSize: 13 }}>
                  No badge holders match your search/filter.
                </div>
              ) : (
                <AnimatePresence mode="wait" initial={false}>
                  {badgeViewMode === 'grid' ? (
                    <motion.div
                      key="badge-grid"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="hsi-ach-holders-grid"
                      style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}
                    >
                  {filteredBadgeHolders.map((holder) => (
                    <article
                      key={holder.id}
                      style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: 14,
                        padding: 14,
                        background: '#fff',
                        display: 'flex',
                        flexDirection: 'column',
                        minHeight: 260,
                        gap: 10,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 999, background: '#d4af0d', color: '#fff', fontWeight: 900, fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          {holder.profileImage ? (
                            <img src={holder.profileImage} alt={`${holder.name} avatar`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : holder.initials}
                        </div>
                        <div>
                          <div style={{ fontWeight: 900, color: '#111827', fontSize: 16 }}>{holder.name}</div>
                          <div style={{ color: '#667085', fontSize: 13 }}>{holder.subtitle}</div>
                        </div>
                      </div>

                      <div style={{ borderRadius: 10, background: '#f5f6f7', padding: '8px 10px' }}>
                        <div style={{ fontWeight: 700, color: '#334155', fontSize: 13 }}>{holder.roleTitle}</div>
                        <div style={{ color: '#98a2b3', fontSize: 12 }}>{holder.period}</div>
                      </div>

                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {holder.badges.map((name, idx) => {
                          const palette = badgePalette[idx % badgePalette.length];
                          return (
                            <span key={`${holder.id}-${name}-${idx}`} style={{ fontSize: 11, fontWeight: 500, color: palette.text, background: palette.color, borderRadius: 999, padding: '4px 9px' }}>
                              {name}
                            </span>
                          );
                        })}
                      </div>

                      <button type="button"
                        onClick={() => {
                          if (holder.profileId) {
                            navigate(`/directory/profile/${holder.profileId}`, {
                              state: {
                                from: 'achievements-badges',
                                returnToTab: 'badges',
                              },
                            });
                            return;
                          }
                          navigate('/directory');
                        }}
                        style={{
                          height: 34,
                          borderRadius: 9,
                          border: '1px solid #e5e7eb',
                          background: '#fafafa',
                          color: '#667085',
                          fontWeight: 700,
                          fontSize: 12,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                        }}
                      >
                        <Eye size={15} weight="bold" /> View Profile
                      </button>
                    </article>
                  ))}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="badge-list"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}
                    >
                  {filteredBadgeHolders.map((holder) => (
                    <article className="hsi-ach-holder-list-item" key={holder.id} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, display: 'grid', gridTemplateColumns: '46px 1fr auto', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 42, height: 42, borderRadius: 999, background: '#d4af0d', color: '#fff', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {holder.profileImage ? (
                          <img src={holder.profileImage} alt={`${holder.name} avatar`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : holder.initials}
                      </div>
                      <div className="hsi-ach-holder-main">
                        <div className="hsi-ach-holder-head">
                          <div className="hsi-ach-holder-name" style={{ fontWeight: 900, color: '#111827', fontSize: 14 }}>
                            {holder.name}
                          </div>
                          <button
                            className="hsi-ach-holder-eye-btn"
                            type="button"
                            onClick={() => {
                              if (holder.profileId) {
                                navigate(`/directory/profile/${holder.profileId}`, {
                                  state: {
                                    from: 'achievements-badges',
                                    returnToTab: 'badges',
                                  },
                                });
                                return;
                              }
                              navigate('/directory');
                            }}
                            aria-label={`View ${holder.name} profile`}
                            title="View Profile"
                          >
                            <Eye size={14} weight="bold" />
                          </button>
                        </div>
                        <div className="hsi-ach-holder-meta" style={{ color: '#667085', fontSize: 12 }}>
                          {holder.roleTitle} • {holder.period}
                        </div>
                        <div className="hsi-ach-holder-badges-strip">
                          <div className="hsi-ach-holder-badges-track">
                            {holder.badges.map((name, idx) => {
                              const palette = badgePalette[idx % badgePalette.length];
                              return (
                                <span className="hsi-ach-holder-badge-chip" key={`${holder.id}-list-${name}-${idx}`} style={{ fontSize: 11, fontWeight: 500, color: palette.text, background: palette.color, borderRadius: 999, padding: '3px 8px' }}>
                                  {name}
                                </span>
                              );
                            })}
                            {holder.badges.length > 1 ? holder.badges.map((name, idx) => {
                              const palette = badgePalette[idx % badgePalette.length];
                              return (
                                <span className="hsi-ach-holder-badge-chip" key={`${holder.id}-list-dup-${name}-${idx}`} style={{ fontSize: 11, fontWeight: 500, color: palette.text, background: palette.color, borderRadius: 999, padding: '3px 8px' }}>
                                  {name}
                                </span>
                              );
                            }) : null}
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </section>
          </>
        )}

        {activeTab === 'overview' && (
          <section style={{ marginTop: 6, marginBottom: 22, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #eef2f7', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Heart size={18} color="#e44d93" weight="fill" />
                <div className="hsi-ach-overview-posts-title" style={{ fontWeight: 900, color: '#111827', fontSize: 16 }}>Appreciation Posts</div>
              </div>
              <button
                className="hsi-ach-overview-posts-viewall"
                type="button"
                onClick={() => setActiveTab('posts')}
                style={{ border: 'none', background: 'transparent', color: '#d4a009', fontWeight: 900, cursor: 'pointer' }}
              >
                View All
              </button>
            </div>
            <div style={{ padding: 18 }}>
              {appreciationPosts.length === 0 ? (
                <div style={{ border: '1px dashed #e5e7eb', borderRadius: 12, padding: 16, color: '#64748b', fontSize: 13 }}>
                  No appreciation posts yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                {appreciationPosts.slice(0, 3).map((post, idx) => (
                    <div
                      key={post.id || post._id || idx}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedPost({ post, index: idx })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') setSelectedPost({ post, index: idx });
                      }}
                      style={{ display: 'grid', gridTemplateColumns: '44px 1fr', gap: 14, padding: '16px 0', borderTop: idx === 0 ? 'none' : '1px solid #f1f5f9', cursor: 'pointer' }}
                    >
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: '#fbe8f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Heart size={18} color="#e44d93" weight="fill" />
                      </div>
                      <div>
                        <div className="hsi-ach-overview-post-item-title" style={{ fontWeight: 900, color: '#111827' }}>{post.title}</div>
                        <div className="hsi-ach-overview-post-item-author" style={{ marginTop: 3, color: '#667085', fontSize: 12 }}>{post.author}</div>
                        {post.tag ? (
                          <div style={{ marginTop: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 800, color: '#16a34a', background: '#dcfce7', borderRadius: 999, padding: '3px 8px' }}>
                              {post.tag}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'posts' && (
          <section style={{ marginTop: 12, marginBottom: 22, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 0, overflow: 'hidden' }}>
            <div style={{ borderRadius: 12, background: '#fff', overflow: 'hidden' }}>
              <div style={{ padding: '14px 22px', background: '#f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div className="hsi-ach-posts-heading" style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#111827', fontSize: 22, fontWeight: 700, lineHeight: 1.1 }}>
                    <Heart size={28} color="#ec4899" weight="regular" />
                    Company Appreciation Posts
                  </div>
                  <div className="hsi-ach-posts-subtitle" style={{ marginTop: 4, color: '#667085', fontSize: 13 }}>Celebrating alumni achievements recognized by their current employers</div>
                </div>

                <div className="hsi-ach-posts-controls" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div className="hsi-ach-posts-search" style={{ height: 42, minWidth: 280, borderRadius: 10, border: '1px solid #9ca3af', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px' }}>
                    <MagnifyingGlass size={18} color="#98a2b3" />
                    <input
                      value={postSearchQuery}
                      onChange={(e) => setPostSearchQuery(e.target.value)}
                      placeholder="Search posts..."
                      style={{ border: 'none', outline: 'none', width: '100%', fontSize: 14, background: 'transparent', color: '#667085' }}
                    />
                  </div>

                  {isAdmin ? (
                    <button
                      className="hsi-btn hsi-btn-primary hsi-ach-posts-create-btn"
                      type="button"
                      onClick={() => setShowPostModal(true)}
                      style={{ fontSize: 14, height: 48, padding: '0 18px', display: 'inline-flex', alignItems: 'center', gap: 10 }}
                    >
                      <Plus size={18} weight="bold" />
                      Create Post
                    </button>
                  ) : null}
                </div>
              </div>

              <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', borderTop: '1px solid #f1f5f9' }}>
                <select
                  value={postTypeFilter}
                  onChange={(e) => setPostTypeFilter(e.target.value)}
                  style={{ height: 36, borderRadius: 11, border: '1px solid #e5e7eb', background: '#f8fafc', color: '#344054', fontWeight: 600, padding: '0 12px', fontSize: 14 }}
                >
                  {Object.entries(postTypeMeta).map(([value, meta]) => (
                    <option key={value} value={value}>{meta.label}</option>
                  ))}
                </select>
                <div style={{ color: '#475467', fontSize: 13 }}>{filteredAppreciationPostCards.length} posts</div>
              </div>

              <div style={{ padding: '0 18px 18px' }}>
                {filteredAppreciationPostCards.length === 0 ? (
                  <div style={{ border: '1px dashed #e5e7eb', borderRadius: 12, padding: 14, color: '#64748b', fontSize: 13 }}>
                    No appreciation posts match your search.
                  </div>
                ) : (
                  <div className="hsi-ach-posts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
                    {filteredAppreciationPostCards.map((post) => {
                      const cardId = String(post._id || post._idx);
                      const isHovered = hoveredPostCardId === cardId;
                      return (
                      <article
                        key={post._id || post._idx}
                        role="button"
                        tabIndex={0}
                        onMouseEnter={() => setHoveredPostCardId(cardId)}
                        onMouseLeave={() => setHoveredPostCardId('')}
                        onFocus={() => setHoveredPostCardId(cardId)}
                        onBlur={() => setHoveredPostCardId('')}
                        onClick={() => setSelectedPost({ post, index: post._idx })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') setSelectedPost({ post, index: post._idx });
                        }}
                        style={{
                          border: '1px solid #e7d38a',
                          borderRadius: 16,
                          overflow: 'hidden',
                          background: '#fff',
                          cursor: 'pointer',
                          transform: isHovered ? 'scale(1.015)' : 'scale(1)',
                          transition: 'transform 180ms ease, box-shadow 180ms ease',
                          boxShadow: isHovered ? '0 10px 26px rgba(15, 23, 42, 0.12)' : 'none',
                        }}
                      >
                        <div style={{ height: 160, background: post.banner, position: 'relative' }}>
                          <span style={{ position: 'absolute', top: 12, left: 14, borderRadius: 999, background: 'rgba(255,255,255,0.92)', color: '#111827', fontSize: 11, padding: '5px 10px', fontWeight: 700 }}>
                            {post.typeLabel}
                          </span>
                        </div>

                        <div style={{ padding: 16 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                            <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: isHovered ? '#d4a009' : '#111827', lineHeight: 1.2, transition: 'color 180ms ease' }}>{post.title}</h3>
                            <span style={{ fontSize: 11, background: '#f8f0d7', color: '#b07a15', borderRadius: 999, padding: '4px 10px' }}>Featured</span>
                          </div>

                          <div style={{ marginTop: 12, borderRadius: 12, background: '#f8fafc', border: '1px solid #eef2f7', padding: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, overflow: 'hidden' }}>
                              {post.profileImage ? (
                                <img src={post.profileImage} alt={`${post.author || 'Author'} avatar`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : post.initials}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>{post.author || 'Author'}</div>
                              <div style={{ color: '#98a2b3', fontSize: 12 }}>{post.dateLabel || 'Recent'}</div>
                            </div>
                          </div>

                          <p style={{ margin: '12px 0 0', color: '#475467', fontSize: 14, lineHeight: 1.5 }}>
                            {String(post.excerptBody || '').length > 180 ? `${String(post.excerptBody).slice(0, 180)}...` : (post.excerptBody || 'No description provided.')}
                          </p>

                          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                            <button type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPost({ post, index: post._idx });
                              }}
                              style={{ border: 'none', background: 'transparent', color: '#d4a009', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                            >
                              Read more {'->'}
                            </button>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <button type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTogglePostLike(post, post._idx);
                                }}
                                disabled={likeBusyPostId === String(post?._id || post._idx)}
                                style={{ border: 'none', background: 'transparent', color: '#e44d93', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, padding: 0 }}
                              >
                                <Heart size={16} weight={Array.isArray(post.likedBy) && String(user?.id || user?._id || '')
                                  ? post.likedBy.map((id) => String(id)).includes(String(user?.id || user?._id || '')) ? 'fill' : 'regular'
                                  : 'regular'} />
                                {post.likes || 0}
                              </button>
                              {isAdmin ? (
                                <button type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteAppreciationPost(post, post._idx);
                                  }}
                                  style={{ border: 'none', background: 'transparent', color: '#b91c1c', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}
                                >
                                  Delete
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </article>
                    );})}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'featured' && (
          <section style={{ marginTop: 12, marginBottom: 22, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 16 }}>
            <div style={{ border: '1px solid #eef2f7', borderRadius: 12, background: '#fff', overflow: 'hidden' }}>
              <div style={{ padding: '16px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#111827', fontSize: 18, fontWeight: 700, lineHeight: 1.1 }}>
                    <CrownSimple size={20} color="#d4af0d" weight="fill" />
                    Featured Alumni of the Month
                  </div>
                  <div style={{ marginTop: 4, color: '#667085', fontSize: 13 }}>Celebrating outstanding alumni who inspire our community</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ color: '#667085', fontSize: 13 }}>{featuredSlides.length ? `${featuredIndex + 1} of ${featuredSlides.length}` : '0 of 0'}</div>
                  <button type="button"
                    onClick={() => setFeaturedIndex((idx) => (featuredSlides.length ? (idx - 1 + featuredSlides.length) % featuredSlides.length : 0))}
                    disabled={featuredSlides.length <= 1}
                    style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', color: '#64748b', cursor: featuredSlides.length <= 1 ? 'not-allowed' : 'pointer' }}
                  >
                    <CaretLeft size={16} />
                  </button>
                  <button type="button"
                    onClick={() => setFeaturedIndex((idx) => (featuredSlides.length ? (idx + 1) % featuredSlides.length : 0))}
                    disabled={featuredSlides.length <= 1}
                    style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', color: '#64748b', cursor: featuredSlides.length <= 1 ? 'not-allowed' : 'pointer' }}
                  >
                    <CaretRight size={16} />
                  </button>
                </div>
              </div>

              {!activeFeatured ? (
                <div style={{ padding: 18, color: '#64748b', fontSize: 14 }}>No featured alumni yet.</div>
              ) : (
                <div style={{ border: '1px solid #d4af0d', borderRadius: 12, margin: 14, overflow: 'hidden' }}>
                  <div style={{ background: 'linear-gradient(135deg, #d4af0d 0%, #b59108 100%)', height: 168, padding: 16, display: 'flex', justifyContent: 'space-between' }}>
                    <Star size={42} color="rgba(255,255,255,0.4)" />
                    <div style={{ alignSelf: 'start', color: '#fff', background: 'rgba(255,255,255,0.2)', padding: '7px 13px', borderRadius: 999, fontSize: 13, fontWeight: 700 }}>
                      {activeFeatured?.monthLabel || 'Featured Month'}
                    </div>
                  </div>

                  <div style={{ padding: 18 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                        <div style={{ width: 84, height: 84, borderRadius: 999, background: '#d4af0d', color: '#fff', border: '4px solid #fff', boxShadow: '0 6px 18px rgba(15,23,42,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, overflow: 'hidden', marginTop: -48 }}>
                          {activeFeaturedProfile?.profileImage ? (
                            <img src={activeFeaturedProfile.profileImage} alt={`${activeFeaturedProfile?.name || activeFeatured?.name || 'Featured'} avatar`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : getInitials(activeFeatured?.fullName || activeFeatured?.name || 'FA')}
                        </div>

                        <div>
                          <div style={{ fontSize: 19, color: '#111827', fontWeight: 800, lineHeight: 1.2 }}>{activeFeatured?.fullName || activeFeatured?.name || activeFeaturedProfile?.name || 'Featured Alumni'}</div>
                          <div style={{ color: '#b07a15', fontSize: 14, fontWeight: 700, marginTop: 2 }}>{activeFeatured?.roleTitle || activeFeaturedProfile?.jobTitle || 'Alumni Member'}</div>
                          <div style={{ color: '#667085', fontSize: 12 }}>{activeFeatured?.company || activeFeaturedProfile?.company || ''}</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {activeFeaturedAwardCount > 0 ? (
                          <span style={{ fontSize: 11, background: '#fff7db', color: '#9a7300', border: '1px solid #f0d87c', borderRadius: 999, padding: '4px 10px' }}>
                            {activeFeaturedAwardCount} total award{activeFeaturedAwardCount === 1 ? '' : 's'}
                          </span>
                        ) : null}
                        {topAwardedEntry && topAwardedEntry.key === activeFeaturedMemberKey ? (
                          <span style={{ fontSize: 11, background: '#f0e8ff', color: '#7b45d3', border: '1px solid #dac7ff', borderRadius: 999, padding: '4px 10px' }}>
                            Most Awarded
                          </span>
                        ) : null}
                        <button type="button"
                          onClick={() => {
                            if (activeFeaturedProfile?.id) {
                              navigate(`/directory/profile/${activeFeaturedProfile.id}`, {
                                state: {
                                  from: 'achievements-featured',
                                  returnToTab: 'featured',
                                },
                              });
                            }
                          }}
                          disabled={!activeFeaturedProfile?.id}
                          style={{
                            border: '1px solid #e5e7eb',
                            borderRadius: 10,
                            background: '#fff',
                            color: '#64748b',
                            fontSize: 12,
                            fontWeight: 700,
                            padding: '8px 12px',
                            cursor: activeFeaturedProfile?.id ? 'pointer' : 'not-allowed',
                          }}
                        >
                          View Profile
                        </button>
                      </div>
                    </div>

                    <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {(Array.isArray(activeFeatured?.badges) ? activeFeatured.badges : []).map((badge, idx) => {
                        const palette = badgePalette[idx % badgePalette.length];
                        return (
                          <span key={`${badge}-${idx}`} style={{ fontSize: 11, color: palette.text, background: palette.color, borderRadius: 999, padding: '6px 12px' }}>
                            {badge}
                          </span>
                        );
                      })}
                    </div>

                    {activeFeatured?.quote ? (
                      <blockquote style={{ margin: '14px 0 0', background: '#f7f2db', borderLeft: '3px solid #d4af0d', borderRadius: 10, color: '#475467', fontStyle: 'italic', padding: '14px 16px', fontSize: 14 }}>
                        "{activeFeatured.quote}"
                      </blockquote>
                    ) : null}

                    <div style={{ marginTop: 14 }}>
                      <div style={{ fontWeight: 700, color: '#111827', fontSize: 13 }}>Key Achievements</div>
                      <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                        {featuredKeyAchievements.map((item) => (
                          <div key={item} style={{ border: '1px solid #edf0f5', borderRadius: 10, background: '#f8fafc', padding: '10px 12px', fontSize: 12, color: '#334155' }}>
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
                      <div style={{ border: '1px solid #edf0f5', borderRadius: 10, background: '#f8fafc', textAlign: 'center', padding: '14px 10px' }}>
                        <div style={{ color: '#d4af0d', fontSize: 24, fontWeight: 800 }}>{formatInt(activeFeaturedAwardCount || 0)}</div>
                        <div style={{ color: '#667085', fontSize: 12 }}>Total Awards</div>
                      </div>
                      <div style={{ border: '1px solid #edf0f5', borderRadius: 10, background: '#f8fafc', textAlign: 'center', padding: '14px 10px' }}>
                        <div style={{ color: '#d4af0d', fontSize: 24, fontWeight: 800 }}>{formatInt((activeFeatured?.badges || []).length)}</div>
                        <div style={{ color: '#667085', fontSize: 12 }}>Badges This Feature</div>
                      </div>
                      <div style={{ border: '1px solid #edf0f5', borderRadius: 10, background: '#f8fafc', textAlign: 'center', padding: '14px 10px' }}>
                        <div style={{ color: '#d4af0d', fontSize: 24, fontWeight: 800 }}>{formatInt(featuredSlides.length)}</div>
                        <div style={{ color: '#667085', fontSize: 12 }}>Featured Entries</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ padding: '0 14px 14px' }}>
                <div style={{ fontWeight: 700, color: '#111827', fontSize: 17, marginBottom: 10 }}>Previous Featured Alumni</div>
                {featuredSlidesWithIndex.length === 0 ? (
                  <div style={{ border: '1px dashed #e5e7eb', borderRadius: 10, padding: 12, color: '#64748b', fontSize: 13 }}>
                    No previous featured alumni yet.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
                    {featuredSlidesWithIndex.map((item) => {
                      const isActive = item.__idx === featuredIndex;
                      const memberKey = String(item?.memberId || toBadgeKey(item?.fullName || item?.name || '')).trim();
                      const profile = directoryMembers.find((member) => {
                        const memberId = String(member?.id || '').trim();
                        if (item?.memberId && memberId && String(item.memberId) === memberId) return true;
                        return toBadgeKey(member?.name) === toBadgeKey(item?.fullName || item?.name || '');
                      });

                      return (
                        <button
                          key={`${item._id || item.__idx}`}
                          type="button"
                          onClick={() => setFeaturedIndex(item.__idx)}
                          style={{
                            border: isActive ? '1px solid #d4af0d' : '1px solid #e5e7eb',
                            borderRadius: 12,
                            background: isActive ? '#fffdf5' : '#fff',
                            textAlign: 'left',
                            padding: '10px 12px',
                            cursor: 'pointer',
                            display: 'flex',
                            gap: 10,
                            alignItems: 'center',
                            minHeight: 68,
                          }}
                        >
                          <div style={{ width: 40, height: 40, borderRadius: 999, background: '#d4af0d', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, overflow: 'hidden' }}>
                            {profile?.profileImage ? (
                              <img src={profile.profileImage} alt={`${profile?.name || item?.name || 'Featured'} avatar`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : getInitials(profile?.name || item?.fullName || item?.name || 'FA')}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, color: '#111827', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item?.fullName || item?.name || profile?.name}
                            </div>
                            <div style={{ color: '#667085', fontSize: 12 }}>{item?.monthLabel || item?.date || ''}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
          </motion.div>
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {showAllAchievements ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1100,
              padding: 16,
            }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setShowAllAchievements(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="hsi-hide-scrollbar"
              style={{
                width: 'min(920px, calc(100vw - 32px))',
                background: '#fff',
                borderRadius: 16,
                border: '1px solid #e5e7eb',
                padding: 18,
                maxHeight: '80vh',
                overflow: 'auto',
              }}
              role="dialog"
              aria-modal="true"
              aria-label="All achievements"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#111827' }}>All Achievements</div>
                <button type="button"
                  onClick={() => setShowAllAchievements(false)}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
                  aria-label="Close achievements"
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                <select
                  value={achievementTypeFilter}
                  onChange={(e) => setAchievementTypeFilter(e.target.value)}
                  style={{
                    height: 36,
                    borderRadius: 10,
                    border: '1px solid #e5e7eb',
                    padding: '0 12px',
                    background: '#fff',
                    color: '#111827',
                    fontWeight: 700,
                    fontSize: 13,
                    outline: 'none',
                  }}
                >
                  <option value="all">All Types</option>
                  <option value="badge">Badge Earned</option>
                  <option value="featured">Featured</option>
                  <option value="hall_of_fame">Hall of Fame</option>
                  <option value="milestone">Milestone</option>
                </select>
              </div>

              <div style={{ marginTop: 8 }}>
                {filteredRecentAchievements.length === 0 ? (
                  <div style={{ border: '1px dashed #e5e7eb', borderRadius: 12, padding: 16, color: '#64748b', fontSize: 13 }}>
                    No achievements yet.
                  </div>
                ) : (
                  filteredRecentAchievements.map((item, idx) => (
                    <div key={`${item?.id || item?._id || idx}`} style={{ padding: '14px 0', borderTop: idx === 0 ? 'none' : '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                        <div style={{ fontWeight: 900, color: '#111827' }}>{item?.name || 'Alumni'}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, whiteSpace: 'nowrap' }}>
                          <div style={{ color: '#98a2b3', fontSize: 12 }}>{item?.date || ''}</div>
                          {isAdmin && item?.deleteId ? (
                            <button type="button"
                              onClick={() => handleDeleteAwardEvent(item.deleteId)}
                              style={{ border: 'none', background: 'transparent', color: '#b91c1c', fontSize: 12, fontWeight: 800, cursor: 'pointer', padding: 0 }}
                            >
                              Delete
                            </button>
                          ) : null}
                        </div>
                      </div>
                      {item?.subtitle ? <div style={{ color: '#667085', fontSize: 12, marginTop: 4 }}>{item.subtitle}</div> : null}
                      {item?.description ? <div style={{ color: '#334155', fontSize: 13, marginTop: 6 }}>{item.description}</div> : null}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        ) : null}

        {selectedAchievement ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1200,
              padding: 16,
            }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setSelectedAchievement(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="hsi-hide-scrollbar"
              style={{
                width: 'min(760px, calc(100vw - 32px))',
                background: '#fff',
                borderRadius: 16,
                border: '1px solid #e5e7eb',
                padding: 18,
                maxHeight: '80vh',
                overflow: 'auto',
              }}
              role="dialog"
              aria-modal="true"
              aria-label="Achievement details"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#111827' }}>
                  {selectedAchievement?.title || 'Achievement'}
                </div>
                <button type="button"
                  onClick={() => setSelectedAchievement(null)}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
                  aria-label="Close achievement"
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 900, fontSize: 16, color: '#111827' }}>{selectedAchievement?.name || 'Alumni'}</div>
                {selectedAchievement?.subtitle ? (
                  <div style={{ marginTop: 4, color: '#667085', fontSize: 13 }}>{selectedAchievement.subtitle}</div>
                ) : null}
                {(selectedAchievement?.roleTitle || selectedAchievement?.company) ? (
                  <div style={{ marginTop: 6, color: '#475467', fontSize: 13 }}>
                    {[selectedAchievement?.roleTitle, selectedAchievement?.company].filter(Boolean).join(' â€¢ ')}
                  </div>
                ) : null}

                <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(Array.isArray(selectedAchievement?.badges) ? selectedAchievement.badges : [])
                    .map((b) => String(b).trim())
                    .filter(Boolean)
                    .map((b) => (
                      <span key={b} style={{ fontSize: 11, fontWeight: 500, color: '#7b45d3', background: '#f0e8ff', borderRadius: 999, padding: '4px 10px' }}>
                        {b}
                      </span>
                    ))}
                </div>

                {selectedAchievement?.description ? (
                  <div style={{ marginTop: 12, color: '#334155', fontSize: 14, lineHeight: 1.5 }}>
                    {selectedAchievement.description}
                  </div>
                ) : null}
                {selectedAchievement?.quote ? (
                  <blockquote style={{ marginTop: 12, borderLeft: '4px solid #d4af0d', background: '#f8fafc', borderRadius: 12, padding: '10px 12px', color: '#334155', fontStyle: 'italic', fontSize: 13 }}>
                    "{selectedAchievement.quote}"
                  </blockquote>
                ) : null}
              </div>

              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <div style={{ color: '#98a2b3', fontSize: 12 }}>{selectedAchievement?.date || ''}</div>
                {isAdmin ? (
                  <button type="button"
                    onClick={async () => {
                      await handleDeleteRecentAchievement(selectedAchievement);
                      setSelectedAchievement(null);
                    }}
                    style={{ border: 'none', borderRadius: 10, background: '#fee2e2', color: '#b91c1c', fontWeight: 900, cursor: 'pointer', padding: '8px 12px' }}
                  >
                    Delete
                  </button>
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        ) : null}

        {selectedPost ? (
          <motion.div
            className="hsi-ach-post-view-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1200,
              padding: 16,
            }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setSelectedPost(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="hsi-ach-post-view-modal hsi-hide-scrollbar"
              style={{
                width: 'min(600px, calc(100vw - 32px))',
                background: '#fff',
                borderRadius: 16,
                border: '1px solid #e5e7eb',
                maxHeight: '80vh',
                overflow: 'auto',
              }}
              role="dialog"
              aria-modal="true"
              aria-label="Post details"
            >
              {selectedPostDisplay?.hasImage ? (
                <div style={{ position: 'relative', height: 198, background: selectedPostDisplay.banner }}>
                  <img
                    src={selectedPostDisplay.imageUrl}
                    alt={selectedPostDisplay.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <button type="button"
                    className="hsi-ach-post-view-xbtn"
                    onClick={() => setSelectedPost(null)}
                    style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: 999, border: 'none', background: 'rgba(17,24,39,0.45)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    aria-label="Close post"
                  >
                    <X size={17} />
                  </button>
                  <span style={{ position: 'absolute', left: 14, bottom: 12, borderRadius: 999, background: '#16a34a', color: '#fff', fontSize: 11, fontWeight: 700, padding: '6px 12px' }}>
                    {selectedPostDisplay.typeLabel}
                  </span>
                </div>
              ) : (
                <div style={{ background: '#ede5fb', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: '#fff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CrownSimple size={22} weight="fill" />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#7c3aed', background: '#f5f3ff', borderRadius: 999, padding: '3px 8px', display: 'inline-flex' }}>{selectedPostDisplay?.typeLabel || 'Featured'}</div>
                      <div style={{ color: '#667085', fontSize: 13, marginTop: 4 }}>{selectedPostDisplay?.company || selectedPostDisplay?.author}</div>
                    </div>
                  </div>
                  <button type="button"
                    onClick={() => setSelectedPost(null)}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#475467' }}
                    aria-label="Close post"
                  >
                    <X size={20} />
                  </button>
                </div>
              )}

              <div className="hsi-ach-post-view-content" style={{ padding: 18 }}>
                <div className="hsi-ach-post-view-title" style={{ fontSize: 36, fontWeight: 800, color: '#111827', lineHeight: 1.2 }}>{selectedPostDisplay?.title || 'Post'}</div>
                <div style={{ marginTop: 6, color: '#667085', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Clock size={14} /> {selectedPostDisplay?.dateLabel || 'Recent post'}
                </div>

                <div style={{ marginTop: 12, borderRadius: 12, background: '#f8fafc', border: '1px solid #eef2f7', padding: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ width: 56, height: 56, borderRadius: 12, background: '#7c3aed', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 27, overflow: 'hidden' }}>
                    {selectedPostDisplay?.profileImage ? (
                      <img src={selectedPostDisplay.profileImage} alt={`${selectedPostDisplay?.author || 'Author'} avatar`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : selectedPostDisplay?.initials}
                  </div>
                  <div>
                    <div className="hsi-ach-post-view-author" style={{ fontSize: 31, color: '#111827', fontWeight: 800 }}>{selectedPostDisplay?.author || 'Author'}</div>
                    <div style={{ marginTop: 2, color: '#b07a15', fontSize: 13, fontWeight: 700 }}>{selectedPostDisplay?.roleLabel || 'Recognized Alumni'}</div>
                    <div style={{ marginTop: 2, color: '#98a2b3', fontSize: 12 }}>{selectedPostDisplay?.company || ''}</div>
                  </div>
                </div>

                {selectedPostDisplay?.excerpt ? (
                  <div style={{ marginTop: 14, color: '#344054', fontSize: 14, lineHeight: 1.6 }}>
                    {selectedPostDisplay.excerpt}
                  </div>
                ) : null}
              </div>

              <div className="hsi-ach-post-view-actions" style={{ padding: '0 18px 14px', display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button type="button"
                    onClick={() => handleTogglePostLike(selectedPostDisplay?.post, selectedPost?.index)}
                    style={{ border: 'none', background: 'transparent', color: '#e44d93', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, padding: 0 }}
                  >
                    <Heart size={17} weight={Array.isArray(selectedPostDisplay?.post?.likedBy) && String(user?.id || user?._id || '')
                      ? selectedPostDisplay.post.likedBy.map((id) => String(id)).includes(String(user?.id || user?._id || '')) ? 'fill' : 'regular'
                      : 'regular'} />
                    {selectedPostDisplay?.post?.likes || 0}
                  </button>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                <button type="button"
                  onClick={() => setSelectedPost(null)}
                  style={{ borderRadius: 10, border: 'none', background: '#d4af0d', color: '#fff', fontWeight: 800, padding: '10px 22px', cursor: 'pointer', minWidth: 120 }}
                >
                  Close
                </button>
                {isAdmin ? (
                  <button type="button"
                    onClick={async () => {
                      await handleDeleteAppreciationPost(selectedPostDisplay.post, selectedPost.index);
                      setSelectedPost(null);
                    }}
                    style={{ border: 'none', borderRadius: 10, background: '#fee2e2', color: '#b91c1c', fontWeight: 900, cursor: 'pointer', padding: '8px 12px' }}
                  >
                    Delete
                  </button>
                ) : null}
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}

        {showPostModal && isAdmin ? (
          <motion.div
            className="hsi-ach-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15,23,42,0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
              zIndex: 1000,
            }}
            onClick={() => { if (!postSubmitting) setShowPostModal(false); }}
          >
            <motion.form
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ duration: 0.22 }}
              onSubmit={handlePostSubmit}
              onClick={(e) => e.stopPropagation()}
              className="hsi-ach-post-modal hsi-hide-scrollbar"
              style={{ width: '100%', maxWidth: 600, background: '#f3f4f6', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden', maxHeight: '82vh', overflowY: 'auto' }}
            >
              <div style={{ background: '#d4af0d', color: '#fff', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 10 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, color: '#fff', fontWeight: 800 }}>Create Appreciation Post</h3>
                  <div style={{ marginTop: 4, fontSize: 13, opacity: 0.95 }}>Celebrate an alumni's achievement</div>
                </div>
                <button type="button"
                  onClick={() => setShowPostModal(false)}
                  disabled={postSubmitting}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#fff', marginTop: 2 }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ padding: 18, background: '#f3f4f6' }}>
                <label style={{ display: 'block', fontSize: 16, fontWeight: 700, color: '#344054', marginBottom: 6 }}>Recognition Type <span style={{ color: '#ef4444' }}>*</span></label>
                <select
                  required
                  value={postForm.recognitionType}
                  onChange={(e) => setPostForm((p) => ({ ...p, recognitionType: e.target.value }))}
                  style={{ width: '100%', height: 38, borderRadius: 10, border: '1px solid #d1d5db', padding: '0 12px', fontSize: 14, color: '#344054', background: '#fff' }}
                >
                  <option value="">Select recognition type</option>
                  <option value="promotion">Promotion</option>
                  <option value="leadership">Leadership Award</option>
                  <option value="technical">Technical Excellence</option>
                  <option value="innovation">Innovation Award</option>
                  <option value="featured">Featured</option>
                </select>

                <div className="hsi-ach-form-grid-2" style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#344054', marginBottom: 6 }}>Company Name <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                      required
                      value={postForm.companyName}
                      onChange={(e) => setPostForm((p) => ({ ...p, companyName: e.target.value }))}
                      placeholder="e.g. Google Philippines"
                      style={{ width: '100%', height: 38, borderRadius: 10, border: '1px solid #d1d5db', padding: '0 12px', fontSize: 14 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#344054', marginBottom: 6 }}>Alumni Honoree <span style={{ color: '#ef4444' }}>*</span></label>
                    <select
                      required
                      value={postForm.honoreeId}
                      onChange={(e) => {
                        const nextId = e.target.value;
                        const selected = postHonoreeOptions.find((member) => String(member?.id || '') === String(nextId));
                        setPostForm((p) => ({
                          ...p,
                          honoreeId: nextId,
                          honoreeName: selected?.name || '',
                          companyName: selected?.company || p.companyName,
                          currentRole: selected?.jobTitle || p.currentRole,
                        }));
                      }}
                      style={{ width: '100%', height: 38, borderRadius: 10, border: '1px solid #d1d5db', padding: '0 12px', fontSize: 14 }}
                    >
                      <option value="">Select user</option>
                      {postHonoreeOptions.map((member) => (
                        <option key={`honoree-${member.id}`} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="hsi-ach-form-grid-mixed" style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#344054', marginBottom: 6 }}>Alumni Type <span style={{ color: '#ef4444' }}>*</span></label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[{ value: 'employee', label: 'Employee' }, { value: 'intern', label: 'Intern' }].map((item) => {
                        const active = postForm.alumniType === item.value;
                        return (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => setPostForm((p) => ({ ...p, alumniType: item.value }))}
                            style={{ flex: 1, height: 38, borderRadius: 10, border: `1px solid ${active ? '#8b44d2' : '#d1d5db'}`, background: active ? '#f5f3ff' : '#fff', color: active ? '#7c3aed' : '#344054', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#344054', marginBottom: 6 }}>Current Role <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                      required
                      value={postForm.currentRole}
                      onChange={(e) => setPostForm((p) => ({ ...p, currentRole: e.target.value }))}
                      placeholder="e.g., Senior Software Engineer"
                      style={{ width: '100%', height: 38, borderRadius: 10, border: '1px solid #d1d5db', padding: '0 12px', fontSize: 14 }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: 12, background: '#eef2f7', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#344054', marginBottom: 10 }}>HSI Information</div>
                  <div className="hsi-ach-form-grid-3" style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#344054', marginBottom: 6 }}>HSI Role <span style={{ color: '#ef4444' }}>*</span></label>
                      <input
                        required
                        value={postForm.hsiRole}
                        onChange={(e) => setPostForm((p) => ({ ...p, hsiRole: e.target.value }))}
                        placeholder="e.g., Web Developer"
                        style={{ width: '100%', height: 34, borderRadius: 10, border: '1px solid #d1d5db', padding: '0 10px', fontSize: 14 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#344054', marginBottom: 6 }}>Start Year <span style={{ color: '#ef4444' }}>*</span></label>
                      <select required value={postForm.startYear} onChange={(e) => setPostForm((p) => ({ ...p, startYear: e.target.value }))} style={{ width: '100%', height: 34, borderRadius: 10, border: '1px solid #d1d5db', padding: '0 10px', fontSize: 14 }}>
                        <option value="">Year</option>
                        {appreciationYearOptions.map((year) => <option key={`start-${year}`} value={year}>{year}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#344054', marginBottom: 6 }}>End Year <span style={{ color: '#ef4444' }}>*</span></label>
                      <select required value={postForm.endYear} onChange={(e) => setPostForm((p) => ({ ...p, endYear: e.target.value }))} style={{ width: '100%', height: 34, borderRadius: 10, border: '1px solid #d1d5db', padding: '0 10px', fontSize: 14 }}>
                        <option value="">Year</option>
                        {appreciationYearOptions.map((year) => <option key={`end-${year}`} value={year}>{year}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#344054', marginBottom: 6 }}>Post Title <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    required
                    value={postForm.title}
                    onChange={(e) => setPostForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="e.g., Promoted to Senior Software Engineer"
                    style={{ width: '100%', height: 38, borderRadius: 10, border: '1px solid #d1d5db', padding: '0 12px', fontSize: 14 }}
                  />
                  <div style={{ marginTop: 5, color: '#98a2b3', fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Minimum 10 characters</span>
                    <span>{Math.min(String(postForm.title || '').trim().length, 10)}/10+</span>
                  </div>
                </div>

                <div style={{ marginTop: 10 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#344054', marginBottom: 6 }}>Description <span style={{ color: '#ef4444' }}>*</span></label>
                  <textarea
                    required
                    value={postForm.description}
                    onChange={(e) => setPostForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Share the details of this achievement..."
                    style={{ width: '100%', minHeight: 92, borderRadius: 10, border: '1px solid #d1d5db', padding: 12, fontSize: 14, resize: 'vertical' }}
                  />
                  <div style={{ marginTop: 5, color: '#98a2b3', fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Minimum 50 characters</span>
                    <span>{Math.min(String(postForm.description || '').trim().length, 50)}/50+</span>
                  </div>
                </div>

                <div style={{ marginTop: 10 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#667085', marginBottom: 6 }}>Image (Optional)</label>
                  <input
                    value={postForm.imageUrl}
                    onChange={(e) => setPostForm((p) => ({ ...p, imageUrl: e.target.value }))}
                    placeholder="https://example.com/image.jpg"
                    style={{ width: '100%', height: 38, borderRadius: 10, border: '1px solid #d1d5db', padding: '0 12px', fontSize: 14 }}
                  />
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <label style={{ borderRadius: 9, border: '1px solid #d1d5db', background: '#fff', color: '#475467', fontWeight: 600, padding: '7px 12px', cursor: 'pointer', fontSize: 12 }}>
                      Choose from device
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePostImageFileChange}
                        style={{ display: 'none' }}
                      />
                    </label>
                    <span style={{ color: '#98a2b3', fontSize: 12 }}>
                      {postImageFileName || 'No file selected'}
                    </span>
                  </div>
                  <div style={{ marginTop: 5, color: '#98a2b3', fontSize: 12 }}>
                    Paste a URL or choose an image from your device (max 4MB).
                  </div>
                </div>

                <div style={{ marginTop: 12, borderRadius: 10, background: '#f7f2db', color: '#475467', fontSize: 13, padding: '10px 12px' }}>
                  New posts are automatically marked as Featured
                </div>
              </div>

              {postError ? (
                <div style={{ margin: '0 18px 10px', color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '8px 10px', fontSize: 13 }}>
                  {postError}
                </div>
              ) : null}

              <div className="hsi-ach-modal-footer" style={{ borderTop: '1px solid #e5e7eb', background: '#f3f4f6', padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <div style={{ color: '#98a2b3', fontSize: 12 }}>* Required fields</div>
                <div style={{ display: 'flex', gap: 10 }}>
                <button type="button"
                  onClick={() => setShowPostModal(false)}
                  disabled={postSubmitting}
                  style={{ borderRadius: 10, border: '1px solid #d1d5db', background: '#fff', color: '#475467', fontWeight: 700, padding: '10px 14px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={postSubmitting}
                  style={{ borderRadius: 10, border: 'none', background: '#d4af0d', color: '#fff', fontWeight: 700, padding: '10px 18px', cursor: 'pointer' }}
                >
                  {postSubmitting ? 'Publishing...' : '+ Publish Post'}
                </button>
                </div>
              </div>
            </motion.form>
          </motion.div>
        ) : null}

        {showAwardModal && isAdmin ? (
          <motion.div
            className="hsi-ach-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15,23,42,0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
              zIndex: 1000,
            }}
            onClick={() => { if (!awardSubmitting) setShowAwardModal(false); }}
          >
            <motion.form
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ duration: 0.22 }}
              onSubmit={handleAwardSubmit}
              onClick={(e) => e.stopPropagation()}
              className="hsi-ach-award-modal hsi-hide-scrollbar"
              style={{ width: '100%', maxWidth: 640, background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: 18, maxHeight: '80vh', overflowY: 'auto' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 20, color: '#0f172a' }}>Add Award</h3>
                <button type="button"
                  onClick={() => setShowAwardModal(false)}
                  disabled={awardSubmitting}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="hsi-ach-award-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                <div className="hsi-ach-award-category" style={{ gridColumn: '1 / -1', display: 'flex', gap: 8 }}>
                  {[
                    { value: 'alumni', label: 'Alumni' },
                    { value: 'employee', label: 'Employee' },
                  ].map((item) => {
                    const active = awardForm.awardeeCategory === item.value;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setAwardForm((p) => ({
                          ...p,
                          awardeeCategory: item.value,
                          memberId: '',
                          fullName: '',
                          roleTitle: '',
                          company: '',
                        }))}
                        style={{
                          flex: 1,
                          height: 42,
                          borderRadius: 10,
                          border: active ? '2px solid #d4af0d' : '1px solid #d1d5db',
                          background: active ? '#fff7db' : '#fff',
                          color: '#0f172a',
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
                <select
                  required
                  value={awardForm.memberId}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    const selected = directoryMembers.find((m) => String(m.id) === String(nextId));
                    setAwardForm((p) => ({
                      ...p,
                      memberId: nextId,
                      fullName: selected?.name || '',
                      roleTitle: p.roleTitle || selected?.jobTitle || '',
                      company: p.company || selected?.company || '',
                    }));
                  }}
                  style={{ height: 42, borderRadius: 10, border: '1px solid #d1d5db', padding: '0 12px', fontSize: 14, background: '#fff' }}
                >
                  <option value="" disabled>Select portal user</option>
                  {awardCandidates.map((member) => (
                    <option key={member.id} value={member.id}>
                      {formatMemberOptionLabel(member)}
                    </option>
                  ))}
                </select>
                <input required placeholder="Role title" value={awardForm.roleTitle} onChange={(e) => setAwardForm((p) => ({ ...p, roleTitle: e.target.value }))} style={{ height: 42, borderRadius: 10, border: '1px solid #d1d5db', padding: '0 12px', fontSize: 14 }} />
                <input required placeholder="Company" value={awardForm.company} onChange={(e) => setAwardForm((p) => ({ ...p, company: e.target.value }))} style={{ height: 42, borderRadius: 10, border: '1px solid #d1d5db', padding: '0 12px', fontSize: 14 }} />
                <input required placeholder="Month label (e.g. February 2026)" value={awardForm.monthLabel} onChange={(e) => setAwardForm((p) => ({ ...p, monthLabel: e.target.value }))} style={{ height: 42, borderRadius: 10, border: '1px solid #d1d5db', padding: '0 12px', fontSize: 14 }} />
              </div>

              <div style={{ marginTop: 10, position: 'relative' }}>
                <button type="button"
                  ref={badgeButtonRef}
                  onClick={() => {
                    setShowBadgeDropdown((v) => {
                      const next = !v;
                      if (next) {
                        const el = badgeButtonRef.current;
                        if (el) {
                          const rect = el.getBoundingClientRect();
                          setBadgeDropdownRect({
                            left: rect.left,
                            right: rect.right,
                            top: rect.top,
                            bottom: rect.bottom,
                            width: rect.width,
                          });
                        }
                      }
                      return next;
                    });
                  }}
                  style={{
                    width: '100%',
                    minHeight: 42,
                    borderRadius: 10,
                    border: showBadgeDropdown ? '2px solid #d4af0d' : '1px solid #d1d5db',
                    padding: '8px 12px',
                    background: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    cursor: 'pointer',
                  }}
                  aria-label="Select badges"
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    {(Array.isArray(awardForm.badges) ? awardForm.badges : []).length === 0 ? (
                      <span style={{ color: '#98a2b3', fontSize: 14 }}>
                        Select badges
                      </span>
                    ) : (
                      (Array.isArray(awardForm.badges) ? awardForm.badges : []).map((b) => (
                        <span key={b} style={{ fontSize: 11, fontWeight: 500, color: '#7b45d3', background: '#f0e8ff', borderRadius: 999, padding: '4px 10px' }}>
                          {b}
                        </span>
                      ))
                    )}
                  </div>
                  <CaretDown size={18} color="#667085" />
                </button>

                {showBadgeDropdown ? (
                  <div
                    style={{
                      position: 'fixed',
                      left: (() => {
                        const pad = 16;
                        const rect = badgeDropdownRect;
                        if (!rect) return pad;
                        const maxLeft = Math.max(pad, window.innerWidth - rect.width - pad);
                        return Math.min(Math.max(pad, rect.left), maxLeft);
                      })(),
                      width: badgeDropdownRect ? badgeDropdownRect.width : 'min(520px, calc(100vw - 32px))',
                      ...(badgeDropdownRect
                        ? (() => {
                          const pad = 16;
                          const below = window.innerHeight - badgeDropdownRect.bottom - pad;
                          const above = badgeDropdownRect.top - pad;
                          const openUp = below < 220 && above > below;
                          const available = Math.max(160, Math.min(320, (openUp ? above : below) - 8));
                          return {
                            ...(openUp
                              ? { bottom: Math.max(pad, window.innerHeight - badgeDropdownRect.top + 8) }
                              : { top: Math.max(pad, badgeDropdownRect.bottom + 8) }),
                            maxHeight: `${available}px`,
                          };
                        })()
                        : { top: 'calc(50% + 20px)', maxHeight: '320px' }),
                      background: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: 14,
                      padding: 12,
                      boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
                      zIndex: 1400,
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onWheel={(e) => e.stopPropagation()}
                  >
                    <div
                      className="hsi-hide-scrollbar"
                      style={{
                        flex: '1 1 auto',
                        minHeight: 0,
                        overflowY: 'auto',
                        overscrollBehavior: 'contain',
                        paddingRight: 4,
                      }}
                      onWheel={(e) => e.stopPropagation()}
                      onWheelCapture={(e) => e.stopPropagation()}
                    >
                      <div className="hsi-ach-badge-options-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                      {badgeChoices.map((choice) => {
                        const selected = Array.isArray(awardForm.badges) && awardForm.badges.includes(choice.id);
                        return (
                          <button
                            key={choice.id}
                            type="button"
                            onClick={() => {
                              setAwardForm((prev) => {
                                const current = Array.isArray(prev.badges) ? prev.badges : [];
                                const next = current.includes(choice.id)
                                  ? current.filter((x) => x !== choice.id)
                                  : [...current, choice.id];
                                return { ...prev, badges: next };
                              });
                            }}
                            style={{
                              border: selected ? '2px solid #d4af0d' : '1px solid #eef2f7',
                              borderRadius: 12,
                              background: '#fff',
                              padding: '10px 12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 10,
                            }}
                            aria-pressed={selected}
                          >
                            <div style={{ color: '#344054', fontWeight: 900, fontSize: 13, lineHeight: 1.2 }}>
                              {choice.id}
                            </div>
                            <div
                              aria-hidden="true"
                              style={{
                                width: 18,
                                height: 18,
                                borderRadius: 6,
                                border: selected ? 'none' : '2px solid #cbd5e1',
                                background: selected ? '#d4af0d' : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff',
                                fontSize: 12,
                                fontWeight: 900,
                                flexShrink: 0,
                              }}
                            >
                              {selected ? 'âœ“' : ''}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    </div>

                    <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button type="button"
                        onClick={() => setAwardForm((p) => ({ ...p, badges: [] }))}
                        style={{ border: 'none', background: 'transparent', color: '#667085', fontWeight: 800, cursor: 'pointer', padding: 0 }}
                      >
                        Clear
                      </button>
                      <button type="button"
                        onClick={() => setShowBadgeDropdown(false)}
                        style={{ border: 'none', borderRadius: 10, background: '#d4af0d', color: '#fff', fontWeight: 900, cursor: 'pointer', padding: '8px 14px' }}
                      >
                        OK
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
              <textarea placeholder="Quote (optional)" value={awardForm.quote} onChange={(e) => setAwardForm((p) => ({ ...p, quote: e.target.value }))} style={{ marginTop: 10, width: '100%', minHeight: 96, borderRadius: 10, border: '1px solid #d1d5db', padding: 12, fontSize: 14, resize: 'vertical' }} />

              {awardError ? (
                <div style={{ marginTop: 10, color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '8px 10px', fontSize: 13 }}>
                  {awardError}
                </div>
              ) : null}

              <div className="hsi-ach-award-actions" style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button"
                  onClick={() => setShowAwardModal(false)}
                  disabled={awardSubmitting}
                  style={{ borderRadius: 10, border: '1px solid #d1d5db', background: '#fff', color: '#334155', fontWeight: 700, padding: '10px 14px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={awardSubmitting}
                  style={{ borderRadius: 10, border: 'none', background: '#d4af0d', color: '#fff', fontWeight: 700, padding: '10px 14px', cursor: 'pointer' }}
                >
                  {awardSubmitting ? 'Saving...' : 'Save Award'}
                </button>
              </div>
            </motion.form>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}






