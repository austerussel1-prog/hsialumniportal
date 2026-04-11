import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  ChevronDownIcon, 
  ChevronRightIcon, 
  MagnifyingGlassIcon,
  PlusIcon,
  XMarkIcon,
  CheckIcon,
  TrashIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import Sidebar from './components/Sidebar';
import { apiEndpoints } from './config/api';

const ALUMNI_PAGE_SIZE = 10;

export default function AdminDashboard() {
  const navigate = useNavigate();
  const fallbackProfileImage = '/Logo.jpg';
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const notify = (type, text) => {
    window.dispatchEvent(new CustomEvent('hsi-toast', {
      detail: { type, text },
    }));
  };
  const [pendingUsers, setPendingUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [stats, setStats] = useState({ totalUsers: 0, approvedUsers: 0, pendingUsers: 0, rejectedUsers: 0 });
  const [actionLoading, setActionLoading] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [headerSearchQuery, setHeaderSearchQuery] = useState('');
  const [verificationSearchQuery, setVerificationSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [addUserForm, setAddUserForm] = useState({
    fullName: '',
    employeeId: '',
    email: '',
    contactNumber: '',
    address: '',
    role: '',
    tempPassword: '',
  });
  const [addUserLoading, setAddUserLoading] = useState(false);
  const [addUserError, setAddUserError] = useState('');
  
 
  const [alumni, setAlumni] = useState([]);
  const [showAddAlumniModal, setShowAddAlumniModal] = useState(false);
  const [addAlumniForm, setAddAlumniForm] = useState({
    fullName: '',
    email: '',
    graduationYear: '',
    major: '',
    company: '',
    jobTitle: '',
  });
  const [addAlumniLoading, setAddAlumniLoading] = useState(false);
  const [addAlumniError, setAddAlumniError] = useState('');
  const [alumniSearchQuery, setAlumniSearchQuery] = useState('');
  const [alumniPage, setAlumniPage] = useState(1);
  

  const [showEditAlumniModal, setShowEditAlumniModal] = useState(false);
  const [editAlumniForm, setEditAlumniForm] = useState({
    _id: '',
    fullName: '',
    email: '',
    graduationYear: '',
    major: '',
    company: '',
    jobTitle: '',
  });
  const [editAlumniLoading, setEditAlumniLoading] = useState(false);
  const [editAlumniError, setEditAlumniError] = useState('');


  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editUserForm, setEditUserForm] = useState({
    _id: '',
    name: '',
    email: '',
    role: '',
  });
  const [editUserLoading, setEditUserLoading] = useState(false);
  const [editUserError, setEditUserError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState({ type: '', id: null });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [mobileAdminTab, setMobileAdminTab] = useState('users');
  const [dataRemovalRequests, setDataRemovalRequests] = useState([]);
  const [dataRemovalStatus, setDataRemovalStatus] = useState('pending');
  const [dataRemovalLoading, setDataRemovalLoading] = useState(false);
  const [dataRemovalActionLoading, setDataRemovalActionLoading] = useState(null);
  const [showDataRemovalRejectModal, setShowDataRemovalRejectModal] = useState(false);
  const [selectedDataRemovalRequestId, setSelectedDataRemovalRequestId] = useState(null);
  const [dataRemovalRejectNote, setDataRemovalRejectNote] = useState('');

  // Mentorship & volunteer admin state
  const [mentorAppsStatus, setMentorAppsStatus] = useState('pending');
  const [mentorAppsSearch, setMentorAppsSearch] = useState('');
  const [mentorApplications, setMentorApplications] = useState([]);
  const [mentorAppsLoading, setMentorAppsLoading] = useState(false);
  const [mentorAppsActionLoading, setMentorAppsActionLoading] = useState(null);

  const [volunteerOppsStatus, setVolunteerOppsStatus] = useState('active');
  const [volunteerOpps, setVolunteerOpps] = useState([]);
  const [volunteerOppsLoading, setVolunteerOppsLoading] = useState(false);
  const [showAddOpportunityModal, setShowAddOpportunityModal] = useState(false);
  const [addOpportunityLoading, setAddOpportunityLoading] = useState(false);
  const [addOpportunityError, setAddOpportunityError] = useState('');
  const [addOpportunityForm, setAddOpportunityForm] = useState({
    title: '',
    description: '',
    category: '',
    startAt: '',
    endAt: '',
    location: '',
    estimatedHours: '',
  });

  const [participationsStatus, setParticipationsStatus] = useState('applied');
  const [volunteerParticipations, setVolunteerParticipations] = useState([]);
  const [participationsLoading, setParticipationsLoading] = useState(false);
  const [participationActionLoading, setParticipationActionLoading] = useState(null);
  const [showAttendModal, setShowAttendModal] = useState(false);
  const [attendHours, setAttendHours] = useState('');
  const [selectedParticipationId, setSelectedParticipationId] = useState(null);

  const [volunteerLogsStatus, setVolunteerLogsStatus] = useState('pending');
  const [volunteerLogs, setVolunteerLogs] = useState([]);
  const [volunteerLogsLoading, setVolunteerLogsLoading] = useState(false);
  const [volunteerLogActionLoading, setVolunteerLogActionLoading] = useState(null);

  // Refs for scrolling to sections
  const userVerificationRef = useRef(null);
  const alumniManagementRef = useRef(null);
  const adminManagementRef = useRef(null);
  const mentorshipProgramsRef = useRef(null);

  // Handle header search for navigation
  const handleHeaderSearch = (query) => {
    setHeaderSearchQuery(query);
    
    const searchTerm = query.toLowerCase().trim();
    
    if (searchTerm.includes('user') && searchTerm.includes('verification')) {
      userVerificationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (searchTerm.includes('admin')) {
      adminManagementRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (searchTerm.includes('alumni')) {
      alumniManagementRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (searchTerm.includes('mentor') || searchTerm.includes('mentorship') || searchTerm.includes('volunteer')) {
      mentorshipProgramsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (searchTerm.includes('user')) {
      userVerificationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const resolveProfileImage = (value) => {
    if (!value) return fallbackProfileImage;
    if (String(value).includes('gear-icon.svg')) return fallbackProfileImage;
    if (value.includes('via.placeholder.com')) return fallbackProfileImage;
    return value;
  };

  const mergeUserWithProfile = (nextUser) => {
    const profileKey = nextUser?.email ? `profileData_${nextUser.email}` : null;
    if (!profileKey) return nextUser;
    const savedProfile = localStorage.getItem(profileKey);
    const mergedUser = savedProfile ? { ...nextUser, ...JSON.parse(savedProfile) } : nextUser;
    return { ...mergedUser, profileImage: resolveProfileImage(mergedUser?.profileImage) };
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      navigate('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    
 
    if (!['super_admin', 'admin', 'hr', 'alumni_officer'].includes(parsedUser.role)) {
      alert('Access denied. Admin only.');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
      return;
    }

    setUser(mergeUserWithProfile(parsedUser));
    fetchPendingUsers();
    fetchAllUsers();
    fetchStats();
    fetchAlumni();
    setMentorAppsStatus('pending');
    setVolunteerOppsStatus('active');
    setParticipationsStatus('applied');
    setVolunteerLogsStatus('pending');
    fetchMentorApplications('pending');
    fetchVolunteerOpportunities('active');
    fetchVolunteerParticipations('applied');
    fetchVolunteerLogs('pending');
    fetchDataRemovalRequests('pending');
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchPendingUsers();
      fetchAllUsers();
      fetchStats();
      fetchAlumni();
      fetchMentorApplications(mentorAppsStatus, { silent: true });
      fetchVolunteerOpportunities(volunteerOppsStatus, { silent: true });
      fetchVolunteerParticipations(participationsStatus, { silent: true });
      fetchVolunteerLogs(volunteerLogsStatus, { silent: true });
      fetchDataRemovalRequests(dataRemovalStatus, { silent: true });
    }, 10000);

    return () => clearInterval(interval);
  }, [mentorAppsStatus, volunteerOppsStatus, participationsStatus, volunteerLogsStatus, dataRemovalStatus]);

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
    };
  };

  const fetchAllUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(apiEndpoints.allUsers, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAllUsers(data.users || []);
      }
    } catch (err) {
      console.error('Error fetching all users:', err);
    }
  };

  const fetchPendingUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(apiEndpoints.pendingUsers, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPendingUsers(data.users);
      } else {
        const fallback = await fetch(apiEndpoints.allUsers, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (fallback.ok) {
          const data = await fallback.json();
          const pending = (data.users || []).filter((u) => u.status === 'pending' && u.role === 'user');
          setPendingUsers(pending);
        }
      }
    } catch (err) {
      console.error('Error fetching pending users:', err);
    }
  };

  const fetchAlumni = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(apiEndpoints.allAlumni, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAlumni(data.alumni || []);
      }
    } catch (err) {
      console.error('Error fetching alumni:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(apiEndpoints.stats, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchMentorApplications = async (status = mentorAppsStatus, options = {}) => {
    try {
      if (!options.silent) setMentorAppsLoading(true);
      const response = await fetch(apiEndpoints.mentorshipAdminApplications(status), {
        headers: authHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setMentorApplications(data.applications || []);
      }
    } catch (err) {
      console.error('Error fetching mentor applications:', err);
    } finally {
      if (!options.silent) setMentorAppsLoading(false);
    }
  };

  const approveMentorApplication = async (applicationId) => {
    setMentorAppsActionLoading(applicationId);
    try {
      const response = await fetch(apiEndpoints.mentorshipApproveApplication(applicationId), {
        method: 'POST',
        headers: authHeaders(),
      });
      if (response.ok) {
        await fetchMentorApplications(mentorAppsStatus);
        notify('success', 'Mentor/Speaker application approved.');
      } else {
        notify('error', 'Failed to approve application.');
      }
    } catch (err) {
      console.error('Error approving application:', err);
      notify('error', 'Error approving application.');
    } finally {
      setMentorAppsActionLoading(null);
    }
  };

  const rejectMentorApplication = async (applicationId) => {
    setMentorAppsActionLoading(applicationId);
    try {
      const response = await fetch(apiEndpoints.mentorshipRejectApplication(applicationId), {
        method: 'POST',
        headers: authHeaders(),
      });
      if (response.ok) {
        await fetchMentorApplications(mentorAppsStatus);
        notify('success', 'Mentor/Speaker application rejected.');
      } else {
        notify('error', 'Failed to reject application.');
      }
    } catch (err) {
      console.error('Error rejecting application:', err);
      notify('error', 'Error rejecting application.');
    } finally {
      setMentorAppsActionLoading(null);
    }
  };

  const fetchVolunteerOpportunities = async (status = volunteerOppsStatus, options = {}) => {
    try {
      if (!options.silent) setVolunteerOppsLoading(true);
      const response = await fetch(`${apiEndpoints.volunteerOpportunities}?status=${encodeURIComponent(status)}`, {
        headers: authHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setVolunteerOpps(data.opportunities || []);
      }
    } catch (err) {
      console.error('Error fetching volunteer opportunities:', err);
    } finally {
      if (!options.silent) setVolunteerOppsLoading(false);
    }
  };

  const createVolunteerOpportunity = async (e) => {
    e.preventDefault();
    setAddOpportunityLoading(true);
    setAddOpportunityError('');
    try {
      const response = await fetch(apiEndpoints.volunteerCreateOpportunity, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(addOpportunityForm),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setAddOpportunityError(data?.message || 'Failed to create opportunity');
        return;
      }
      setShowAddOpportunityModal(false);
      setAddOpportunityForm({ title: '', description: '', category: '', startAt: '', endAt: '', location: '', estimatedHours: '' });
      await fetchVolunteerOpportunities(volunteerOppsStatus);
    } catch (err) {
      console.error('Error creating volunteer opportunity:', err);
      setAddOpportunityError('Failed to create opportunity');
    } finally {
      setAddOpportunityLoading(false);
    }
  };

  const closeVolunteerOpportunity = async (id) => {
    try {
      const response = await fetch(apiEndpoints.volunteerCloseOpportunity(id), {
        method: 'POST',
        headers: authHeaders(),
      });
      if (response.ok) {
        await fetchVolunteerOpportunities(volunteerOppsStatus);
        notify('success', 'Opportunity closed.');
      } else {
        notify('error', 'Failed to close opportunity.');
      }
    } catch (err) {
      console.error('Error closing opportunity:', err);
      notify('error', 'Error closing opportunity.');
    }
  };

  const reopenVolunteerOpportunity = async (id) => {
    try {
      const response = await fetch(apiEndpoints.volunteerReopenOpportunity(id), {
        method: 'POST',
        headers: authHeaders(),
      });
      if (response.ok) {
        await fetchVolunteerOpportunities(volunteerOppsStatus);
        notify('success', 'Opportunity reopened.');
      } else {
        notify('error', 'Failed to reopen opportunity.');
      }
    } catch (err) {
      console.error('Error reopening opportunity:', err);
      notify('error', 'Error reopening opportunity.');
    }
  };

  const fetchVolunteerParticipations = async (status = participationsStatus, options = {}) => {
    try {
      if (!options.silent) setParticipationsLoading(true);
      const response = await fetch(apiEndpoints.volunteerAdminParticipations(status), {
        headers: authHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setVolunteerParticipations(data.participations || []);
      }
    } catch (err) {
      console.error('Error fetching volunteer participations:', err);
    } finally {
      if (!options.silent) setParticipationsLoading(false);
    }
  };

  const approveParticipation = async (id) => {
    setParticipationActionLoading(id);
    try {
      const response = await fetch(apiEndpoints.volunteerApproveParticipation(id), {
        method: 'POST',
        headers: authHeaders(),
      });
      if (response.ok) {
        await fetchVolunteerParticipations(participationsStatus);
        notify('success', 'Volunteer participation approved.');
      } else {
        notify('error', 'Failed to approve participation.');
      }
    } catch (err) {
      console.error('Error approving participation:', err);
      notify('error', 'Error approving participation.');
    } finally {
      setParticipationActionLoading(null);
    }
  };

  const rejectParticipation = async (id) => {
    setParticipationActionLoading(id);
    try {
      const response = await fetch(apiEndpoints.volunteerRejectParticipation(id), {
        method: 'POST',
        headers: authHeaders(),
      });
      if (response.ok) {
        await fetchVolunteerParticipations(participationsStatus);
        notify('success', 'Volunteer participation rejected.');
      } else {
        notify('error', 'Failed to reject participation.');
      }
    } catch (err) {
      console.error('Error rejecting participation:', err);
      notify('error', 'Error rejecting participation.');
    } finally {
      setParticipationActionLoading(null);
    }
  };

  const openMarkAttended = (id) => {
    setSelectedParticipationId(id);
    setAttendHours('');
    setShowAttendModal(true);
  };

  const markParticipationAttended = async () => {
    if (!selectedParticipationId) return;
    setParticipationActionLoading(selectedParticipationId);
    try {
      const response = await fetch(apiEndpoints.volunteerMarkAttended(selectedParticipationId), {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours: attendHours }),
      });
      if (response.ok) {
        setShowAttendModal(false);
        setSelectedParticipationId(null);
        await fetchVolunteerParticipations(participationsStatus);
        notify('success', 'Marked as attended.');
      } else {
        notify('error', 'Failed to mark attended.');
      }
    } catch (err) {
      console.error('Error marking attended:', err);
      notify('error', 'Error marking attended.');
    } finally {
      setParticipationActionLoading(null);
    }
  };

  const fetchVolunteerLogs = async (status = volunteerLogsStatus, options = {}) => {
    try {
      if (!options.silent) setVolunteerLogsLoading(true);
      const response = await fetch(apiEndpoints.volunteerAdminLogs(status), {
        headers: authHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setVolunteerLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Error fetching volunteer logs:', err);
    } finally {
      if (!options.silent) setVolunteerLogsLoading(false);
    }
  };

  const approveVolunteerLog = async (id) => {
    setVolunteerLogActionLoading(id);
    try {
      const response = await fetch(apiEndpoints.volunteerApproveLog(id), {
        method: 'POST',
        headers: authHeaders(),
      });
      if (response.ok) {
        await fetchVolunteerLogs(volunteerLogsStatus);
        notify('success', 'Volunteer hour log approved.');
      } else {
        notify('error', 'Failed to approve log.');
      }
    } catch (err) {
      console.error('Error approving log:', err);
      notify('error', 'Error approving log.');
    } finally {
      setVolunteerLogActionLoading(null);
    }
  };

  const rejectVolunteerLog = async (id) => {
    setVolunteerLogActionLoading(id);
    try {
      const response = await fetch(apiEndpoints.volunteerRejectLog(id), {
        method: 'POST',
        headers: authHeaders(),
      });
      if (response.ok) {
        await fetchVolunteerLogs(volunteerLogsStatus);
        notify('success', 'Volunteer hour log rejected.');
      } else {
        notify('error', 'Failed to reject log.');
      }
    } catch (err) {
      console.error('Error rejecting log:', err);
      notify('error', 'Error rejecting log.');
    } finally {
      setVolunteerLogActionLoading(null);
    }
  };

  const handleApprove = async (userId) => {
    setActionLoading(userId);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(apiEndpoints.approveUser(userId), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => null);

      if (response.ok) {
        await fetchPendingUsers();
        await fetchStats();
        notify('success', data?.message || 'User approved successfully.');
      } else {
        notify('error', data?.message || 'Failed to approve user.');
      }
    } catch (err) {
      console.error('Error approving user:', err);
      notify('error', 'Error approving user.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectClick = (userId) => {
    setSelectedUserId(userId);
    setShowRejectModal(true);
  };

  const handleLogout = () => {
    setShowUserMenu(false);
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleAddUserChange = (e) => {
    const { name, value } = e.target;
    setAddUserForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCreateAdminUser = async (e) => {
    e.preventDefault();
    setAddUserLoading(true);
    setAddUserError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(apiEndpoints.createAdmin, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: addUserForm.fullName,
          employeeId: addUserForm.employeeId,
          email: addUserForm.email,
          contactNumber: addUserForm.contactNumber,
          address: addUserForm.address,
          role: addUserForm.role,
          tempPassword: addUserForm.tempPassword,
        }),
      });

      if (response.ok) {
        await fetchAllUsers();
        await fetchStats();
        setShowAddUserModal(false);
        setAddUserForm({
          fullName: '',
          employeeId: '',
          email: '',
          contactNumber: '',
          address: '',
          role: '',
          tempPassword: '',
        });
      } else {
        const text = await response.text().catch(() => '');
        let message = 'Failed to create admin user';
        try {
          const data = text ? JSON.parse(text) : null;
          if (data?.message) message = data.message;
        } catch (err) {
          if (text) message = text;
        }
        setAddUserError(message);
      }
    } catch (err) {
      console.error('Error creating admin user:', err);
      setAddUserError(err?.message || 'Failed to create admin user');
    } finally {
      setAddUserLoading(false);
    }
  };

  const handleAddAlumniChange = (e) => {
    const { name, value } = e.target;
    setAddAlumniForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCreateAlumni = async (e) => {
    e.preventDefault();
    setAddAlumniLoading(true);
    setAddAlumniError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(apiEndpoints.createAlumni, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: addAlumniForm.fullName,
          email: addAlumniForm.email,
          graduationYear: addAlumniForm.graduationYear,
          major: addAlumniForm.major,
          company: addAlumniForm.company,
          jobTitle: addAlumniForm.jobTitle,
        }),
      });

      if (response.ok) {
        await fetchAlumni();
        setShowAddAlumniModal(false);
        setAddAlumniForm({
          fullName: '',
          email: '',
          graduationYear: '',
          major: '',
          company: '',
          jobTitle: '',
        });
        notify('success', 'Alumni member added successfully!');
      } else {
        const text = await response.text().catch(() => '');
        let message = 'Failed to add alumni member';
        try {
          const data = text ? JSON.parse(text) : null;
          if (data?.message) message = data.message;
        } catch (err) {
          if (text) message = text;
        }
        setAddAlumniError(message);
      }
    } catch (err) {
      console.error('Error creating alumni:', err);
      setAddAlumniError(err?.message || 'Failed to create alumni member');
    } finally {
      setAddAlumniLoading(false);
    }
  };

  const handleDeleteAlumni = (alumniId) => {
    setDeleteTarget({ type: 'alumni', id: alumniId });
    setShowDeleteModal(true);
  };

  const handleEditAlumni = (alumni) => {
    setEditAlumniForm({
      _id: alumni._id,
      fullName: alumni.fullName || alumni.name || '',
      email: alumni.email || '',
      graduationYear: alumni.graduationYear || '',
      major: alumni.major || '',
      company: alumni.company || '',
      jobTitle: alumni.jobTitle || '',
    });
    setEditAlumniError('');
    setShowEditAlumniModal(true);
  };

  const handleSaveAlumni = async () => {
    if (!editAlumniForm.fullName.trim() || !editAlumniForm.email.trim()) {
      setEditAlumniError('Name and email are required');
      return;
    }

    setEditAlumniLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(apiEndpoints.updateAlumni(editAlumniForm._id), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: editAlumniForm.fullName,
          email: editAlumniForm.email,
          graduationYear: editAlumniForm.graduationYear,
          major: editAlumniForm.major,
          company: editAlumniForm.company,
          jobTitle: editAlumniForm.jobTitle,
        }),
      });

      if (response.ok) {
        await fetchAlumni();
        setShowEditAlumniModal(false);
        setEditAlumniForm({
          _id: '',
          fullName: '',
          email: '',
          graduationYear: '',
          major: '',
          company: '',
          jobTitle: '',
        });
        notify('success', 'Alumni member updated successfully!');
      } else {
        const text = await response.text().catch(() => '');
        let message = 'Failed to update alumni member';
        try {
          const data = text ? JSON.parse(text) : null;
          if (data?.message) message = data.message;
        } catch (err) {
          if (text) message = text;
        }
        setEditAlumniError(message);
      }
    } catch (err) {
      console.error('Error updating alumni:', err);
      setEditAlumniError(err?.message || 'Failed to update alumni member');
    } finally {
      setEditAlumniLoading(false);
    }
  };

  const handleDeleteUser = (userId) => {
    setDeleteTarget({ type: 'user', id: userId });
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget.id) return;

    setDeleteLoading(true);
    try {
      const token = localStorage.getItem('token');
      const endpoint = deleteTarget.type === 'alumni'
        ? apiEndpoints.deleteAlumni(deleteTarget.id)
        : apiEndpoints.deleteUser(deleteTarget.id);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        if (deleteTarget.type === 'alumni') {
          await fetchAlumni();
          notify('success', 'Alumni member deleted successfully!');
        } else {
          await fetchAllUsers();
          notify('success', 'User deleted successfully!');
        }
        setShowDeleteModal(false);
        setDeleteTarget({ type: '', id: null });
      } else {
        notify('error', deleteTarget.type === 'alumni' ? 'Failed to delete alumni member' : 'Failed to delete user');
      }
    } catch (err) {
      console.error('Error deleting:', err);
      notify('error', deleteTarget.type === 'alumni' ? 'Error deleting alumni member' : 'Error deleting user');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleEditUser = (user) => {
    setEditUserForm({
      _id: user._id,
      name: user.name || '',
      email: user.email || '',
      role: user.role || '',
    });
    setEditUserError('');
    setShowEditUserModal(true);
  };

  const handleSaveUser = async () => {
    if (!editUserForm.name.trim() || !editUserForm.email.trim()) {
      setEditUserError('Name and email are required');
      return;
    }

    setEditUserLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(apiEndpoints.updateUser(editUserForm._id), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editUserForm.name,
          email: editUserForm.email,
          role: editUserForm.role,
        }),
      });

      if (response.ok) {
        await fetchAllUsers();
        setShowEditUserModal(false);
        setEditUserForm({
          _id: '',
          name: '',
          email: '',
          role: '',
        });
        notify('success', 'User updated successfully!');
      } else {
        const text = await response.text().catch(() => '');
        let message = 'Failed to update user';
        try {
          const data = text ? JSON.parse(text) : null;
          if (data?.message) message = data.message;
        } catch (err) {
          if (text) message = text;
        }
        setEditUserError(message);
      }
    } catch (err) {
      console.error('Error updating user:', err);
      setEditUserError(err?.message || 'Failed to update user');
    } finally {
      setEditUserLoading(false);
    }
  };

  const filteredApprovedUsers = allUsers.filter((u) =>
    u.status === 'approved' &&
    (u.role === 'admin' || u.role === 'super_admin' || u.role === 'hr' || u.role === 'alumni_officer') &&
    (searchQuery === '' ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.name || '').toLowerCase().includes(searchQuery.toLowerCase())) &&
    (roleFilter === '' || u.role === roleFilter)
  );

  const filteredAlumni = [...alumni, ...allUsers.filter(u => u.role === 'user' && u.status === 'approved')].filter((a) =>
    alumniSearchQuery === '' ||
    a.email?.toLowerCase().includes(alumniSearchQuery.toLowerCase()) ||
    (a.name || a.fullName || '').toLowerCase().includes(alumniSearchQuery.toLowerCase()) ||
    String(a.graduationYear || '').toLowerCase().includes(alumniSearchQuery.toLowerCase()) ||
    (a.major || '').toLowerCase().includes(alumniSearchQuery.toLowerCase()) ||
    (a.company || '').toLowerCase().includes(alumniSearchQuery.toLowerCase()) ||
    (a.jobTitle || '').toLowerCase().includes(alumniSearchQuery.toLowerCase())
  );
  const totalAlumniPages = Math.max(1, Math.ceil(filteredAlumni.length / ALUMNI_PAGE_SIZE));
  const paginatedAlumni = filteredAlumni.slice(
    (alumniPage - 1) * ALUMNI_PAGE_SIZE,
    alumniPage * ALUMNI_PAGE_SIZE,
  );

  const filteredPendingUsers = pendingUsers.filter((u) =>
    u.role === 'user' &&
    (searchQuery === '' ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.name || '').toLowerCase().includes(searchQuery.toLowerCase())) &&
    (roleFilter === '' || u.role === roleFilter)
  );

  const mobileManagedUsers = allUsers.filter((u) =>
    u.status === 'approved' &&
    (searchQuery === '' ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.name || '').toLowerCase().includes(searchQuery.toLowerCase())) &&
    (roleFilter === '' || u.role === roleFilter)
  );

  useEffect(() => {
    setAlumniPage(1);
  }, [alumniSearchQuery]);

  useEffect(() => {
    setAlumniPage((prev) => Math.min(prev, totalAlumniPages));
  }, [totalAlumniPages]);

  const handleReject = async () => {
    if (!selectedUserId) return;
    
    setActionLoading(selectedUserId);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(apiEndpoints.rejectUser(selectedUserId), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: rejectReason }),
      });

      const data = await response.json().catch(() => null);

      if (response.ok) {
        await fetchPendingUsers();
        await fetchStats();
        setShowRejectModal(false);
        setRejectReason('');
        setSelectedUserId(null);
        notify('success', data?.message || 'User rejected successfully.');
      } else {
        notify('error', data?.message || 'Failed to reject user.');
      }
    } catch (err) {
      console.error('Error rejecting user:', err);
      notify('error', 'Error rejecting user.');
    } finally {
      setActionLoading(null);
    }
  };

  const fetchDataRemovalRequests = async (status = dataRemovalStatus, options = {}) => {
    try {
      if (!options.silent) setDataRemovalLoading(true);
      const response = await fetch(apiEndpoints.dataRemovalRequests(status), {
        headers: authHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setDataRemovalRequests(data.requests || []);
      }
    } catch (err) {
      console.error('Error fetching data removal requests:', err);
    } finally {
      if (!options.silent) setDataRemovalLoading(false);
    }
  };

  const updateDataRemovalRequestState = (userId, nextStatus) => {
    setDataRemovalRequests((prev) => {
      if (dataRemovalStatus === 'pending') {
        return prev.filter((item) => item._id !== userId);
      }

      return prev.map((item) => {
        if (item._id !== userId) return item;
        return {
          ...item,
          dataRemovalRequestStatus: nextStatus,
          dataRemovalRequestReviewedAt: new Date().toISOString(),
        };
      });
    });
  };

  const approveDataRemovalRequest = async (userId) => {
    setDataRemovalActionLoading(userId);
    try {
      const response = await fetch(apiEndpoints.approveDataRemovalRequest(userId), {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        updateDataRemovalRequestState(userId, 'approved');
        notify('success', data?.message || 'Data removal request approved.');
        Promise.allSettled([
          fetchDataRemovalRequests(dataRemovalStatus, { silent: true }),
          fetchAllUsers(),
          fetchStats(),
        ]);
      } else {
        notify('error', data?.message || 'Failed to approve data removal request.');
      }
    } catch (err) {
      console.error('Error approving data removal request:', err);
      notify('error', 'Error approving data removal request.');
    } finally {
      setDataRemovalActionLoading(null);
    }
  };

  const rejectDataRemovalRequest = async (userId, note = '') => {
    setDataRemovalActionLoading(userId);
    try {
      const response = await fetch(apiEndpoints.rejectDataRemovalRequest(userId), {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        updateDataRemovalRequestState(userId, 'rejected');
        closeRejectDataRemovalModal();
        notify('success', data?.message || 'Data removal request rejected.');
        Promise.allSettled([
          fetchDataRemovalRequests(dataRemovalStatus, { silent: true }),
          fetchAllUsers(),
          fetchStats(),
        ]);
      } else {
        notify('error', data?.message || 'Failed to reject data removal request.');
      }
    } catch (err) {
      console.error('Error rejecting data removal request:', err);
      notify('error', 'Error rejecting data removal request.');
    } finally {
      setDataRemovalActionLoading(null);
    }
  };

  const openRejectDataRemovalModal = (userId) => {
    setSelectedDataRemovalRequestId(userId);
    setDataRemovalRejectNote('');
    setShowDataRemovalRejectModal(true);
  };

  const closeRejectDataRemovalModal = () => {
    setShowDataRemovalRejectModal(false);
    setSelectedDataRemovalRequestId(null);
    setDataRemovalRejectNote('');
  };

  const submitDataRemovalRejection = async () => {
    if (!selectedDataRemovalRequestId) return;
    const requestId = selectedDataRemovalRequestId;
    const rejectionNote = dataRemovalRejectNote;
    await rejectDataRemovalRequest(requestId, rejectionNote);
  };

  const canViewUserSections = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'hr' || user?.role === 'alumni_officer';
  const canAddAdminUser = user?.role === 'super_admin';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="flex min-h-screen bg-gray-100"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      <Sidebar isOpen={sidebarOpen} toggle={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex-1 flex flex-col">
       
        <header className="bg-[#DAB619] shadow-sm z-10">
          <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-8 md:py-4">
     
            <div className="flex-1 max-w-xl mx-auto">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  type="text"
                  placeholder="Search"
                  value={headerSearchQuery}
                  onChange={(e) => handleHeaderSearch(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white"
                />
                {headerSearchQuery && (
                  <button 
                    onClick={() => handleHeaderSearch('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

          
            <div className="flex items-center gap-3 md:ml-8 relative">
              <button 
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 rounded-lg px-2 py-1 transition"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-white">{user?.name || 'User'}</p>
                  <p className="text-xs text-gray-200">{user?.role?.replace('_', ' ')}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center overflow-hidden">
                  <img
                    src={user?.profileImage || fallbackProfileImage}
                    alt="Profile"
                    className="w-10 h-10 rounded-full object-cover"
                  />
                </div>
              </button>

          
              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, y: 6 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute top-full right-0 mt-3 w-60 bg-white rounded-xl shadow-xl border border-amber-100 z-50 overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-amber-100">
                      <p className="text-sm font-semibold text-gray-900">{user?.name || 'Account'}</p>
                      <p className="text-xs text-gray-500">{user?.email || ''}</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        navigate('/account');
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700 flex items-center gap-2"
                    >
                      <Cog6ToothIcon className="w-4 h-4 text-gray-500" />
                      Settings & Privacy
                    </button>
                    <button 
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 font-semibold flex items-center gap-2"
                    >
                      <ArrowRightOnRectangleIcon className="w-4 h-4 text-red-600" />
                      Logout
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

       
        <main className="flex-1 bg-gray-100">
          <div className="p-4 md:p-8">
            {canViewUserSections && (
              <section className="md:hidden bg-white rounded-[12px] border border-[#efe4d3] mb-6">
                <div className="p-3 border-b border-[#efe4d3]">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_120px_auto]">
                    <div className="relative">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search"
                        value={mobileAdminTab === 'verification' ? verificationSearchQuery : searchQuery}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (mobileAdminTab === 'verification') {
                            setVerificationSearchQuery(value);
                          } else {
                            setSearchQuery(value);
                          }
                        }}
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      />
                    </div>

                    <div className="grid grid-cols-[1fr_auto] gap-2 sm:contents">
                      <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 text-xs"
                      >
                        <option value="">Role</option>
                        <option value="admin">Admin</option>
                        <option value="hr">HR</option>
                        <option value="alumni_officer">Alumni Officer</option>
                      </select>

                      {canAddAdminUser ? (
                        <button
                          onClick={() => {
                            setAddUserError('');
                            setShowAddUserModal(true);
                          }}
                          className="px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-semibold rounded-md transition whitespace-nowrap"
                        >
                          ADD USER
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSearchQuery('');
                            setVerificationSearchQuery('');
                            setRoleFilter('');
                          }}
                          className="px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-semibold rounded-md transition whitespace-nowrap"
                        >
                          CLEAR
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 inline-flex rounded-md border border-gray-300 overflow-hidden">
                    <button
                      onClick={() => setMobileAdminTab('users')}
                      className={`px-5 py-2 text-[13px] font-semibold ${mobileAdminTab === 'users' ? 'bg-yellow-500 text-white' : 'bg-white text-gray-700'}`}
                    >
                      Users
                    </button>
                    <button
                      onClick={() => setMobileAdminTab('verification')}
                      className={`px-5 py-2 text-[13px] font-semibold ${mobileAdminTab === 'verification' ? 'bg-yellow-500 text-white' : 'bg-white text-gray-700'}`}
                    >
                      Verification
                    </button>
                  </div>
                </div>

                {mobileAdminTab === 'users' ? (
                  <div className="p-3">
                    <h2 className="text-[20px] leading-tight font-bold text-gray-900 mb-2">User Management</h2>
                    <div className="text-[10px] text-gray-500 mb-3">Showing {mobileManagedUsers.length} total users</div>
                    <div className="space-y-3">
                      {mobileManagedUsers.map((userData) => (
                        <div key={userData._id} className="border border-[#efe4d3] rounded-[10px] p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-[14px] leading-tight text-gray-900 truncate">{userData.name || 'User'}</div>
                              <div className="text-[11px] text-gray-500 truncate">{userData.email}</div>
                              <div className="mt-2">
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-[11px] font-medium">
                                  {userData.role?.replace('_', ' ')}
                                </span>
                              </div>
                            </div>
                            {canAddAdminUser && (
                              <button
                                onClick={() => handleDeleteUser(userData._id)}
                                aria-label="Remove user"
                                title="Remove user"
                                className="shrink-0 text-red-500 hover:text-red-600 transition"
                              >
                                <TrashIcon className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      {mobileManagedUsers.length === 0 && (
                        <div className="text-center py-8 text-sm text-gray-500">No users found</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-3">
                    <h2 className="text-[24px] leading-tight font-bold text-gray-900 mb-2">User Verification</h2>
                    <div className="text-[11px] text-gray-500 mb-3">Showing {filteredPendingUsers.length} pending users</div>
                    <div className="space-y-3">
                      {filteredPendingUsers
                        .filter((pendingUser) => {
                          const q = verificationSearchQuery.toLowerCase().trim();
                          if (!q) return true;
                          const name = (pendingUser.name || '').toLowerCase();
                          const email = (pendingUser.email || '').toLowerCase();
                          return name.includes(q) || email.includes(q);
                        })
                        .map((pendingUser) => (
                          <div key={pendingUser._id} className="border border-[#efe4d3] rounded-[10px] p-3">
                            <div className="font-semibold text-sm text-gray-900">{pendingUser.name || 'New User'}</div>
                            <div className="text-xs text-gray-500">{pendingUser.email}</div>
                            <div className="mt-2 text-[11px] text-gray-500">{pendingUser.role?.replace('_', ' ')}</div>
                            <div className="mt-3 flex gap-2 justify-end">
                              <button
                                onClick={() => handleRejectClick(pendingUser._id)}
                                aria-label="Reject user"
                                title="Reject user"
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                              >
                                <TrashIcon className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleApprove(pendingUser._id)}
                                disabled={actionLoading === pendingUser._id}
                                aria-label="Approve user"
                                title="Approve user"
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50 transition"
                              >
                                <CheckIcon className={`w-5 h-5 ${actionLoading === pendingUser._id ? 'animate-pulse' : ''}`} />
                              </button>
                            </div>
                          </div>
                        ))}

                      {filteredPendingUsers.length === 0 && (
                        <div className="text-center py-8 text-sm text-gray-500">No pending verifications</div>
                      )}
                    </div>
                  </div>
                )}
              </section>
            )}
       
          
            {(user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'hr' || user?.role === 'alumni_officer') && (
            <section ref={userVerificationRef} className="hidden md:block bg-white rounded-[12px] border border-[#efe4d3] mb-8">
              <div className="p-6 border-b border-[#efe4d3]">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">User Verification</h2>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        type="text"
                        placeholder="Search"
                        value={verificationSearchQuery}
                        onChange={(e) => setVerificationSearchQuery(e.target.value)}
                        className="pl-10 pr-10 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      />
                      {verificationSearchQuery && (
                        <button 
                          onClick={() => setVerificationSearchQuery('')}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <p className="text-gray-600 mb-6">{filteredPendingUsers.length} Pending Verifications</p>

                {filteredPendingUsers.length === 0 ? (
                  <div className="text-center text-gray-500 py-10">
                    No pending verifications
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#f7f4ee]">
                        <tr>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Role</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPendingUsers.map((pendingUser) => (
                          <tr key={pendingUser._id} className="border-b border-[#efe4d3] hover:bg-[#fbf7ee]">
                            <td className="px-6 py-4 text-sm text-gray-800">{pendingUser.name || pendingUser.email || '-'}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{pendingUser.email || '-'}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{pendingUser.role ? pendingUser.role.replace('_', ' ') : '-'}</td>
                            <td className="px-6 py-4 text-sm">
                              <span className="px-2 py-1 rounded text-xs font-semibold bg-yellow-100 text-yellow-700">
                                PENDING
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleRejectClick(pendingUser._id)}
                                  aria-label="Reject user"
                                  title="Reject user"
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                                >
                                  <TrashIcon className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => handleApprove(pendingUser._id)}
                                  disabled={actionLoading === pendingUser._id}
                                  aria-label="Approve user"
                                  title="Approve user"
                                  className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-60 transition"
                                >
                                  <CheckIcon className={`w-5 h-5 ${actionLoading === pendingUser._id ? 'animate-pulse' : ''}`} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
            )}

            {(user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'hr' || user?.role === 'alumni_officer') && (
            <section className="hidden md:block bg-white rounded-[12px] border border-[#efe4d3] mb-8">
              <div className="p-6 border-b border-[#efe4d3]">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Data Removal Requests</h2>
                  <div className="flex items-center gap-3">
                    <select
                      value={dataRemovalStatus}
                      onChange={(e) => {
                        setDataRemovalStatus(e.target.value);
                        fetchDataRemovalRequests(e.target.value);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="all">All</option>
                    </select>
                  </div>
                </div>

                <p className="text-gray-600 mb-6">{dataRemovalRequests.length} request(s)</p>

                {dataRemovalLoading ? (
                  <div className="text-sm text-gray-500">Loading requests...</div>
                ) : dataRemovalRequests.length === 0 ? (
                  <div className="text-center text-gray-500 py-10">No data removal requests</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#f7f4ee]">
                        <tr>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Requested</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Mode</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dataRemovalRequests.map((item) => {
                          const isPending = item.dataRemovalRequestStatus === 'pending';
                          const isActionLoading = dataRemovalActionLoading === item._id;
                          return (
                            <tr key={item._id} className="border-b border-[#efe4d3] hover:bg-[#fbf7ee]">
                              <td className="px-6 py-4 text-sm text-gray-800">{item.name || '-'}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{item.email || '-'}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                {item.dataRemovalRequestedAt ? new Date(item.dataRemovalRequestedAt).toLocaleString() : '-'}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                {item.dataRemovalRequestedFinalAction === 'anonymize' ? 'Anonymize' : 'Delete'}
                              </td>
                              <td className="px-6 py-4 text-sm">
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                  item.dataRemovalRequestStatus === 'approved'
                                    ? 'bg-green-100 text-green-700'
                                    : item.dataRemovalRequestStatus === 'rejected'
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {String(item.dataRemovalRequestStatus || 'pending').toUpperCase()}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm">
                                {isPending ? (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => openRejectDataRemovalModal(item._id)}
                                      disabled={isActionLoading}
                                      aria-label="Reject data removal request"
                                      title="Reject data removal request"
                                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-60 transition"
                                    >
                                      <TrashIcon className="w-5 h-5" />
                                    </button>
                                    <button
                                      onClick={() => approveDataRemovalRequest(item._id)}
                                      disabled={isActionLoading}
                                      aria-label="Approve data removal request"
                                      title="Approve data removal request"
                                      className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-60 transition"
                                    >
                                      <CheckIcon className={`w-5 h-5 ${isActionLoading ? 'animate-pulse' : ''}`} />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-gray-500">Reviewed</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
            )}

            
            {(user?.role === 'user' || user?.role === 'alumni' || user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'hr' || user?.role === 'alumni_officer') && (
            <section ref={alumniManagementRef} className="hidden md:block bg-white rounded-[12px] border border-[#efe4d3] mb-8">
              <div className="p-6 border-b border-[#efe4d3]">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Alumni Management</h2>
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search"
                      value={alumniSearchQuery}
                      onChange={(e) => setAlumniSearchQuery(e.target.value)}
                      className="pl-10 pr-10 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                    {alumniSearchQuery && (
                      <button 
                        onClick={() => setAlumniSearchQuery('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-gray-600 mb-6">Showing {filteredAlumni.length} alumni members</p>

                {filteredAlumni.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No alumni members added yet</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-[#f7f4ee]">
                          <tr>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Graduation Year</th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Major</th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Company</th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedAlumni.map((alumniMember) => (
                            <tr key={alumniMember._id} className="border-b border-[#efe4d3] hover:bg-[#fbf7ee]">
                              <td className="px-6 py-4 text-sm text-gray-800">{alumniMember.name || '-'}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{alumniMember.email}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{alumniMember.graduationYear || '-'}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{alumniMember.major || '-'}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{alumniMember.company || '-'}</td>
                              <td className="px-6 py-4 text-sm flex gap-3">
                                <button
                                  onClick={() => handleDeleteAlumni(alumniMember._id)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                                  title="Delete"
                                >
                                  <TrashIcon className="w-5 h-5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-4 flex flex-col gap-3 border-t border-[#efe4d3] pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-gray-600">
                        Showing {filteredAlumni.length === 0 ? 0 : ((alumniPage - 1) * ALUMNI_PAGE_SIZE) + 1}-{Math.min(alumniPage * ALUMNI_PAGE_SIZE, filteredAlumni.length)} of {filteredAlumni.length}
                      </p>
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          onClick={() => setAlumniPage((prev) => Math.max(1, prev - 1))}
                          disabled={alumniPage === 1}
                          className="px-3 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <span className="text-sm font-medium text-gray-700">
                          Page {alumniPage} of {totalAlumniPages}
                        </span>
                        <button
                          onClick={() => setAlumniPage((prev) => Math.min(totalAlumniPages, prev + 1))}
                          disabled={alumniPage === totalAlumniPages}
                          className="px-3 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </section>
            )}

          
            {(user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'hr' || user?.role === 'alumni_officer') && (
            <section ref={adminManagementRef} className="hidden md:block bg-white rounded-[12px] border border-[#efe4d3] mb-8">
              <div className="p-6 border-b border-[#efe4d3]">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Admin Management</h2>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        type="text"
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-10 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      />
                      {searchQuery && (
                        <button 
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <select 
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    >
                      <option value="">Roles</option>
                      <option value="admin">Admin</option>
                      <option value="hr">HR</option>
                      <option value="alumni_officer">Alumni Officer</option>
                    </select>
                    {user?.role === 'super_admin' && (
                      <button
                        onClick={() => {
                          setAddUserError('');
                          setShowAddUserModal(true);
                        }}
                        className="px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-md transition"
                      >
                        ADD USER
                      </button>
                    )}
                  </div>
                </div>

              
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Name</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Roles</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="text-sm text-gray-500 border-b">
                        <td colSpan="3" className="py-2 px-4">Showing {filteredApprovedUsers.length} users</td>
                      </tr>
              
                      {filteredApprovedUsers.map((userData) => (
                        <tr key={userData._id} className="border-b hover:bg-gray-50">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <div>
                                <p className="font-semibold text-gray-800">{userData.name || userData.email}</p>
                                <p className="text-sm text-gray-500">{userData.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex flex-wrap gap-2">
                              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                {userData.role?.replace('_', ' ')}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex gap-3">
                              {user?.role === 'super_admin' && (
                                <button
                                  onClick={() => handleDeleteUser(userData._id)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                                  title="Delete"
                                >
                                  <TrashIcon className="w-5 h-5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}

                      {filteredApprovedUsers.length === 0 && (
                        <tr>
                          <td colSpan="4" className="py-8 text-center text-gray-500">
                            No users found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
            )}

            {(user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'hr' || user?.role === 'alumni_officer') && (
              <section ref={mentorshipProgramsRef} className="bg-white rounded-[12px] border border-[#efe4d3] mb-8">
                <div className="p-4 md:p-6 border-b border-[#efe4d3]">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <h2 className="text-[18px] md:text-2xl font-bold text-gray-800 leading-tight">Mentorship & Volunteer Programs</h2>
                    <div className="flex items-center gap-3 flex-wrap">
                      <button
                        onClick={() => {
                          fetchMentorApplications(mentorAppsStatus);
                          fetchVolunteerOpportunities(volunteerOppsStatus);
                          fetchVolunteerParticipations(participationsStatus);
                          fetchVolunteerLogs(volunteerLogsStatus);
                        }}
                        className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 font-semibold text-sm md:text-base transition"
                      >
                        Refresh
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-4 md:p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                    <div className="border border-[#efe4d3] rounded-[12px] p-4 md:p-5">
                      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                        <div>
                          <h3 className="text-[15px] md:text-lg font-bold text-gray-800">Mentor / Speaker Applications</h3>
                          <p className="text-sm text-gray-600">{mentorAppsLoading ? 'Loading…' : `${mentorApplications.length} applications`}</p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                          <select
                            value={mentorAppsStatus}
                            onChange={(e) => {
                              const next = e.target.value;
                              setMentorAppsStatus(next);
                              fetchMentorApplications(next);
                            }}
                            className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm"
                          >
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                          </select>
                          <div className="relative w-full sm:w-auto">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              value={mentorAppsSearch}
                              onChange={(e) => setMentorAppsSearch(e.target.value)}
                              placeholder="Search"
                              className="pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm w-full sm:w-[180px]"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {(mentorApplications || [])
                          .filter((app) => {
                            const q = mentorAppsSearch.toLowerCase().trim();
                            if (!q) return true;
                            const name = (app?.user?.name || '').toLowerCase();
                            const email = (app?.user?.email || '').toLowerCase();
                            return name.includes(q) || email.includes(q);
                          })
                          .slice(0, 6)
                          .map((app) => (
                            <div key={app._id} className="border border-gray-200 rounded-lg p-3 bg-white">
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="font-semibold text-gray-800 truncate">{app?.user?.name || 'Unknown user'}</div>
                                  <div className="text-xs text-gray-600 truncate">{app?.user?.email || ''}</div>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {(app.roles || []).map((r) => (
                                      <span key={r} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                        {r}
                                      </span>
                                    ))}
                                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                                      {app.status}
                                    </span>
                                  </div>
                                </div>
                                {app.status === 'pending' ? (
                                  <div className="flex gap-2 self-end sm:self-auto">
                                    <button
                                      onClick={() => rejectMentorApplication(app._id)}
                                      disabled={mentorAppsActionLoading === app._id}
                                      className="p-2 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                                      title="Reject"
                                    >
                                      <XMarkIcon className="w-5 h-5" />
                                    </button>
                                    <button
                                      onClick={() => approveMentorApplication(app._id)}
                                      disabled={mentorAppsActionLoading === app._id}
                                      className="p-2 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                                      title="Approve"
                                    >
                                      <CheckIcon className="w-5 h-5" />
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          ))}

                        {!mentorAppsLoading && mentorApplications.length === 0 && (
                          <div className="text-sm text-gray-500 italic">No applications found.</div>
                        )}
                      </div>
                    </div>

                    <div className="border border-[#efe4d3] rounded-[12px] p-4 md:p-5">
                      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                        <div>
                          <h3 className="text-[15px] md:text-lg font-bold text-gray-800">Volunteer Opportunities</h3>
                          <p className="text-sm text-gray-600">{volunteerOppsLoading ? 'Loading…' : `${volunteerOpps.length} opportunities`}</p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                          <select
                            value={volunteerOppsStatus}
                            onChange={(e) => {
                              const next = e.target.value;
                              setVolunteerOppsStatus(next);
                              fetchVolunteerOpportunities(next);
                            }}
                            className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm"
                          >
                            <option value="active">Active</option>
                            <option value="closed">Closed</option>
                          </select>
                          <button
                            onClick={() => {
                              setAddOpportunityError('');
                              setShowAddOpportunityModal(true);
                            }}
                            className="w-full sm:w-auto px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-md transition text-sm flex items-center justify-center gap-2"
                          >
                            <PlusIcon className="w-4 h-4" />
                            Add
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {(volunteerOpps || []).slice(0, 6).map((opp) => (
                          <div key={opp._id} className="border border-gray-200 rounded-lg p-3 bg-white">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-semibold text-gray-800 truncate">{opp.title}</div>
                                <div className="text-xs text-gray-600 truncate">
                                  {[opp.category, opp.location].filter(Boolean).join(' • ') || '—'}
                                </div>
                                <div className="mt-2 text-xs text-gray-600">
                                  {opp.startAt ? new Date(opp.startAt).toLocaleString() : 'No date'}{opp.endAt ? ` → ${new Date(opp.endAt).toLocaleString()}` : ''}
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                                    {opp.status}
                                  </span>
                                  {typeof opp.estimatedHours === 'number' ? (
                                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                                      Est. {opp.estimatedHours}h
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                              <div className="flex gap-2 self-end sm:self-auto">
                                {opp.status === 'active' ? (
                                  <button
                                    onClick={() => closeVolunteerOpportunity(opp._id)}
                                    className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 font-semibold transition text-xs"
                                  >
                                    Close
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => reopenVolunteerOpportunity(opp._id)}
                                    className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 font-semibold transition text-xs"
                                  >
                                    Reopen
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}

                        {!volunteerOppsLoading && volunteerOpps.length === 0 && (
                          <div className="text-sm text-gray-500 italic">No opportunities found.</div>
                        )}
                      </div>
                    </div>

                    <div className="border border-[#efe4d3] rounded-[12px] p-4 md:p-5">
                      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                        <div>
                          <h3 className="text-[15px] md:text-lg font-bold text-gray-800">Volunteer Tracking</h3>
                          <p className="text-sm text-gray-600">Participations & hour logs</p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="font-semibold text-gray-800">Participations</div>
                          <select
                            value={participationsStatus}
                            onChange={(e) => {
                              const next = e.target.value;
                              setParticipationsStatus(next);
                              fetchVolunteerParticipations(next);
                            }}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm"
                          >
                            <option value="applied">Applied</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="attended">Attended</option>
                          </select>
                        </div>
                        <div className="mt-3 space-y-2">
                          {(volunteerParticipations || []).slice(0, 4).map((p) => (
                            <div key={p._id} className="border border-gray-200 rounded-lg p-3 bg-white">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="font-semibold text-gray-800 truncate">{p.opportunity?.title || 'Opportunity'}</div>
                                  <div className="text-xs text-gray-600 truncate">{p.user?.name || ''} • {p.role} • {p.status}</div>
                                  {p.status === 'attended' ? (
                                    <div className="mt-2 text-xs text-gray-600">Hours: {p.hoursLogged ?? 0}</div>
                                  ) : null}
                                </div>
                                <div className="flex gap-2 self-end sm:self-auto">
                                  {p.status === 'applied' ? (
                                    <>
                                      <button
                                        onClick={() => rejectParticipation(p._id)}
                                        disabled={participationActionLoading === p._id}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                                        title="Reject"
                                      >
                                        <XMarkIcon className="w-5 h-5" />
                                      </button>
                                      <button
                                        onClick={() => approveParticipation(p._id)}
                                        disabled={participationActionLoading === p._id}
                                        className="p-2 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                                        title="Approve"
                                      >
                                        <CheckIcon className="w-5 h-5" />
                                      </button>
                                    </>
                                  ) : null}
                                  {p.status === 'approved' ? (
                                    <button
                                      onClick={() => openMarkAttended(p._id)}
                                      className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 font-semibold transition text-xs"
                                    >
                                      Mark attended
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          ))}
                          {!participationsLoading && volunteerParticipations.length === 0 && (
                            <div className="text-sm text-gray-500 italic">No participations found.</div>
                          )}
                        </div>
                      </div>

                      <div className="pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="font-semibold text-gray-800">Hour Logs</div>
                          <select
                            value={volunteerLogsStatus}
                            onChange={(e) => {
                              const next = e.target.value;
                              setVolunteerLogsStatus(next);
                              fetchVolunteerLogs(next);
                            }}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm"
                          >
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </div>
                        <div className="mt-3 space-y-2">
                          {(volunteerLogs || []).slice(0, 4).map((log) => (
                            <div key={log._id} className="border border-gray-200 rounded-lg p-3 bg-white">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="font-semibold text-gray-800 truncate">{log.title}</div>
                                  <div className="text-xs text-gray-600 truncate">{log.user?.name || ''} • {new Date(log.date).toLocaleDateString()} • {log.hours}h</div>
                                  <div className="mt-2 text-xs text-gray-600">Status: {log.status}</div>
                                </div>
                                {log.status === 'pending' ? (
                                  <div className="flex gap-2 self-end sm:self-auto">
                                    <button
                                      onClick={() => rejectVolunteerLog(log._id)}
                                      disabled={volunteerLogActionLoading === log._id}
                                      className="p-2 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                                      title="Reject"
                                    >
                                      <XMarkIcon className="w-5 h-5" />
                                    </button>
                                    <button
                                      onClick={() => approveVolunteerLog(log._id)}
                                      disabled={volunteerLogActionLoading === log._id}
                                      className="p-2 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                                      title="Approve"
                                    >
                                      <CheckIcon className="w-5 h-5" />
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          ))}
                          {!volunteerLogsLoading && volunteerLogs.length === 0 && (
                            <div className="text-sm text-gray-500 italic">No logs found.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>
        </main>
      </div>

   
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="bg-white rounded-xl md:rounded-2xl shadow-xl w-full max-w-[90vw] md:max-w-md p-3 md:p-8 relative max-h-[92vh] overflow-y-auto scrollbar-hide"
          >
            <h3 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">Add Admin User</h3>
            <p className="text-gray-600 mb-3 md:mb-4 text-sm md:text-base">Fill in the details to create an admin account.</p>

            {addUserError && (
              <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
                {addUserError}
              </p>
            )}

            <form onSubmit={handleCreateAdminUser} className="space-y-3 md:space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  name="fullName"
                  value={addUserForm.fullName}
                  onChange={handleAddUserChange}
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                <input
                  name="employeeId"
                  value={addUserForm.employeeId}
                  onChange={handleAddUserChange}
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  name="email"
                  value={addUserForm.email}
                  onChange={handleAddUserChange}
                  type="email"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                <input
                  name="contactNumber"
                  value={addUserForm.contactNumber}
                  onChange={handleAddUserChange}
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  name="address"
                  value={addUserForm.address}
                  onChange={handleAddUserChange}
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  name="role"
                  value={addUserForm.role || ''}
                  onChange={handleAddUserChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  required
                >
                  <option value="">Select Role</option>
                  <option value="admin">Admin</option>
                  <option value="hr">HR</option>
                  <option value="alumni_officer">Alumni Officer</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Temporary Password</label>
                <input
                  name="tempPassword"
                  value={addUserForm.tempPassword}
                  onChange={handleAddUserChange}
                  type="password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="flex-1 px-3 py-2 md:px-4 md:py-3 border border-gray-300 text-gray-700 text-sm md:text-base rounded-md hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addUserLoading}
                  className="flex-1 px-3 py-2 md:px-4 md:py-3 bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-400 text-white text-sm md:text-base font-semibold rounded-md transition"
                >
                  {addUserLoading ? 'Creating...' : 'Create Admin'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="bg-white rounded-xl md:rounded-2xl shadow-xl w-full max-w-[90vw] md:max-w-2xl p-4 md:p-8 relative"
          >
            <h3 className="text-2xl font-bold mb-4">Reject Registration</h3>
            <p className="text-gray-600 mb-4">Please provide a reason for rejection (optional):</p>
            
            <textarea
              className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 bg-gray-50 mb-4 resize-none"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Enter reason for rejection..."
              rows={4}
            />
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                  setSelectedUserId(null);
                }}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 disabled:bg-red-400 text-white font-semibold rounded-md transition"
              >
                {actionLoading ? 'Rejecting...' : 'Reject User'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <AnimatePresence>
        {showDataRemovalRejectModal && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="bg-white rounded-xl md:rounded-2xl shadow-xl w-full max-w-[90vw] md:max-w-xl p-4 md:p-8 relative"
            >
            <h3 className="text-2xl font-bold mb-4">Reject Data Removal Request</h3>
            <p className="text-gray-600 mb-4">Add an optional note for rejection:</p>

            <textarea
              className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 bg-gray-50 mb-4 resize-none"
              value={dataRemovalRejectNote}
              onChange={(e) => setDataRemovalRejectNote(e.target.value)}
              placeholder="Enter note (optional)..."
              rows={4}
            />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={closeRejectDataRemovalModal}
                disabled={Boolean(dataRemovalActionLoading)}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-60 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitDataRemovalRejection}
                disabled={Boolean(dataRemovalActionLoading)}
                className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 disabled:bg-red-400 text-white font-semibold rounded-md transition"
              >
                {dataRemovalActionLoading === selectedDataRemovalRequestId ? 'Rejecting...' : 'Reject Request'}
              </button>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Alumni Modal */}
      {showAddAlumniModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="bg-white rounded-xl md:rounded-2xl shadow-xl w-full max-w-[90vw] md:max-w-2xl p-4 md:p-8 relative"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold text-gray-800">Add Alumni Member</h3>
              <button
                onClick={() => setShowAddAlumniModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {addAlumniError && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
                {addAlumniError}
              </div>
            )}

            <form onSubmit={handleCreateAlumni} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  name="fullName"
                  value={addAlumniForm.fullName}
                  onChange={handleAddAlumniChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={addAlumniForm.email}
                  onChange={handleAddAlumniChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Graduation Year *</label>
                <input
                  type="text"
                  name="graduationYear"
                  placeholder="e.g., 2020"
                  value={addAlumniForm.graduationYear}
                  onChange={handleAddAlumniChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Major *</label>
                <input
                  type="text"
                  name="major"
                  placeholder="e.g., Computer Science"
                  value={addAlumniForm.major}
                  onChange={handleAddAlumniChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Company</label>
                <input
                  type="text"
                  name="company"
                  placeholder="e.g., Google"
                  value={addAlumniForm.company}
                  onChange={handleAddAlumniChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Job Title</label>
                <input
                  type="text"
                  name="jobTitle"
                  placeholder="e.g., Software Engineer"
                  value={addAlumniForm.jobTitle}
                  onChange={handleAddAlumniChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddAlumniModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addAlumniLoading}
                  className="flex-1 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-400 text-white font-semibold rounded-md transition"
                >
                  {addAlumniLoading ? 'Adding...' : 'Add Alumni'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* EDIT ALUMNI MODAL */}
      {showEditAlumniModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="bg-white rounded-xl md:rounded-2xl shadow-xl w-full max-w-[90vw] md:max-w-2xl p-4 md:p-8 relative max-h-[92vh] overflow-y-auto"
          >
            <button
              onClick={() => setShowEditAlumniModal(false)}
              className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-lg transition"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>

            <h2 className="text-2xl font-bold mb-4 text-gray-800">Edit Alumni Member</h2>

            {editAlumniError && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-200 rounded-md text-sm">
                {editAlumniError}
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); handleSaveAlumni(); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    value={editAlumniForm.fullName}
                    onChange={(e) => setEditAlumniForm({ ...editAlumniForm, fullName: e.target.value })}
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    value={editAlumniForm.email}
                    onChange={(e) => setEditAlumniForm({ ...editAlumniForm, email: e.target.value })}
                    type="email"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Graduation Year</label>
                  <input
                    value={editAlumniForm.graduationYear}
                    onChange={(e) => setEditAlumniForm({ ...editAlumniForm, graduationYear: e.target.value })}
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Major</label>
                  <input
                    value={editAlumniForm.major}
                    onChange={(e) => setEditAlumniForm({ ...editAlumniForm, major: e.target.value })}
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                  <input
                    value={editAlumniForm.company}
                    onChange={(e) => setEditAlumniForm({ ...editAlumniForm, company: e.target.value })}
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                  <input
                    value={editAlumniForm.jobTitle}
                    onChange={(e) => setEditAlumniForm({ ...editAlumniForm, jobTitle: e.target.value })}
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditAlumniModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editAlumniLoading}
                  className="flex-1 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-400 text-white font-semibold rounded-md transition"
                >
                  {editAlumniLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

 
      {showEditUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="bg-white rounded-xl md:rounded-2xl shadow-xl w-full max-w-[90vw] md:max-w-md p-4 md:p-8 relative max-h-[92vh] overflow-y-auto"
          >
            <button
              onClick={() => setShowEditUserModal(false)}
              className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-lg transition"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>

            <h2 className="text-2xl font-bold mb-4 text-gray-800">Edit User</h2>

            {editUserError && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-200 rounded-md text-sm">
                {editUserError}
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); handleSaveUser(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  value={editUserForm.name}
                  onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={user?.role !== 'super_admin'}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  value={editUserForm.email}
                  onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                  type="email"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={user?.role !== 'super_admin'}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={editUserForm.role}
                  onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  required
                >
                  <option value="">Select Role</option>
                  {user?.role === 'super_admin' && (
                    <option value="user">Alumni</option>
                  )}
                  <option value="admin">Admin</option>
                  <option value="hr">HR</option>
                  <option value="alumni_officer">Alumni Officer</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditUserModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editUserLoading}
                  className="flex-1 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-400 text-white font-semibold rounded-md transition"
                >
                  {editUserLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="bg-white rounded-xl md:rounded-2xl shadow-xl w-full max-w-[90vw] md:max-w-md p-4 md:p-8 relative"
          >
            <h2 className="text-2xl font-bold mb-2 text-gray-800">Confirm Delete</h2>
            <p className="text-gray-600 mb-6">
              {deleteTarget.type === 'alumni'
                ? 'Are you sure you want to delete this alumni member?'
                : 'Are you sure you want to delete this user?'}
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteTarget({ type: '', id: null });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-400 text-white font-semibold rounded-md transition"
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showAddOpportunityModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="bg-white rounded-xl md:rounded-2xl shadow-xl w-full max-w-[90vw] md:max-w-lg p-4 md:p-8 relative max-h-[92vh] overflow-y-auto scrollbar-hide"
          >
            <button
              onClick={() => setShowAddOpportunityModal(false)}
              className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-lg transition"
              aria-label="Close"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>

            <h3 className="text-2xl font-bold mb-2">Add Volunteer Opportunity</h3>
            <p className="text-gray-600 mb-4">Create an outreach / advocacy activity that alumni can join.</p>

            {addOpportunityError && (
              <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
                {addOpportunityError}
              </p>
            )}

            <form onSubmit={createVolunteerOpportunity} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  value={addOpportunityForm.title}
                  onChange={(e) => setAddOpportunityForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <input
                  value={addOpportunityForm.category}
                  onChange={(e) => setAddOpportunityForm((p) => ({ ...p, category: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  placeholder="Outreach / Advocacy / Tech Talk"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={addOpportunityForm.description}
                  onChange={(e) => setAddOpportunityForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start (optional)</label>
                  <input
                    type="datetime-local"
                    value={addOpportunityForm.startAt}
                    onChange={(e) => setAddOpportunityForm((p) => ({ ...p, startAt: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End (optional)</label>
                  <input
                    type="datetime-local"
                    value={addOpportunityForm.endAt}
                    onChange={(e) => setAddOpportunityForm((p) => ({ ...p, endAt: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    value={addOpportunityForm.location}
                    onChange={(e) => setAddOpportunityForm((p) => ({ ...p, location: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="Onsite / Virtual"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Hours</label>
                  <input
                    type="number"
                    min="0"
                    value={addOpportunityForm.estimatedHours}
                    onChange={(e) => setAddOpportunityForm((p) => ({ ...p, estimatedHours: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="e.g. 2"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddOpportunityModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addOpportunityLoading}
                  className="flex-1 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-400 text-white font-semibold rounded-md transition"
                >
                  {addOpportunityLoading ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {showAttendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="bg-white rounded-xl md:rounded-2xl shadow-xl w-full max-w-[90vw] md:max-w-md p-4 md:p-8 relative"
          >
            <button
              onClick={() => {
                setShowAttendModal(false);
                setSelectedParticipationId(null);
              }}
              className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-lg transition"
              aria-label="Close"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>

            <h2 className="text-2xl font-bold mb-2 text-gray-800">Mark Attended</h2>
            <p className="text-gray-600 mb-6">Optionally enter hours to credit for this participation.</p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Hours (optional)</label>
              <input
                type="number"
                min="0"
                value={attendHours}
                onChange={(e) => setAttendHours(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                placeholder="Leave blank to use estimated hours"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowAttendModal(false);
                  setSelectedParticipationId(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={markParticipationAttended}
                disabled={participationActionLoading === selectedParticipationId}
                className="flex-1 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-400 text-white font-semibold rounded-md transition"
              >
                {participationActionLoading === selectedParticipationId ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="bg-white rounded-xl md:rounded-2xl shadow-xl w-full max-w-[90vw] md:max-w-md p-4 md:p-8 relative"
          >
            <button
              onClick={() => setShowLogoutModal(false)}
              className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-lg transition"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>

            <h2 className="text-2xl font-bold mb-2 text-gray-800">Confirm Logout</h2>
            <p className="text-gray-600 mb-6">Are you sure you want to log out?</p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md transition"
              >
                Logout
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
