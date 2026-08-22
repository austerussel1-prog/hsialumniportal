import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Sidebar from './components/Sidebar';
import { apiEndpoints } from './config/api';
import { isAdminUser, safelyParseUser } from './config/session';

const TASK_STATUS_STYLES = {
  pending: { label: 'Pending', color: '#92400e', background: '#fef3c7' },
  in_progress: { label: 'In Progress', color: '#1d4ed8', background: '#dbeafe' },
  completed: { label: 'Completed', color: '#047857', background: '#d1fae5' },
  overdue: { label: 'Overdue', color: '#b91c1c', background: '#fee2e2' },
};

const showToast = (type, text) => {
  window.dispatchEvent(new CustomEvent('hsi-toast', { detail: { type, text } }));
};

function getUserDisplayName(user) {
  return String(user?.name || user?.fullName || user?.email || 'Unnamed User').trim();
}

function getUserDepartment(user) {
  const candidates = [user?.department, user?.role, user?.jobTitle, user?.company, user?.major];
  const value = candidates.find((item) => String(item || '').trim());
  return String(value || '').replace(/_/g, ' ');
}

export default function TasksPage() {
  const user = safelyParseUser();
  const isAdmin = isAdminUser(user);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Admin: assign task state
  const [directoryUsers, setDirectoryUsers] = useState([]);
  const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
  const [departmentDropdownOpen, setDepartmentDropdownOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({
    selectedUserId: '',
    employeeName: '',
    department: '',
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium',
  });
  const [adminTasks, setAdminTasks] = useState([]);
  const [taskStatusFilter, setTaskStatusFilter] = useState('all');
  const [submitting, setSubmitting] = useState(false);

  // Everyone: my tasks state
  const [myTasks, setMyTasks] = useState(null);
  const [submitDrafts, setSubmitDrafts] = useState({});
  const [submittingTaskId, setSubmittingTaskId] = useState(null);

  useEffect(() => {
    if (!isAdmin) return;
    let mounted = true;
    (async () => {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      try {
        let res = await fetch(apiEndpoints.allUsers, { headers });
        let data = res.ok ? await res.json().catch(() => ({ users: [] })) : { users: [] };
        if (!res.ok || !Array.isArray(data?.users)) {
          res = await fetch(apiEndpoints.directoryUsers, { headers });
          data = res.ok ? await res.json().catch(() => ({ users: [] })) : { users: [] };
        }
        if (mounted) setDirectoryUsers(Array.isArray(data?.users) ? data.users : []);
      } catch {
        if (mounted) setDirectoryUsers([]);
      }
    })();
    return () => { mounted = false; };
  }, [isAdmin]);

  const loadAdminTasks = async () => {
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const res = await fetch(apiEndpoints.adminTasks(taskStatusFilter), { headers });
      const data = res.ok ? await res.json().catch(() => ({ tasks: [] })) : { tasks: [] };
      setAdminTasks(Array.isArray(data?.tasks) ? data.tasks : []);
    } catch {
      setAdminTasks([]);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    let mounted = true;
    (async () => {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      try {
        const res = await fetch(apiEndpoints.adminTasks(taskStatusFilter), { headers });
        const data = res.ok ? await res.json().catch(() => ({ tasks: [] })) : { tasks: [] };
        if (mounted) setAdminTasks(Array.isArray(data?.tasks) ? data.tasks : []);
      } catch {
        if (mounted) setAdminTasks([]);
      }
    })();
    return () => { mounted = false; };
  }, [isAdmin, taskStatusFilter]);

  const loadMyTasks = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch(apiEndpoints.myTasks, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        setMyTasks([]);
        return;
      }
      const data = await res.json();
      setMyTasks(Array.isArray(data?.tasks) ? data.tasks : []);
    } catch {
      setMyTasks([]);
    }
  };

  useEffect(() => {
    loadMyTasks();
  }, []);

  const updateAssignField = (field, value) => {
    setAssignForm((prev) => ({ ...prev, [field]: value }));
  };

  const selectEmployee = (candidate) => {
    setAssignForm((prev) => ({
      ...prev,
      selectedUserId: String(candidate?._id || candidate?.id || ''),
      employeeName: getUserDisplayName(candidate),
      department: getUserDepartment(candidate) || prev.department,
    }));
    setEmployeeDropdownOpen(false);
  };

  const selectDepartment = (dept) => {
    setAssignForm((prev) => ({ ...prev, department: dept }));
    setDepartmentDropdownOpen(false);
  };

  const filteredEmployees = (() => {
    const term = String(assignForm.employeeName || '').trim().toLowerCase();
    if (!term) return directoryUsers;
    return directoryUsers.filter((candidate) => {
      const haystack = [
        getUserDisplayName(candidate),
        candidate?.email,
        candidate?.role,
        candidate?.department,
      ].join(' ').toLowerCase();
      return haystack.includes(term);
    });
  })();

  const departmentOptions = (() => {
    const unique = new Set();
    directoryUsers.forEach((candidate) => {
      const dept = getUserDepartment(candidate);
      if (dept) unique.add(dept);
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  })();

  const filteredDepartmentOptions = (() => {
    const term = String(assignForm.department || '').trim().toLowerCase();
    if (!term) return departmentOptions;
    return departmentOptions.filter((dept) => dept.toLowerCase().includes(term));
  })();

  const assignTask = async (event) => {
    event.preventDefault();

    if (!assignForm.selectedUserId) {
      showToast('error', 'Select an employee from the dropdown before assigning a task.');
      return;
    }
    if (!assignForm.title.trim()) {
      showToast('error', 'Task title is required.');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(apiEndpoints.tasks, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          assignedTo: assignForm.selectedUserId,
          title: assignForm.title.trim(),
          description: assignForm.description.trim(),
          department: assignForm.department,
          priority: assignForm.priority,
          dueDate: assignForm.dueDate || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Failed to assign task.');

      setAssignForm((prev) => ({ ...prev, title: '', description: '', dueDate: '', priority: 'medium' }));
      showToast('success', `Task assigned to ${assignForm.employeeName}.`);
      loadAdminTasks();
    } catch (err) {
      showToast('error', err?.message || 'Failed to assign task.');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteAdminTask = async (taskId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(apiEndpoints.deleteTask(taskId), {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed to delete task.');
      setAdminTasks((prev) => prev.filter((task) => String(task._id) !== String(taskId)));
      showToast('success', 'Task removed.');
    } catch (err) {
      showToast('error', err?.message || 'Failed to delete task.');
    }
  };

  const updateMyTaskStatus = async (taskId, status) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(apiEndpoints.updateTaskStatus(taskId), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update task.');
      const data = await res.json();
      setMyTasks((prev) => prev.map((task) => (String(task._id) === String(taskId) ? data.task : task)));
    } catch (err) {
      showToast('error', err?.message || 'Failed to update task.');
    }
  };

  const updateSubmitDraft = (taskId, field, value) => {
    setSubmitDrafts((prev) => ({
      ...prev,
      [taskId]: { ...(prev[taskId] || { text: '', file: null }), [field]: value },
    }));
  };

  const submitMyTask = async (taskId) => {
    const draft = submitDrafts[taskId] || { text: '', file: null };
    if (!draft.text.trim() && !draft.file) {
      showToast('error', 'Add a write-up or attach a file before submitting.');
      return;
    }

    setSubmittingTaskId(taskId);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('text', draft.text.trim());
      if (draft.file) formData.append('file', draft.file);

      const res = await fetch(apiEndpoints.submitTask(taskId), {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Failed to submit task.');

      setMyTasks((prev) => prev.map((task) => (String(task._id) === String(taskId) ? data.task : task)));
      setSubmitDrafts((prev) => ({ ...prev, [taskId]: { text: '', file: null } }));
      showToast('success', 'Task submitted.');
    } catch (err) {
      showToast('error', err?.message || 'Failed to submit task.');
    } finally {
      setSubmittingTaskId(null);
    }
  };

  const downloadSubmission = async (taskId, fileName) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(apiEndpoints.downloadTaskSubmission(taskId), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed to download the submitted file.');
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = fileName || 'submission';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      showToast('error', err?.message || 'Failed to download the submitted file.');
    }
  };

  return (
    <motion.div
      style={{ display: 'flex', height: '100vh', background: '#f3f4f6', overflow: 'hidden' }}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      <style>{`
        .tk-scroll { flex: 1; overflow-y: auto; }
        .tk-shell { padding: 32px; }
        .tk-card { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; margin-bottom: 24px; }
        .tk-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; position: relative; }
        .tk-field label { font-size: 12px; color: #4b5563; font-weight: 800; }
        .tk-field input, .tk-field select, .tk-field textarea {
          width: 100%; border: 1px solid #eadfca; border-radius: 8px; padding: 9px 10px;
          font: inherit; color: #111827; background: #fff; box-sizing: border-box; resize: vertical;
        }
        .tk-form { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; align-items: start; }
        .tk-dropdown-list {
          position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 20; margin: 0; padding: 6px;
          list-style: none; max-height: 220px; overflow-y: auto; background: #fff; border: 1px solid #eadfca;
          border-radius: 10px; box-shadow: 0 10px 24px rgba(17, 24, 39, 0.12);
        }
        .tk-dropdown-list li + li { margin-top: 2px; }
        .tk-dropdown-list button {
          width: 100%; display: flex; flex-direction: column; align-items: flex-start; gap: 1px;
          border: none; background: transparent; border-radius: 6px; padding: 7px 9px; font: inherit;
          text-align: left; cursor: pointer;
        }
        .tk-dropdown-list button:hover, .tk-dropdown-list button:focus { background: #fff5e0; }
        .tk-dropdown-name { font-size: 13px; font-weight: 700; color: #111827; }
        .tk-dropdown-sub { font-size: 11px; color: #6b7280; }
        .tk-dropdown-empty { padding: 8px 9px; font-size: 12px; color: #9ca3af; }
        .tk-task-list { display: flex; flex-direction: column; gap: 8px; }
        .tk-task-row {
          display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;
          border: 1px solid #f0e6d4; border-radius: 10px; padding: 10px 12px; background: #fff; flex-wrap: wrap;
        }
        .tk-header { background: #f4f4f4; padding: 34px 32px 26px; }
        .tk-header h1 { margin: 0; font-size: 42px; font-weight: 800; color: #0f172a; line-height: 1.02; }
        @media (max-width: 900px) {
          .tk-shell { padding: 18px 12px; }
          .tk-form { grid-template-columns: 1fr; }
          .tk-header { padding: 74px 12px 14px; }
          .tk-header h1 { font-size: 22px; line-height: 1.1; }
        }
      `}</style>

      <Sidebar isOpen={sidebarOpen} toggle={() => setSidebarOpen(!sidebarOpen)} />

      <div className="tk-scroll" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="tk-header">
          <h1>
            Manage <span style={{ color: '#d4a009' }}>Tasks</span>
          </h1>
          <p style={{ marginTop: 10, fontSize: 14, color: '#566273', fontStyle: 'italic' }}>
            Assign tasks to your team and keep track of progress.
          </p>
        </div>

        <div className="tk-shell">
          {isAdmin && (
            <div className="tk-card">
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', marginTop: 0, marginBottom: 16 }}>Assign a task</h2>
              <form onSubmit={assignTask} className="tk-form">
                <div className="tk-field">
                  <label htmlFor="tkEmployee">Employee</label>
                  <input
                    id="tkEmployee"
                    type="text"
                    autoComplete="off"
                    value={assignForm.employeeName}
                    onChange={(event) => {
                      updateAssignField('employeeName', event.target.value);
                      setEmployeeDropdownOpen(true);
                    }}
                    onFocus={() => setEmployeeDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setEmployeeDropdownOpen(false), 150)}
                    placeholder="Employee name"
                  />
                  {employeeDropdownOpen && (
                    <ul className="tk-dropdown-list">
                      {filteredEmployees.length === 0 ? (
                        <li className="tk-dropdown-empty">No matching users</li>
                      ) : (
                        filteredEmployees.map((candidate) => (
                          <li key={candidate?._id || candidate?.id || candidate?.email}>
                            <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => selectEmployee(candidate)}>
                              <span className="tk-dropdown-name">{getUserDisplayName(candidate)}</span>
                              {getUserDepartment(candidate) && <span className="tk-dropdown-sub">{getUserDepartment(candidate)}</span>}
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </div>
                <div className="tk-field">
                  <label htmlFor="tkDepartment">Department</label>
                  <input
                    id="tkDepartment"
                    type="text"
                    autoComplete="off"
                    value={assignForm.department}
                    onChange={(event) => {
                      updateAssignField('department', event.target.value);
                      setDepartmentDropdownOpen(true);
                    }}
                    onFocus={() => setDepartmentDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setDepartmentDropdownOpen(false), 150)}
                    placeholder="Department"
                  />
                  {departmentDropdownOpen && (
                    <ul className="tk-dropdown-list">
                      {filteredDepartmentOptions.length === 0 ? (
                        <li className="tk-dropdown-empty">No matching departments</li>
                      ) : (
                        filteredDepartmentOptions.map((dept) => (
                          <li key={dept}>
                            <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => selectDepartment(dept)}>
                              <span className="tk-dropdown-name">{dept}</span>
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </div>
                <div className="tk-field">
                  <label htmlFor="tkPriority">Priority</label>
                  <select id="tkPriority" value={assignForm.priority} onChange={(event) => updateAssignField('priority', event.target.value)}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="tk-field">
                  <label htmlFor="tkTitle">Task title</label>
                  <input
                    id="tkTitle"
                    type="text"
                    value={assignForm.title}
                    onChange={(event) => updateAssignField('title', event.target.value)}
                    placeholder="e.g. Submit Q3 report"
                  />
                </div>
                <div className="tk-field">
                  <label htmlFor="tkDueDate">Due date</label>
                  <input
                    id="tkDueDate"
                    type="date"
                    value={assignForm.dueDate}
                    onChange={(event) => updateAssignField('dueDate', event.target.value)}
                  />
                </div>
                <div className="tk-field" style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="tkDescription">Description (optional)</label>
                  <textarea
                    id="tkDescription"
                    rows={2}
                    value={assignForm.description}
                    onChange={(event) => updateAssignField('description', event.target.value)}
                    placeholder="Add any details the employee needs"
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{ padding: '10px 18px', background: '#3d4451', color: 'white', border: 'none', borderRadius: '999px', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: '600' }}
                  >
                    {submitting ? 'Assigning...' : 'Assign task'}
                  </button>
                </div>
              </form>

              <div style={{ marginTop: 22 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                  <h3 style={{ margin: 0, fontSize: 15, color: '#1f2937' }}>Assigned tasks</h3>
                  <select
                    value={taskStatusFilter}
                    onChange={(event) => setTaskStatusFilter(event.target.value)}
                    style={{ border: '1px solid #eadfca', borderRadius: 8, padding: '6px 8px', font: 'inherit' }}
                  >
                    <option value="all">All statuses</option>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
                {adminTasks.length === 0 ? (
                  <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>No tasks assigned yet.</p>
                ) : (
                  <div className="tk-task-list">
                    {adminTasks.map((task) => {
                      const statusInfo = TASK_STATUS_STYLES[task.status] || TASK_STATUS_STYLES.pending;
                      const assigneeName = task.assignedTo?.name || task.assignedTo?.fullName || task.assignedTo?.email || 'Unknown user';
                      return (
                        <div key={task._id} className="tk-task-row">
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 800, color: '#111827', fontSize: 13.5 }}>{task.title}</div>
                            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                              {assigneeName}{task.department ? ` - ${task.department}` : ''}{task.dueDate ? ` - Due ${new Date(task.dueDate).toLocaleDateString()}` : ''}
                            </div>
                            {task.status === 'completed' && (task.submission?.text || task.submission?.fileUrl) && (
                              <div style={{ marginTop: 6 }}>
                                {task.submission?.text && (
                                  <div style={{ fontSize: 12, color: '#374151', whiteSpace: 'pre-wrap' }}>{task.submission.text}</div>
                                )}
                                {task.submission?.fileUrl && (
                                  <button
                                    type="button"
                                    onClick={() => downloadSubmission(task._id, task.submission.fileName)}
                                    style={{ marginTop: 4, fontSize: 11, fontWeight: 700, color: '#1d4ed8', background: 'none', border: '1px solid #bfdbfe', borderRadius: 999, padding: '3px 9px', cursor: 'pointer' }}
                                  >
                                    Download {task.submission.fileName || 'attachment'}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 11, fontWeight: 800, color: statusInfo.color, background: statusInfo.background, borderRadius: 999, padding: '4px 10px' }}>
                              {statusInfo.label}
                            </span>
                            <button
                              type="button"
                              onClick={() => deleteAdminTask(task._id)}
                              style={{ border: 'none', background: 'none', color: '#b91c1c', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="tk-card">
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', marginTop: 0, marginBottom: 16 }}>My tasks</h2>
            {myTasks === null ? (
              <div style={{ color: '#6b7280', fontSize: '13px' }}>Loading tasks...</div>
            ) : myTasks.length === 0 ? (
              <div style={{ fontSize: '12px', color: '#6b7280' }}>No tasks assigned to you yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {myTasks.map((task, index) => {
                  const badge = TASK_STATUS_STYLES[task.status] || TASK_STATUS_STYLES.pending;
                  return (
                    <div key={task._id} style={{ paddingBottom: '14px', borderBottom: index < myTasks.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <h3 style={{ fontWeight: '600', color: '#111827', margin: 0, fontSize: '13.5px' }}>{task.title}</h3>
                        <span style={{ background: badge.background, color: badge.color, padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap' }}>{badge.label}</span>
                      </div>
                      {task.description && (
                        <div style={{ fontSize: '12.5px', color: '#4b5563', marginTop: '4px' }}>{task.description}</div>
                      )}
                      {task.dueDate && (
                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>Due {new Date(task.dueDate).toLocaleDateString()}</div>
                      )}
                      {task.status === 'completed' ? (
                        <div style={{ marginTop: '8px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px 12px' }}>
                          <div style={{ fontSize: '11px', fontWeight: '700', color: '#047857' }}>
                            Submitted {task.submission?.submittedAt ? new Date(task.submission.submittedAt).toLocaleString() : ''}
                          </div>
                          {task.submission?.text && (
                            <div style={{ fontSize: '12.5px', color: '#374151', marginTop: '6px', whiteSpace: 'pre-wrap' }}>{task.submission.text}</div>
                          )}
                          {task.submission?.fileUrl && (
                            <button
                              type="button"
                              onClick={() => downloadSubmission(task._id, task.submission.fileName)}
                              style={{ marginTop: '8px', fontSize: '11px', fontWeight: '700', color: '#1d4ed8', background: 'none', border: '1px solid #bfdbfe', borderRadius: '999px', padding: '4px 10px', cursor: 'pointer' }}
                            >
                              Download {task.submission.fileName || 'attachment'}
                            </button>
                          )}
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                            {task.status !== 'in_progress' && (
                              <button
                                onClick={() => updateMyTaskStatus(task._id, 'in_progress')}
                                style={{ fontSize: '11px', fontWeight: '700', color: '#1d4ed8', background: 'none', border: '1px solid #bfdbfe', borderRadius: '999px', padding: '4px 10px', cursor: 'pointer' }}
                              >
                                Mark in progress
                              </button>
                            )}
                          </div>
                          <div style={{ marginTop: '10px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px' }}>
                            <label style={{ fontSize: '11px', fontWeight: '800', color: '#4b5563', display: 'block', marginBottom: '6px' }}>
                              Submit your work (write-up and/or file)
                            </label>
                            <textarea
                              rows={2}
                              value={submitDrafts[task._id]?.text || ''}
                              onChange={(event) => updateSubmitDraft(task._id, 'text', event.target.value)}
                              placeholder="Write a short summary or essay for this task (optional if attaching a file)"
                              style={{ width: '100%', border: '1px solid #eadfca', borderRadius: '8px', padding: '8px 10px', font: 'inherit', color: '#111827', background: '#fff', boxSizing: 'border-box', resize: 'vertical' }}
                            />
                            <input
                              type="file"
                              onChange={(event) => updateSubmitDraft(task._id, 'file', event.target.files?.[0] || null)}
                              style={{ marginTop: '8px', fontSize: '12px' }}
                            />
                            <div style={{ marginTop: '10px' }}>
                              <button
                                type="button"
                                disabled={submittingTaskId === task._id}
                                onClick={() => submitMyTask(task._id)}
                                style={{ fontSize: '12px', fontWeight: '700', color: 'white', background: '#3d4451', border: 'none', borderRadius: '999px', padding: '7px 16px', cursor: submittingTaskId === task._id ? 'not-allowed' : 'pointer' }}
                              >
                                {submittingTaskId === task._id ? 'Submitting...' : 'Submit task'}
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
