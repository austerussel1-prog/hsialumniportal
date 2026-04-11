import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
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

const ADMIN_ROLES = ['super_admin', 'admin', 'hr', 'alumni_officer'];

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
  const location = useLocation();
  const authPages = ['/login', '/register'];
  const hasSidebarLayout = !authPages.includes(location.pathname);
  const footerVisiblePaths = ['/login', '/register', '/account'];
  const shouldShowFooter = footerVisiblePaths.includes(location.pathname);
  const [toast, setToast] = useState(null);
  const toastCenterOffsetPx = location.pathname.startsWith('/job-application') ? -120 : 0;

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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '100vw', overflowX: 'hidden' }}>
      <Toast toast={toast} centerOffsetPx={toastCenterOffsetPx} />
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
