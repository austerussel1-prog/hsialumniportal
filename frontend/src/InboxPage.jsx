import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowDown,
  CaretDown,
  CaretUp,
  ClockCounterClockwise,
  DotsThreeOutlineVertical,
  File,
  FileDoc,
  FilePdf,
  FilePng,
  FileZip,
  FolderSimple,
  ImagesSquare,
  MagnifyingGlass,
  PaperPlaneRight,
  Paperclip,
  ImageSquare,
  Smiley,
  UserCircle,
} from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import { apiEndpoints, resolveApiAssetUrl } from './config/api';

export default function InboxPage() {
  const navigate = useNavigate();
  const SELECTED_RECIPIENT_STORAGE_KEY = 'hsi_inbox_selected_recipient_id';
  const LAST_READ_BY_USER_STORAGE_KEY = 'hsi_inbox_last_read_by_user';
  const DEFAULT_AVATAR = '/Logo.jpg';
  const applyAvatarFallback = (event) => {
    if (event?.currentTarget) {
      event.currentTarget.src = DEFAULT_AVATAR;
    }
  };
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [userLastChats, setUserLastChats] = useState({});
  const [lastReadByUser, setLastReadByUser] = useState(() => {
    try {
      const raw = localStorage.getItem(LAST_READ_BY_USER_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  });
  const [selectedRecipientId, setSelectedRecipientId] = useState(() => {
    const saved = localStorage.getItem(SELECTED_RECIPIENT_STORAGE_KEY);
    return typeof saved === 'string' ? saved : '';
  });
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [conversationSearch, setConversationSearch] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [chatSearchMatchCount, setChatSearchMatchCount] = useState(0);
  const [activeChatMatchIndex, setActiveChatMatchIndex] = useState(-1);
  const [showScrollToLatest, setShowScrollToLatest] = useState(false);
  const [gifSearch, setGifSearch] = useState('');
  const [gifResults, setGifResults] = useState([]);
  const [gifLoading, setGifLoading] = useState(false);
  const [gifError, setGifError] = useState('');
  const [lightboxImage, setLightboxImage] = useState(null);
  const chatRef = useRef(null);
  const chatBottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const gifPickerRef = useRef(null);
  const chatSearchInputRef = useRef(null);
  const chatSearchHitsRef = useRef([]);
  const lastReadByUserRef = useRef(lastReadByUser);
  const shouldScrollToLatestRef = useRef(false);
  const hasInitializedSelectionRef = useRef(false);
  const tenorKey = 'LIVDSRZULELA';
  const fallbackGifs = useMemo(
    () => [
      { id: 'hello-1', title: 'hello hi wave greeting', url: 'https://media.giphy.com/media/ASd0Ukj0y3qMM/giphy.gif', previewUrl: 'https://media.giphy.com/media/ASd0Ukj0y3qMM/giphy.gif' },
      { id: 'party-1', title: 'party celebrate congrats', url: 'https://media.giphy.com/media/3KC2jD2QcBOSc/giphy.gif', previewUrl: 'https://media.giphy.com/media/3KC2jD2QcBOSc/giphy.gif' },
      { id: 'laugh-1', title: 'laugh funny haha lol', url: 'https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif', previewUrl: 'https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif' },
      { id: 'clap-1', title: 'clap applause nice good job', url: 'https://media.giphy.com/media/l3q2XhfQ8oCkm1Ts4/giphy.gif', previewUrl: 'https://media.giphy.com/media/l3q2XhfQ8oCkm1Ts4/giphy.gif' },
      { id: 'thumbs-1', title: 'thumbs up okay approve yes', url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif', previewUrl: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif' },
      { id: 'cat-1', title: 'cat cute pet animal', url: 'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif', previewUrl: 'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif' },
      { id: 'dog-1', title: 'dog puppy cute pet animal', url: 'https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif', previewUrl: 'https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif' },
      { id: 'happy-1', title: 'happy smile joy excited', url: 'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif', previewUrl: 'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif' },
      { id: 'sad-1', title: 'sad cry crying tears', url: 'https://media.giphy.com/media/9Y5BbDSkSTiY8/giphy.gif', previewUrl: 'https://media.giphy.com/media/9Y5BbDSkSTiY8/giphy.gif' },
      { id: 'wow-1', title: 'wow shocked surprise amazing', url: 'https://media.giphy.com/media/udmx3pgdiD7tm/giphy.gif', previewUrl: 'https://media.giphy.com/media/udmx3pgdiD7tm/giphy.gif' },
      { id: 'love-1', title: 'love heart hearts cute', url: 'https://media.giphy.com/media/3oriO0OEd9QIDdllqo/giphy.gif', previewUrl: 'https://media.giphy.com/media/3oriO0OEd9QIDdllqo/giphy.gif' },
      { id: 'thanks-1', title: 'thanks thank you grateful', url: 'https://media.giphy.com/media/l0MYyDa8S9ghzNebm/giphy.gif', previewUrl: 'https://media.giphy.com/media/l0MYyDa8S9ghzNebm/giphy.gif' },
      { id: 'goodmorning-1', title: 'good morning sunrise coffee', url: 'https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif', previewUrl: 'https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif' },
      { id: 'coffee-1', title: 'coffee work morning energy', url: 'https://media.giphy.com/media/3oriO04qxVReM5rJEA/giphy.gif', previewUrl: 'https://media.giphy.com/media/3oriO04qxVReM5rJEA/giphy.gif' },
      { id: 'dance-1', title: 'dance dancing groove party', url: 'https://media.giphy.com/media/l0MYATH9ZumUHCBXy/giphy.gif', previewUrl: 'https://media.giphy.com/media/l0MYATH9ZumUHCBXy/giphy.gif' },
      { id: 'mindblown-1', title: 'mind blown shocked wow', url: 'https://media.giphy.com/media/OK27wINdQS5YQ/giphy.gif', previewUrl: 'https://media.giphy.com/media/OK27wINdQS5YQ/giphy.gif' },
      { id: 'angry-1', title: 'angry mad annoyed upset', url: 'https://media.giphy.com/media/11tTNkNy1SdXGg/giphy.gif', previewUrl: 'https://media.giphy.com/media/11tTNkNy1SdXGg/giphy.gif' },
      { id: 'facepalm-1', title: 'facepalm fail oops', url: 'https://media.giphy.com/media/TJawtKM6OCKkvwCIqX/giphy.gif', previewUrl: 'https://media.giphy.com/media/TJawtKM6OCKkvwCIqX/giphy.gif' },
      { id: 'welcome-1', title: 'welcome hello nice to meet you', url: 'https://media.giphy.com/media/l0MYC0LajbaPoEADu/giphy.gif', previewUrl: 'https://media.giphy.com/media/l0MYC0LajbaPoEADu/giphy.gif' },
      { id: 'bye-1', title: 'bye goodbye see you wave', url: 'https://media.giphy.com/media/26BRuo6sLetdllPAQ/giphy.gif', previewUrl: 'https://media.giphy.com/media/26BRuo6sLetdllPAQ/giphy.gif' },
      { id: 'study-1', title: 'study studying homework reading book', url: 'https://media.giphy.com/media/l378khQxt68syiWJy/giphy.gif', previewUrl: 'https://media.giphy.com/media/l378khQxt68syiWJy/giphy.gif' },
      { id: 'study-2', title: 'study focus laptop learning class', url: 'https://media.giphy.com/media/3orieUe6ejxSFxYCXe/giphy.gif', previewUrl: 'https://media.giphy.com/media/3orieUe6ejxSFxYCXe/giphy.gif' },
      { id: 'work-1', title: 'work working office laptop busy', url: 'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif', previewUrl: 'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif' },
      { id: 'work-2', title: 'work typing computer deadline', url: 'https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif', previewUrl: 'https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif' },
      { id: 'sleep-1', title: 'sleep sleepy tired nap exhausted', url: 'https://media.giphy.com/media/3o6ZtaiPZNzrmRQ6YM/giphy.gif', previewUrl: 'https://media.giphy.com/media/3o6ZtaiPZNzrmRQ6YM/giphy.gif' },
      { id: 'sleep-2', title: 'sleep bed rest night tired', url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif', previewUrl: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif' },
      { id: 'food-1', title: 'food eating yummy delicious hungry', url: 'https://media.giphy.com/media/3orieLWYouYT4W0bF6/giphy.gif', previewUrl: 'https://media.giphy.com/media/3orieLWYouYT4W0bF6/giphy.gif' },
      { id: 'food-2', title: 'food pizza snack meal hungry', url: 'https://media.giphy.com/media/3oz8xSOhxkZwQlRjBC/giphy.gif', previewUrl: 'https://media.giphy.com/media/3oz8xSOhxkZwQlRjBC/giphy.gif' },
      { id: 'gaming-1', title: 'gaming gamer play controller victory', url: 'https://media.giphy.com/media/3o7aD2saalBwwftBIY/giphy.gif', previewUrl: 'https://media.giphy.com/media/3o7aD2saalBwwftBIY/giphy.gif' },
      { id: 'gaming-2', title: 'gaming game stream keyboard computer', url: 'https://media.giphy.com/media/13HgwGsXF0aiGY/giphy.gif', previewUrl: 'https://media.giphy.com/media/13HgwGsXF0aiGY/giphy.gif' },
      { id: 'school-1', title: 'school class learning teacher student', url: 'https://media.giphy.com/media/l4FGuhL4U2WyjdkaY/giphy.gif', previewUrl: 'https://media.giphy.com/media/l4FGuhL4U2WyjdkaY/giphy.gif' },
      { id: 'school-2', title: 'school exam test quiz nervous', url: 'https://media.giphy.com/media/26ufcYAkp8e66vanu/giphy.gif', previewUrl: 'https://media.giphy.com/media/26ufcYAkp8e66vanu/giphy.gif' },
      { id: 'coding-1', title: 'coding programmer developer code laptop', url: 'https://media.giphy.com/media/13FrpeVH09Zrb2/giphy.gif', previewUrl: 'https://media.giphy.com/media/13FrpeVH09Zrb2/giphy.gif' },
      { id: 'coding-2', title: 'coding debug error fix computer', url: 'https://media.giphy.com/media/l378c04F2fjeZ7vH2/giphy.gif', previewUrl: 'https://media.giphy.com/media/l378c04F2fjeZ7vH2/giphy.gif' },
      { id: 'waiting-1', title: 'waiting please wait loading hold on', url: 'https://media.giphy.com/media/tXL4FHPSnVJ0A/giphy.gif', previewUrl: 'https://media.giphy.com/media/tXL4FHPSnVJ0A/giphy.gif' },
      { id: 'bored-1', title: 'bored meh nothing to do', url: 'https://media.giphy.com/media/3oEduNEbTtAHABX0dy/giphy.gif', previewUrl: 'https://media.giphy.com/media/3oEduNEbTtAHABX0dy/giphy.gif' },
      { id: 'confused-1', title: 'confused huh what question', url: 'https://media.giphy.com/media/WRQBXSCnEFJIuxktnw/giphy.gif', previewUrl: 'https://media.giphy.com/media/WRQBXSCnEFJIuxktnw/giphy.gif' },
      { id: 'no-1', title: 'no nope disagree stop', url: 'https://media.giphy.com/media/3o7TKwmnDgQb5jemjK/giphy.gif', previewUrl: 'https://media.giphy.com/media/3o7TKwmnDgQb5jemjK/giphy.gif' },
      { id: 'yes-1', title: 'yes yup agree correct approved', url: 'https://media.giphy.com/media/26gsjCZpPolPr3sBy/giphy.gif', previewUrl: 'https://media.giphy.com/media/26gsjCZpPolPr3sBy/giphy.gif' },
      { id: 'cheer-1', title: 'cheer support lets go hype', url: 'https://media.giphy.com/media/5xaOcLGvzHxDKjufnLW/giphy.gif', previewUrl: 'https://media.giphy.com/media/5xaOcLGvzHxDKjufnLW/giphy.gif' },
      { id: 'rain-1', title: 'rain weather gloomy chill', url: 'https://media.giphy.com/media/xUPGcguWZHRC2HyBRS/giphy.gif', previewUrl: 'https://media.giphy.com/media/xUPGcguWZHRC2HyBRS/giphy.gif' },
      { id: 'music-1', title: 'music singing headphones vibe', url: 'https://media.giphy.com/media/GeimqsH0TLDt4tScGw/giphy.gif', previewUrl: 'https://media.giphy.com/media/GeimqsH0TLDt4tScGw/giphy.gif' },
      { id: 'travel-1', title: 'travel trip vacation airplane adventure', url: 'https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif', previewUrl: 'https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif' },
      { id: 'birthday-1', title: 'birthday cake celebrate candles', url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif', previewUrl: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif' },
      { id: 'weekend-1', title: 'weekend friday relax freedom', url: 'https://media.giphy.com/media/l0HlKrB02QY0f1mbm/giphy.gif', previewUrl: 'https://media.giphy.com/media/l0HlKrB02QY0f1mbm/giphy.gif' },
      { id: 'monday-1', title: 'monday tired work sleepy', url: 'https://media.giphy.com/media/3oriePFZ78wzILNkFq/giphy.gif', previewUrl: 'https://media.giphy.com/media/3oriePFZ78wzILNkFq/giphy.gif' },
    ],
    []
  );
  const getDisplayError = (value, fallbackMessage) => {
    if (typeof value === 'string' && value.trim()) return value;
    if (value && typeof value === 'object') {
      if (typeof value.message === 'string' && value.message.trim()) return value.message;
      if (typeof value.error === 'string' && value.error.trim()) return value.error;
    }
    return fallbackMessage;
  };
  const getFallbackGifResults = (query) => {
    const normalized = String(query || '').trim().toLowerCase();
    const source = normalized
      ? fallbackGifs.filter((gif) => gif.title.includes(normalized))
      : fallbackGifs;
    const pool = source.length > 0 ? source : fallbackGifs;
    const hash = Array.from(normalized || 'featured').reduce(
      (acc, ch) => ((acc * 31) + ch.charCodeAt(0)) >>> 0,
      7
    );
    const offset = hash % pool.length;
    return [...pool.slice(offset), ...pool.slice(0, offset)];
  };
  const quickEmojis = useMemo(
    () => [
      String.fromCodePoint(0x1F600), // grinning face
      String.fromCodePoint(0x1F602), // tears of joy
      String.fromCodePoint(0x1F60D), // heart eyes
      String.fromCodePoint(0x1F64F), // folded hands
      String.fromCodePoint(0x1F389), // party popper
      String.fromCodePoint(0x1F44D), // thumbs up
    ],
    []
  );
  const cuteLikeReaction = String.fromCodePoint(0x1F44D); // thumbs up

  const forceScrollChatToBottom = (behavior = 'auto') => {
    const node = chatRef.current;
    if (!node) return () => {};

    const scroll = () => {
      const latestNode = chatRef.current;
      if (!latestNode) return;
      latestNode.scrollTo({ top: latestNode.scrollHeight, behavior });
      chatBottomRef.current?.scrollIntoView({ block: 'end', behavior });
    };

    scroll();
    const frameId = requestAnimationFrame(scroll);
    const timeoutId = window.setTimeout(scroll, 80);
    const timeoutId2 = window.setTimeout(scroll, 180);

    return () => {
      cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
      window.clearTimeout(timeoutId2);
    };
  };

  const currentUser = useMemo(() => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);
  const currentUserId = String(currentUser?.id || currentUser?._id || '');

  useEffect(() => {
    lastReadByUserRef.current = lastReadByUser;
  }, [lastReadByUser]);

  useEffect(() => {
    localStorage.setItem(LAST_READ_BY_USER_STORAGE_KEY, JSON.stringify(lastReadByUser));
  }, [lastReadByUser]);

  const fetchWithTimeout = async (url, options = {}, timeoutMs = 12000) => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      window.clearTimeout(timer);
    }
  };

  const resolveMediaUrl = (url) => {
    return resolveApiAssetUrl(url);
  };

  const formatFileSize = (bytes) => {
    const size = Number(bytes || 0);
    if (!size) return '';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getAttachmentMeta = (name, mimeType) => {
    const normalizedName = String(name || '').toLowerCase();
    const normalizedType = String(mimeType || '').toLowerCase();

    if (normalizedType.includes('pdf') || normalizedName.endsWith('.pdf')) {
      return { label: 'PDF', color: '#b91c1c', background: '#fee2e2', Icon: FilePdf };
    }
    if (
      normalizedType.includes('word')
      || normalizedName.endsWith('.doc')
      || normalizedName.endsWith('.docx')
    ) {
      return { label: 'DOC', color: '#1d4ed8', background: '#dbeafe', Icon: FileDoc };
    }
    if (
      normalizedType.includes('zip')
      || normalizedType.includes('compressed')
      || normalizedName.endsWith('.zip')
      || normalizedName.endsWith('.rar')
      || normalizedName.endsWith('.7z')
    ) {
      return { label: 'ZIP', color: '#7c3aed', background: '#ede9fe', Icon: FileZip };
    }
    if (normalizedType.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp)$/i.test(normalizedName)) {
      return { label: 'IMG', color: '#0f766e', background: '#ccfbf1', Icon: FilePng };
    }
    return { label: 'FILE', color: '#374151', background: '#e5e7eb', Icon: File };
  };

  const extractGifUrlFromText = (value) => {
    const raw = String(value || '').trim();
    const match = raw.match(/^gif\s*:\s*(https?:\/\/\S+)$/i);
    return match?.[1] || '';
  };

  const selectedUser = useMemo(
    () => users.find((item) => String(item.id || item._id) === selectedRecipientId) || null,
    [users, selectedRecipientId]
  );

  const sortedUsers = useMemo(() => {
    const list = [...users];
    list.sort((left, right) => {
      const leftId = String(left.id || left._id || '');
      const rightId = String(right.id || right._id || '');
      const leftTime = userLastChats[leftId]?.lastMessageAt
        ? new Date(userLastChats[leftId].lastMessageAt).getTime()
        : 0;
      const rightTime = userLastChats[rightId]?.lastMessageAt
        ? new Date(userLastChats[rightId].lastMessageAt).getTime()
        : 0;

      if (leftTime !== rightTime) {
        return rightTime - leftTime;
      }

      const leftName = String(left.fullName || left.name || 'User');
      const rightName = String(right.fullName || right.name || 'User');
      return leftName.localeCompare(rightName);
    });
    return list;
  }, [users, userLastChats]);

  const filteredUsers = useMemo(() => {
    const query = conversationSearch.trim().toLowerCase();
    if (!query) {
      return sortedUsers;
    }

    return sortedUsers.filter((user) => {
      const userId = String(user.id || user._id || '');
      const displayName = String(user.fullName || user.name || 'User').toLowerCase();
      const preview = String(userLastChats[userId]?.lastMessage || '').toLowerCase();
      return displayName.includes(query) || preview.includes(query);
    });
  }, [sortedUsers, userLastChats, conversationSearch]);

  const sharedMedia = useMemo(
    () => messages
      .filter((msg) => Boolean(resolveMediaUrl(msg.imageUrl || extractGifUrlFromText(msg.text))))
      .map((msg, index) => ({
        id: String(msg._id || `media-${index}`),
        url: resolveMediaUrl(msg.imageUrl || extractGifUrlFromText(msg.text)),
        alt: msg.imageOriginalName || 'Shared media',
      }))
      .slice()
      .reverse()
      .slice(0, 6),
    [messages]
  );

  const sharedFiles = useMemo(
    () => messages
      .filter((msg) => {
        const attachmentUrl = resolveMediaUrl(msg.attachmentUrl || '');
        const imageUrl = resolveMediaUrl(msg.imageUrl || extractGifUrlFromText(msg.text));
        return Boolean(attachmentUrl) && !Boolean(imageUrl);
      })
      .map((msg, index) => ({
        id: String(msg._id || `file-${index}`),
        url: resolveMediaUrl(msg.attachmentUrl || ''),
        name: msg.attachmentOriginalName || 'Attachment',
        mimeType: msg.attachmentMimeType || '',
        size: formatFileSize(msg.attachmentSize),
        meta: getAttachmentMeta(msg.attachmentOriginalName || '', msg.attachmentMimeType || ''),
      }))
      .slice()
      .reverse()
      .slice(0, 6),
    [messages]
  );

  const formatLastChatTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const now = new Date();
    const isSameDay =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();

    if (isSameDay) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }

    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const markConversationAsRead = (recipientId, readAtValue) => {
    const userId = String(recipientId || '');
    if (!userId) return;
    const resolvedReadAt = String(readAtValue || new Date().toISOString());

    setLastReadByUser((prev) => {
      if (prev[userId] === resolvedReadAt) return prev;
      return {
        ...prev,
        [userId]: resolvedReadAt,
      };
    });

    setUserLastChats((prev) => {
      if (!prev[userId]) return prev;
      if (!prev[userId].hasUnread) return prev;
      return {
        ...prev,
        [userId]: {
          ...prev[userId],
          hasUnread: false,
        },
      };
    });
  };

  const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const buildHighlightedText = (value) => {
    const text = String(value || '');
    const query = chatSearchOpen ? chatSearchQuery.trim() : '';
    if (!text || !query) return text;

    const matcher = new RegExp(`(${escapeRegExp(query)})`, 'ig');
    const parts = text.split(matcher);

    return parts.map((part, index) => {
      const isMatch = part.toLowerCase() === query.toLowerCase();
      if (!isMatch) return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;

      return (
        <mark
          key={`${part}-${index}`}
          data-chat-search-hit="true"
          style={{
            background: '#fde68a',
            color: '#111827',
            borderRadius: 4,
            padding: '0 2px',
          }}
        >
          {part}
        </mark>
      );
    });
  };

  const focusChatSearchMatch = (index) => {
    const hits = chatSearchHitsRef.current;
    if (!Array.isArray(hits) || hits.length === 0) return;
    const nextIndex = ((index % hits.length) + hits.length) % hits.length;
    setActiveChatMatchIndex(nextIndex);
  };

  const jumpChatSearchMatch = (direction) => {
    const hits = chatSearchHitsRef.current;
    if (!Array.isArray(hits) || hits.length === 0) return;

    const nextIndex = activeChatMatchIndex >= 0
      ? activeChatMatchIndex + direction
      : (direction >= 0 ? 0 : hits.length - 1);
    focusChatSearchMatch(nextIndex);
  };

  const areMessagesEqual = (a, b) => {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      const leftSender =
        typeof a[i]?.sender === 'object' && a[i]?.sender !== null
          ? String(a[i].sender._id || a[i].sender.id || '')
          : String(a[i]?.sender || '');
      const rightSender =
        typeof b[i]?.sender === 'object' && b[i]?.sender !== null
          ? String(b[i].sender._id || b[i].sender.id || '')
          : String(b[i]?.sender || '');

      if (
        String(a[i]?._id || '') !== String(b[i]?._id || '') ||
        String(a[i]?.text || '') !== String(b[i]?.text || '') ||
        String(a[i]?.imageUrl || '') !== String(b[i]?.imageUrl || '') ||
        String(a[i]?.attachmentUrl || '') !== String(b[i]?.attachmentUrl || '') ||
        String(a[i]?.attachmentOriginalName || '') !== String(b[i]?.attachmentOriginalName || '') ||
        String(a[i]?.createdAt || '') !== String(b[i]?.createdAt || '') ||
        leftSender !== rightSender
      ) {
        return false;
      }
    }
    return true;
  };

  const fetchLastChatForUser = async (recipientId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetchWithTimeout(`${apiEndpoints.getMessages}/${recipientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) return { lastMessage: '', lastMessageAt: '', hasUnread: false };
      const data = await res.json();
      const list = Array.isArray(data?.messages) ? data.messages : [];
      const last = list.length > 0 ? list[list.length - 1] : null;
      let lastIncomingAt = '';
      for (let i = list.length - 1; i >= 0; i -= 1) {
        const senderObj = typeof list[i]?.sender === 'object' && list[i]?.sender !== null ? list[i].sender : {};
        const senderId = String(senderObj._id || senderObj.id || list[i]?.sender || '');
        if (senderId === String(recipientId || '')) {
          lastIncomingAt = String(list[i]?.createdAt || '');
          break;
        }
      }

      const lastReadAt = String(lastReadByUserRef.current[String(recipientId || '')] || '');
      const hasUnread = Boolean(lastIncomingAt)
        && (!lastReadAt || new Date(lastIncomingAt).getTime() > new Date(lastReadAt).getTime());

      return {
        lastMessage: last?.text || (last?.imageUrl ? 'Photo' : (last?.attachmentOriginalName || (last?.attachmentUrl ? 'File' : ''))),
        lastMessageAt: last?.createdAt || '',
        hasUnread,
      };
    } catch {
      return { lastMessage: '', lastMessageAt: '', hasUnread: false };
    }
  };

  const refreshLastChats = async (list) => {
    if (!Array.isArray(list) || list.length === 0) {
      setUserLastChats({});
      return;
    }

    const entries = await Promise.all(
      list.map(async (user) => {
        const userId = String(user.id || user._id || '');
        if (!userId) return [null, { lastMessage: '', lastMessageAt: '' }];
        const chat = await fetchLastChatForUser(userId);
        return [userId, chat];
      })
    );

    const next = {};
    for (const [userId, chat] of entries) {
      if (!userId) continue;
      next[userId] = chat;
    }
    setUserLastChats(next);
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetchWithTimeout(`${apiEndpoints.directoryUsers}?includePrivate=1`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to load users.');
      const data = await res.json();
      const list = Array.isArray(data?.users) ? data.users : [];
      const filtered = list.filter((user) => String(user.id || user._id) !== currentUserId);
      setUsers(filtered);
      // Keep initial render responsive; conversation previews can load in the background.
      refreshLastChats(filtered).catch(() => {
        // Ignore preview failures and keep the inbox usable.
      });
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load users.');
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchMessages = async (recipientId, options = {}) => {
    if (!recipientId) return;
    const silent = Boolean(options.silent);
    if (!silent) setLoadingMessages(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetchWithTimeout(`${apiEndpoints.getMessages}/${recipientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data?.error === 'string' && data.error.trim()
            ? data.error
            : 'Failed to load messages.'
        );
      }
      const nextMessages = Array.isArray(data?.messages) ? data.messages : [];
      setMessages((prev) => (areMessagesEqual(prev, nextMessages) ? prev : nextMessages));
      if (recipientId === selectedRecipientId) {
        let lastIncomingAt = '';
        for (let i = nextMessages.length - 1; i >= 0; i -= 1) {
          const senderObj = typeof nextMessages[i]?.sender === 'object' && nextMessages[i]?.sender !== null ? nextMessages[i].sender : {};
          const senderId = String(senderObj._id || senderObj.id || nextMessages[i]?.sender || '');
          if (senderId === String(recipientId || '')) {
            lastIncomingAt = String(nextMessages[i]?.createdAt || '');
            break;
          }
        }
        markConversationAsRead(recipientId, lastIncomingAt || new Date().toISOString());
      }
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load messages.');
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    const usersIntervalId = setInterval(fetchUsers, 10000);
    return () => clearInterval(usersIntervalId);
  }, []);

  useEffect(() => {
    if (selectedRecipientId) {
      localStorage.setItem(SELECTED_RECIPIENT_STORAGE_KEY, selectedRecipientId);
      return;
    }
    localStorage.removeItem(SELECTED_RECIPIENT_STORAGE_KEY);
  }, [selectedRecipientId]);

  useEffect(() => {
    if (!sortedUsers.length) {
      if (!loadingUsers && !hasInitializedSelectionRef.current) {
        setSelectedRecipientId('');
        setMessages([]);
      }
      return;
    }

    setSelectedRecipientId((prevSelected) => {
      const savedSelection = localStorage.getItem(SELECTED_RECIPIENT_STORAGE_KEY) || '';
      if (
        savedSelection &&
        sortedUsers.some((user) => String(user.id || user._id || '') === savedSelection)
      ) {
        hasInitializedSelectionRef.current = true;
        return savedSelection;
      }

      if (
        prevSelected &&
        sortedUsers.some((user) => String(user.id || user._id || '') === prevSelected)
      ) {
        return prevSelected;
      }

      const nextSelected = String(sortedUsers[0].id || sortedUsers[0]._id || '');
      hasInitializedSelectionRef.current = true;
      return nextSelected;
    });
  }, [sortedUsers, loadingUsers]);

  useEffect(() => {
    if (!selectedRecipientId) return;

    shouldScrollToLatestRef.current = true;
    fetchMessages(selectedRecipientId, { silent: false });
    const intervalId = setInterval(() => fetchMessages(selectedRecipientId, { silent: true }), 3000);
    return () => clearInterval(intervalId);
  }, [selectedRecipientId]);

  useEffect(() => {
    if (!chatSearchOpen) return;
    chatSearchInputRef.current?.focus();
  }, [chatSearchOpen]);

  useEffect(() => {
    if (!chatSearchOpen) {
      chatSearchHitsRef.current = [];
      setChatSearchMatchCount(0);
      setActiveChatMatchIndex(-1);
      return;
    }

    const trimmedQuery = chatSearchQuery.trim();
    if (!trimmedQuery) {
      chatSearchHitsRef.current = [];
      setChatSearchMatchCount(0);
      setActiveChatMatchIndex(-1);
      return;
    }

    const frameId = requestAnimationFrame(() => {
      const hits = Array.from(chatRef.current?.querySelectorAll('mark[data-chat-search-hit="true"]') || []);
      chatSearchHitsRef.current = hits;
      setChatSearchMatchCount(hits.length);

      if (hits.length === 0) {
        setActiveChatMatchIndex(-1);
        return;
      }

      setActiveChatMatchIndex((prev) => (prev >= 0 && prev < hits.length ? prev : 0));
    });

    return () => cancelAnimationFrame(frameId);
  }, [chatSearchOpen, chatSearchQuery, messages]);

  useEffect(() => {
    const hits = chatSearchHitsRef.current;
    if (!Array.isArray(hits) || hits.length === 0) return;

    hits.forEach((node, index) => {
      node.style.background = index === activeChatMatchIndex ? '#f3d24f' : '#fde68a';
      node.style.boxShadow = index === activeChatMatchIndex ? '0 0 0 1px rgba(161, 98, 7, 0.28)' : 'none';
    });

    if (activeChatMatchIndex >= 0 && hits[activeChatMatchIndex]) {
      hits[activeChatMatchIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeChatMatchIndex, chatSearchMatchCount]);

  useEffect(() => {
    setChatSearchOpen(false);
    setChatSearchQuery('');
    setChatSearchMatchCount(0);
    setActiveChatMatchIndex(-1);
    setShowScrollToLatest(false);
  }, [selectedRecipientId]);

  useLayoutEffect(() => {
    const node = chatRef.current;
    if (!node || !selectedRecipientId) return;

    if (shouldScrollToLatestRef.current) {
      if (loadingMessages) {
        return;
      }

      const cleanup = forceScrollChatToBottom('auto');
      shouldScrollToLatestRef.current = false;
      return cleanup;
    }

    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    if (distanceFromBottom < 100) {
      return forceScrollChatToBottom('auto');
    }
    return undefined;
  }, [messages, loadingMessages, selectedRecipientId]);

  const sendMessage = async (forcedText, attachmentFile = null) => {
    const nextText = typeof forcedText === 'string' ? forcedText.trim() : input.trim();
    if (!selectedRecipientId || (!nextText && !attachmentFile)) return;

    // Always stick to latest when user sends a message.
    shouldScrollToLatestRef.current = true;
    setSending(true);
    try {
      const token = localStorage.getItem('token');
      let res;
      if (attachmentFile) {
        const formData = new FormData();
        if (nextText) formData.append('text', nextText);
        formData.append('attachment', attachmentFile);
        res = await fetchWithTimeout(`${apiEndpoints.sendMessage}/${selectedRecipientId}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }, 60000);
      } else {
        res = await fetchWithTimeout(`${apiEndpoints.sendMessage}/${selectedRecipientId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ text: nextText }),
        });
      }

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        let backendError = 'Failed to send message.';
        if (typeof payload?.error === 'string' && payload.error.trim()) {
          backendError = payload.error;
        } else if (typeof payload?.message === 'string' && payload.message.trim()) {
          backendError = payload.message;
        }
        throw new Error(backendError);
      }

      const sentMessage = payload?.message && typeof payload.message === 'object'
        ? payload.message
        : null;

      setInput('');

      if (sentMessage) {
        setMessages((prev) => {
          const sentId = String(sentMessage?._id || '');
          if (sentId && prev.some((item) => String(item?._id || '') === sentId)) {
            return prev;
          }
          return [...prev, sentMessage];
        });

        const previewText = sentMessage?.text
          || (sentMessage?.imageUrl ? 'Photo' : (sentMessage?.attachmentOriginalName || (sentMessage?.attachmentUrl ? 'File' : '')));
        setUserLastChats((prev) => ({
          ...prev,
          [selectedRecipientId]: {
            ...prev[selectedRecipientId],
            lastMessage: previewText || prev[selectedRecipientId]?.lastMessage || '',
            lastMessageAt: sentMessage?.createdAt || new Date().toISOString(),
            hasUnread: false,
          },
        }));
      }

      forceScrollChatToBottom('smooth');

      // Keep data authoritative after optimistic local update.
      await fetchMessages(selectedRecipientId, { silent: true });
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const scrollChatToBottom = (smooth = true) => {
    forceScrollChatToBottom(smooth ? 'smooth' : 'auto');
    setShowScrollToLatest(false);
  };

  const handleChatScroll = () => {
    const node = chatRef.current;
    if (!node) return;
    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    setShowScrollToLatest(distanceFromBottom > 140);
  };

  const openUserProfile = (userId) => {
    const normalizedId = String(userId || '').trim();
    if (!normalizedId) return;
    navigate(`/directory/profile/${normalizedId}`);
  };

  const openOwnProfile = () => {
    navigate('/profile');
  };

  const insertIntoInput = (value) => {
    setInput((prev) => `${prev}${value}`);
  };

  const handleSelectAttachment = (event) => {
    const file = event?.target?.files?.[0];
    if (!file) return;
    sendMessage('', file);
    event.target.value = '';
  };

  const sendGifUrl = (url) => {
    if (!url) return;
    sendMessage(`GIF: ${url}`);
    setShowGifPicker(false);
    setGifSearch('');
    setGifResults([]);
    setGifError('');
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }

      if (gifPickerRef.current && !gifPickerRef.current.contains(event.target)) {
        setShowGifPicker(false);
      }
    };

    if (showEmojiPicker || showGifPicker) {
      window.addEventListener('mousedown', handleClickOutside);
    }
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker, showGifPicker]);

  useEffect(() => {
    if (!showGifPicker) return;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      const query = gifSearch.trim();
      setGifLoading(true);
      setGifError('');
      try {
        const params = new URLSearchParams();
        if (query) {
          params.set('q', query);
        }

        const token = localStorage.getItem('token');
        const queryString = params.toString() ? `?${params.toString()}` : '';
        const candidateUrls = [
          `${apiEndpoints.searchGifs}${queryString}`,
          `${apiEndpoints.getMessages}/gifs${queryString}`,
        ];

        let resolvedResults = null;
        let lastError = null;

        for (const url of candidateUrls) {
          const response = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          });

          const payload = await response.json().catch(() => ({}));
          if (response.ok) {
            resolvedResults = Array.isArray(payload?.results) ? payload.results : [];
            break;
          }

          lastError = getDisplayError(payload?.error || payload, 'Failed to load GIFs.');
        }

        if (resolvedResults === null) {
          const tenorParams = new URLSearchParams({
            key: tenorKey,
            client_key: 'hsi_alumni_portal',
            limit: '30',
            media_filter: 'gif,tinygif',
            contentfilter: 'high',
            locale: 'en_US',
            random: 'true',
          });

          if (query) {
            tenorParams.set('q', query);
          }

          const tenorEndpoint = query
            ? 'https://tenor.googleapis.com/v2/search'
            : 'https://tenor.googleapis.com/v2/featured';

          const tenorResponse = await fetch(`${tenorEndpoint}?${tenorParams.toString()}`, {
            signal: controller.signal,
          });
          const tenorPayload = await tenorResponse.json().catch(() => ({}));

          if (tenorResponse.ok) {
            resolvedResults = (Array.isArray(tenorPayload?.results) ? tenorPayload.results : [])
              .map((item, index) => {
                const media = item?.media_formats?.gif || item?.media_formats?.tinygif || null;
                const preview = item?.media_formats?.tinygifpreview || item?.media_formats?.nanogifpreview || null;
                const url = media?.url || '';
                if (!url) return null;

                const title = String(item?.content_description || item?.title || 'GIF').trim().toLowerCase();
                const blockedTerms = ['18+', 'adult', 'boob', 'breast', 'erotic', 'horny', 'naked', 'nude', 'nsfw', 'porn', 'sexy', 'sex', 'twerk'];
                if (blockedTerms.some((term) => title.includes(term))) return null;

                return {
                  id: String(item?.id || `${Date.now()}-${index}`),
                  title: title || 'gif',
                  url,
                  previewUrl: preview?.url || url,
                };
              })
              .filter(Boolean);
          } else {
            lastError = getDisplayError(tenorPayload?.error || tenorPayload, lastError || 'Failed to load GIFs.');
          }
        }

        if (resolvedResults === null) {
          resolvedResults = getFallbackGifResults(query);
          lastError = '';
        }

        setGifResults(resolvedResults);
      } catch (err) {
        if (controller.signal.aborted) return;
        setGifResults(getFallbackGifResults(query));
        setGifError(getDisplayError(err instanceof Error ? err.message : err, ''));
      } finally {
        if (!controller.signal.aborted) {
          setGifLoading(false);
        }
      }
    }, 280);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [showGifPicker, gifSearch]);

  useEffect(() => {
    if (!lightboxImage) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeydown = (event) => {
      if (event.key === 'Escape') {
        setLightboxImage(null);
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => {
      window.removeEventListener('keydown', handleKeydown);
      document.body.style.overflow = previousOverflow;
    };
  }, [lightboxImage]);

  return (
    <motion.div
      style={{ display: 'flex', minHeight: '100vh', background: '#f6f2ea' }}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.25 }}
    >
      <Sidebar isOpen={sidebarOpen} toggle={() => setSidebarOpen(!sidebarOpen)} />

      <div style={{ flex: 1, padding: '28px 36px' }}>
        <div
          style={{
            marginBottom: '18px',
            display: 'grid',
            gridTemplateColumns: '320px minmax(0, 1fr)',
            alignItems: 'start',
            gap: 14,
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: '30px', fontWeight: 800, color: '#111827' }}>
              Inbox <span style={{ color: '#d9a520' }}>&amp; Inquiries</span>
            </h1>
            <p style={{ marginTop: '6px', color: '#6b7280' }}>View and reply to your direct messages.</p>
          </div>
          <div
            style={{
              width: 358,
              maxWidth: '100%',
              justifySelf: 'end',
              fontSize: 12,
              lineHeight: 1.45,
              color: '#6b7280',
              textAlign: 'left',
              padding: '8px 12px',
              borderRadius: 10,
              border: '1px solid #efe5d7',
              background: '#fff',
              boxSizing: 'border-box',
            }}
          >
            <span style={{ color: '#b91c1c', fontWeight: 700 }}>Note:</span>{' '}
            Messages cannot be deleted to preserve communication history and ensure transparency between users. This helps maintain accurate records for reference and accountability.
          </div>
        </div>

        {error && (
          <div
            style={{
              marginBottom: '12px',
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid #fecaca',
              background: '#fef2f2',
              color: '#b91c1c',
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            background: '#fff',
            border: '1px solid #efe5d7',
            boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
            borderRadius: '16px',
            height: 'calc(100vh - 180px)',
            display: 'flex',
            overflow: 'hidden',
          }}
        >
          <div style={{ width: 320, flexShrink: 0, borderRight: '1px solid #efe5d7', overflowY: 'auto', background: '#faf9f7' }}>
            <div
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 1,
                padding: '14px 14px 10px',
                background: '#faf9f7',
                borderBottom: '1px solid #efe5d7',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  border: '1px solid #e5dccf',
                  borderRadius: '10px',
                  background: '#fff',
                  padding: '8px 10px',
                }}
              >
                <MagnifyingGlass size={16} color="#9ca3af" />
                <input
                  type="text"
                  value={conversationSearch}
                  onChange={(e) => setConversationSearch(e.target.value)}
                  placeholder="Search conversations..."
                  style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontSize: 13,
                    color: '#111827',
                  }}
                />
              </div>
            </div>
            {loadingUsers ? (
              <div style={{ padding: '18px', color: '#8a5a00' }}>Loading users...</div>
            ) : users.length === 0 ? (
              <div style={{ padding: '18px', color: '#9ca3af' }}>No users found.</div>
            ) : filteredUsers.length === 0 ? (
              <div style={{ padding: '18px', color: '#9ca3af' }}>No conversations match your search.</div>
            ) : (
              <AnimatePresence initial={false}>
                {filteredUsers.map((user) => {
                const userId = String(user.id || user._id || '');
                const isActive = userId === selectedRecipientId;
                const preview = userLastChats[userId]?.lastMessage || 'No messages yet.';
                const hasUnread = Boolean(userLastChats[userId]?.hasUnread) && !isActive;
                const lastMessageAt = userLastChats[userId]?.lastMessageAt;
                const lastChatTime = formatLastChatTime(lastMessageAt);
                const displayName = user.fullName || user.name || 'User';
                return (
                  <motion.button
                    key={userId}
                    layout
                    type="button"
                    onClick={async () => {
                      shouldScrollToLatestRef.current = true;
                      markConversationAsRead(userId, new Date().toISOString());
                      if (userId === selectedRecipientId) {
                        await fetchMessages(userId, { silent: false });
                        scrollChatToBottom(true);
                        return;
                      }

                      setSelectedRecipientId(userId);
                    }}
                    whileTap={{ scale: 0.99 }}
                    transition={{
                      layout: { duration: 0.35, ease: 'easeInOut' },
                      backgroundColor: { duration: 0.2 },
                      boxShadow: { duration: 0.2 },
                    }}
                    style={{
                      width: '100%',
                      border: 'none',
                      textAlign: 'left',
                      padding: '14px 14px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #efe5d7',
                      background: isActive ? '#f3ede3' : 'transparent',
                      transition: 'background-color 180ms ease, box-shadow 180ms ease',
                      boxShadow: isActive ? 'inset 3px 0 0 #d9a520' : 'inset 0 0 0 transparent',
                      }}
                    >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                        <img
                          src={resolveApiAssetUrl(user.profileImage) || DEFAULT_AVATAR}
                          alt={displayName}
                          onError={applyAvatarFallback}
                          style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e4d6c4', flexShrink: 0 }}
                        />
                        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
                          <div
                            style={{
                              fontWeight: 700,
                              color: '#111827',
                              fontSize: 15,
                              lineHeight: 1.2,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {displayName}
                          </div>
                          <div
                            style={{
                              fontSize: 14,
                              color: hasUnread ? '#4b5563' : '#6b7280',
                              fontWeight: hasUnread ? 600 : 500,
                              lineHeight: 1.25,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {preview}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: 8, minWidth: 46, flexShrink: 0 }}>
                        <div style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>
                          {lastChatTime}
                        </div>
                        {hasUnread ? (
                          <span
                            aria-label="Unread conversation"
                            title="Unread"
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              background: '#2d7ff9',
                              flexShrink: 0,
                            }}
                          />
                        ) : (
                          <span style={{ width: 12, height: 12, flexShrink: 0 }} />
                        )}
                      </div>
                    </div>
                  </motion.button>
                );
                })}
              </AnimatePresence>
            )}
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, height: '100%', overflow: 'hidden' }}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={selectedRecipientId || 'no-conversation'}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                style={{ display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0, flex: 1, overflow: 'hidden' }}
              >
                {selectedUser ? (
                  <div
                    style={{
                      borderBottom: '1px solid #efe5d7',
                      padding: '14px 18px',
                      background: '#f3ede3',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontWeight: 700,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <img
                        src={resolveApiAssetUrl(selectedUser?.profileImage) || DEFAULT_AVATAR}
                        alt={selectedUser?.fullName || selectedUser?.name || 'Conversation avatar'}
                        onError={applyAvatarFallback}
                        onClick={() => openUserProfile(selectedRecipientId)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '1.5px solid #d6c3a7',
                          background: '#fff',
                          cursor: selectedRecipientId ? 'pointer' : 'default',
                          flexShrink: 0,
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => openUserProfile(selectedRecipientId)}
                        disabled={!selectedRecipientId}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          padding: 0,
                          margin: 0,
                          fontWeight: 700,
                          color: '#111827',
                          cursor: selectedRecipientId ? 'pointer' : 'default',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                        }}
                      >
                        {selectedUser?.fullName || selectedUser?.name || 'Conversation'}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsInfoPanelOpen((prev) => !prev)}
                      title={isInfoPanelOpen ? 'Hide conversation info' : 'Show conversation info'}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        border: '1px solid #e5dccf',
                        background: '#fff9ee',
                        color: '#8a5a00',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      <DotsThreeOutlineVertical size={18} weight="bold" />
                    </button>
                  </div>
                ) : (
                  <div
                    style={{
                      borderBottom: '1px solid #efe5d7',
                      padding: '14px 18px',
                      background: '#f3ede3',
                      minHeight: 61,
                      display: 'flex',
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setIsInfoPanelOpen((prev) => !prev)}
                      title={isInfoPanelOpen ? 'Hide conversation info' : 'Show conversation info'}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        border: '1px solid #e5dccf',
                        background: '#fff9ee',
                        color: '#8a5a00',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <DotsThreeOutlineVertical size={18} weight="bold" />
                    </button>
                  </div>
                )}

                <AnimatePresence initial={false}>
                  {chatSearchOpen && (
                    <motion.div
                      key="chat-search-drop"
                      initial={{ height: 0, opacity: 0, y: -8 }}
                      animate={{ height: 'auto', opacity: 1, y: 0 }}
                      exit={{ height: 0, opacity: 0, y: -8 }}
                      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div
                        style={{
                          borderBottom: '1px solid #efe5d7',
                          padding: '10px 14px',
                          background: '#fffdf7',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                        }}
                      >
                        <MagnifyingGlass size={16} color="#8a5a00" />
                        <input
                          ref={chatSearchInputRef}
                          type="text"
                          value={chatSearchQuery}
                          onChange={(event) => setChatSearchQuery(event.target.value)}
                          placeholder="Search this conversation"
                          style={{
                            flex: 1,
                            minWidth: 0,
                            border: '1px solid #e7dcc8',
                            borderRadius: 999,
                            padding: '7px 12px',
                            outline: 'none',
                            background: '#fff',
                            fontSize: 13,
                            color: '#111827',
                          }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => jumpChatSearchMatch(-1)}
                            disabled={chatSearchMatchCount === 0}
                            title="Previous match"
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: 7,
                              border: '1px solid #e7dcc8',
                              background: '#fff',
                              color: '#8a5a00',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: chatSearchMatchCount === 0 ? 'not-allowed' : 'pointer',
                              opacity: chatSearchMatchCount === 0 ? 0.5 : 1,
                            }}
                          >
                            <CaretUp size={14} weight="bold" />
                          </button>
                          <button
                            type="button"
                            onClick={() => jumpChatSearchMatch(1)}
                            disabled={chatSearchMatchCount === 0}
                            title="Next match"
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: 7,
                              border: '1px solid #e7dcc8',
                              background: '#fff',
                              color: '#8a5a00',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: chatSearchMatchCount === 0 ? 'not-allowed' : 'pointer',
                              opacity: chatSearchMatchCount === 0 ? 0.5 : 1,
                            }}
                          >
                            <CaretDown size={14} weight="bold" />
                          </button>
                          <div style={{ fontSize: 12, fontWeight: 700, color: chatSearchQuery.trim() && chatSearchMatchCount === 0 ? '#b91c1c' : '#6b7280', minWidth: 82, textAlign: 'right' }}>
                            {!chatSearchQuery.trim()
                              ? 'Type to search'
                              : (chatSearchMatchCount > 0
                                ? `${activeChatMatchIndex + 1}/${chatSearchMatchCount}`
                                : 'None found')}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div style={{ position: 'relative', minHeight: 0, flex: 1, height: 0 }}>
                  <div
                    ref={chatRef}
                    onScroll={handleChatScroll}
                    style={{
                      minHeight: 0,
                      flex: 1,
                      padding: '16px',
                      overflowY: 'auto',
                      background: '#fff',
                      height: '100%',
                      boxSizing: 'border-box',
                    }}
                  >
                    {(!selectedRecipientId || loadingMessages) ? (
                      <div style={{ color: '#9ca3af' }}>
                        {loadingMessages ? 'Loading messages...' : 'No conversation selected.'}
                      </div>
                    ) : messages.length === 0 ? (
                      <div style={{ color: '#9ca3af' }}>No messages yet.</div>
                    ) : (
                      <>
                        <AnimatePresence initial={false}>
                        {messages.map((msg, index) => {
                      const senderObj = typeof msg.sender === 'object' && msg.sender !== null ? msg.sender : {};
                      const senderId = String(senderObj._id || senderObj.id || msg.sender || '');
                      const isMine = senderId === currentUserId;
                      const senderName = senderObj.fullName || senderObj.name || 'User';
                      const senderProfile = resolveApiAssetUrl(senderObj.profileImage) || DEFAULT_AVATAR;
                      const gifUrlFromText = extractGifUrlFromText(msg.text);
                      const imageUrl = resolveMediaUrl(msg.imageUrl || gifUrlFromText || '');
                      const attachmentUrl = resolveMediaUrl(msg.attachmentUrl || '');
                      const attachmentName = msg.attachmentOriginalName || 'Attachment';
                      const attachmentSize = formatFileSize(msg.attachmentSize);
                      const attachmentMeta = getAttachmentMeta(attachmentName, msg.attachmentMimeType);
                      const hasNonImageAttachment = Boolean(attachmentUrl) && !Boolean(imageUrl);
                      const normalizedText = String(msg.text || '').trim();
                      const isEmojiOnly = Boolean(normalizedText)
                        && /^[\p{Extended_Pictographic}\p{Emoji_Presentation}\p{Emoji}\u200D\uFE0F\s]+$/u.test(normalizedText);
                      const isGifMessage = /^gif\s*:/i.test(normalizedText);
                      const useTransparentBubble = Boolean(imageUrl) || hasNonImageAttachment || isEmojiOnly || isGifMessage;
                      const visibleText = gifUrlFromText ? '' : msg.text;
                      const createdAt = msg.createdAt ? new Date(msg.createdAt) : null;
                      const formattedTime = createdAt ? createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                      return (
                        <motion.div
                          key={msg._id || `${senderId}-${index}`}
                          layout
                          initial={{ opacity: 0, y: 12, scale: 0.985 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.985 }}
                          transition={{ type: 'spring', stiffness: 420, damping: 30, mass: 0.6 }}
                          style={{ marginBottom: '14px', display: 'flex', flexDirection: isMine ? 'row-reverse' : 'row', alignItems: 'flex-end' }}
                        >
                          <img
                            src={isMine ? (resolveApiAssetUrl(currentUser?.profileImage) || DEFAULT_AVATAR) : senderProfile}
                            alt={isMine ? 'Me' : senderName}
                            onError={applyAvatarFallback}
                            onClick={() => {
                              if (isMine) {
                                openOwnProfile();
                                return;
                              }
                              openUserProfile(senderId);
                            }}
                            style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #e4d6c4', margin: isMine ? '0 0 0 8px' : '0 8px 0 0' }}
                          />
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
                            <button
                              type="button"
                              onClick={() => {
                                if (isMine) {
                                  openOwnProfile();
                                  return;
                                }
                                openUserProfile(senderId);
                              }}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                padding: 0,
                                marginBottom: 2,
                                fontWeight: 600,
                                fontSize: 13,
                                color: '#8a5a00',
                                cursor: 'pointer',
                              }}
                            >
                              {isMine ? (currentUser?.fullName || currentUser?.name || 'Me') : senderName}
                            </button>
                            {(msg.text || imageUrl || attachmentUrl) && (
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: imageUrl ? (useTransparentBubble ? 0 : '8px') : (useTransparentBubble ? 0 : '9px 12px'),
                                  borderRadius: '12px',
                                  background: useTransparentBubble ? 'transparent' : (isMine ? '#d9a520' : '#e4d6c4'),
                                  color: '#111827',
                                  wordBreak: 'break-word',
                                  fontSize: isEmojiOnly ? 30 : 14,
                                  lineHeight: isEmojiOnly ? 1.15 : undefined,
                                }}
                              >
                                {imageUrl && (
                                  <motion.img
                                    layoutId={`chat-image-${msg._id || `${senderId}-${index}`}`}
                                    src={imageUrl}
                                    alt={msg.imageOriginalName || 'Shared image'}
                                    onClick={() => {
                                      setLightboxImage({
                                        src: imageUrl,
                                        alt: msg.imageOriginalName || 'Shared image',
                                        layoutId: `chat-image-${msg._id || `${senderId}-${index}`}`,
                                      });
                                    }}
                                    style={{
                                      display: 'block',
                                      width: '100%',
                                      maxWidth: 220,
                                      maxHeight: 260,
                                      borderRadius: 10,
                                      objectFit: 'cover',
                                      marginBottom: visibleText ? 8 : 0,
                                      background: '#fff',
                                      cursor: 'zoom-in',
                                    }}
                                  />
                                )}
                                {buildHighlightedText(visibleText)}
                                {hasNonImageAttachment && (
                                  <div
                                    style={{
                                      marginTop: visibleText ? 8 : 0,
                                      minWidth: 220,
                                      maxWidth: 260,
                                      background: '#ffffff',
                                      border: '1px solid #d1d5db',
                                      borderRadius: 12,
                                      padding: '10px 12px',
                                      boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                      <div
                                        style={{
                                          width: 38,
                                          height: 38,
                                          borderRadius: 10,
                                          background: attachmentMeta.background,
                                          color: attachmentMeta.color,
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          flexShrink: 0,
                                        }}
                                      >
                                        <attachmentMeta.Icon size={20} weight="fill" />
                                      </div>
                                      <div
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          borderRadius: 999,
                                          padding: '4px 8px',
                                          background: attachmentMeta.background,
                                          color: attachmentMeta.color,
                                          fontSize: 11,
                                          fontWeight: 800,
                                          letterSpacing: '0.04em',
                                        }}
                                      >
                                        {attachmentMeta.label}
                                      </div>
                                    </div>
                                    <div style={{ fontWeight: 700, color: '#111827', fontSize: 13, wordBreak: 'break-word' }}>
                                      {buildHighlightedText(attachmentName)}
                                    </div>
                                    <div style={{ marginTop: 4, color: '#6b7280', fontSize: 12 }}>
                                      {msg.attachmentMimeType || 'File'}{attachmentSize ? ` â€¢ ${attachmentSize}` : ''}
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                                      <a
                                        href={attachmentUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{
                                          textDecoration: 'none',
                                          padding: '6px 10px',
                                          borderRadius: 999,
                                          background: '#f3d24f',
                                          color: '#1f2937',
                                          fontSize: 12,
                                          fontWeight: 700,
                                        }}
                                      >
                                        Open
                                      </a>
                                      <a
                                        href={attachmentUrl}
                                        download={attachmentName}
                                        style={{
                                          textDecoration: 'none',
                                          padding: '6px 10px',
                                          borderRadius: 999,
                                          background: '#f3f4f6',
                                          color: '#111827',
                                          fontSize: 12,
                                          fontWeight: 700,
                                        }}
                                      >
                                        Download
                                      </a>
                                    </div>
                                  </div>
                                )}
                              </span>
                            )}
                            <span style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{formattedTime}</span>
                          </div>
                        </motion.div>
                      );
                        })}
                        </AnimatePresence>
                        <div ref={chatBottomRef} />
                      </>
                    )}
                  </div>

                  <AnimatePresence>
                    {showScrollToLatest && selectedRecipientId && !loadingMessages && (
                      <motion.button
                        key="scroll-to-latest"
                        type="button"
                        initial={{ opacity: 0, y: 20, scale: 0.92 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 18, scale: 0.94 }}
                        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                        onClick={() => scrollChatToBottom(true)}
                        title="Go to latest"
                        style={{
                          position: 'absolute',
                          left: '50%',
                          bottom: 16,
                          transform: 'translateX(-50%)',
                          width: 42,
                          height: 42,
                          border: 'none',
                          borderRadius: '50%',
                          background: '#fff',
                          color: '#8a5a00',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 10px 24px rgba(0,0,0,0.18)',
                          cursor: 'pointer',
                          zIndex: 6,
                        }}
                      >
                        <ArrowDown size={20} weight="bold" />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </AnimatePresence>

            <div
              style={{
                borderTop: '2px solid #d9a520',
                padding: '10px 12px',
                background: '#fffbe6',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                zIndex: 2,
              }}
            >
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach file"
                    style={{
                      width: 26,
                      height: 26,
                      border: 'none',
                      borderRadius: 0,
                      background: 'transparent',
                      color: '#d9a520',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Paperclip size={18} weight="bold" />
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach file"
                    style={{
                      width: 26,
                      height: 26,
                      border: 'none',
                      borderRadius: 0,
                      background: 'transparent',
                      color: '#d9a520',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ImageSquare size={18} weight="fill" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowGifPicker((prev) => !prev);
                      setShowEmojiPicker(false);
                    }}
                    title="GIF"
                    style={{
                      border: 'none',
                      borderRadius: 0,
                      background: 'transparent',
                      color: '#d9a520',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                      minWidth: 30,
                      height: 26,
                      fontWeight: 700,
                      fontSize: 14,
                      lineHeight: 1,
                    }}
                  >
                    GIF
                  </button>
                </div>

                <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {showGifPicker && (
                    <div
                      ref={gifPickerRef}
                      style={{
                        position: 'absolute',
                        left: 0,
                        bottom: 50,
                        width: 360,
                        maxWidth: 'calc(100vw - 140px)',
                        height: 430,
                        background: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '18px',
                        boxShadow: '0 20px 42px rgba(0,0,0,0.22)',
                        overflow: 'hidden',
                        zIndex: 40,
                      }}
                    >
                      <div style={{ padding: '14px 14px 10px' }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            borderRadius: 999,
                            border: '1px solid #e5e7eb',
                            background: '#f7f7f9',
                            padding: '9px 12px',
                          }}
                        >
                          <MagnifyingGlass size={19} color="#6b7280" />
                          <input
                            type="text"
                            value={gifSearch}
                            onChange={(event) => setGifSearch(event.target.value)}
                            placeholder="Search"
                            style={{
                              width: '100%',
                              border: 'none',
                              outline: 'none',
                              background: 'transparent',
                              fontSize: 16,
                              color: '#111827',
                            }}
                          />
                        </div>
                      </div>

                      <div
                        style={{
                          height: 'calc(100% - 68px)',
                          overflowY: 'auto',
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gridAutoRows: '140px',
                          gap: 6,
                          padding: 6,
                          alignContent: 'start',
                        }}
                      >
                        {gifResults.map((gif) => (
                          <button
                            key={gif.id}
                            type="button"
                            onClick={() => sendGifUrl(gif.url)}
                            style={{
                              border: 'none',
                              padding: 0,
                              margin: 0,
                              cursor: 'pointer',
                              background: '#f3f4f6',
                              borderRadius: 10,
                              overflow: 'hidden',
                              minHeight: 140,
                            }}
                          >
                            <img
                              src={gif.url}
                              alt={gif.title}
                              loading="lazy"
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                display: 'block',
                                background: '#f3f4f6',
                              }}
                            />
                          </button>
                        ))}
                        {!gifLoading && gifError && (
                          <div style={{ gridColumn: '1 / -1', padding: '18px', color: '#b91c1c', fontSize: 14 }}>
                            {gifError}
                          </div>
                        )}
                        {!gifLoading && !gifError && gifResults.length === 0 && (
                          <div style={{ gridColumn: '1 / -1', padding: '18px', color: '#6b7280', fontSize: 14 }}>
                            No GIF results for that search.
                          </div>
                        )}
                        {gifLoading && (
                          <div style={{ gridColumn: '1 / -1', padding: '18px', color: '#6b7280', fontSize: 14 }}>
                            Loading GIFs...
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Aa"
                    disabled={sending}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      width: '1%',
                      border: '1px solid #e5e7eb',
                      borderRadius: '999px',
                      padding: '10px 14px',
                      outline: 'none',
                      fontSize: '14px',
                      background: '#fff',
                    }}
                  />

                  <div ref={emojiPickerRef} style={{ position: 'relative', display: 'flex' }}>
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker((prev) => !prev)}
                      title="Emoji"
                      style={{
                        width: 26,
                        height: 26,
                        border: 'none',
                        borderRadius: 0,
                        background: 'transparent',
                        color: '#d9a520',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Smiley size={18} weight="fill" />
                    </button>

                    {showEmojiPicker && (
                      <div
                        style={{
                          position: 'absolute',
                          right: 0,
                          bottom: 44,
                          background: '#fff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '12px',
                          boxShadow: '0 10px 24px rgba(0,0,0,0.12)',
                          padding: '8px',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: '6px',
                          width: 132,
                        }}
                      >
                        {quickEmojis.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => {
                              insertIntoInput(emoji);
                              setShowEmojiPicker(false);
                            }}
                            style={{
                              border: '1px solid #eef2f7',
                              background: '#fff',
                              borderRadius: '8px',
                              height: 34,
                              fontSize: '18px',
                              cursor: 'pointer',
                            }}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {input.trim() ? (
                    <button
                      type="button"
                      onClick={() => sendMessage()}
                      disabled={sending}
                      style={{
                        minWidth: 40,
                        height: 40,
                        background: '#d9a520',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '999px',
                        cursor: sending ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <PaperPlaneRight size={18} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => sendMessage(cuteLikeReaction)}
                      disabled={sending || !selectedRecipientId}
                      title="Send like"
                      style={{
                        minWidth: 26,
                        height: 26,
                        background: 'transparent',
                        color: '#d9a520',
                        border: 'none',
                        borderRadius: 0,
                        cursor: sending || !selectedRecipientId ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <span style={{ fontSize: 22, lineHeight: 1 }}>{cuteLikeReaction}</span>
                    </button>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleSelectAttachment}
                  style={{ display: 'none' }}
                />
              </div>
            </div>
          </div>

          <motion.div
            initial={false}
            animate={{
              width: isInfoPanelOpen ? 390 : 0,
              opacity: isInfoPanelOpen ? 1 : 0,
              borderLeftWidth: isInfoPanelOpen ? 1 : 0,
            }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            style={{
              borderLeftStyle: 'solid',
              borderLeftColor: '#efe5d7',
              background: 'linear-gradient(180deg, #fffdf7 0%, #fff 100%)',
              display: 'flex',
              flexDirection: 'column',
              minWidth: 0,
              width: 390,
              flexShrink: 0,
              minHeight: 0,
              height: '100%',
              overflow: 'hidden',
              pointerEvents: isInfoPanelOpen ? 'auto' : 'none',
            }}
          >
            <div
              style={{
                padding: '24px 20px 18px',
                borderBottom: '1px solid #f1e6d6',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <img
                src={resolveApiAssetUrl(selectedUser?.profileImage) || DEFAULT_AVATAR}
                alt={selectedUser?.fullName || selectedUser?.name || 'Conversation user'}
                onError={applyAvatarFallback}
                onClick={() => selectedRecipientId && openUserProfile(selectedRecipientId)}
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid #f5e7c9',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                  cursor: selectedRecipientId ? 'pointer' : 'default',
                  background: '#fff',
                }}
              />
              <div style={{ marginTop: 16, fontSize: 24, fontWeight: 800, color: '#111827', lineHeight: 1.15, textAlign: 'center' }}>
                {selectedUser?.fullName || selectedUser?.name || 'Conversation'}
              </div>
              <div style={{ marginTop: 8, color: '#6b7280', fontSize: 14, textAlign: 'center' }}>
                {selectedUser?.jobTitle || 'Alumni Member'}
              </div>
              <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => selectedRecipientId && openUserProfile(selectedRecipientId)}
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: '50%',
                    border: 'none',
                    background: '#f6efe2',
                    color: '#8a5a00',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  title="Open profile"
                >
                  <UserCircle size={22} weight="fill" />
                </button>
                <button
                  type="button"
                  onClick={() => chatRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: '50%',
                    border: 'none',
                    background: '#f6efe2',
                    color: '#8a5a00',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  title="Go to latest"
                >
                  <ClockCounterClockwise size={20} weight="fill" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowGifPicker(false);
                    setShowEmojiPicker(false);
                    setChatSearchOpen((prev) => {
                      const next = !prev;
                      if (!next) {
                        setChatSearchQuery('');
                        setChatSearchMatchCount(0);
                        setActiveChatMatchIndex(-1);
                      }
                      return next;
                    });
                  }}
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: '50%',
                    border: 'none',
                    background: '#f6efe2',
                    color: '#8a5a00',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  title={chatSearchOpen ? 'Close chat search' : 'Search chat'}
                >
                  <MagnifyingGlass size={19} weight="bold" />
                </button>
              </div>
            </div>

            <div style={{ padding: '18px 16px', overflowY: 'auto', minHeight: 0 }}>
              <div
                style={{
                  border: '1px solid #f1e6d6',
                  borderRadius: 16,
                  background: '#fff',
                  padding: 14,
                  boxShadow: '0 10px 24px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: '#a16207', textTransform: 'uppercase' }}>
                  Chat Info
                </div>
                <div style={{ marginTop: 12, color: '#111827', fontWeight: 700 }}>
                  {selectedUser?.fullName || selectedUser?.name || 'Conversation'}
                </div>
                <div style={{ marginTop: 4, color: '#6b7280', fontSize: 14, wordBreak: 'break-word' }}>
                  {selectedUser?.email || 'No email available'}
                </div>
                <div style={{ marginTop: 10, color: '#6b7280', fontSize: 14 }}>
                  {selectedUser?.jobTitle || 'No role provided'}
                </div>
              </div>

              <div style={{ marginTop: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#111827', fontWeight: 800 }}>
                    <ImagesSquare size={18} color="#a16207" weight="fill" />
                    Media
                  </div>
                  <div style={{ color: '#9ca3af', fontSize: 12 }}>{sharedMedia.length}</div>
                </div>
                {sharedMedia.length === 0 ? (
                  <div style={{ color: '#9ca3af', fontSize: 13, padding: '8px 2px' }}>No shared media yet.</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {sharedMedia.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setLightboxImage({ src: item.url, alt: item.alt, layoutId: `side-${item.id}` })}
                        style={{
                          border: 'none',
                          padding: 0,
                          background: '#f3f4f6',
                          borderRadius: 12,
                          overflow: 'hidden',
                          cursor: 'pointer',
                          aspectRatio: '1 / 1',
                        }}
                      >
                        <img
                          src={item.url}
                          alt={item.alt}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ marginTop: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#111827', fontWeight: 800 }}>
                    <FolderSimple size={18} color="#a16207" weight="fill" />
                    Files
                  </div>
                  <div style={{ color: '#9ca3af', fontSize: 12 }}>{sharedFiles.length}</div>
                </div>
                {sharedFiles.length === 0 ? (
                  <div style={{ color: '#9ca3af', fontSize: 13, padding: '8px 2px' }}>No shared files yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {sharedFiles.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          border: '1px solid #ece5d8',
                          borderRadius: 14,
                          background: '#fff',
                          padding: 12,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 10,
                              background: item.meta.background,
                              color: item.meta.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <item.meta.Icon size={18} weight="fill" />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', wordBreak: 'break-word' }}>
                              {item.name}
                            </div>
                            <div style={{ marginTop: 3, color: '#6b7280', fontSize: 12 }}>
                              {item.meta.label}{item.size ? ` • ${item.size}` : ''}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              textDecoration: 'none',
                              padding: '6px 10px',
                              borderRadius: 999,
                              background: '#f6efe2',
                              color: '#8a5a00',
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            Open
                          </a>
                          <a
                            href={item.url}
                            download={item.name}
                            style={{
                              textDecoration: 'none',
                              padding: '6px 10px',
                              borderRadius: 999,
                              background: '#f3f4f6',
                              color: '#111827',
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            Download
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setLightboxImage(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(12, 15, 23, 0.78)',
              zIndex: 12000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
            }}
          >
            <motion.img
              layoutId={lightboxImage.layoutId}
              src={lightboxImage.src}
              alt={lightboxImage.alt}
              onClick={(event) => event.stopPropagation()}
              style={{
                maxWidth: 'min(92vw, 1200px)',
                maxHeight: '88vh',
                borderRadius: 14,
                objectFit: 'contain',
                boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
                background: '#fff',
                cursor: 'zoom-out',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
