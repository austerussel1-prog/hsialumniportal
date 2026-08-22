const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const User = require('../models/User');
const { verifyToken } = require('./auth');
const { createUserNotification } = require('../services/userNotificationService');

const ADMIN_ROLES = ['super_admin', 'admin', 'hr', 'alumni_officer'];

const verifyAdmin = (req, res, next) => {
  if (!ADMIN_ROLES.includes(req.user?.role)) {
    return res.status(403).json({ message: 'Admins only' });
  }
  next();
};

// Tasks past their due date but not yet completed are surfaced as overdue.
async function refreshOverdueTasks(filter = {}) {
  await Task.updateMany(
    { ...filter, status: { $in: ['pending', 'in_progress'] }, dueDate: { $lt: new Date() } },
    { $set: { status: 'overdue', updatedAt: new Date() } }
  );
}

// Admin: assign a new task to a user
router.post('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { assignedTo, title, description, department, priority, dueDate } = req.body || {};
    const targetUserId = String(assignedTo || '').trim();
    const taskTitle = String(title || '').trim();
    if (!targetUserId || !taskTitle) {
      return res.status(400).json({ message: 'assignedTo and title are required.' });
    }

    const targetUser = await User.findById(targetUserId).select('_id name fullName email').lean();
    if (!targetUser) {
      return res.status(404).json({ message: 'Assigned user not found.' });
    }

    const task = await Task.create({
      title: taskTitle,
      description: String(description || '').trim(),
      department: String(department || '').trim(),
      priority: ['low', 'medium', 'high'].includes(priority) ? priority : 'medium',
      dueDate: dueDate ? new Date(dueDate) : undefined,
      assignedTo: targetUserId,
      assignedBy: req.user.id,
    });

    const dueLabel = task.dueDate ? ` Due ${task.dueDate.toLocaleDateString()}.` : '';
    await createUserNotification({
      recipient: targetUserId,
      kind: 'task',
      source: 'Admin',
      title: 'New task assigned',
      message: `You have been assigned a new task: "${taskTitle}".${dueLabel}`,
      level: 'info',
      actionType: 'route',
      actionPath: '/alumni-dashboard',
      metadata: { taskId: String(task._id) },
    });

    return res.status(201).json({ task });
  } catch (err) {
    console.error('POST /api/tasks error', err);
    return res.status(500).json({ message: 'Failed to create task.' });
  }
});

// Admin: list all tasks, optionally filtered by status or assignee
router.get('/admin', verifyToken, verifyAdmin, async (req, res) => {
  try {
    await refreshOverdueTasks();
    const { status, assignedTo } = req.query || {};
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (assignedTo) filter.assignedTo = assignedTo;

    const tasks = await Task.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('assignedTo', 'name fullName email')
      .populate('assignedBy', 'name fullName email')
      .lean();

    return res.json({ tasks });
  } catch (err) {
    console.error('GET /api/tasks/admin error', err);
    return res.status(500).json({ message: 'Failed to load tasks.' });
  }
});

// User: list tasks assigned to me
router.get('/me', verifyToken, async (req, res) => {
  try {
    await refreshOverdueTasks({ assignedTo: req.user.id });
    const tasks = await Task.find({ assignedTo: req.user.id })
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ tasks });
  } catch (err) {
    console.error('GET /api/tasks/me error', err);
    return res.status(500).json({ message: 'Failed to load your tasks.' });
  }
});

// Assignee or admin: update task status
router.patch('/:id/status', verifyToken, async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!['pending', 'in_progress', 'completed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status.' });
    }

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found.' });

    const isOwner = String(task.assignedTo) === String(req.user.id);
    const isAdmin = ADMIN_ROLES.includes(req.user?.role);
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not allowed to update this task.' });
    }

    task.status = status;
    task.completedAt = status === 'completed' ? new Date() : undefined;
    await task.save();

    return res.json({ task });
  } catch (err) {
    console.error('PATCH /api/tasks/:id/status error', err);
    return res.status(500).json({ message: 'Failed to update task.' });
  }
});

// Admin: delete a task
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found.' });
    return res.json({ message: 'Task deleted.' });
  } catch (err) {
    console.error('DELETE /api/tasks/:id error', err);
    return res.status(500).json({ message: 'Failed to delete task.' });
  }
});

module.exports = router;
