import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Certificate, TrendUp, DownloadSimple, CaretDown } from '@phosphor-icons/react';
import Sidebar from './components/Sidebar';
import { apiEndpoints } from './config/api';

export default function AnalyticsReportPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedWindowDays, setSelectedWindowDays] = useState(30);
  const [filterOpen, setFilterOpen] = useState(false);
  const [metrics, setMetrics] = useState({
    activeUsers: 0,
    engagedUsers: 0,
    certificationsCompleted: 0,
    engagementRate: 0,
    windowDays: 30,
    newUsersInWindow: 0,
    approvalsInWindow: 0,
    certificationsInWindow: 0,
    dailyLabels: [],
    usersCreatedDaily: [],
    usersApprovedDaily: [],
    awardsAlumniDaily: [],
    awardsEmployeeDaily: [],
    awardsInWindow: 0,
    userGrowthSeries: [],
    userGrowthAdded: [],
    userGrowthCumulative: [],
    timelineLabels: [],
    certificationPeriodLabels: [],
    certificationSeries: [],
  });

  useEffect(() => {
    let mounted = true;

    async function loadFallbackAnalytics() {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const now = new Date();
      const dayMs = 24 * 60 * 60 * 1000;
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const fallbackWindowDays = selectedWindowDays === 'all'
        ? Math.max(1, now.getDate())
        : Math.max(1, Number(selectedWindowDays || 30));
      const windowDays = Number.isFinite(fallbackWindowDays) ? fallbackWindowDays : 30;
      const since = new Date(todayStart.getTime() - (windowDays - 1) * dayMs);
      const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

      const [directoryRes, achievementsRes] = await Promise.all([
        fetch(apiEndpoints.directoryUsers, { headers }),
        fetch(apiEndpoints.achievements, { headers }),
      ]);

      const directoryData = directoryRes.ok ? await directoryRes.json() : { users: [] };
      const achievementsData = achievementsRes.ok ? await achievementsRes.json() : { stats: {} };

      const totalEligibleUsers = Array.isArray(directoryData?.users) ? directoryData.users.length : 0;
      const activeUsers = totalEligibleUsers;
      const engagedUsers = Number(achievementsData?.stats?.activeAlumni || 0);
      const certificationsCompleted = Number(achievementsData?.stats?.totalBadgesAwarded || 0);
      const engagementRate = activeUsers > 0
        ? Number(((engagedUsers / activeUsers) * 100).toFixed(1))
        : 0;

      const dailyLabels = Array.from({ length: windowDays }, (_, i) => {
        const d = new Date(since.getTime() + (i * dayMs));
        return dateFormat.format(d);
      });
      const usersCreatedDaily = Array.from({ length: windowDays }, () => 0);
      const usersApprovedDaily = Array.from({ length: windowDays }, () => 0);
      const awardsAlumniDaily = Array.from({ length: windowDays }, () => 0);
      const awardsEmployeeDaily = Array.from({ length: windowDays }, () => 0);

      const timelinePoints = 7;
      const timelineLabels = [];
      const userGrowthAdded = Array.from({ length: timelinePoints }, () => 0);
      const userGrowthSeries = Array.from({ length: timelinePoints }, () => 0);
      const userGrowthCumulative = Array.from({ length: timelinePoints }, () => activeUsers);
      for (let i = 0; i < timelinePoints; i += 1) {
        const offsetDays = Math.round((windowDays / (timelinePoints - 1)) * i);
        const d = new Date(since.getTime() + offsetDays * dayMs);
        timelineLabels.push(dateFormat.format(d));
      }

      const certificationBuckets = 5;
      const certificationPeriodLabels = [];
      const certificationSeries = Array.from({ length: certificationBuckets }, () => 0);
      const bucketSizeDays = Math.floor(windowDays / certificationBuckets);
      for (let i = 0; i < certificationBuckets; i += 1) {
        const start = new Date(since);
        start.setDate(start.getDate() + i * bucketSizeDays);
        const end = new Date(start);
        end.setDate(end.getDate() + bucketSizeDays - 1);
        certificationPeriodLabels.push(`${dateFormat.format(start)}-${dateFormat.format(end)}`);
      }
      certificationSeries[certificationBuckets - 1] = certificationsCompleted;

      return {
        activeUsers,
        engagedUsers,
        certificationsCompleted,
        engagementRate,
        windowDays,
        windowMode: selectedWindowDays === 'all' ? 'all_time' : 'last_n_days',
        sinceStart: since.toISOString(),
        todayStart: todayStart.toISOString(),
        userGrowthSeries,
        userGrowthAdded,
        userGrowthCumulative,
        timelineLabels,
        dailyLabels,
        usersCreatedDaily,
        usersApprovedDaily,
        awardsAlumniDaily,
        awardsEmployeeDaily,
        newUsersInWindow: 0,
        approvalsInWindow: 0,
        awardsInWindow: 0,
        certificationPeriodLabels,
        certificationSeries,
      };
    }

    async function loadAnalytics() {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const url = `${apiEndpoints.analyticsReport}?windowDays=${encodeURIComponent(selectedWindowDays)}`;
        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (res.ok) {
          const data = await res.json();
          console.debug('analytics response', { data, selectedWindowDays });
          if (!mounted) return;
          setMetrics({
            activeUsers: Number(data?.activeUsers || 0),
            engagedUsers: Number(data?.engagedUsers || 0),
            certificationsCompleted: Number(data?.certificationsCompleted || 0),
            engagementRate: Number(data?.engagementRate || 0),
            windowDays: Number(data?.windowDays || 30),
            windowMode: String(data?.windowMode || ''),
            sinceStart: typeof data?.sinceStart === 'string' ? data.sinceStart : '',
            todayStart: typeof data?.todayStart === 'string' ? data.todayStart : '',
            newUsersInWindow: Number(data?.newUsersInWindow || 0),
            approvalsInWindow: Number(data?.approvalsInWindow || 0),
            certificationsInWindow: Number(data?.certificationsInWindow || 0),
            dailyLabels: Array.isArray(data?.dailyLabels) ? data.dailyLabels : [],
            usersCreatedDaily: Array.isArray(data?.usersCreatedDaily) ? data.usersCreatedDaily : [],
            usersApprovedDaily: Array.isArray(data?.usersApprovedDaily) ? data.usersApprovedDaily : [],
            awardsAlumniDaily: Array.isArray(data?.awardsAlumniDaily) ? data.awardsAlumniDaily : [],
            awardsEmployeeDaily: Array.isArray(data?.awardsEmployeeDaily) ? data.awardsEmployeeDaily : [],
            awardsInWindow: Number(data?.awardsInWindow || 0),
            userGrowthSeries: Array.isArray(data?.userGrowthSeries) ? data.userGrowthSeries : [],
            userGrowthAdded: Array.isArray(data?.userGrowthAdded) ? data.userGrowthAdded : [],
            userGrowthCumulative: Array.isArray(data?.userGrowthCumulative) ? data.userGrowthCumulative : [],
            timelineLabels: Array.isArray(data?.timelineLabels) ? data.timelineLabels : [],
            certificationPeriodLabels: Array.isArray(data?.certificationPeriodLabels) ? data.certificationPeriodLabels : [],
            certificationSeries: Array.isArray(data?.certificationSeries) ? data.certificationSeries : [],
          });
          setError('');
          return;
        }

        // Fallback path when analytics endpoint is unavailable (e.g. old backend process).
        const fallback = await loadFallbackAnalytics();
        console.debug('analytics fallback', { fallback, selectedWindowDays });
        if (!mounted) return;
        setMetrics(fallback);
        setError('');
      } catch (err) {
        try {
          const fallback = await loadFallbackAnalytics();
          if (!mounted) return;
          setMetrics(fallback);
          setError('');
          return;
        } catch {
          // fall through to visible error
        }
        if (!mounted) return;
        setError(err.message || 'Failed to load analytics report.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadAnalytics();
    return () => { mounted = false; };
  }, [selectedWindowDays]);

  const handleDownloadReport = async () => {
    try {
      const token = localStorage.getItem('token');
      const windowValue = selectedWindowDays === 'all' ? 'all' : String(selectedWindowDays);
      const url = `${apiEndpoints.analyticsReportExport}?windowDays=${encodeURIComponent(windowValue)}`;
      const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error(`Download failed (${res.status}).`);

      const blob = await res.blob();
      const contentDisposition = res.headers.get('content-disposition') || '';
      const match = /filename="([^"]+)"/i.exec(contentDisposition);
      const filename = match?.[1] || 'analytics-report.csv';

      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setError(err?.message || 'Failed to download report.');
    }
  };

  const cards = [
    { icon: Users, label: 'Active Users', value: metrics.activeUsers.toLocaleString(), trend: `+${metrics.newUsersInWindow || 0} created | +${metrics.approvalsInWindow || 0} approved`, helper: metrics.windowMode === 'all_time' ? 'all time' : `last ${metrics.windowDays} days` },
    { icon: Certificate, label: 'Certifications Completed', value: metrics.certificationsCompleted.toLocaleString(), trend: metrics.certificationsInWindow !== undefined ? `+${metrics.certificationsInWindow} new` : '+8%', helper: metrics.windowMode === 'all_time' ? 'all time' : `last ${metrics.windowDays} days` },
    { icon: TrendUp, label: 'Engagement Rate', value: `${metrics.engagementRate}%`, trend: '+5%', helper: metrics.windowMode === 'all_time' ? 'all time' : `last ${metrics.windowDays} days` },
  ];

  const windowDays = Math.max(
    1,
    Number(metrics.windowDays || (selectedWindowDays === 'all' ? 30 : selectedWindowDays) || 30)
  );
  const dayMs = 24 * 60 * 60 * 1000;
  const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
  const monthFormat = new Intl.DateTimeFormat('en-US', { month: 'short' });
  const monthYearFormat = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' });
  const sinceStartDate = (() => {
    const d = metrics?.sinceStart ? new Date(metrics.sinceStart) : new Date(Date.now() - (windowDays - 1) * dayMs);
    if (Number.isNaN(d.getTime())) return new Date(Date.now() - (windowDays - 1) * dayMs);
    d.setHours(0, 0, 0, 0);
    return d;
  })();
  const datePoints = Array.from({ length: windowDays }, (_, i) => new Date(sinceStartDate.getTime() + (i * dayMs)));

  const dailyLabels = Array.isArray(metrics.dailyLabels) && metrics.dailyLabels.length === windowDays
    ? metrics.dailyLabels
    : datePoints.map((d) => dateFormat.format(d));
  const usersCreatedDaily = Array.isArray(metrics.usersCreatedDaily) && metrics.usersCreatedDaily.length === windowDays
    ? metrics.usersCreatedDaily.map((value) => Number(value || 0))
    : Array.from({ length: windowDays }, () => 0);
  const usersApprovedDaily = Array.isArray(metrics.usersApprovedDaily) && metrics.usersApprovedDaily.length === windowDays
    ? metrics.usersApprovedDaily.map((value) => Number(value || 0))
    : Array.from({ length: windowDays }, () => 0);

  const maxUserDaily = Math.max(...usersCreatedDaily, ...usersApprovedDaily, 1);
  const userChartLeftPad = 28;
  const userChartRightPad = 28;
  const userChartWidth = 700 - userChartLeftPad - userChartRightPad;
  const xStep = windowDays === 1 ? 0 : (userChartWidth / (windowDays - 1));
  const makePath = (points) => points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`).join(' ');

  const createdPoints = usersCreatedDaily.map((value, index) => ({
    x: userChartLeftPad + (xStep * index),
    y: 230 - ((value / maxUserDaily) * 160),
    label: dailyLabels[index] || '-',
    created: value,
    approved: usersApprovedDaily[index] || 0,
  }));
  const approvedPoints = usersApprovedDaily.map((value, index) => ({
    x: userChartLeftPad + (xStep * index),
    y: 230 - ((value / maxUserDaily) * 160),
  }));

  const createdLinePath = makePath(createdPoints);
  const approvedLinePath = makePath(approvedPoints);
  const createdAreaPath = `${createdLinePath} L${createdPoints[createdPoints.length - 1]?.x ?? (700 - userChartRightPad)},270 L${createdPoints[0]?.x ?? userChartLeftPad},270 Z`;

  const axisLabels = datePoints.map((d, index) => {
    if (windowDays <= 31) return dateFormat.format(d);
    const isStart = index === 0;
    const isEnd = index === windowDays - 1;
    const prev = index > 0 ? datePoints[index - 1] : null;
    const monthChanged = prev ? prev.getMonth() !== d.getMonth() : true;
    if (isStart || isEnd) return monthYearFormat.format(d);
    if (monthChanged || d.getDate() === 1) return monthFormat.format(d);
    return '';
  });
  const xAxisEvery = Math.max(1, Math.ceil(windowDays / 6));
  const shownXAxisLabels = axisLabels.map((label, index) => (
    windowDays <= 31
      ? (index === 0 || index === windowDays - 1 || (index % xAxisEvery === 0) ? label : '')
      : label
  ));

  const awardsAlumniDaily = Array.isArray(metrics.awardsAlumniDaily) && metrics.awardsAlumniDaily.length === windowDays
    ? metrics.awardsAlumniDaily.map((value) => Number(value || 0))
    : Array.from({ length: windowDays }, () => 0);
  const awardsEmployeeDaily = Array.isArray(metrics.awardsEmployeeDaily) && metrics.awardsEmployeeDaily.length === windowDays
    ? metrics.awardsEmployeeDaily.map((value) => Number(value || 0))
    : Array.from({ length: windowDays }, () => 0);
  const awardTotalsDaily = awardsAlumniDaily.map((value, index) => value + (awardsEmployeeDaily[index] || 0));
  const maxAwardTotal = Math.max(...awardTotalsDaily, 1);
  const awardLabelEvery = Math.max(1, Math.ceil(windowDays / 8));

  return (
    <motion.div
      style={{ display: 'flex', minHeight: '100vh', background: '#f6f2ea' }}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.25 }}
    >
      <Sidebar isOpen={sidebarOpen} toggle={() => setSidebarOpen(!sidebarOpen)} />
      <style>{`
        .ar-shell { flex: 1; padding: 20px 24px; width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; }
        .ar-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; flex-wrap: wrap; width: 100%; }
        .ar-header > div { min-width: 0; }
        .ar-actions { display: flex; gap: 10px; align-items: center; }
        .ar-filter-wrap { position: relative; }
        .ar-title { margin: 0; font-size: 40px; line-height: 1; font-weight: 800; color: #111827; overflow-wrap: anywhere; }
        .ar-subtitle { margin-top: 8px; color: #6b7280; font-style: italic; overflow-wrap: anywhere; }
        .ar-filter {
          border: 1px solid #e6d7b5;
          border-radius: 10px;
          background: #fff;
          color: #1f2937;
          padding: 8px 11px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
        }
        .ar-download {
          border: none;
          border-radius: 10px;
          color: #fff;
          background: linear-gradient(135deg, #d9a520, #b07a15);
          padding: 8px 12px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 8px 20px rgba(176, 122, 21, 0.28);
        }
        .ar-top-grid {
          margin-top: 20px;
          display: grid;
          gap: 14px;
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        .ar-card {
          border: 1px solid #eadfca;
          border-radius: 14px;
          background: #fff;
          padding: 12px;
          min-width: 0;
          overflow: hidden;
        }
        .ar-middle-grid {
          margin-top: 14px;
          display: grid;
          gap: 14px;
          grid-template-columns: 1.7fr 1fr;
          min-width: 0;
        }
        .ar-middle-grid > * { min-width: 0; }
        .ar-bottom-card { margin-top: 14px; }
        .ar-chart-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; gap: 10px; flex-wrap: wrap; }
        .ar-chart-title { margin: 0; font-size: 22px; color: #1f2937; }
        .ar-chart-legend { color: #6b7280; display: flex; align-items: center; gap: 12px; font-size: 14px; flex-wrap: wrap; }
        .ar-chart-body { width: 100%; max-width: 100%; min-width: 0; padding: 0 10px 2px; box-sizing: border-box; }
        .ar-linechart-wrap { width: 100%; max-width: 100%; min-width: 0; }
        .ar-linechart { width: 100%; height: 210px; display: block; }
        .ar-awards-wrap { width: 100%; max-width: 100%; min-width: 0; overflow-x: auto; padding-bottom: 4px; box-sizing: border-box; }
        .ar-snapshot-chips { margin-top: 16px; display: flex; gap: 10px; flex-wrap: wrap; }
        @media (max-width: 1220px) {
          .ar-top-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .ar-middle-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 900px) {
          .ar-shell { padding: 74px 10px 18px; overflow-x: clip; }
          .ar-header { gap: 10px; }
          .ar-top-grid { grid-template-columns: 1fr; }
          .ar-top-grid, .ar-middle-grid { margin-top: 10px; gap: 10px; }
          .ar-bottom-card { margin-top: 10px; }
          .ar-actions { width: 100%; }
          .ar-filter-wrap { flex: 1; }
          .ar-filter, .ar-download { flex: 1; justify-content: center; }
          .ar-title { font-size: 22px; line-height: 1.15; }
          .ar-subtitle { font-size: 12px; margin-top: 4px; }
          .ar-card { padding: 10px; border-radius: 14px; }
          .ar-chart-title { font-size: 21px; }
          .ar-chart-legend { font-size: 12px; gap: 8px; }
          .ar-filter, .ar-download { font-size: 12px; padding: 9px 12px; }
          .ar-chart-body { padding: 0 8px 2px; }
          .ar-linechart-wrap { overflow-x: hidden; padding-bottom: 2px; }
          .ar-linechart { min-width: 0; height: 205px; }
          .ar-snapshot-chips { margin-top: 12px; gap: 8px; }
        }
        @media (max-width: 480px) {
          .ar-chart-title { font-size: 19px; }
        }
      `}</style>

      <div className="ar-shell">
        <div className="ar-header">
          <div>
            <h1 className="ar-title">
              Analytics & <span style={{ color: '#d4a403' }}>Reports</span>
            </h1>
            <p className="ar-subtitle">Live metrics for activity, certifications, and engagement.</p>
          </div>
          <div className="ar-actions">
            <div className="ar-filter-wrap">
              <button type="button" className="ar-filter" onClick={() => setFilterOpen(!filterOpen)}>
                {selectedWindowDays === 'all' ? 'All Time' : `Last ${selectedWindowDays} Days`}
                <CaretDown size={14} />
              </button>
              {filterOpen && (
                <div style={{ position: 'absolute', right: 0, marginTop: 8, background: '#fff', border: '1px solid #e6d7b5', borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,0.08)', zIndex: 40 }}>
                  {[7, 15, 30, 'all'].map((d) => (
                    <div key={d} onClick={() => { setSelectedWindowDays(d); setFilterOpen(false); }} style={{ padding: '8px 12px', cursor: 'pointer', fontWeight: 600 }}>
                      {d === 'all' ? 'All Time' : `Last ${d} Days`}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button type="button" className="ar-download" onClick={handleDownloadReport} disabled={loading}>
              <DownloadSimple size={16} />
              Download Report
            </button>
          </div>
        </div>

        {error && (
          <div
            style={{
              marginTop: '16px',
              border: '1px solid #fecaca',
              borderRadius: '10px',
              background: '#fef2f2',
              color: '#b91c1c',
              padding: '10px 12px',
              maxWidth: '680px',
            }}
          >
            {error}
          </div>
        )}

        <div className="ar-top-grid">
          {cards.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="ar-card" style={{ minHeight: '118px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '999px', background: '#f7eddb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={18} color="#a06c04" />
                  </div>
                  <div style={{ fontSize: '16px', color: '#1f2937', fontWeight: 650, lineHeight: 1.1 }}>{item.label}</div>
                </div>
                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#111827', lineHeight: 1 }}>
                    {loading ? '...' : item.value}
                  </div>
                  <div style={{ color: '#a06c04', fontSize: '11px', fontWeight: 700 }}>{item.trend}</div>
                  <div style={{ color: '#6b7280', fontSize: '11px' }}>{item.helper}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="ar-middle-grid">
          <div className="ar-card">
            <div className="ar-chart-head">
              <h2 className="ar-chart-title">User Growth</h2>
              <div className="ar-chart-legend">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 999, background: '#b07a15', display: 'inline-block' }} />
                  Created
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 999, background: '#2563eb', display: 'inline-block' }} />
                  Approved
                </div>
              </div>
            </div>
            <div className="ar-chart-body">
              <div className="ar-linechart-wrap">
                <svg key={`user-growth-${String(selectedWindowDays)}-${windowDays}`} viewBox="0 0 700 300" className="ar-linechart">
                  <defs>
                    <linearGradient id="arCreatedFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#b07a15" stopOpacity="0.18" />
                      <stop offset="100%" stopColor="#b07a15" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  {[40, 90, 140, 190, 240].map((y) => (
                  <line key={y} x1={userChartLeftPad} y1={y} x2={700 - userChartRightPad} y2={y} stroke="#f0e6d4" strokeDasharray="5 6" />
                  ))}
                  <motion.path
                    d={createdAreaPath}
                    fill="url(#arCreatedFill)"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, d: createdAreaPath }}
                    transition={{ duration: 0.6, ease: 'easeInOut' }}
                  />
                  <motion.path
                    d={createdLinePath}
                    fill="none"
                    stroke="#b07a15"
                    strokeWidth="4"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1, d: createdLinePath }}
                    transition={{ duration: 0.6, ease: 'easeInOut' }}
                  />
                  <motion.path
                    d={approvedLinePath}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="4"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1, d: approvedLinePath }}
                    transition={{ duration: 0.6, ease: 'easeInOut', delay: 0.08 }}
                  />
                  {windowDays <= 120 ? createdPoints.map((point, idx) => (
                    <motion.circle
                      key={`p-${idx}`}
                      cx={point.x}
                      cy={point.y}
                      r="8"
                      fill="transparent"
                      style={{ cursor: 'pointer' }}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.02 * idx, duration: 0.35 }}
                    >
                      <title>{`${point.label}: +${point.created} created, +${point.approved} approved`}</title>
                    </motion.circle>
                  )) : null}
                  {shownXAxisLabels.map((label, index) => {
                    if (!label) return null;
                    const x = createdPoints[index]?.x ?? 10;
                    return (
                      <text key={label + index} x={x} y="293" fontSize="12" fill="#64748b" textAnchor={index === 0 ? 'start' : (index === windowDays - 1 ? 'end' : 'middle')}>{label}</text>
                    );
                  })}
                </svg>
              </div>
            </div>
          </div>

          <div className="ar-card">
            <div className="ar-chart-head" style={{ marginBottom: '12px' }}>
              <h2 className="ar-chart-title">Awards Given</h2>
              <div className="ar-chart-legend">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 999, background: '#8b44d2', display: 'inline-block' }} />
                  Alumni
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 999, background: '#0ea5e9', display: 'inline-block' }} />
                  Employee
                </div>
              </div>
            </div>

            <div key={`awards-${String(selectedWindowDays)}-${windowDays}`} className="ar-awards-wrap">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: windowDays > 31 ? 2 : 4,
                  height: '180px',
                  borderBottom: '1px solid #efe5d7',
                  paddingBottom: '8px',
                  paddingLeft: '8px',
                  paddingRight: '8px',
                  width: '100%',
                  overflow: 'hidden',
                }}
              >
                {awardTotalsDaily.map((total, idx) => {
                  const alumni = awardsAlumniDaily[idx] || 0;
                  const employee = awardsEmployeeDaily[idx] || 0;
                  const normalizedHeight = total > 0 ? (total / maxAwardTotal) * 100 : 0;
                  const height = Math.max(6, normalizedHeight);
                  const alumniPct = total > 0 ? (alumni / total) * 100 : 0;
                  const employeePct = total > 0 ? (employee / total) * 100 : 0;

                  return (
                    <motion.div
                      key={`award-${idx}`}
                      title={`${dailyLabels[idx] || '-'}: Alumni ${alumni}, Employee ${employee}`}
                      initial={{ height: '6%' }}
                      animate={{ height: `${height}%` }}
                      transition={{ duration: 0.5, ease: 'easeInOut', delay: idx * 0.01 }}
                      style={{
                        flex: '1 1 0',
                        minWidth: 0,
                        borderRadius: '10px 10px 4px 4px',
                        overflow: 'hidden',
                        boxShadow: 'inset 0 -2px 0 rgba(255,255,255,0.2)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-end',
                        background: '#f3f4f6',
                      }}
                    >
                      <div style={{ height: `${employeePct}%`, background: '#0ea5e9' }} />
                      <div style={{ height: `${alumniPct}%`, background: '#8b44d2' }} />
                    </motion.div>
                  );
                })}
              </div>
              <div style={{ marginTop: '8px', display: 'flex', gap: windowDays > 31 ? 2 : 4, color: '#64748b', fontSize: '11px', paddingLeft: '8px', paddingRight: '8px', width: '100%', overflow: 'hidden' }}>
                {axisLabels.map((label, idx) => {
                  const show = windowDays <= 31
                    ? (idx === 0 || idx === windowDays - 1 || (idx % awardLabelEvery === 0))
                    : Boolean(label);
                  return (
                    <span key={`al-${idx}`} style={{ flex: '1 1 0', minWidth: 0, textAlign: 'center' }}>
                      {show ? label : ''}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="ar-card ar-bottom-card">
          <h2 className="ar-chart-title">Growth Snapshot</h2>
          <div className="ar-snapshot-chips">
            {[
              `Active users: ${loading ? '...' : metrics.activeUsers.toLocaleString()}`,
              `Engaged users: ${loading ? '...' : metrics.engagedUsers.toLocaleString()}`,
              `Certifications completed: ${loading ? '...' : metrics.certificationsCompleted.toLocaleString()}`,
              `Engagement rate: ${loading ? '...' : `${metrics.engagementRate}%`}`,
              metrics.windowMode === 'all_time' ? 'Window: All time' : `Window: Last ${metrics.windowDays} days`,
            ].map((item) => (
              <div
                key={item}
                style={{
                  padding: '8px 14px',
                  borderRadius: '999px',
                  border: '1px solid #ecdcb4',
                  background: '#fffaf0',
                  color: '#6b7280',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
