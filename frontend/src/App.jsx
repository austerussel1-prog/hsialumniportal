import React, { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import LoginPage from './LoginPage.jsx';
import RegisterPage from './RegisterPage.jsx';
import AdminDashboard from './AdminDashboard.jsx';
import AlumniDashboard from './AlumniDashboard.jsx';
import AlumniManagement from './AlumniManagement.jsx';
import ProfilePage from './ProfilePage.jsx';
import AccountSettings from './AccountSettings.jsx';
import DocumentsPage from './DocumentsPage.jsx';
import MentorshipPage from './MentorshipPage.jsx';
import CareerJobsPage from './CareerJobsPage.jsx';
import EventsPage from './EventsPage.jsx';
import DirectoryPage from './DirectoryPage.jsx';
import DirectoryProfileView from './DirectoryProfileView.jsx';
import AnnouncementsPage from './AnnouncementsPage.jsx';
import JobListingsPage from './JobListingsPage.jsx';
import JobDetailsPage from './JobDetailsPage.jsx';
import JobApplicationForm from './JobApplicationForm.jsx';
import ReferralJobBoard from './ReferralJobBoard.jsx';
import InternshipOJT from './InternshipOJT.jsx';
import ReferFriend from './ReferFriend.jsx';
import InboxPage from './InboxPage.jsx';
import TrainingLearningPage from './TrainingLearningPage.jsx';
import AchievementsRecognitionPage from './AchievementsRecognitionPage.jsx';
import AnalyticsReportPage from './AnalyticsReportPage.jsx';
import Toast from './components/Toast.jsx';
import { apiEndpoints, resolveApiAssetUrl } from './config/api';

const ADMIN_ROLES = ['super_admin', 'admin', 'hr', 'alumni_officer'];
const AUTH_PAGES = ['/login', '/register'];
const FOOTER_VISIBLE_PATHS = ['/login', '/register', '/account'];

function formatReminderDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Today';
  return date.toLocaleString([], {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getCalendarDayKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getScheduleReminderWindow(startValue, endValue, today = new Date()) {
  const startAt = startValue ? new Date(startValue) : null;
  const endAt = endValue ? new Date(endValue) : null;
  if (!startAt || Number.isNaN(startAt.getTime())) return false;

  const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
  const dayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
  const normalizedEnd = endAt && !Number.isNaN(endAt.getTime()) ? endAt : startAt;
  if (startAt <= dayEnd && normalizedEnd >= dayStart) {
    return 'same-day';
  }

  const nextDayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 0, 0, 0, 0);
  const nextDayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 23, 59, 59, 999);
  if (startAt >= nextDayStart && startAt <= nextDayEnd) {
    return 'day-before';
  }

  return null;
}

function getParticipationReminderWindow(participation, today = new Date()) {
  const opportunity = participation?.opportunity;
  return getScheduleReminderWindow(opportunity?.startAt, opportunity?.endAt, today);
}

function getEventRegistrationReminderWindow(registration, today = new Date()) {
  return getScheduleReminderWindow(registration?.startDate, registration?.endDate, today);
}

function resolveReminderEventImage(value) {
  return resolveApiAssetUrl(value) || '/hero.jpg';
}

function CalendarIcon({ color = '#94a3b8' }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function PinIcon({ color = '#94a3b8' }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M21 10c0 6-9 13-9 13S3 16 3 10a9 9 0 0 1 18 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function EventReminderDetailsModal({ event, onClose }) {
  if (!event) return null;

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.52)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10010,
        padding: 16,
      }}
      onMouseDown={(modalEvent) => {
        if (modalEvent.target === modalEvent.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 14, scale: 0.985 }}
        transition={{ duration: 0.24, ease: 'easeOut' }}
        className="hsi-reminder-scroll"
        style={{
          width: 'min(900px, calc(100vw - 32px))',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: '#ffffff',
          borderRadius: 18,
          boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <div style={{ position: 'relative', height: 260, background: 'linear-gradient(135deg,#065f46,#1f2937)' }}>
          <img
            src={resolveReminderEventImage(event.imageUrl)}
            alt={event.title || 'Event'}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={(imgEvent) => {
              if (imgEvent.currentTarget.src.endsWith('/hero.jpg')) imgEvent.currentTarget.style.display = 'none';
              else imgEvent.currentTarget.src = '/hero.jpg';
            }}
          />
          <button
            type="button"
            onClick={onClose}
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
            {event.category || 'Community Event'}
          </div>

          <h2 style={{ margin: '12px 0 8px', fontSize: 42, lineHeight: 1.1, fontWeight: 900, color: '#0f172a' }}>
            {event.title || 'Event'}
          </h2>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '18px', marginBottom: 16 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#64748b', fontWeight: 600 }}>
              <CalendarIcon color="#94a3b8" />
              <span>{formatReminderDateTime(event.startDate)}</span>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#64748b', fontWeight: 600 }}>
              <PinIcon color="#94a3b8" />
              <span>{event.isVirtual ? 'Online' : (event.location || 'Location not set')}</span>
            </div>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16, marginBottom: 14 }}>
            <div style={{ color: '#334155', fontWeight: 700, marginBottom: 6 }}>Description</div>
            <div style={{ color: '#334155', lineHeight: 1.6 }}>
              {event.description || 'No description available for this event.'}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, marginBottom: 18 }}>
            <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 700 }}>End Date</div>
              <div style={{ marginTop: 4, color: '#111827', fontWeight: 700 }}>
                {event.endDate ? formatReminderDateTime(event.endDate) : 'Not specified'}
              </div>
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 700 }}>Capacity</div>
              <div style={{ marginTop: 4, color: '#111827', fontWeight: 700 }}>
                {event.capacity || 'Open'}
              </div>
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 700 }}>Mode</div>
              <div style={{ marginTop: 4, color: '#111827', fontWeight: 700 }}>
                {event.isVirtual ? 'Virtual' : 'Onsite'}
              </div>
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 700 }}>Link / Venue</div>
              <div style={{ marginTop: 4, color: '#111827', fontWeight: 700, wordBreak: 'break-word' }}>
                {event.isVirtual ? (event.virtualLink || 'Not provided') : (event.location || 'Not provided')}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '11px 18px',
                borderRadius: 12,
                border: '1px solid #dbe3ee',
                background: '#ffffff',
                color: '#0f172a',
                cursor: 'pointer',
                fontWeight: 800,
              }}
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ReminderModal({ reminders, onClose, onOpenPrimary, onViewEventDetails }) {
  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  const hasEventReminder = reminders.some((item) => item?.reminderType === 'event');
  const hasVolunteerReminder = reminders.some((item) => item?.reminderType === 'volunteer');
  const hasDayBeforeReminder = reminders.some((item) => item?.reminderWindow === 'day-before');
  const hasSameDayReminder = reminders.some((item) => item?.reminderWindow === 'same-day');
  const scheduleLabel = hasSameDayReminder && hasDayBeforeReminder ? 'today and tomorrow' : hasDayBeforeReminder ? 'tomorrow' : 'today';
  const heading = hasEventReminder && hasVolunteerReminder
    ? 'You Have Upcoming Commitments'
    : hasEventReminder
      ? `You Have A Registered Event ${scheduleLabel === 'today' ? 'Today' : scheduleLabel === 'tomorrow' ? 'Tomorrow' : 'Coming Up'}`
      : `You Have A Scheduled Volunteer Event ${scheduleLabel === 'today' ? 'Today' : scheduleLabel === 'tomorrow' ? 'Tomorrow' : 'Coming Up'}`;
  const bodyText = hasEventReminder && hasVolunteerReminder
    ? `These are your registered events and approved volunteer or speaker commitments scheduled for ${scheduleLabel}.`
    : hasEventReminder
      ? `These are the events you registered for that are happening ${scheduleLabel}.`
      : `These are the volunteer or speaker commitments scheduled for ${scheduleLabel}. Please review the details before you proceed.`;
  const primaryLabel = hasEventReminder && !hasVolunteerReminder ? 'View full event details' : hasVolunteerReminder && !hasEventReminder ? 'Open Mentorship' : 'Open Related Page';
  const modalBadgeText = hasSameDayReminder && hasDayBeforeReminder ? 'Upcoming reminders' : hasDayBeforeReminder ? '1-day-before Reminder' : 'Same-day Reminder';

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(17, 24, 39, 0.58)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '12px' : '24px',
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 14, scale: 0.985 }}
        transition={{ duration: 0.24, ease: 'easeOut' }}
        className="hsi-reminder-scroll"
        style={{
          width: '100%',
          maxWidth: isMobile ? '96vw' : '860px',
          maxHeight: isMobile ? '92vh' : '88vh',
          overflowY: 'auto',
          background: '#ffffff',
          borderRadius: isMobile ? '18px' : '22px',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.28)',
          overflowX: 'hidden',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <div
          style={{
            height: isMobile ? '18px' : '24px',
            background: 'linear-gradient(90deg, #d8a617 0%, #f3cf5f 35%, #184d91 70%, #2c6fc2 100%)',
          }}
        />
        <div style={{ padding: isMobile ? '18px 16px 16px' : '24px 24px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '6px 12px',
                  borderRadius: '999px',
                  background: '#f9edc8',
                  color: '#8a5a00',
                  fontSize: isMobile ? '11px' : '12px',
                  fontWeight: 800,
                }}
              >
                {modalBadgeText}
              </div>
              <h2 style={{ marginTop: '14px', color: '#0f172a', fontSize: isMobile ? '28px' : '42px', lineHeight: 1.05, fontWeight: 900 }}>
                {heading}
              </h2>
              <p style={{ marginTop: '8px', color: '#64748b', fontSize: isMobile ? '13px' : '15px', lineHeight: 1.6 }}>
                {bodyText}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                border: '1px solid #dbe3ee',
                background: '#ffffff',
                color: '#0f172a',
                borderRadius: '999px',
                width: isMobile ? '36px' : '40px',
                height: isMobile ? '36px' : '40px',
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: isMobile ? '16px' : '18px',
                flexShrink: 0,
              }}
              aria-label="Close reminder"
            >
              ×
            </button>
          </div>

          <div style={{ marginTop: '20px', display: 'grid', gap: '14px' }}>
            {reminders.map((item) => {
              const isEvent = item?.reminderType === 'event';
              const opportunity = item?.opportunity || {};
              const event = item?.event || {};
              const role = String(item?.role || 'volunteer').toLowerCase() === 'speaker' ? 'Speaker' : 'Volunteer';
              const statusText = String(item?.status || 'approved').trim() || 'approved';
              return (
                <div
                  key={String(item?.reminderId || item?._id || item?.id || Math.random())}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '18px',
                    padding: isMobile ? '16px' : '18px',
                    background: '#f8fafc',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                    <span style={{ padding: '6px 10px', borderRadius: '999px', background: isEvent ? '#ede9fe' : role === 'Speaker' ? '#dbeafe' : '#fef3c7', color: isEvent ? '#6d28d9' : role === 'Speaker' ? '#1d4ed8' : '#92400e', fontSize: '12px', fontWeight: 800 }}>
                      {isEvent ? 'Participant' : role}
                    </span>
                    <span style={{ padding: '6px 10px', borderRadius: '999px', background: '#dcfce7', color: '#166534', fontSize: '12px', fontWeight: 800, textTransform: 'capitalize' }}>
                      {statusText}
                    </span>
                    {(isEvent ? event?.category : opportunity?.category) ? (
                      <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 700 }}>{isEvent ? event.category : opportunity.category}</span>
                    ) : null}
                  </div>

                  <div style={{ color: '#0f172a', fontSize: isMobile ? '22px' : '28px', lineHeight: 1.12, fontWeight: 900 }}>
                    {isEvent ? (event?.title || item?.eventTitle || 'Event') : (opportunity?.title || 'Volunteer opportunity')}
                  </div>

                  <div style={{ marginTop: '12px', display: 'flex', gap: '18px', flexWrap: 'wrap', color: '#475569', fontSize: isMobile ? '13px' : '14px', fontWeight: 700 }}>
                    <span>{formatReminderDateTime(isEvent ? event?.startDate || item?.startDate : opportunity?.startAt)}</span>
                    <span>{isEvent ? (event?.isVirtual ? 'Online' : (event?.location || 'Location not set')) : (opportunity?.location || 'Location will be announced')}</span>
                  </div>

                  <div style={{ marginTop: '14px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <span style={{ padding: '6px 10px', borderRadius: '999px', background: item?.reminderWindow === 'day-before' ? '#dbeafe' : '#f9edc8', color: item?.reminderWindow === 'day-before' ? '#1d4ed8' : '#8a5a00', fontSize: '12px', fontWeight: 800 }}>
                      {item?.reminderWindow === 'day-before' ? 'Tomorrow reminder' : 'Today reminder'}
                    </span>
                    {isEvent && event ? (
                      <button
                        type="button"
                        onClick={() => onViewEventDetails(item)}
                        style={{
                          border: 'none',
                          background: '#184d91',
                          color: '#ffffff',
                          borderRadius: '999px',
                          padding: '8px 14px',
                          cursor: 'pointer',
                          fontWeight: 800,
                          fontSize: '12px',
                        }}
                      >
                        View full event details
                      </button>
                    ) : null}
                  </div>

                  {(isEvent ? event?.description : opportunity?.description) ? (
                    <div
                      style={{
                        marginTop: '14px',
                        border: '1px solid #e2e8f0',
                        background: '#ffffff',
                        borderRadius: '14px',
                        padding: isMobile ? '14px' : '16px',
                      }}
                    >
                      <div style={{ color: '#334155', fontSize: '12px', fontWeight: 900, marginBottom: '8px' }}>Description</div>
                      <div style={{ color: '#334155', fontSize: isMobile ? '13px' : '14px', lineHeight: 1.7 }}>
                        {isEvent ? event.description : opportunity.description}
                      </div>
                    </div>
                  ) : null}

                  <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px 16px', background: '#ffffff' }}>
                      <div style={{ color: '#64748b', fontSize: '12px', fontWeight: 800, marginBottom: '6px' }}>End Time</div>
                      <div style={{ color: '#0f172a', fontSize: isMobile ? '16px' : '18px', fontWeight: 900 }}>
                        {isEvent
                          ? (event?.endDate ? formatReminderDateTime(event.endDate) : 'Not specified')
                          : (opportunity?.endAt ? formatReminderDateTime(opportunity.endAt) : 'Not set')}
                      </div>
                    </div>
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px 16px', background: '#ffffff' }}>
                      <div style={{ color: '#64748b', fontSize: '12px', fontWeight: 800, marginBottom: '6px' }}>{isEvent ? 'Link / Venue' : 'Venue / Link'}</div>
                      <div style={{ color: '#0f172a', fontSize: isMobile ? '16px' : '18px', fontWeight: 900, wordBreak: 'break-word' }}>
                        {isEvent
                          ? (event?.isVirtual ? (event?.virtualLink || 'Not provided') : (event?.location || 'Not provided'))
                          : (opportunity?.location || 'Check with admin')}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                border: '1px solid #dbe3ee',
                background: '#ffffff',
                color: '#0f172a',
                borderRadius: '12px',
                padding: '12px 18px',
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: '14px',
              }}
            >
              Close
            </button>
            <button
              type="button"
              onClick={onOpenPrimary}
              style={{
                border: 'none',
                background: '#e4b118',
                color: '#111827',
                borderRadius: '12px',
                padding: '12px 18px',
                cursor: 'pointer',
                fontWeight: 900,
                fontSize: '14px',
              }}
            >
              {primaryLabel}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function AdminOnlyRoute({ children }) {
  const rawUser = localStorage.getItem('user');
  const user = rawUser ? JSON.parse(rawUser) : null;
  if (!user) return <Navigate to="/login" replace />;
  if (!ADMIN_ROLES.includes(user.role)) return <Navigate to="/alumni-management" replace />;
  return children;
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/admin-dashboard"
          element={(
            <AdminOnlyRoute>
              <AdminDashboard />
            </AdminOnlyRoute>
          )}
        />
        <Route path="/alumni-dashboard" element={<AlumniDashboard />} />
        <Route path="/alumni-management" element={<AlumniManagement />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/account" element={<AccountSettings />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/mentorship" element={<MentorshipPage />} />
        <Route path="/training" element={<JobListingsPage />} />
        <Route path="/training/hub" element={<CareerJobsPage />} />
        <Route path="/training/jobs" element={<JobListingsPage />} />
        <Route path="/training/job-details" element={<JobDetailsPage />} />
        <Route path="/training/job-details/:jobId" element={<JobDetailsPage />} />
        <Route path="/career/job-details" element={<JobDetailsPage />} />
        <Route path="/career/job-details/:jobId" element={<JobDetailsPage />} />
        <Route path="/job-application" element={<JobApplicationForm />} />
        <Route path="/job-application/:jobId" element={<JobApplicationForm />} />
        <Route path="/training/paths" element={<TrainingLearningPage />} />
        <Route path="/training/certification" element={<TrainingLearningPage />} />
        <Route path="/achievements" element={<AchievementsRecognitionPage />} />
        <Route path="/analytics-and-report" element={<AnalyticsReportPage />} />
        <Route path="/referral-board" element={<ReferralJobBoard />} />
        <Route path="/internship-ojt" element={<InternshipOJT />} />
        <Route path="/refer-friend" element={<ReferFriend />} />
        <Route path="/inbox" element={<InboxPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/directory" element={<DirectoryPage />} />
        <Route path="/directory/profile/:userId" element={<DirectoryProfileView />} />
        <Route path="/announcements" element={<AnnouncementsPage />} />
      </Routes>
    </AnimatePresence>
  );
}

function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const hasSidebarLayout = !AUTH_PAGES.includes(location.pathname);
  const shouldShowFooter = FOOTER_VISIBLE_PATHS.includes(location.pathname);
  const [toast, setToast] = useState(null);
  const [scheduleReminders, setScheduleReminders] = useState([]);
  const [showScheduleReminder, setShowScheduleReminder] = useState(false);
  const [selectedReminderEvent, setSelectedReminderEvent] = useState(null);
  const toastCenterOffsetPx = location.pathname.startsWith('/job-application') ? -120 : 0;
  const currentUser = useMemo(() => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [location.pathname]);
  const reminderUserKey = String(currentUser?.id || currentUser?._id || currentUser?.email || '').trim();

  useEffect(() => {
    const raw = sessionStorage.getItem('hsi_toast');
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      const next = parsed && typeof parsed === 'object' ? parsed : null;
      const nextText = next?.text || next?.message;
      if (typeof nextText === 'string' && nextText.trim()) {
        setToast({
          id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
          type: next?.type || 'success',
          text: nextText,
        });
      }
    } catch {
      // ignore invalid payload
    } finally {
      sessionStorage.removeItem('hsi_toast');
    }
  }, [location.key]);

  useEffect(() => {
    const handler = (event) => {
      const detail = event?.detail && typeof event.detail === 'object' ? event.detail : null;
      const nextText = detail?.text || detail?.message;
      if (typeof nextText !== 'string' || !nextText.trim()) {
        return;
      }

      setToast({
        id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        type: detail?.type || 'success',
        text: nextText,
      });
    };

    window.addEventListener('hsi-toast', handler);
    return () => window.removeEventListener('hsi-toast', handler);
  }, []);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }
    const timeoutId = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timeoutId);
  }, [toast]);

  useEffect(() => {
    if (!showScheduleReminder && !selectedReminderEvent) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showScheduleReminder, selectedReminderEvent]);

  useEffect(() => {
    let cancelled = false;

    async function loadScheduleReminders() {
      if (AUTH_PAGES.includes(location.pathname)) {
        if (!cancelled) {
          setScheduleReminders([]);
          setShowScheduleReminder(false);
        }
        return;
      }
      const token = localStorage.getItem('token');
      if (!token || !reminderUserKey) {
        if (!cancelled) {
          setScheduleReminders([]);
          setShowScheduleReminder(false);
        }
        return;
      }

      try {
        const today = new Date();
        const todayKey = getCalendarDayKey(today);
        const seenStorageKey = `hsi_schedule_reminders_${reminderUserKey}_${todayKey}`;
        let seenIds = [];
        try {
          const raw = localStorage.getItem(seenStorageKey);
          const parsed = raw ? JSON.parse(raw) : [];
          seenIds = Array.isArray(parsed) ? parsed.map((item) => String(item || '').trim()).filter(Boolean) : [];
        } catch {
          seenIds = [];
        }

        const [volunteerResponse, eventRegistrationsResponse] = await Promise.all([
          fetch(apiEndpoints.volunteerMe, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(apiEndpoints.myEventRegistrations, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const volunteerData = await volunteerResponse.json().catch(() => ({}));
        const eventRegistrationsData = await eventRegistrationsResponse.json().catch(() => ({}));
        if (cancelled) return;

        const participations = volunteerResponse.ok && Array.isArray(volunteerData?.participations)
          ? volunteerData.participations
          : [];
        const volunteerReminders = participations.map((participation) => {
          const participationId = String(participation?._id || '').trim();
          const reminderWindow = getParticipationReminderWindow(participation, today);
          const eventDayKey = getCalendarDayKey(participation?.opportunity?.startAt || today);
          const reminderId = `volunteer|${participationId}|${reminderWindow || 'none'}|${eventDayKey}`;
          return {
            ...participation,
            reminderType: 'volunteer',
            reminderWindow,
            reminderId,
          };
        }).filter((participation) => {
          const status = String(participation?.status || '').trim().toLowerCase();
          if (!participation?.reminderWindow) return false;
          if (!String(participation?._id || '').trim() || status !== 'approved') return false;
          if (seenIds.includes(participation.reminderId)) return false;
          return true;
        });

        const eventRegistrations = eventRegistrationsResponse.ok && Array.isArray(eventRegistrationsData?.registrations)
          ? eventRegistrationsData.registrations
          : [];
        const upcomingEventRegistrations = eventRegistrations.map((registration) => {
          const registrationId = String(registration?.registrationId || '').trim();
          const reminderWindow = getEventRegistrationReminderWindow(registration, today);
          const eventDayKey = getCalendarDayKey(registration?.startDate || today);
          const reminderId = `event|${registrationId}|${reminderWindow || 'none'}|${eventDayKey}`;
          return {
            ...registration,
            reminderWindow,
            reminderId,
          };
        }).filter((registration) => {
          const status = String(registration?.status || '').trim().toLowerCase();
          if (!registration?.reminderWindow) return false;
          if (!String(registration?.registrationId || '').trim() || status !== 'approved') return false;
          if (seenIds.includes(registration.reminderId)) return false;
          return true;
        });

        const eventDetails = await Promise.all(upcomingEventRegistrations.map(async (registration) => {
          const eventId = String(registration?.eventId || '').trim();
          if (!eventId) {
            return {
              ...registration,
              reminderType: 'event',
              event: null,
            };
          }

          try {
            const res = await fetch(apiEndpoints.event(eventId));
            const body = await res.json().catch(() => ({}));
            return {
              ...registration,
              reminderType: 'event',
              event: res.ok ? body?.event || null : null,
            };
          } catch {
            return {
              ...registration,
              reminderType: 'event',
              event: null,
            };
          }
        }));

        const reminders = [...eventDetails, ...volunteerReminders].sort((left, right) => {
          const leftPriority = left?.reminderWindow === 'same-day' ? 0 : 1;
          const rightPriority = right?.reminderWindow === 'same-day' ? 0 : 1;
          if (leftPriority !== rightPriority) return leftPriority - rightPriority;
          const leftStart = new Date(left?.event?.startDate || left?.startDate || left?.opportunity?.startAt || 0).getTime();
          const rightStart = new Date(right?.event?.startDate || right?.startDate || right?.opportunity?.startAt || 0).getTime();
          return leftStart - rightStart;
        });

        if (!cancelled) {
          setScheduleReminders(reminders);
          setShowScheduleReminder(reminders.length > 0);
        }
      } catch {
        // ignore reminder failures to avoid blocking navigation
      }
    }

    loadScheduleReminders();

    return () => {
      cancelled = true;
    };
  }, [location.pathname, reminderUserKey]);

  const persistDismissedReminders = (remindersToDismiss = scheduleReminders) => {
    const todayKey = getCalendarDayKey(new Date());
    const seenStorageKey = `hsi_schedule_reminders_${reminderUserKey}_${todayKey}`;
    const reminderIds = remindersToDismiss
      .map((item) => String(item?.reminderId || '').trim())
      .filter(Boolean);

    if (!reminderIds.length) return;

    try {
      const raw = localStorage.getItem(seenStorageKey);
      const existing = raw ? JSON.parse(raw) : [];
      const next = Array.from(new Set([...(Array.isArray(existing) ? existing : []), ...reminderIds]));
      localStorage.setItem(seenStorageKey, JSON.stringify(next));
    } catch {
      // ignore storage issues
    }
  };

  const dismissScheduleReminder = () => {
    persistDismissedReminders();
    setShowScheduleReminder(false);
  };

  const openEventDetailsFromReminder = (reminder) => {
    if (!reminder?.event) return;
    setSelectedReminderEvent(reminder.event);
  };

  const openPrimaryFromReminder = () => {
    const hasVolunteerReminder = scheduleReminders.some((item) => item?.reminderType === 'volunteer');
    const firstEventReminder = scheduleReminders.find((item) => item?.reminderType === 'event' && item?.event);
    if (firstEventReminder && !hasVolunteerReminder) {
      setSelectedReminderEvent(firstEventReminder.event);
      return;
    }

    dismissScheduleReminder();
    const firstReminder = scheduleReminders[0] || null;
    if (firstReminder?.reminderType === 'event') {
      navigate('/events');
      return;
    }
    navigate('/mentorship');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '100vw', overflowX: 'hidden' }}>
      <style>{`
        .hsi-reminder-scroll {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .hsi-reminder-scroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <Toast toast={toast} centerOffsetPx={toastCenterOffsetPx} />
      <AnimatePresence>
        {showScheduleReminder && scheduleReminders.length > 0 ? (
          <ReminderModal
            reminders={scheduleReminders}
            onClose={dismissScheduleReminder}
            onOpenPrimary={openPrimaryFromReminder}
            onViewEventDetails={openEventDetailsFromReminder}
          />
        ) : null}
      </AnimatePresence>
      <AnimatePresence>
        {selectedReminderEvent ? (
          <EventReminderDetailsModal
            event={selectedReminderEvent}
            onClose={() => setSelectedReminderEvent(null)}
          />
        ) : null}
      </AnimatePresence>
      <div className="pt-16 md:pt-0" style={{ flex: 1 }}>
        <AnimatedRoutes />
      </div>
      {shouldShowFooter && (
        <footer
          style={{
            padding: '18px 52px 30px',
            borderTop: '1px solid #d8d8d8',
            color: '#6b7280',
            fontSize: 12,
            background: '#fff',
            marginLeft: hasSidebarLayout ? 92 : 0,
          }}
        >
          &copy; 2013 Highly Succeed Inc. All rights reserved.
        </footer>
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
