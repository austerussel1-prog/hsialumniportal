// API configuration
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function resolveApiAssetUrl(value) {
  if (!value) return '';
  const raw = String(value).trim();
  if (!raw) return '';
  if (/^(https?:)?\/\//i.test(raw) || raw.startsWith('data:') || raw.startsWith('blob:')) {
    return raw;
  }

  // Upload assets are served by the backend service, not by the Vercel frontend domain.
  if (raw.startsWith('/uploads/')) return `${API_URL}${raw}`;
  if (raw.startsWith('uploads/')) return `${API_URL}/${raw}`;

  return raw;
}

export const apiEndpoints = {
  // Auth endpoints
  googleAuth: `${API_URL}/api/auth/google`,
  login: `${API_URL}/api/auth/login`,
  loginVerify2fa: `${API_URL}/api/auth/login/verify-2fa`,
  forgotPassword: `${API_URL}/api/auth/forgot-password`,
  verifyResetOtp: `${API_URL}/api/auth/verify-reset-otp`,
  resetPassword: `${API_URL}/api/auth/reset-password`,
  getProfile: `${API_URL}/api/auth/me`,
  updateProfile: `${API_URL}/api/auth/me`,
  updatePrivacy: `${API_URL}/api/auth/me/privacy`,
  changePassword: `${API_URL}/api/auth/me/change-password`,
  requestDataRemoval: `${API_URL}/api/auth/me/request-data-removal`,
  deleteMyAccount: `${API_URL}/api/auth/me/delete-account`,
  accountFeedback: `${API_URL}/api/auth/feedback`,
  accountFeedbackAlumniUsers: `${API_URL}/api/auth/feedback/alumni-users`,
  accountFeedbackReviews: `${API_URL}/api/auth/feedback/reviews`,
  uploadAvatar: `${API_URL}/api/auth/me/avatar`,
  directoryUsers: `${API_URL}/api/auth/directory`,
  directoryUser: (userId) => `${API_URL}/api/auth/directory/${userId}`,

  // Register endpoints
  sendOtp: `${API_URL}/api/register/send-otp`,
  verifyOtp: `${API_URL}/api/register/verify-otp`,

  // Admin endpoints
  allUsers: `${API_URL}/api/admin/all-users`,
  pendingUsers: `${API_URL}/api/admin/pending-users`,
  stats: `${API_URL}/api/admin/stats`,
  analyticsReport: `${API_URL}/api/admin/analytics-report`,
  analyticsReportExport: `${API_URL}/api/admin/analytics-report/export`,
  auditLogs: (page = 1, limit = 20, status = '', action = '') =>
    `${API_URL}/api/admin/audit-logs?page=${encodeURIComponent(page)}&limit=${encodeURIComponent(limit)}${status ? `&status=${encodeURIComponent(status)}` : ''}${action ? `&action=${encodeURIComponent(action)}` : ''}`,
  createAdmin: `${API_URL}/api/admin/create-admin`,
  approveUser: (userId) => `${API_URL}/api/admin/approve/${userId}`,
  rejectUser: (userId) => `${API_URL}/api/admin/reject/${userId}`,
  dataRemovalRequests: (status = 'pending') => `${API_URL}/api/admin/data-removal-requests?status=${encodeURIComponent(status)}`,
  approveDataRemovalRequest: (userId) => `${API_URL}/api/admin/data-removal-requests/${userId}/approve`,
  rejectDataRemovalRequest: (userId) => `${API_URL}/api/admin/data-removal-requests/${userId}/reject`,

  // Alumni endpoints
  allAlumni: `${API_URL}/api/admin/all-alumni`,
  createAlumni: `${API_URL}/api/admin/create-alumni`,
  deleteAlumni: (alumniId) => `${API_URL}/api/admin/delete-alumni/${alumniId}`,
  updateAlumni: (alumniId) => `${API_URL}/api/admin/update-alumni/${alumniId}`,

  // Messaging endpoints
  getConversations: `${API_URL}/api/messages/conversations`,
  getMessages: `${API_URL}/api/messages`,
  searchGifs: `${API_URL}/api/messages/search-gifs`,
  sendMessage: `${API_URL}/api/messages`,
  sendReferralInvitation: `${API_URL}/api/referrals/send`,

  // User management endpoints
  deleteUser: (userId) => `${API_URL}/api/admin/delete-user/${userId}`,
  updateUser: (userId) => `${API_URL}/api/admin/update-user/${userId}`,

  // Announcements endpoints
  announcements: `${API_URL}/api/announcements`,
  announcement: (id) => `${API_URL}/api/announcements/${id}`,
  heartAnnouncement: (id) => `${API_URL}/api/announcements/${id}/heart`,
  commentAnnouncement: (id) => `${API_URL}/api/announcements/${id}/comment`,

  // Events endpoints
  events: `${API_URL}/api/events`,
  event: (id) => `${API_URL}/api/events/${id}`,
  registerEvent: (id) => `${API_URL}/api/events/${id}/register`,
  eventRegistrations: (id, status = '') => `${API_URL}/api/events/${id}/registrations${status ? `?status=${encodeURIComponent(status)}` : ''}`,
  approveEventRegistration: (eventId, registrationId) => `${API_URL}/api/events/${eventId}/registrations/${registrationId}/approve`,
  rejectEventRegistration: (eventId, registrationId) => `${API_URL}/api/events/${eventId}/registrations/${registrationId}/reject`,
  feedbackEvent: (id) => `${API_URL}/api/events/${id}/feedback`,
  attendees: (id) => `${API_URL}/api/events/${id}/attendees`,
  myEventRegistrations: `${API_URL}/api/events/me/registrations`,

  // Achievements endpoints
  achievements: `${API_URL}/api/achievements`,
  awardAchievement: `${API_URL}/api/achievements/award`,
  deleteAwardEvent: (eventId) => `${API_URL}/api/achievements/award-events/${eventId}`,
  addAppreciationPost: `${API_URL}/api/achievements/appreciation`,
  deleteAppreciationPost: (postId) => `${API_URL}/api/achievements/appreciation/${postId}`,
  likeAppreciationPost: (postId) => `${API_URL}/api/achievements/appreciation/${postId}/like`,

  // Documents endpoints
  documentStats: `${API_URL}/api/documents/stats`,
  recentDocuments: `${API_URL}/api/documents/recent`,
  myDocuments: `${API_URL}/api/documents/my`,
  uploadDocument: `${API_URL}/api/documents/upload`,
  downloadDocument: (id) => `${API_URL}/api/documents/download/${id}`,
  documentRequests: `${API_URL}/api/documents/requests`,
  adminDocumentRequests: `${API_URL}/api/documents/admin/requests`,
  fulfillDocumentRequest: (id) => `${API_URL}/api/documents/admin/requests/${id}/fulfill`,
  rejectDocumentRequest: (id) => `${API_URL}/api/documents/admin/requests/${id}/reject`,

  // Mentorship & volunteer endpoints
  mentors: `${API_URL}/api/mentorship/mentors`,
  mentorshipProfile: `${API_URL}/api/mentorship/me/profile`,
  mentorshipApply: `${API_URL}/api/mentorship/applications`,
  mentorshipSessions: `${API_URL}/api/mentorship/me/sessions`,
  mentorshipRequestSession: `${API_URL}/api/mentorship/sessions`,
  mentorshipRespondSession: (id) => `${API_URL}/api/mentorship/sessions/${id}/respond`,
  volunteerOpportunities: `${API_URL}/api/mentorship/volunteer/opportunities`,
  volunteerCreateOpportunity: `${API_URL}/api/mentorship/volunteer/opportunities`,
  volunteerCloseOpportunity: (id) => `${API_URL}/api/mentorship/volunteer/opportunities/${id}/close`,
  volunteerReopenOpportunity: (id) => `${API_URL}/api/mentorship/volunteer/opportunities/${id}/reopen`,
  volunteerApply: (id) => `${API_URL}/api/mentorship/volunteer/opportunities/${id}/apply`,
  volunteerMe: `${API_URL}/api/mentorship/volunteer/me`,
  volunteerSummary: `${API_URL}/api/mentorship/volunteer/me/summary`,
  volunteerLogs: `${API_URL}/api/mentorship/volunteer/me/logs`,
  volunteerCreateLog: `${API_URL}/api/mentorship/volunteer/logs`,

  // Mentorship & volunteer admin endpoints
  mentorshipAdminApplications: (status = 'pending') => `${API_URL}/api/mentorship/admin/applications?status=${encodeURIComponent(status)}`,
  mentorshipApproveApplication: (id) => `${API_URL}/api/mentorship/admin/applications/${id}/approve`,
  mentorshipRejectApplication: (id) => `${API_URL}/api/mentorship/admin/applications/${id}/reject`,
  volunteerAdminParticipations: (status = 'applied') => `${API_URL}/api/mentorship/volunteer/admin/participations?status=${encodeURIComponent(status)}`,
  volunteerApproveParticipation: (id) => `${API_URL}/api/mentorship/volunteer/admin/participations/${id}/approve`,
  volunteerRejectParticipation: (id) => `${API_URL}/api/mentorship/volunteer/admin/participations/${id}/reject`,
  volunteerMarkAttended: (id) => `${API_URL}/api/mentorship/volunteer/admin/participations/${id}/mark-attended`,
  volunteerAdminLogs: (status = 'pending') => `${API_URL}/api/mentorship/volunteer/admin/logs?status=${encodeURIComponent(status)}`,
  volunteerApproveLog: (id) => `${API_URL}/api/mentorship/volunteer/admin/logs/${id}/approve`,
  volunteerRejectLog: (id) => `${API_URL}/api/mentorship/volunteer/admin/logs/${id}/reject`,

  // Notifications
  notifications: `${API_URL}/api/notifications`,

  // Career jobs endpoints
  jobs: `${API_URL}/api/jobs`,
  jobById: (id) => `${API_URL}/api/jobs/${id}`,
};
