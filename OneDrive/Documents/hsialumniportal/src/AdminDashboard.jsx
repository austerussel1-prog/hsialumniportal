import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ChevronDownIcon, 
  ChevronRightIcon, 
  MagnifyingGlassIcon,
  PencilIcon,
  PlusIcon,
  XMarkIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import Sidebar from './components/Sidebar';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [stats, setStats] = useState({ totalUsers: 0, approvedUsers: 0, pendingUsers: 0, rejectedUsers: 0 });
  const [actionLoading, setActionLoading] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [addUserForm, setAddUserForm] = useState({
    fullName: '',
    employeeId: '',
    email: '',
    contactNumber: '',
    address: '',
    tempPassword: '',
  });
  const [addUserLoading, setAddUserLoading] = useState(false);
  const [addUserError, setAddUserError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      navigate('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    
 
    if (!['super_admin', 'admin'].includes(parsedUser.role)) {
      alert('Access denied. Admin only.');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
      return;
    }

    setUser(parsedUser);
    fetchPendingUsers();
    fetchAllUsers();
    fetchStats();
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchPendingUsers();
      fetchAllUsers();
      fetchStats();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const fetchAllUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/admin/all-users', {
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
      const response = await fetch('http://localhost:5000/api/admin/pending-users', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPendingUsers(data.users);
      } else {
        const fallback = await fetch('http://localhost:5000/api/admin/all-users', {
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

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/admin/stats', {
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

  const handleApprove = async (userId) => {
    setActionLoading(userId);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/admin/approve/${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchPendingUsers();
        await fetchStats();
        alert('User approved successfully!');
      } else {
        alert('Failed to approve user');
      }
    } catch (err) {
      console.error('Error approving user:', err);
      alert('Error approving user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectClick = (userId) => {
    setSelectedUserId(userId);
    setShowRejectModal(true);
  };

  const handleLogout = () => {
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
      const response = await fetch('http://localhost:5000/api/admin/create-admin', {
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

  const filteredApprovedUsers = allUsers.filter((u) =>
    u.status === 'approved' &&
    (searchQuery === '' ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.name || '').toLowerCase().includes(searchQuery.toLowerCase())) &&
    (roleFilter === '' || u.role === roleFilter)
  );

  const filteredPendingUsers = pendingUsers.filter((u) =>
    u.role === 'user' &&
    (searchQuery === '' ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.name || '').toLowerCase().includes(searchQuery.toLowerCase())) &&
    (roleFilter === '' || u.role === roleFilter)
  );

  const handleReject = async () => {
    if (!selectedUserId) return;
    
    setActionLoading(selectedUserId);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/admin/reject/${selectedUserId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: rejectReason }),
      });

      if (response.ok) {
        await fetchPendingUsers();
        await fetchStats();
        setShowRejectModal(false);
        setRejectReason('');
        setSelectedUserId(null);
        alert('User rejected successfully!');
      } else {
        alert('Failed to reject user');
      }
    } catch (err) {
      console.error('Error rejecting user:', err);
      alert('Error rejecting user');
    } finally {
      setActionLoading(null);
    }
  };

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
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} toggle={() => setSidebarOpen(!sidebarOpen)} />

 
      <div className="flex-1 flex flex-col overflow-hidden">
       
        <header className="bg-[#8B8B3D] shadow-sm z-10">
          <div className="flex items-center justify-between px-8 py-4">
     
            <div className="flex-1 max-w-xl mx-auto">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  type="text"
                  placeholder="Search"
                  className="w-full pl-10 pr-4 py-2 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white"
                />
              </div>
            </div>

          
            <div className="flex items-center gap-3 ml-8 relative">
              <button 
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 hover:bg-gray-700 rounded-lg px-2 py-1 transition"
              >
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">{user?.name || 'User'}</p>
                  <p className="text-xs text-gray-200">{user?.role?.replace('_', ' ')}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
              </button>

            
              {showUserMenu && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <button className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700">
                    Profile
                  </button>
                  <button className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700">
                    Settings
                  </button>
                  <hr className="my-2" />
                  <button 
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600 font-semibold"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

       
        <main className="flex-1 overflow-y-auto bg-gray-100">
          <div className="p-8">
       
            <section className="bg-white rounded-lg shadow mb-8">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">User Management</h2>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        type="text"
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      />
                    </div>
                    <select 
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    >
                      <option value="">Roles</option>
                      <option value="admin">Admin</option>
                      <option value="user">Alumni</option>
                    </select>
                    <button
                      onClick={() => {
                        setAddUserError('');
                        setShowAddUserModal(true);
                      }}
                      className="px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-md transition"
                    >
                      ADD USER
                    </button>
                  </div>
                </div>

              
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4">
                          <input type="checkbox" className="rounded" />
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Name</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Roles</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="text-sm text-gray-500 border-b">
                        <td colSpan="4" className="py-2 px-4">Showing {filteredApprovedUsers.length} users</td>
                      </tr>
              
                      {filteredApprovedUsers.map((userData) => (
                        <tr key={userData._id} className="border-b hover:bg-gray-50">
                          <td className="py-4 px-4">
                            <input type="checkbox" className="rounded" />
                          </td>
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
                            <div className="flex flex-col gap-1 text-sm">
                              <button className="flex items-center gap-1 text-gray-600 hover:text-gray-800">
                                <span>⚙️</span> Modify Role
                              </button>
                              <button className="flex items-center gap-1 text-red-600 hover:text-red-800">
                                <span>🗑️</span> Remove
                              </button>
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

         
            <section className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">User Verification</h2>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        type="text"
                        placeholder="Search"
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      />
                    </div>
                    <select 
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    >
                      <option value="">Roles</option>
                      <option value="admin">Admin</option>
                      <option value="user">Alumni</option>
                    </select>
                    <button className="px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-md transition">
                      CLEAR
                    </button>
                  </div>
                </div>

                <p className="text-gray-600 mb-6">{filteredPendingUsers.length} Pending Verifications</p>

              
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredPendingUsers.map((pendingUser) => (
                    <div key={pendingUser._id} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-gray-800 mb-1">New Alumni Registration</h3>
                          <div className="flex flex-wrap gap-2 mb-3">
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">Pending</span>
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">{pendingUser.role?.replace('_', ' ')}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleRejectClick(pendingUser._id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded"
                          >
                            <XMarkIcon className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleApprove(pendingUser._id)}
                            disabled={actionLoading === pendingUser._id}
                            className="p-2 text-green-500 hover:bg-green-50 rounded disabled:opacity-50"
                          >
                            <CheckIcon className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                          <svg className="w-7 h-7 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{pendingUser.name || pendingUser.email}</p>
                          <p className="text-sm text-gray-500">{pendingUser.email}</p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {filteredPendingUsers.length === 0 && (
                    <div className="col-span-full text-center text-gray-500 py-10">
                      No pending verifications
                    </div>
                  )}
                </div>

           
                <div className="flex justify-end items-center gap-2 mt-6">
                  <button className="px-4 py-2 bg-yellow-500 text-white rounded-md font-semibold hover:bg-yellow-600">
                    FIRST
                  </button>
                  <button className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                    &lt;
                  </button>
                  <button className="px-3 py-2 bg-yellow-500 text-white rounded-md">
                    1
                  </button>
                  <button className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                    2
                  </button>
                  <button className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                    &gt;
                  </button>
                  <button className="px-4 py-2 bg-yellow-500 text-white rounded-md font-semibold hover:bg-yellow-600">
                    LAST
                  </button>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>

   
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-8 relative"
          >
            <h3 className="text-2xl font-bold mb-4">Add Admin User</h3>
            <p className="text-gray-600 mb-4">Fill in the details to create an admin account.</p>

            {addUserError && (
              <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
                {addUserError}
              </p>
            )}

            <form onSubmit={handleCreateAdminUser} className="space-y-4">
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
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addUserLoading}
                  className="flex-1 px-4 py-3 bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-400 text-white font-semibold rounded-md transition"
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
            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-8 relative"
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
    </div>
  );
}
