import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './components/Sidebar';
import { apiEndpoints, resolveApiAssetUrl } from './config/api';

export default function EventsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [query, setQuery] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [adminRegistrations, setAdminRegistrations] = useState([]);
  const [adminRegStatusFilter, setAdminRegStatusFilter] = useState('pending');
  const [adminRegRejectReason, setAdminRegRejectReason] = useState('');
  const [adminRegLoading, setAdminRegLoading] = useState(false);
  const [adminRegBusyId, setAdminRegBusyId] = useState('');
  const [createMessage, setCreateMessage] = useState('');
  const [toast, setToast] = useState(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [activeStep, setActiveStep] = useState(1);
  const [dateFilter, setDateFilter] = useState('all'); // all | today | this_week | next_week | date
  const [selectedDate, setSelectedDate] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());
  const [page, setPage] = useState(1);
  const [gridPage, setGridPage] = useState(1);
  const [hoveredEventCardId, setHoveredEventCardId] = useState('');
  const [regPickIndex, setRegPickIndex] = useState(0);
  const [regSelectedDate, setRegSelectedDate] = useState(null);
  const [regCalendarMonth, setRegCalendarMonth] = useState(() => new Date().getMonth());
  const [regCalendarYear, setRegCalendarYear] = useState(() => new Date().getFullYear());
  const eventsSectionRef = useRef(null);
  const registrationSectionRef = useRef(null);
  const virtualSectionRef = useRef(null);
  const feedbackSectionRef = useRef(null);

  const anyModalOpen = showRegister || showEventDetails || showFeedback || showCreate || !!confirmDelete;

  useEffect(() => {
    if (!anyModalOpen) return undefined;

    const { body } = document;
    const prevOverflow = body.style.overflow;
    const prevPaddingRight = body.style.paddingRight;

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPaddingRight;
    };
  }, [anyModalOpen]);

  const EVENTS_PER_PAGE = 3;
  const GRID_EVENTS_PER_PAGE = 6;

  const isAdmin = user && ['super_admin', 'admin', 'hr', 'alumni_officer'].includes(user.role);

  const steps = [
    { id: 1, label: 'Events' },
    { id: 2, label: 'Registration' },
    { id: 3, label: 'Virtual & Onsite' },
    { id: 4, label: 'Feedback' },
  ];

  const scrollToStep = (stepId) => {
    const map = {
      1: eventsSectionRef,
      2: registrationSectionRef,
      3: virtualSectionRef,
      4: feedbackSectionRef,
    };
    const ref = map[stepId];
    const node = ref?.current;
    if (!node) return;

    // Align to top with a small offset so it doesn't feel too tight.
    const top = window.scrollY + node.getBoundingClientRect().top - 18;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const isSameDay = (a, b) => {
    if (!a || !b) return false;
    const da = new Date(a);
    const db = new Date(b);
    return da.getFullYear() === db.getFullYear()
      && da.getMonth() === db.getMonth()
      && da.getDate() === db.getDate();
  };

  const inRangeDays = (date, fromDays, toDays) => {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return false;
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + fromDays, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + toDays, 23, 59, 59, 999);
    return d >= start && d <= end;
  };

  const getCalendarGrid = (year, month) => {
    const first = new Date(year, month, 1);
    const firstDow = first.getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDow; i += 1) cells.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
    while (cells.length % 7 !== 0) cells.push(null);
    while (cells.length < 42) cells.push(null);
    return cells;
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiEndpoints.events);
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load events', err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    try {
      const rawUser = localStorage.getItem('user');
      if (rawUser) setUser(JSON.parse(rawUser));
    } catch {
      // ignore malformed user storage
    }
    fetchEvents();
  }, []);

  const toastTimerRef = useRef(null);
  const TOAST_CENTER_OFFSET_PX = 0;
  const notify = (type, text) => {
    const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    setToast({ id, type, text });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  };

  const toastTheme = (type) => {
    if (type === 'error') return { bg: '#fee2e2', border: '#fecaca', iconBg: '#ef4444', text: '#7f1d1d' };
    if (type === 'warning') return { bg: '#fef3c7', border: '#fde68a', iconBg: '#f59e0b', text: '#7c2d12' };
    if (type === 'info') return { bg: '#cffafe', border: '#a5f3fc', iconBg: '#06b6d4', text: '#0e7490' };
    return { bg: '#dcfce7', border: '#bbf7d0', iconBg: '#22c55e', text: '#065f46' };
  };

  const ToastIcon = ({ type }) => {
    const common = { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: '#fff', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' };
    if (type === 'success') {
      return (
        <svg {...common}>
          <path d="M20 6 9 17l-5-5" />
        </svg>
      );
    }
    if (type === 'info') {
      return (
        <svg {...common}>
          <path d="M12 16v-6" />
          <path d="M12 8h.01" />
          <circle cx="12" cy="12" r="10" stroke="none" fill="rgba(255,255,255,0.22)" />
        </svg>
      );
    }
    // error / warning
    return (
      <svg {...common}>
        <path d="M12 9v5" />
        <path d="M12 17h.01" />
      </svg>
    );
  };

  const filtered = useMemo(() => {
    let list = events.slice().sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    if (query) list = list.filter(e => (e.title || '').toLowerCase().includes(query.toLowerCase()));

    if (dateFilter === 'today') {
      const today = new Date();
      list = list.filter(e => isSameDay(e.startDate, today));
    } else if (dateFilter === 'this_week') {
      list = list.filter(e => inRangeDays(e.startDate, 0, 7));
    } else if (dateFilter === 'next_week') {
      list = list.filter(e => inRangeDays(e.startDate, 8, 14));
    } else if (dateFilter === 'date' && selectedDate) {
      list = list.filter(e => isSameDay(e.startDate, selectedDate));
    }
    return list;
  }, [events, query, dateFilter, selectedDate]);

  const registrationEvents = useMemo(
    () => events.slice().sort((a, b) => new Date(a.startDate) - new Date(b.startDate)),
    [events],
  );
  const registrationFilteredEvents = useMemo(() => {
    if (!regSelectedDate) return registrationEvents;
    return registrationEvents.filter(e => isSameDay(e.startDate, regSelectedDate));
  }, [registrationEvents, regSelectedDate]);

  useEffect(() => {
    if (registrationFilteredEvents.length === 0) return;
    if (regPickIndex >= registrationFilteredEvents.length) setRegPickIndex(0);
    if (!selectedEvent) setSelectedEvent(registrationFilteredEvents[0]);
  }, [registrationFilteredEvents, regPickIndex, selectedEvent]);

  useEffect(() => {
    setPage(1);
    setGridPage(1);
  }, [query, dateFilter, selectedDate]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / EVENTS_PER_PAGE));
  const safePage = Math.min(Math.max(page, 1), pageCount);
  const pagedEvents = useMemo(() => {
    const start = (safePage - 1) * EVENTS_PER_PAGE;
    return filtered.slice(start, start + EVENTS_PER_PAGE);
  }, [filtered, safePage]);

  const gridPageCount = Math.max(1, Math.ceil(filtered.length / GRID_EVENTS_PER_PAGE));
  const safeGridPage = Math.min(Math.max(gridPage, 1), gridPageCount);
  const pagedGridEvents = useMemo(() => {
    const start = (safeGridPage - 1) * GRID_EVENTS_PER_PAGE;
    return filtered.slice(start, start + GRID_EVENTS_PER_PAGE);
  }, [filtered, safeGridPage]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  useEffect(() => {
    if (gridPage > gridPageCount) setGridPage(gridPageCount);
  }, [gridPage, gridPageCount]);

  // helper to format date
  const fmt = (d) => {
    try { return new Date(d).toLocaleString(); } catch { return d; }
  };
  const fmtDateOnly = (d) => {
    try { return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); } catch { return d; }
  };
  const normalizeDateInput = (raw) => {
    const v = String(raw || '').trim();
    if (!v) return '';
    // datetime-local inputs typically look like "2026-03-03T18:00"
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) {
      const [datePart, timePart] = v.split('T');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes] = String(timePart || '').split(':').map(Number);
      const localDate = new Date(year, (month || 1) - 1, day || 1, hours || 0, minutes || 0, 0, 0);
      if (!Number.isNaN(localDate.getTime())) return localDate.toISOString();
    }
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
    return v;
  };
  const resolveEventImage = (value) => {
    if (!value) return '/hero.jpg';
    return resolveApiAssetUrl(value);
  };

  const handleDeleteEvent = async (ev) => {
    if (!isAdmin || !ev?._id) return;

    const token = localStorage.getItem('token');
    if (!token) { notify('error', 'Missing login token. Please sign in again.'); return; }

    setDeletingId(ev._id);
    try {
      const res = await fetch(apiEndpoints.event(ev._id), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || `Failed to delete (HTTP ${res.status})`);

      setEvents(prev => (Array.isArray(prev) ? prev.filter(e2 => e2 && e2._id !== ev._id) : []));
      if (selectedEvent?._id === ev._id) setSelectedEvent(null);
      notify('success', 'Event deleted.');
      await fetchEvents();
    } catch (err) {
      console.error(err);
      notify('error', err.message || 'Failed to delete event');
    } finally {
      setDeletingId(null);
    }
  };

  const handleRegistrationSubmit = async (form, { closeModal = false } = {}) => {
    if (!selectedEvent?._id) {
      notify('warning', 'Please select an event to register.');
      return false;
    }

    try {
      const res = await fetch(apiEndpoints.registerEvent(selectedEvent._id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json().catch(() => ({}));
      const message = json?.message || 'Registration failed';

      if (res.ok) {
        if (closeModal) setShowRegister(false);
        notify('success', message);
        return true;
      }

      if (res.status === 409) {
        if (closeModal) setShowRegister(false);
        notify('info', message || 'You already registered for this event');
        return true;
      }

      throw new Error(message || `Failed to register (HTTP ${res.status})`);
    } catch (err) {
      console.error(err);
      notify('error', err.message || 'Registration failed');
      return false;
    }
  };

  const openEventDetails = (ev) => {
    setSelectedEvent(ev);
    setShowEventDetails(true);
  };

  const openRegisterModal = (ev) => {
    setSelectedEvent(ev);
    setShowRegister(true);
  };

  const loadAdminRegistrations = async (eventId, status = adminRegStatusFilter) => {
    const token = localStorage.getItem('token');
    if (!token || !eventId) return;

    setAdminRegLoading(true);
    try {
      const res = await fetch(apiEndpoints.eventRegistrations(eventId, status), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Failed to load registrations');
      setAdminRegistrations(Array.isArray(json?.registrations) ? json.registrations : []);
    } catch (err) {
      console.error(err);
      notify('error', err?.message || 'Failed to load registrations');
      setAdminRegistrations([]);
    } finally {
      setAdminRegLoading(false);
    }
  };

  const handleApproveRegistration = async (registrationId) => {
    if (!selectedEvent?._id || !registrationId) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    setAdminRegBusyId(String(registrationId));
    try {
      const res = await fetch(apiEndpoints.approveEventRegistration(selectedEvent._id, registrationId), {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Failed to approve registration');
      notify('success', 'Registration approved.');
      await loadAdminRegistrations(selectedEvent._id);
    } catch (err) {
      console.error(err);
      notify('error', err?.message || 'Failed to approve registration');
    } finally {
      setAdminRegBusyId('');
    }
  };

  const handleRejectRegistration = async (registrationId) => {
    if (!selectedEvent?._id || !registrationId) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    setAdminRegBusyId(String(registrationId));
    try {
      const res = await fetch(apiEndpoints.rejectEventRegistration(selectedEvent._id, registrationId), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: adminRegRejectReason }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Failed to reject registration');
      notify('success', 'Registration rejected.');
      await loadAdminRegistrations(selectedEvent._id);
    } catch (err) {
      console.error(err);
      notify('error', err?.message || 'Failed to reject registration');
    } finally {
      setAdminRegBusyId('');
    }
  };

  useEffect(() => {
    if (!isAdmin || !selectedEvent?._id) return;
    loadAdminRegistrations(selectedEvent._id, adminRegStatusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, selectedEvent?._id, adminRegStatusFilter]);

  const PinIcon = ({ color = '#d97706' }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M21 10c0 6-9 13-9 13S3 16 3 10a9 9 0 0 1 18 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
  const CalendarIcon = ({ color = '#d97706' }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );

  return (
    <motion.div
      className="eventsPageRoot"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.3 }}
      style={{ display: 'flex', minHeight: '100vh', background: '#f3f4f6' }}
    >
      <style>{`
        .modal-no-scrollbar {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .modal-no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .eventActionLink {
          position: relative;
          display: inline-block;
          background: transparent;
          border: none;
          padding: 0;
          font-weight: 500;
          font-size: 13px;
          text-decoration: none;
          cursor: pointer;
        }
        .eventActionLink:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }
        .eventActionLink::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          bottom: -4px;
          height: 2px;
          border-radius: 999px;
          background: currentColor;
          transform: scaleX(0);
          transform-origin: right;
          transition: transform 180ms ease-out;
        }
        .eventActionLink:hover::after {
          transform: scaleX(1);
        }
        .eventActionLink:focus-visible {
          outline: none;
        }
        .eventActionLink:focus-visible::after {
          transform: scaleX(1);
        }
        .eventActionLink--register { color: #e1aa18; }
        .eventActionLink--delete { color: #b91c1c; }

        .eventCardButtonNoSweep::before,
        .eventCardButtonNoSweep:hover::before,
        .eventCardButtonNoSweep:focus-visible::before {
          content: none !important;
          animation: none !important;
          display: none !important;
        }

        @media (max-width: 1024px) {
          .eventsMain {
            padding: 20px 20px !important;
            gap: 22px !important;
          }
          .eventsHeroControls {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 14px !important;
          }
          .eventsStepper {
            min-width: 0 !important;
            width: 100% !important;
            justify-content: space-between !important;
          }
          .eventsSearchBar {
            width: 100% !important;
          }
          .eventsListLayout {
            flex-direction: column !important;
            gap: 16px !important;
          }
          .eventsSidebar {
            width: 100% !important;
          }
          .eventsListCard {
            flex-direction: column !important;
            gap: 12px !important;
          }
          .eventsListCardMedia {
            width: 100% !important;
          }
          .eventsRegistrationSection {
            flex-direction: column !important;
            gap: 16px !important;
            padding: 22px !important;
          }
          .eventsRegistrationPanel {
            width: 100% !important;
          }
          .eventsRegistrationFormWrap {
            width: 100% !important;
            justify-content: flex-start !important;
          }
          .eventsRegistrationForm {
            width: 100% !important;
          }
          .eventsVirtualSection {
            padding: 42px 0 24px !important;
          }
          .eventsVirtualGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 18px !important;
            margin-top: 26px !important;
          }
          .eventsFeedbackSection {
            padding: 22px !important;
          }
          .eventsFeedbackCard {
            width: 100% !important;
            padding: 20px !important;
          }
        }

        @media (max-width: 900px) {
          /* Compensate for the fixed mobile top nav from Sidebar */
          .eventsMain {
            padding-top: 76px !important;
          }
        }

        @media (max-width: 640px) {
          .eventsPageRoot {
            width: 100%;
            max-width: 100vw;
            overflow-x: hidden;
          }
          .eventsMain {
            padding: 14px 10px !important;
            gap: 14px !important;
            width: 100%;
            max-width: 100vw;
            overflow-x: hidden;
          }
          .eventsHero {
            border-radius: 8px !important;
            padding: 16px 12px !important;
            width: 100%;
            max-width: 100%;
          }
          .eventsHeroTitle {
            font-size: 30px !important;
            line-height: 1.12 !important;
          }
          .eventsHeroSubtitle {
            font-size: 12px !important;
          }
          .eventsStepper {
            gap: 6px !important;
            justify-content: space-between !important;
            flex-wrap: nowrap !important;
            overflow-x: hidden !important;
            padding-bottom: 2px;
          }
          .eventsStepper::-webkit-scrollbar {
            display: none;
          }
          .eventsStepper button > div > div:first-child {
            width: 22px !important;
            height: 22px !important;
            font-size: 12px !important;
            line-height: 22px !important;
          }
          .eventsStepConnector {
            width: 10px !important;
            margin: 10px 6px 0 !important;
          }
          .eventsStepLabel {
            width: auto !important;
            font-size: 11px !important;
            margin-top: 4px !important;
            white-space: nowrap !important;
            max-width: 80px !important;
            text-overflow: ellipsis !important;
            overflow: hidden !important;
          }
          .eventsSearchBar {
            /* Stack input over actions on very small screens by default */
            flex-direction: column !important;
            gap: 8px !important;
            padding: 6px !important;
            align-items: stretch !important;
          }
          .eventsSearchBar input {
            width: 100% !important;
            min-width: 0 !important;
          }
          .eventsSearchActions {
            display: flex !important;
            gap: 8px !important;
            width: 100% !important;
            margin-top: 6px !important;
          }
          .eventsSearchActions button {
            flex: 1 1 auto !important;
            min-width: 0 !important;
            font-size: 12px !important;
            padding: 8px 10px !important;
          }
          .eventsSearchBtn { padding: 8px 10px !important; }
          .eventsAddBtn { padding: 8px 10px !important; }
          /* Date filter buttons: keep on one line and smaller */
          .eventsDateFilters { flex-wrap: nowrap !important; gap: 6px !important; overflow-x: hidden !important; justify-content: flex-start !important; }
          .eventsDateFilterBtn { padding: 4px 8px !important; font-size: 11px !important; border-radius: 6px !important; white-space: nowrap !important; }
          .eventsCalendarToolbar {
            display: grid !important;
            grid-template-columns: 30px minmax(0, 1fr) 76px 30px !important;
            gap: 6px !important;
            align-items: center !important;
          }
          .eventsCalendarToolbar select {
            min-width: 0 !important;
            width: 100% !important;
          }
          .eventsWeekdayGrid,
          .eventsDayGrid {
            gap: 6px !important;
          }
          .eventsListCard {
            border-radius: 10px !important;
            padding: 10px !important;
          }
          .eventsListCardMedia > div,
          .eventsListCardMedia img {
            height: 172px !important;
          }
          .eventsListCardContent {
            width: 100% !important;
          }
          .eventsPager {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .eventsRegistrationSection {
            border-radius: 0 !important;
            padding: 16px 10px !important;
          }
          .eventsRegistrationTitle {
            font-size: 24px !important;
            line-height: 1.12 !important;
            overflow-wrap: anywhere !important;
            word-break: break-word !important;
            max-width: 100% !important;
          }
          .eventsRegistrationForm {
            gap: 10px !important;
          }
          .eventsFormCard {
            padding: 14px 10px !important;
            border-radius: 8px !important;
          }
          .eventsFormHeading {
            font-size: 28px !important;
          }
          .eventsVirtualSection {
            padding-top: 30px !important;
          }
          .eventsVirtualTitle {
            font-size: 37px !important;
          }
          .eventsVirtualGrid {
            grid-template-columns: 1fr !important;
            gap: 14px !important;
          }
          .eventsFeedbackSection {
            border-radius: 0 !important;
            padding: 16px 10px !important;
          }
          .eventsFeedbackTitle {
            font-size: 35px !important;
          }
          .eventsRegisterModal {
            max-width: calc(100vw - 16px) !important;
            padding: 10px !important;
          }
        }
      `}</style>
      <Sidebar isOpen={sidebarOpen} toggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Global toast (fixed at top of viewport) */}
      <AnimatePresence initial={false}>
        {toast && (() => {
          const t = toastTheme(toast.type);
          return (
            <div
              style={{
                position: 'fixed',
                top: 16,
                left: `calc(50% + ${TOAST_CENTER_OFFSET_PX}px)`,
                transform: 'translateX(-50%)',
                zIndex: 9999,
                pointerEvents: 'none',
              }}
            >
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              style={{
                width: 'fit-content',
                maxWidth: 'min(680px, calc(100vw - 24px))',
                padding: '8px 12px',
                borderRadius: 10,
                background: t.bg,
                border: `1px solid ${t.border}`,
                boxShadow: '0 10px 30px rgba(17,24,39,0.12)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 20, height: 20, borderRadius: 999, background: t.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ToastIcon type={toast.type} />
                </div>
                <div style={{ color: t.text, fontWeight: 700, fontSize: 13, lineHeight: 1.25, whiteSpace: 'nowrap' }}>
                  {toast.text}
                </div>
              </div>
            </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      <div className="eventsMain" style={{ flex: 1, padding: '28px 48px', display: 'flex', flexDirection: 'column', gap: 28 }}>
        {/* Hero / stepper / search */}
        <section className="eventsHero" style={{ background: '#fff', borderRadius: 10, padding: 22, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <h1 className="eventsHeroTitle" style={{ fontSize: 32, fontWeight: 800, margin: 0, color: '#111827' }}>
            Events &amp; <span style={{ color: '#e1aa18' }}>Community Engagement</span>
          </h1>
          <p className="eventsHeroSubtitle" style={{ marginTop: 6, color: '#6b7280', fontStyle: 'italic', fontSize: 14 }}>Discover upcoming events, connect with fellow alumni, and stay engaged with our vibrant community.</p>

          <div className="eventsHeroControls" style={{ marginTop: 18, display: 'flex', gap: 20, alignItems: 'center' }}>
            {/* Stepper */}
              <div className="eventsStepper" style={{ minWidth: 0, display: 'flex', alignItems: 'center', flexWrap: 'nowrap', gap: 8 }}>
              {steps.map((s, idx) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => { setActiveStep(s.id); scrollToStep(s.id); }}
                    style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
                    aria-label={`Step ${s.id}: ${s.label}`}
                  >
                    <div style={{ display: 'grid', justifyItems: 'center' }}>
                      <div style={{
                        width: 30,
                        height: 30,
                        borderRadius: 999,
                        background: '#f4b400',
                        color: '#fff',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: activeStep === s.id ? '0 0 0 3px rgba(244,180,0,0.18)' : 'none',
                      }}
                      >
                        {s.id}
                      </div>
                      <div className="eventsStepLabel" style={{ marginTop: 6, fontSize: 11, color: '#d97706', textAlign: 'center', width: 74 }}>{s.label}</div>
                    </div>
                  </button>
                  {idx !== steps.length - 1 && (
                    <div className="eventsStepConnector" style={{ width: 36, height: 2, background: '#f4b400', margin: '14px 10px 0 10px' }} />
                  )}
                </div>
              ))}
            </div>

            {/* Search */}
            <div className="eventsSearchBar" style={{ flex: 1, background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 10, padding: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search events..."
                style={{ flex: 1, padding: '9px 11px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f8fafc', fontSize: 13, minWidth: 0 }}
              />

              <div className="eventsSearchActions" style={{ display: 'flex', gap: 10 }}>
                <button className="eventsSearchBtn" style={{ background: '#f4b400', color: '#fff', padding: '9px 14px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 13 }}>
                  Search
                </button>
                {isAdmin && (
                  <button
                    className="eventsAddBtn"
                    onClick={() => { setShowCreate(true); setCreateMessage(''); }}
                    style={{ background: '#111827', color: '#fff', padding: '9px 14px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 13 }}
                  >
                    Add Event
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Main list + calendar */}
        <section ref={eventsSectionRef} className="eventsListLayout" style={{ display: 'flex', gap: 22, alignItems: 'flex-start', scrollMarginTop: 90 }}>
          <aside className="eventsSidebar" style={{ width: 320, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: 18 }}>
              <div className="eventsDateFilters" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {(() => {
                  const buttonBase = { padding: '9px 12px', borderRadius: 8, border: 'none', fontWeight: 800, fontSize: 13 };
                  const dark = { background: '#111827', color: '#fff' };
                  const light = { background: '#111827', color: '#fff', opacity: 0.92 };
                  const mk = (key, label) => (
                    <button
                      key={key}
                      type="button"
                      className="eventsDateFilterBtn"
                      onClick={() => { setDateFilter(key); setSelectedDate(null); }}
                      style={{ ...buttonBase, ...(dateFilter === key ? dark : light) }}
                    >
                      {label}
                    </button>
                  );
                  return (
                    <>
                      {mk('today', 'Today')}
                      {mk('this_week', 'This Week')}
                      {mk('next_week', 'Next Week')}
                    </>
                  );
                })()}
              </div>

              <div style={{ marginTop: 18, borderRadius: 12, padding: 14, border: '1px solid #e5e7eb' }}>
                <div className="eventsCalendarToolbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date(calendarYear, calendarMonth, 1);
                      d.setMonth(d.getMonth() - 1);
                      setCalendarMonth(d.getMonth());
                      setCalendarYear(d.getFullYear());
                    }}
                    style={{ width: 30, height: 30, borderRadius: 999, border: '1px solid #e5e7eb', background: '#fff', fontWeight: 900, cursor: 'pointer' }}
                    aria-label="Previous month"
                  >
                    ‹
                  </button>

                  <select value={calendarMonth} onChange={(e) => setCalendarMonth(Number(e.target.value))} style={{ flex: 1, padding: '7px 9px', borderRadius: 8, border: '1px solid #e5e7eb', fontWeight: 800, fontSize: 13 }}>
                    {monthNames.map((m, idx) => <option key={m} value={idx}>{m}</option>)}
                  </select>

                  <select value={calendarYear} onChange={(e) => setCalendarYear(Number(e.target.value))} style={{ width: 92, padding: '7px 9px', borderRadius: 8, border: '1px solid #e5e7eb', fontWeight: 800, fontSize: 13 }}>
                    {Array.from({ length: 15 }).map((_, i) => {
                      const y = new Date().getFullYear() - 5 + i;
                      return <option key={y} value={y}>{y}</option>;
                    })}
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date(calendarYear, calendarMonth, 1);
                      d.setMonth(d.getMonth() + 1);
                      setCalendarMonth(d.getMonth());
                      setCalendarYear(d.getFullYear());
                    }}
                    style={{ width: 30, height: 30, borderRadius: 999, border: '1px solid #e5e7eb', background: '#fff', fontWeight: 900, cursor: 'pointer' }}
                    aria-label="Next month"
                  >
                    ›
                  </button>
                </div>

                <div className="eventsWeekdayGrid" style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10 }}>
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                    <div key={d} style={{ fontSize: 12, textAlign: 'center', color: '#6b7280', fontWeight: 800 }}>{d}</div>
                  ))}
                </div>

                <div className="eventsDayGrid" style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10 }}>
                  {getCalendarGrid(calendarYear, calendarMonth).map((day, idx) => {
                    const dateObj = day ? new Date(calendarYear, calendarMonth, day) : null;
                    const selected = day && selectedDate && isSameDay(dateObj, selectedDate);
                    const isToday = day && isSameDay(dateObj, new Date());
                    const canPick = Boolean(day);
                    return (
                      <button
                        // eslint-disable-next-line react/no-array-index-key
                        key={idx}
                        type="button"
                        disabled={!canPick}
                        onClick={() => {
                          if (!dateObj) return;
                          setSelectedDate(dateObj);
                          setDateFilter('date');
                        }}
                        style={{
                          height: 30,
                          borderRadius: 999,
                          border: 'none',
                          background: !canPick ? 'transparent' : (selected ? '#111827' : '#fff'),
                          color: selected ? '#fff' : '#111827',
                          fontWeight: selected || isToday ? 900 : 700,
                          fontSize: 13,
                          cursor: canPick ? 'pointer' : 'default',
                          outline: isToday && !selected ? '2px solid rgba(244,180,0,0.35)' : 'none',
                        }}
                      >
                        {day || ''}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>

          <div className="eventsListContent" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Event card list */}
            {loading ? (
              <div style={{ color: '#6b7280' }}>Loading events...</div>
            ) : filtered.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: 10, padding: 16, color: '#6b7280' }}>
                <div style={{ fontWeight: 700, color: '#111827' }}>No events yet</div>
                <div style={{ marginTop: 6 }}>
                  {isAdmin
                    ? 'No events are posted yet. Use the "Add Event" button above to create one.'
                    : 'No events are posted yet. Please check back later - an admin will post upcoming events soon.'}
                </div>
              </div>
            ) : (
              pagedEvents.map(ev => {
                const cardId = String(ev?._id || '');
                const isHovered = hoveredEventCardId === cardId;
                return (
                <div
                  key={ev._id}
                  className="eventsListCard"
                  onMouseEnter={() => setHoveredEventCardId(cardId)}
                  onMouseLeave={() => setHoveredEventCardId('')}
                  style={{
                    display: 'flex',
                    gap: 18,
                    background: '#fff',
                    borderRadius: 12,
                    padding: 14,
                    alignItems: 'stretch',
                    boxShadow: isHovered ? '0 10px 26px rgba(15, 23, 42, 0.12)' : '0 1px 2px rgba(0,0,0,0.04)',
                    transform: isHovered ? 'scale(1.008)' : 'scale(1)',
                    transition: 'transform 180ms ease, box-shadow 180ms ease',
                  }}
                >
                  <div className="eventsListCardMedia" style={{ width: 240, flexShrink: 0, position: 'relative' }}>
                    <div style={{ height: 160, borderRadius: 12, background: 'linear-gradient(135deg,#34d399,#86efac)' }} />
                    <img
                      src={resolveEventImage(ev.imageUrl)}
                      alt={ev.title || 'Event'}
                      style={{ position: 'absolute', inset: 0, width: '100%', height: 160, objectFit: 'cover', borderRadius: 12, display: 'block' }}
                      onError={(e) => {
                        // eslint-disable-next-line no-param-reassign
                        if (e.currentTarget.src.endsWith('/hero.jpg')) e.currentTarget.style.display = 'none';
                        // eslint-disable-next-line no-param-reassign
                        else e.currentTarget.src = '/hero.jpg';
                      }}
                    />
                  </div>

                  <div className="eventsListCardContent" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ fontWeight: 900, fontSize: 19, color: isHovered ? '#d4a009' : '#111827', transition: 'color 180ms ease' }}>{ev.title || 'Event Title'}</div>
                      <div style={{ background: '#f4b400', color: '#fff', padding: '5px 10px', borderRadius: 6, fontWeight: 900, fontSize: 11 }}>
                        {ev.category || 'Tech Talks'}
                      </div>
                    </div>

                    <div style={{ marginTop: 8, color: '#6b7280', lineHeight: 1.45, fontSize: 13 }}>
                      {ev.description || 'Brief description of the event goes here. This is where you can add a short summary of what the event is about.'}
                    </div>

                    <div style={{ marginTop: 14, display: 'grid', gap: 9, color: '#374151' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <PinIcon />
                        <span style={{ color: '#6b7280', fontWeight: 500, fontSize: 13 }}>
                          {ev.isVirtual ? 'Online' : (ev.location || 'Location, City')}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <CalendarIcon />
                        <span style={{ color: '#6b7280', fontWeight: 500, fontSize: 13 }}>{fmt(ev.startDate)}</span>
                      </div>
                    </div>

                    <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
                      <button
                        type="button"
                        onClick={() => openEventDetails(ev)}
                        className="eventActionLink"
                        style={{ color: '#111827' }}
                      >
                        View details
                      </button>
                      <button
                        type="button"
                        onClick={() => openRegisterModal(ev)}
                        className="eventActionLink eventActionLink--register"
                      >
                        Register
                      </button>
                      {isAdmin && (
                        <button
                          type="button"
                          disabled={deletingId === ev._id}
                          onClick={() => setConfirmDelete(ev)}
                          className="eventActionLink eventActionLink--delete"
                        >
                          {deletingId === ev._id ? 'Deleting...' : 'Delete'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
              })
            )}

            {!loading && filtered.length > EVENTS_PER_PAGE && (
              <div className="eventsPager" style={{ marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ color: '#6b7280', fontSize: 12, fontWeight: 700 }}>
                  Showing {(safePage - 1) * EVENTS_PER_PAGE + 1}-{Math.min(safePage * EVENTS_PER_PAGE, filtered.length)} of {filtered.length}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontWeight: 900, cursor: safePage <= 1 ? 'not-allowed' : 'pointer', opacity: safePage <= 1 ? 0.6 : 1 }}
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    disabled={safePage >= pageCount}
                    onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                    style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#111827', color: '#fff', fontWeight: 900, cursor: safePage >= pageCount ? 'not-allowed' : 'pointer', opacity: safePage >= pageCount ? 0.6 : 1 }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Registration / Attendance Tracking section */}
        <section ref={registrationSectionRef} className="eventsRegistrationSection" style={{ background: '#e8c42b', borderRadius: 6, padding: 28, display: 'flex', gap: 22, alignItems: 'flex-start', scrollMarginTop: 90 }}>
          <div className="eventsRegistrationPanel" style={{ width: 320 }}>
            <h2 className="eventsRegistrationTitle" style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>Events Registration/Attendance Tracking</h2>
            <p style={{ color: '#1f2937' }}>Select Date</p>
            <div style={{ background: '#fff', padding: 12, borderRadius: 10 }}>
              <div className="eventsCalendarToolbar" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date(regCalendarYear, regCalendarMonth - 1, 1);
                    setRegCalendarMonth(d.getMonth());
                    setRegCalendarYear(d.getFullYear());
                  }}
                  style={{ width: 30, height: 30, borderRadius: 999, border: '1px solid #e5e7eb', background: '#fff' }}
                  aria-label="Previous month"
                >
                  ‹
                </button>
                <select
                  value={regCalendarMonth}
                  onChange={(e) => setRegCalendarMonth(Number(e.target.value))}
                  style={{ flex: 1, padding: '7px 9px', borderRadius: 8, border: '1px solid #e5e7eb', fontWeight: 800, fontSize: 13 }}
                >
                  {monthNames.map((m, idx) => <option key={m} value={idx}>{m}</option>)}
                </select>
                <select
                  value={regCalendarYear}
                  onChange={(e) => setRegCalendarYear(Number(e.target.value))}
                  style={{ width: 92, padding: '7px 9px', borderRadius: 8, border: '1px solid #e5e7eb', fontWeight: 800, fontSize: 13 }}
                >
                  {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date(regCalendarYear, regCalendarMonth + 1, 1);
                    setRegCalendarMonth(d.getMonth());
                    setRegCalendarYear(d.getFullYear());
                  }}
                  style={{ width: 30, height: 30, borderRadius: 999, border: '1px solid #e5e7eb', background: '#fff' }}
                  aria-label="Next month"
                >
                  ›
                </button>
              </div>

              <div className="eventsWeekdayGrid eventsDayGrid" style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, textAlign: 'center' }}>
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                  <div key={d} style={{ fontSize: 11, color: '#6b7280', fontWeight: 800 }}>{d}</div>
                ))}

                {getCalendarGrid(regCalendarYear, regCalendarMonth).map((day, idx) => {
                  const isEmpty = !day;
                  const d = isEmpty ? null : new Date(regCalendarYear, regCalendarMonth, day);
                  const selected = d && regSelectedDate && isSameDay(d, regSelectedDate);
                  return (
                    <button
                      // eslint-disable-next-line react/no-array-index-key
                      key={idx}
                      type="button"
                      disabled={isEmpty}
                      onClick={() => {
                        if (!d) return;
                        setRegSelectedDate(d);
                        setRegPickIndex(0);
                        const matching = registrationEvents.filter(e => isSameDay(e.startDate, d));
                        if (matching[0]) setSelectedEvent(matching[0]);
                      }}
                      style={{
                        height: 34,
                        borderRadius: 10,
                        border: 'none',
                        background: selected ? 'rgba(244,180,0,0.18)' : 'transparent',
                        color: selected ? '#111827' : '#111827',
                        fontWeight: selected ? 900 : 700,
                        cursor: isEmpty ? 'default' : 'pointer',
                        opacity: isEmpty ? 0 : 1,
                      }}
                    >
                      {day || ''}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#111827' }}>Select Event</div>
                <button
                  type="button"
                  disabled={registrationFilteredEvents.length <= 1}
                  onClick={() => {
                    if (registrationFilteredEvents.length === 0) return;
                    const next = (regPickIndex + 1) % registrationFilteredEvents.length;
                    setRegPickIndex(next);
                    setSelectedEvent(registrationFilteredEvents[next]);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    color: '#111827',
                    fontWeight: 700,
                    cursor: registrationFilteredEvents.length <= 1 ? 'not-allowed' : 'pointer',
                    opacity: registrationFilteredEvents.length <= 1 ? 0.5 : 1,
                  }}
                >
                  Next →
                </button>
              </div>

              {registrationFilteredEvents.length === 0 ? (
                <div style={{ marginTop: 10, color: '#1f2937' }}>
                  {regSelectedDate ? 'No events on selected date.' : 'No events available.'}
                </div>
              ) : (() => {
                const ev = registrationFilteredEvents[Math.min(regPickIndex, registrationFilteredEvents.length - 1)];
                const checked = selectedEvent?._id === ev?._id;
                return (
                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button
                      type="button"
                      onClick={() => { setSelectedEvent(ev); }}
                      style={{
                        flex: 1,
                        textAlign: 'left',
                        background: '#fff',
                        border: '1px solid rgba(17,24,39,0.08)',
                        borderRadius: 10,
                        padding: 12,
                        boxShadow: '0 10px 24px rgba(17,24,39,0.08)',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 700 }}>Event Name</div>
                          <div style={{ marginTop: 2, fontSize: 15, fontWeight: 900, color: '#111827', lineHeight: 1.2 }}>
                            {ev?.title || 'Untitled event'}
                          </div>

                          <div style={{ marginTop: 10, fontSize: 12, color: '#6b7280', fontWeight: 700 }}>Location</div>
                          <div style={{ marginTop: 2, fontSize: 13, color: '#111827' }}>
                            {ev?.isVirtual ? 'Online' : (ev?.location || 'Location')}
                          </div>

                          <div style={{ marginTop: 10, fontSize: 12, color: '#6b7280', fontWeight: 700 }}>Date &amp; Time</div>
                          <div style={{ marginTop: 2, fontSize: 13, color: '#111827' }}>
                            {fmt(ev?.startDate)}
                          </div>
                        </div>

                        <div style={{ width: 62, height: 62, borderRadius: 10, overflow: 'hidden', background: '#e5e7eb', flexShrink: 0 }}>
                          <img
                            src={resolveEventImage(ev?.imageUrl)}
                            alt={ev?.title || 'Event'}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            onError={(e) => {
                              // eslint-disable-next-line no-param-reassign
                              if (e.currentTarget.src.endsWith('/hero.jpg')) e.currentTarget.style.display = 'none';
                              // eslint-disable-next-line no-param-reassign
                              else e.currentTarget.src = '/hero.jpg';
                            }}
                          />
                        </div>
                      </div>
                    </button>

                    <input
                      type="radio"
                      name="registrationEventPick"
                      checked={!!checked}
                      onChange={() => { setSelectedEvent(ev); }}
                      aria-label={`Select event ${ev?.title || 'event'}`}
                      style={{ width: 18, height: 18 }}
                    />
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="eventsRegistrationFormWrap" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', alignSelf: 'stretch' }}>
            <div className="eventsRegistrationForm" style={{ width: 680, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ color: '#111827', fontSize: 16 }}>
                Selected Event: {selectedEvent ? selectedEvent.title : 'Tech Summit 2026'}
              </div>
              <div className="eventsFormCard" style={{ background: '#fff', padding: '28px 32px', borderRadius: 10 }}>
                <h3 className="eventsFormHeading" style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>Registration Form</h3>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const form = Object.fromEntries(new FormData(e.target).entries());
                  await handleRegistrationSubmit(form);
                }}>
                  <div style={{ marginTop: 18, display: 'grid', gap: 18 }}>
                    <div style={{ display: 'grid', gap: 8 }}>
                      <div style={{ fontWeight: 700, color: '#111827' }}>Name</div>
                      <input
                        name="name"
                        placeholder="Full Name"
                        required
                        style={{
                          padding: '12px 14px',
                          borderRadius: 8,
                          border: '1px solid #eef2f7',
                          background: '#f3f4f6',
                          fontSize: 14,
                          outline: 'none',
                        }}
                      />
                    </div>

                    <div style={{ display: 'grid', gap: 8 }}>
                      <div style={{ fontWeight: 700, color: '#111827' }}>Phone Number</div>
                      <input
                        name="phone"
                        placeholder="(123) 456-7890"
                        style={{
                          padding: '12px 14px',
                          borderRadius: 8,
                          border: '1px solid #eef2f7',
                          background: '#f3f4f6',
                          fontSize: 14,
                          outline: 'none',
                        }}
                      />
                    </div>

                    <div style={{ display: 'grid', gap: 8 }}>
                      <div style={{ fontWeight: 700, color: '#111827' }}>Email</div>
                      <input
                        name="email"
                        placeholder="your@email.com"
                        required
                        type="email"
                        style={{
                          padding: '12px 14px',
                          borderRadius: 8,
                          border: '1px solid #eef2f7',
                          background: '#f3f4f6',
                          fontSize: 14,
                          outline: 'none',
                        }}
                      />
                    </div>

                    <button
                      type="submit"
                      style={{
                        marginTop: 8,
                        width: '100%',
                        background: '#f4b400',
                        color: '#fff',
                        padding: '12px 14px',
                        borderRadius: 8,
                        border: 'none',
                        fontWeight: 800,
                        fontSize: 16,
                        cursor: 'pointer',
                      }}
                    >
                      Register
                    </button>
                  </div>
                </form>
              </div>

              {isAdmin && selectedEvent?._id ? (
                <div style={{ background: '#fff', padding: '18px 20px', borderRadius: 10, marginTop: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                    <h4 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#111827' }}>Manage Registrations</h4>
                    <select
                      value={adminRegStatusFilter}
                      onChange={(e) => setAdminRegStatusFilter(e.target.value)}
                      style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 10px', background: '#fff', fontSize: 12, fontWeight: 700 }}
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <textarea
                      value={adminRegRejectReason}
                      onChange={(e) => setAdminRegRejectReason(e.target.value)}
                      rows={2}
                      placeholder="Reject reason (optional)"
                      style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: 10, fontSize: 12, resize: 'vertical', background: '#fff' }}
                    />
                  </div>

                  <div style={{ marginTop: 12, border: '1px solid #f1f5f9', borderRadius: 10, padding: 10, maxHeight: 280, overflowY: 'auto' }}>
                    {adminRegLoading ? (
                      <div style={{ color: '#6b7280', fontSize: 12 }}>Loading registrations...</div>
                    ) : adminRegistrations.length === 0 ? (
                      <div style={{ color: '#6b7280', fontSize: 12 }}>No registrations in this status.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {adminRegistrations.map((r) => (
                          <div key={r._id} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 10, background: '#fff' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 800, color: '#111827' }}>{r.name || 'Unnamed registrant'}</div>
                                <div style={{ fontSize: 12, color: '#6b7280' }}>{r.email || 'No email'}{r.phone ? ` • ${r.phone}` : ''}</div>
                              </div>
                              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: r.status === 'approved' ? '#16a34a' : r.status === 'rejected' ? '#b91c1c' : '#d97706' }}>
                                {r.status || 'pending'}
                              </div>
                            </div>

                            {adminRegStatusFilter === 'pending' ? (
                              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                <button
                                  type="button"
                                  disabled={adminRegBusyId === String(r._id)}
                                  onClick={() => handleApproveRegistration(r._id)}
                                  style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                                >
                                  {adminRegBusyId === String(r._id) ? 'Working...' : 'Approve'}
                                </button>
                                <button
                                  type="button"
                                  disabled={adminRegBusyId === String(r._id)}
                                  onClick={() => handleRejectRegistration(r._id)}
                                  style={{ background: '#fff', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 8, padding: '7px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                                >
                                  {adminRegBusyId === String(r._id) ? 'Working...' : 'Reject'}
                                </button>
                              </div>
                            ) : null}

                            {r.status === 'rejected' && r.rejectionReason ? (
                              <div style={{ marginTop: 8, fontSize: 11, color: '#b91c1c' }}>Reason: {r.rejectionReason}</div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {/* Virtual & Onsite grid */}
        <section ref={virtualSectionRef} className="eventsVirtualSection" style={{ padding: '72px 0 36px', background: 'radial-gradient(circle at 50% 42%, rgba(234,179,8,0.38), rgba(243,244,246,0) 55%)', scrollMarginTop: 90 }}>
          <div className="eventsVirtualContainer" style={{ maxWidth: 1240, margin: '0 auto' }}>
            <h2 className="eventsVirtualTitle" style={{ fontSize: 34, fontWeight: 900, textAlign: 'center', margin: 0, color: '#111827' }}>Virtual &amp; Onsite Events</h2>

            <div className="eventsVirtualGrid" style={{ marginTop: 46, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 28 }}>
              {(!loading && filtered.length === 0) ? (
                <div style={{ gridColumn: '1/-1', color: '#6b7280', textAlign: 'center', padding: 20 }}>
                  <div>No virtual or onsite events available</div>
                </div>
              ) : (
                pagedGridEvents.map(ev => {
                  const cardId = String(ev?._id || '');
                  const isHovered = hoveredEventCardId === cardId;
                  return (
                  <button
                    key={ev._id}
                    type="button"
                    className="eventCardButtonNoSweep"
                    onClick={() => openEventDetails(ev)}
                    onMouseEnter={() => setHoveredEventCardId(cardId)}
                    onMouseLeave={() => setHoveredEventCardId('')}
                    onFocus={() => setHoveredEventCardId(cardId)}
                    onBlur={() => setHoveredEventCardId('')}
                    style={{
                      background: '#fff',
                      borderRadius: 10,
                      overflow: 'hidden',
                      boxShadow: isHovered ? '0 20px 36px rgba(15, 23, 42, 0.16)' : '0 16px 30px rgba(17,24,39,0.08)',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      padding: 0,
                      width: '100%',
                      transform: isHovered ? 'scale(1.015)' : 'scale(1)',
                      transition: 'transform 180ms ease, box-shadow 180ms ease',
                    }}
                  >
                    <div style={{ height: 230, background: 'transparent', overflow: 'hidden', position: 'relative', lineHeight: 0 }}>
                      <img
                        src={resolveEventImage(ev.imageUrl)}
                        alt={ev.title || 'Event'}
                        style={{ position: 'absolute', top: -2, left: 0, width: '100%', height: 'calc(100% + 2px)', objectFit: 'cover', objectPosition: 'center', display: 'block' }}
                        onError={(e) => {
                          // eslint-disable-next-line no-param-reassign
                          if (e.currentTarget.src.endsWith('/hero.jpg')) e.currentTarget.style.display = 'none';
                          // eslint-disable-next-line no-param-reassign
                          else e.currentTarget.src = '/hero.jpg';
                        }}
                      />
                    </div>
                    <div style={{ padding: '22px 22px 18px' }}>
                      <div style={{ fontWeight: 900, fontSize: 18, color: isHovered ? '#d4a009' : '#111827', transition: 'color 180ms ease' }}>{ev.title || 'Event Name'}</div>
                      <div style={{ marginTop: 12, color: '#6b7280', lineHeight: 1.55, minHeight: 48 }}>
                        {ev.description || 'Brief description of the event and what attendees can expect to experience.'}
                      </div>

                      <div style={{ marginTop: 18, display: 'flex', gap: 18, alignItems: 'center', color: '#6b7280', fontSize: 13 }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <PinIcon color="#f59e0b" />
                          <span>{ev.isVirtual ? 'Online' : (ev.location || 'Location')}</span>
                        </div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <CalendarIcon color="#f59e0b" />
                          <span>{fmtDateOnly(ev.startDate)}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
                })
              )}
            </div>

            {!loading && filtered.length > GRID_EVENTS_PER_PAGE && (
              <div style={{ marginTop: 26, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ color: '#6b7280', fontSize: 12, fontWeight: 700 }}>
                  Showing {(safeGridPage - 1) * GRID_EVENTS_PER_PAGE + 1}-{Math.min(safeGridPage * GRID_EVENTS_PER_PAGE, filtered.length)} of {filtered.length}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    disabled={safeGridPage <= 1}
                    onClick={() => setGridPage(p => Math.max(1, p - 1))}
                    style={{ padding: '9px 12px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', fontWeight: 900, cursor: safeGridPage <= 1 ? 'not-allowed' : 'pointer', opacity: safeGridPage <= 1 ? 0.6 : 1 }}
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    disabled={safeGridPage >= gridPageCount}
                    onClick={() => setGridPage(p => Math.min(gridPageCount, p + 1))}
                    style={{ padding: '9px 12px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#111827', color: '#fff', fontWeight: 900, cursor: safeGridPage >= gridPageCount ? 'not-allowed' : 'pointer', opacity: safeGridPage >= gridPageCount ? 0.6 : 1 }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Feedback forms section */}
        <section ref={feedbackSectionRef} className="eventsFeedbackSection" style={{ background: '#e8c42b', borderRadius: 6, padding: 28, scrollMarginTop: 90 }}>
          <h2 className="eventsFeedbackTitle" style={{ textAlign: 'center', marginTop: 0 }}>Event Feedback Forms</h2>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 18 }}>
            <div className="eventsFeedbackCard eventsFormCard" style={{ width: 680, background: '#fff', borderRadius: 10, padding: '28px 32px' }}>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formEl = e.currentTarget;
                const form = Object.fromEntries(new FormData(formEl).entries());
                try {
                  const eventId = String(form.eventId || '').trim();
                  if (!eventId) throw new Error('Please select an event.');

                  const payload = {
                    name: String(form.name || '').trim(),
                    email: String(form.email || '').trim(),
                    rating: Number(form.rating),
                    comments: String(form.comments || '').trim(),
                  };

                  const res = await fetch(apiEndpoints.feedbackEvent(eventId), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                  });

                  const json = await res.json().catch(() => ({}));
                  if (!res.ok) throw new Error(json?.message || 'Failed to send feedback');

                  setFeedbackMessage('Thank you for your feedback.');
                  notify('success', 'Feedback submitted successfully.');
                  formEl.reset();
                } catch (err) {
                  console.error(err);
                  setFeedbackMessage(err?.message || 'Failed to send feedback');
                  notify('error', err?.message || 'Failed to send feedback');
                }
              }} style={{ marginTop: 4 }}>
                <div style={{ display: 'grid', gap: 18 }}>
                  <div style={{ display: 'grid', gap: 8 }}>
                    <div style={{ fontWeight: 700, color: '#111827' }}>Event</div>
                    <select
                      name="eventId"
                      required
                      defaultValue=""
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: 8,
                        border: '1px solid #eef2f7',
                        background: '#f3f4f6',
                        fontSize: 14,
                        outline: 'none',
                      }}
                    >
                      <option value="" disabled>Select an Event</option>
                      {events.map(ev => <option key={ev._id} value={ev._id}>{ev.title}</option>)}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gap: 8 }}>
                    <div style={{ fontWeight: 700, color: '#111827' }}>Name</div>
                    <input
                      name="name"
                      placeholder="Your Name"
                      required
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: 8,
                        border: '1px solid #eef2f7',
                        background: '#f3f4f6',
                        fontSize: 14,
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gap: 8 }}>
                    <div style={{ fontWeight: 700, color: '#111827' }}>Email</div>
                    <input
                      name="email"
                      placeholder="your@email.com"
                      type="email"
                      required
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: 8,
                        border: '1px solid #eef2f7',
                        background: '#f3f4f6',
                        fontSize: 14,
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gap: 8 }}>
                    <div style={{ fontWeight: 700, color: '#111827' }}>Rating</div>
                    <select
                      name="rating"
                      required
                      defaultValue=""
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: 8,
                        border: '1px solid #eef2f7',
                        background: '#f3f4f6',
                        fontSize: 14,
                        outline: 'none',
                      }}
                    >
                      <option value="" disabled>Select a Rating</option>
                      <option value="5">5 - Excellent</option>
                      <option value="4">4 - Good</option>
                      <option value="3">3 - Okay</option>
                      <option value="2">2 - Poor</option>
                      <option value="1">1 - Very Poor</option>
                    </select>
                  </div>

                  <div style={{ display: 'grid', gap: 8 }}>
                    <div style={{ fontWeight: 700, color: '#111827' }}>Feedback</div>
                    <textarea
                      name="comments"
                      placeholder="Please share your feedback..."
                      rows={5}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: 8,
                        border: '1px solid #eef2f7',
                        background: '#f3f4f6',
                        fontSize: 14,
                        outline: 'none',
                        resize: 'vertical',
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    style={{
                      marginTop: 8,
                      width: '100%',
                      background: '#f4b400',
                      color: '#fff',
                      padding: '12px 14px',
                      borderRadius: 8,
                      border: 'none',
                      fontWeight: 800,
                      fontSize: 16,
                      cursor: 'pointer',
                    }}
                  >
                    Submit Feedback
                  </button>
                  {feedbackMessage && <div style={{ marginTop: 10, color: '#065f46', fontWeight: 700 }}>{feedbackMessage}</div>}
                </div>
              </form>
            </div>
          </div>
        </section>

        {/* Create event modal */}
        <AnimatePresence initial={false}>
          {showEventDetails && selectedEvent && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.52)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 75,
                padding: 16,
              }}
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setShowEventDetails(false);
              }}
            >
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="modal-no-scrollbar"
                style={{
                  width: 'min(900px, calc(100vw - 32px))',
                  maxHeight: '90vh',
                  overflowY: 'auto',
                  background: '#ffffff',
                  borderRadius: 18,
                  boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
                }}
              >
                <div style={{ position: 'relative', height: 260, background: 'linear-gradient(135deg,#065f46,#1f2937)' }}>
                  <img
                    src={resolveEventImage(selectedEvent.imageUrl)}
                    alt={selectedEvent.title || 'Event'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    onError={(e) => {
                      if (e.currentTarget.src.endsWith('/hero.jpg')) e.currentTarget.style.display = 'none';
                      else e.currentTarget.src = '/hero.jpg';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowEventDetails(false)}
                    aria-label="Close event details"
                    style={{
                      position: 'absolute',
                      top: 14,
                      right: 14,
                      width: 34,
                      height: 34,
                      borderRadius: 999,
                      border: 'none',
                      background: 'rgba(17,24,39,0.65)',
                      color: '#fff',
                      fontSize: 20,
                      lineHeight: 1,
                      cursor: 'pointer',
                    }}
                  >
                    ×
                  </button>
                </div>

                <div style={{ padding: '20px 24px 24px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', background: '#f8ead0', color: '#8a5a00', borderRadius: 999, padding: '6px 12px', fontSize: 12, fontWeight: 800 }}>
                    {selectedEvent.category || 'Community Event'}
                  </div>

                  <h2 style={{ margin: '12px 0 8px', fontSize: 42, lineHeight: 1.1, fontWeight: 900, color: '#0f172a' }}>
                    {selectedEvent.title || 'Event'}
                  </h2>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '18px', marginBottom: 16 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#64748b', fontWeight: 600 }}>
                      <CalendarIcon color="#94a3b8" />
                      <span>{fmt(selectedEvent.startDate)}</span>
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#64748b', fontWeight: 600 }}>
                      <PinIcon color="#94a3b8" />
                      <span>{selectedEvent.isVirtual ? 'Online' : (selectedEvent.location || 'Location not set')}</span>
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16, marginBottom: 14 }}>
                    <div style={{ color: '#334155', fontWeight: 700, marginBottom: 6 }}>Description</div>
                    <div style={{ color: '#334155', lineHeight: 1.6 }}>
                      {selectedEvent.description || 'No description available for this event.'}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, marginBottom: 18 }}>
                    <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
                      <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 700 }}>End Date</div>
                      <div style={{ marginTop: 4, color: '#111827', fontWeight: 700 }}>
                        {selectedEvent.endDate ? fmt(selectedEvent.endDate) : 'Not specified'}
                      </div>
                    </div>
                    <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
                      <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 700 }}>Capacity</div>
                      <div style={{ marginTop: 4, color: '#111827', fontWeight: 700 }}>
                        {selectedEvent.capacity || 'Open'}
                      </div>
                    </div>
                    <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
                      <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 700 }}>Mode</div>
                      <div style={{ marginTop: 4, color: '#111827', fontWeight: 700 }}>
                        {selectedEvent.isVirtual ? 'Virtual' : 'Onsite'}
                      </div>
                    </div>
                    <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
                      <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 700 }}>Link / Venue</div>
                      <div style={{ marginTop: 4, color: '#111827', fontWeight: 700, wordBreak: 'break-word' }}>
                        {selectedEvent.isVirtual ? (selectedEvent.virtualLink || 'Not provided') : (selectedEvent.location || 'Not provided')}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    <button
                      className="hsi-btn hsi-btn-secondary"
                      type="button"
                      onClick={() => setShowEventDetails(false)}
                      style={{
                        padding: '11px 18px',
                      }}
                    >
                      Close
                    </button>
                    <button
                      className="hsi-btn hsi-btn-primary"
                      type="button"
                      onClick={() => {
                        setShowEventDetails(false);
                        openRegisterModal(selectedEvent);
                      }}
                      style={{
                        padding: '11px 18px',
                      }}
                    >
                      Register
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {showCreate && isAdmin && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 70 }}
            >
              <motion.div
                initial={{ opacity: 0, y: 14, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 14, scale: 0.98 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                style={{ width: 640, background: '#fff', borderRadius: 12, padding: 18 }}
              >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Create Event</h3>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff' }}
                >
                  Close
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setCreateMessage('');
                  setCreating(true);

                  const token = localStorage.getItem('token');
                  if (!token) { setCreateMessage('Missing login token. Please sign in again.'); notify('error', 'Missing login token. Please sign in again.'); setCreating(false); return; }

                  const fd = new FormData(e.target);
                  const isVirtual = fd.get('isVirtual') === 'on';
                  fd.set('isVirtual', String(isVirtual));

                  const title = String(fd.get('title') || '').trim();
                  const description = String(fd.get('description') || '').trim();
                  const startDate = normalizeDateInput(fd.get('startDate'));

                  if (!title || !startDate) {
                    setCreateMessage('Title and start date are required.');
                    setCreating(false);
                    return;
                  }

                  if (description.length < 100) {
                    setCreateMessage('Description must be at least 100 characters.');
                    setCreating(false);
                    return;
                  }

                  fd.set('title', title);
                  fd.set('description', description);
                  fd.set('startDate', startDate);

                  const endDate = normalizeDateInput(fd.get('endDate'));
                  if (!endDate) fd.delete('endDate');
                  else fd.set('endDate', endDate);

                  const capRaw = String(fd.get('capacity') || '').trim();
                  if (!capRaw) fd.delete('capacity');
                  else {
                    const capNum = Number(capRaw);
                    if (Number.isFinite(capNum)) fd.set('capacity', String(capNum));
                    else fd.delete('capacity');
                  }

                  if (isVirtual) fd.set('location', '');
                  else fd.set('virtualLink', '');

                  const maybeFile = fd.get('image');
                  if (maybeFile && typeof maybeFile === 'object' && 'size' in maybeFile && maybeFile.size === 0) fd.delete('image');

                  try {
                    const res = await fetch(apiEndpoints.events, {
                      method: 'POST',
                      headers: {
                        Authorization: `Bearer ${token}`,
                      },
                      body: fd,
                    });

                    const json = await res.json().catch(() => ({}));
                    if (!res.ok) {
                      const msg = json?.message || `Failed to create event (HTTP ${res.status})`;
                      throw new Error(msg);
                    }

                    setShowCreate(false);
                    setSelectedEvent(json);
                    setQuery('');
                    setEvents(prev => {
                      const next = Array.isArray(prev) ? prev.slice() : [];
                      const id = json?._id;
                      if (id && !next.some(e2 => e2 && e2._id === id)) next.push(json);
                      return next;
                    });
                    await fetchEvents();
                    notify('success', 'Event posted successfully.');
                  } catch (err) {
                    console.error(err);
                    setCreateMessage(err.message || 'Failed to create event');
                    notify('error', err.message || 'Failed to create event');
                  } finally {
                    setCreating(false);
                  }
                }}
                style={{ marginTop: 14 }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <input name="title" placeholder="Event title" required style={{ gridColumn: '1 / -1', padding: 10, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                  <input name="category" placeholder="Category (e.g., Webinar)" style={{ padding: 10, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                  <input name="capacity" type="number" min="0" placeholder="Capacity (optional)" style={{ padding: 10, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, gridColumn: '1 / -1', fontSize: 14, color: '#374151' }}>
                    <input name="isVirtual" type="checkbox" />
                    Virtual event
                  </label>
                  <textarea name="description" placeholder="Description (required, at least 100 chars)" rows={3} required minLength={100} style={{ gridColumn: '1 / -1', padding: 10, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                  <div style={{ display: 'grid', gap: 6 }}>
                    <label style={{ fontSize: 12, color: '#6b7280' }}>Start date/time</label>
                    <input name="startDate" type="datetime-local" required style={{ padding: 10, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                  </div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    <label style={{ fontSize: 12, color: '#6b7280' }}>End date/time (optional)</label>
                    <input name="endDate" type="datetime-local" style={{ padding: 10, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                  </div>
                  <input name="location" placeholder="Location (for onsite)" style={{ padding: 10, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                  <input name="virtualLink" placeholder="Virtual link (for virtual)" style={{ padding: 10, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                  <div style={{ gridColumn: '1 / -1', display: 'grid', gap: 6 }}>
                    <label style={{ fontSize: 12, color: '#6b7280' }}>Event image (optional)</label>
                    <input name="image" type="file" accept="image/*" style={{ padding: 10, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
                  <button className="hsi-btn hsi-btn-secondary" type="button" onClick={() => setShowCreate(false)} style={{ padding: '10px 14px' }}>Cancel</button>
                  <button className={creating ? 'hsi-btn hsi-btn-secondary' : 'hsi-btn hsi-btn-primary'} disabled={creating} type="submit" style={{ padding: '10px 14px' }}>
                    {creating ? 'Creating...' : 'Create'}
                  </button>
                </div>

                {createMessage && <div style={{ marginTop: 10, color: '#b91c1c' }}>{createMessage}</div>}
              </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete confirmation modal */}
        <AnimatePresence initial={false}>
          {confirmDelete && (
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
                zIndex: 80,
                padding: 16,
              }}
              onMouseDown={(e) => {
                if (e.target === e.currentTarget && deletingId !== confirmDelete?._id) setConfirmDelete(null);
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                style={{
                  width: 'min(448px, calc(100vw - 32px))',
                  background: '#fff',
                  borderRadius: 16,
                  padding: 32,
                  boxShadow: '0 20px 40px rgba(0,0,0,0.18)',
                }}
                role="dialog"
                aria-modal="true"
                aria-label="Delete confirmation"
                tabIndex={-1}
                onKeyDown={(e) => {
                  if (e.key === 'Escape' && deletingId !== confirmDelete?._id) setConfirmDelete(null);
                }}
              >
                <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: '#1f2937' }}>Confirm Delete</div>
                <div style={{ color: '#4b5563', marginBottom: 24, lineHeight: 1.45 }}>
                  Are you sure you want to delete this event?
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    className="hsi-btn hsi-btn-secondary"
                    type="button"
                    disabled={deletingId === confirmDelete._id}
                    onClick={() => setConfirmDelete(null)}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      opacity: deletingId === confirmDelete._id ? 0.7 : 1,
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="hsi-btn hsi-btn-danger"
                    type="button"
                    disabled={deletingId === confirmDelete._id}
                    onClick={async () => {
                      await handleDeleteEvent(confirmDelete);
                      setConfirmDelete(null);
                    }}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      opacity: deletingId === confirmDelete._id ? 0.7 : 1,
                    }}
                  >
                    {deletingId === confirmDelete._id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {showRegister && selectedEvent && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}
            >
              <motion.div
                initial={{ opacity: 0, y: 14, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 14, scale: 0.98 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="modal-no-scrollbar eventsRegisterModal"
                style={{ width: 720, maxWidth: 'calc(100vw - 48px)', maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: 12, padding: 18 }}
              >
                <div style={{ color: '#111827', fontSize: 18, padding: '6px 4px 14px' }}>
                  Selected Event: {selectedEvent.title}
                </div>

                <div style={{ background: '#fff', borderRadius: 10, padding: '22px 24px', border: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>Registration Form</h3>
                    <button
                      type="button"
                      onClick={() => setShowRegister(false)}
                      aria-label="Close registration modal"
                      style={{
                        border: 'none',
                        background: 'transparent',
                        fontSize: 22,
                        lineHeight: 1,
                        cursor: 'pointer',
                        padding: 6,
                        color: '#111827',
                      }}
                    >
                      ×
                    </button>
                  </div>

                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const form = Object.fromEntries(new FormData(e.target).entries());
                    await handleRegistrationSubmit(form, { closeModal: true });
                  }}>
                    <div style={{ marginTop: 18, display: 'grid', gap: 18 }}>
                      <div style={{ display: 'grid', gap: 8 }}>
                        <div style={{ fontWeight: 800, color: '#111827', fontSize: 16 }}>Name</div>
                        <input
                          name="name"
                          placeholder="Full Name"
                          required
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            borderRadius: 8,
                            border: '1px solid #eef2f7',
                            background: '#f3f4f6',
                            fontSize: 14,
                            outline: 'none',
                          }}
                        />
                      </div>

                      <div style={{ display: 'grid', gap: 8 }}>
                        <div style={{ fontWeight: 800, color: '#111827', fontSize: 16 }}>Phone Number</div>
                        <input
                          name="phone"
                          placeholder="(123) 456-7890"
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            borderRadius: 8,
                            border: '1px solid #eef2f7',
                            background: '#f3f4f6',
                            fontSize: 14,
                            outline: 'none',
                          }}
                        />
                      </div>

                      <div style={{ display: 'grid', gap: 8 }}>
                        <div style={{ fontWeight: 800, color: '#111827', fontSize: 16 }}>Email</div>
                        <input
                          name="email"
                          placeholder="your@email.com"
                          required
                          type="email"
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            borderRadius: 8,
                            border: '1px solid #eef2f7',
                            background: '#f3f4f6',
                            fontSize: 14,
                            outline: 'none',
                          }}
                        />
                      </div>

                      <button
                        type="submit"
                        style={{
                          marginTop: 10,
                          width: '100%',
                          background: '#f4b400',
                          color: '#fff',
                          padding: '12px 14px',
                          borderRadius: 8,
                          border: 'none',
                          fontWeight: 900,
                          fontSize: 16,
                          cursor: 'pointer',
                        }}
                      >
                        Register
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Feedback modal (kept) */}
        <AnimatePresence initial={false}>
          {showFeedback && selectedEvent && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}
            >
              <motion.div
                initial={{ opacity: 0, y: 14, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 14, scale: 0.98 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                style={{ width: 520, background: '#fff', borderRadius: 12, padding: 18 }}
              >
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>Feedback - {selectedEvent.title}</h3>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const form = Object.fromEntries(new FormData(e.target).entries());
                try {
                  const res = await fetch(apiEndpoints.feedbackEvent(selectedEvent._id), {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.name, email: form.email, rating: Number(form.rating || 0), comments: form.comments }),
                  });
                  const json = await res.json(); if (!res.ok) throw new Error(json.message || 'Failed');
                  setFeedbackMessage('Thank you for your feedback.');
                } catch (err) { console.error(err); setFeedbackMessage(err.message || 'Feedback failed'); }
              }}>
                <div style={{ display: 'grid', gap: 8 }}>
                  <input name="name" placeholder="Your name (optional)" style={{ padding: 8, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                  <input name="email" placeholder="Your email (optional)" style={{ padding: 8, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                  <label style={{ fontSize: 13 }}>Rating</label>
                  <select name="rating" defaultValue="5" style={{ padding: 8, borderRadius: 8, border: '1px solid #e5e7eb' }}>
                    <option value="5">5 - Excellent</option>
                    <option value="4">4 - Good</option>
                    <option value="3">3 - Okay</option>
                    <option value="2">2 - Poor</option>
                    <option value="1">1 - Terrible</option>
                  </select>
                  <textarea name="comments" placeholder="Comments" rows={4} style={{ padding: 8, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowFeedback(false)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff' }}>Cancel</button>
                  <button type="submit" style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: '#111827', color: '#fff' }}>Submit</button>
                </div>
                {feedbackMessage && <div style={{ marginTop: 10, color: '#065f46' }}>{feedbackMessage}</div>}
              </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
