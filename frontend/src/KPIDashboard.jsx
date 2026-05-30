import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  TrendUp,
  Target,
  Award,
  Trophy,
  Zap,
} from '@phosphor-icons/react';
import Sidebar from './components/Sidebar';
import { apiEndpoints } from './config/api';

export default function KPIDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userType, setUserType] = useState('alumni');
  const [kpis, setKpis] = useState([]);
  const [stats, setStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [metric, setMetric] = useState('engagementScore');
  const [currentUser, setCurrentUser] = useState(null);

  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch(apiEndpoints.getProfile, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const userData = await response.json();
          setCurrentUser(userData);
        }
      } catch (err) {
        console.error('Error fetching user:', err);
      }
    };

    fetchCurrentUser();
  }, [token]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        const [kpiRes, statsRes, leaderboardRes] = await Promise.all([
          fetch(
            `${apiEndpoints.kpi}?page=1&limit=50&userType=${userType}`,
            { headers: { Authorization: `Bearer ${token}` } }
          ),
          fetch(
            `${apiEndpoints.kpiStats}?userType=${userType}`,
            { headers: { Authorization: `Bearer ${token}` } }
          ),
          fetch(
            `${apiEndpoints.kpiLeaderboard(userType)}?limit=10&metric=${metric}`,
            { headers: { Authorization: `Bearer ${token}` } }
          ),
        ]);

        if (!kpiRes.ok || !statsRes.ok || !leaderboardRes.ok) {
          throw new Error('Failed to fetch KPI data');
        }

        const kpiData = await kpiRes.json();
        const statsData = await statsRes.json();
        const leaderboardData = await leaderboardRes.json();

        setKpis(kpiData.data || []);
        setStats(statsData.data || {});
        setLeaderboard(leaderboardData.data || []);
      } catch (err) {
        setError(err.message || 'Failed to load KPI data');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, userType, metric]);

  const getEngagementBadge = (score) => {
    if (score >= 80) return { label: 'Excellent', color: 'bg-green-500', textColor: 'text-green-700' };
    if (score >= 60) return { label: 'Good', color: 'bg-blue-500', textColor: 'text-blue-700' };
    if (score >= 40) return { label: 'Fair', color: 'bg-yellow-500', textColor: 'text-yellow-700' };
    return { label: 'Low', color: 'bg-red-500', textColor: 'text-red-700' };
  };

  const metricOptions = [
    { value: 'engagementScore', label: 'Engagement Score' },
    { value: 'performanceRating', label: 'Performance Rating' },
    { value: 'eventsAttended', label: 'Events Attended' },
    { value: 'jobsPlacements', label: 'Job Placements' },
    { value: 'volunteerHours', label: 'Volunteer Hours' },
    { value: 'badgesEarned', label: 'Badges Earned' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Header */}
      <div className="md:ml-64 bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                ☰
              </button>
              <div className="flex items-center gap-3">
                <Trophy className="w-8 h-8 text-amber-500" weight="bold" />
                <h1 className="text-3xl font-bold text-gray-900">KPI Dashboard</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="md:ml-64 p-4 md:p-8">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        {stats && !loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.totalUsers || 0}
                  </p>
                </div>
                <Users className="w-10 h-10 text-blue-500 opacity-20" weight="bold" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-lg shadow p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Avg Engagement</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Math.round(stats.avgEngagementScore || 0)}
                  </p>
                </div>
                <Zap className="w-10 h-10 text-yellow-500 opacity-20" weight="bold" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-lg shadow p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Avg Performance</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {(stats.avgPerformanceRating || 0).toFixed(1)}/5
                  </p>
                </div>
                <TrendUp className="w-10 h-10 text-green-500 opacity-20" weight="bold" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-lg shadow p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Total Badges</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.totalBadgesEarned || 0}
                  </p>
                </div>
                <Award className="w-10 h-10 text-purple-500 opacity-20" weight="bold" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-lg shadow p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Volunteer Hours</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Math.round(stats.totalVolunteerHours || 0)}
                  </p>
                </div>
                <Target className="w-10 h-10 text-red-500 opacity-20" weight="bold" />
              </div>
            </motion.div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-8 bg-white rounded-lg shadow p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User Type
              </label>
              <select
                value={userType}
                onChange={(e) => setUserType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="alumni">Alumni</option>
                <option value="employee">Employee</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort By
              </label>
              <select
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {metricOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-500" weight="bold" />
              Top Performers
            </h2>
          </div>

          {loading ? (
            <div className="p-6 text-center text-gray-500">Loading...</div>
          ) : leaderboard.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No data available</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Engagement Score
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Performance
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Events
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {leaderboard.map((item, index) => {
                    const badge = getEngagementBadge(item.engagementScore);
                    return (
                      <motion.tr
                        key={item._id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-gray-50 transition"
                      >
                        <td className="px-6 py-4 text-sm font-bold text-gray-900">
                          #{index + 1}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {item.userId?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {item.userId?.email || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                          {item.engagementScore}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                          {item.performanceRating?.toFixed(1)}/5
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {item.eventsAttended}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-3 py-1 rounded-full text-white text-xs font-semibold ${badge.color}`}>
                            {badge.label}
                          </span>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* All KPIs */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">
              All {userType === 'alumni' ? 'Alumni' : 'Employees'} Performance
            </h2>
          </div>

          {loading ? (
            <div className="p-6 text-center text-gray-500">Loading...</div>
          ) : kpis.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No KPI data available</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Engagement
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Performance
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Badges
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Volunteer Hrs
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Last Updated
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {kpis.map((kpi, index) => {
                    const badge = getEngagementBadge(kpi.engagementScore);
                    return (
                      <motion.tr
                        key={kpi._id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.03 }}
                        className="hover:bg-gray-50 transition"
                      >
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {kpi.userId?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-full bg-gray-200 rounded-full h-2 max-w-xs">
                              <div
                                className="bg-blue-500 h-2 rounded-full"
                                style={{ width: `${kpi.engagementScore}%` }}
                              />
                            </div>
                            <span className="text-sm font-semibold text-gray-900">
                              {kpi.engagementScore}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                          {kpi.performanceRating?.toFixed(1)}/5
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {kpi.badgesEarned}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {Math.round(kpi.volunteerHours)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {kpi.updatedAt
                            ? new Date(kpi.updatedAt).toLocaleDateString()
                            : 'N/A'}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
