const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const Task = require('../models/Task');
const User = require('../models/User');
const { verifyToken } = require('./auth');
const { createUserNotification } = require('../services/userNotificationService');
const { decryptField, isEncryptedValue } = require('../utils/fieldEncryption');
const { uploadLocalFile, cleanupLocalFile, isCloudinaryConfigured, isRemoteFileUrl, fetchRemoteFile } = require('../services/mediaStorage');

const ADMIN_ROLES = ['super_admin', 'admin', 'hr', 'alumni_officer'];
const MAX_SUBMISSION_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_SUBMISSION_EXTENSIONS = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.zip'];

const verifyAdmin = (req, res, next) => {
  if (!ADMIN_ROLES.includes(req.user?.role)) {
    return res.status(403).json({ message: 'Admins only' });
  }
  next();
};

const submissionUploadsDir = path.join(__dirname, '..', 'uploads', 'task-submissions');
if (!fs.existsSync(submissionUploadsDir)) fs.mkdirSync(submissionUploadsDir, { recursive: true });

const submissionStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, submissionUploadsDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-]/g, '_');
    cb(null, `${unique}-${safeName}`);
  },
});

const uploadSubmission = multer({
  storage: submissionStorage,
  limits: { fileSize: MAX_SUBMISSION_FILE_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!ALLOWED_SUBMISSION_EXTENSIONS.includes(ext)) {
      return cb(new Error('Unsupported file type. Allowed: PDF, DOC, DOCX, PPT, PPTX, ZIP.'));
    }
    return cb(null, true);
  },
});

const handleSubmissionUpload = (req, res, next) => {
  uploadSubmission.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File must be 10MB or smaller.' });
    }
    return res.status(400).json({ message: err.message || 'File upload failed.' });
  });
};

async function storeSubmissionFile(file) {
  if (!file?.filename) return null;

  const fallbackUrl = `/uploads/task-submissions/${file.filename}`;
  if (isCloudinaryConfigured() && file.path) {
    try {
      const uploadedUrl = await uploadLocalFile(file.path, { folder: 'task-submissions', resourceType: 'raw' });
      if (uploadedUrl) {
        cleanupLocalFile(file.path);
        return { fileUrl: uploadedUrl, fileName: file.originalname, storedName: file.filename };
      }
    } catch (err) {
      console.error('Task submission cloud upload failed:', err.message);
    }
  }

  return { fileUrl: fallbackUrl, fileName: file.originalname, storedName: file.filename };
}

function revealEncrypted(value) {
  const raw = String(value || '');
  if (!raw || !isEncryptedValue(raw)) return value;
  return decryptField(raw);
}

// Population + .lean() bypasses mongoose getters, so encrypted user fields need manual decryption.
function decorateTaskUsers(task) {
  task.department = revealEncrypted(task.department);
  if (task.assignedTo) {
    task.assignedTo.name = revealEncrypted(task.assignedTo.name);
    task.assignedTo.fullName = revealEncrypted(task.assignedTo.fullName);
  }
  if (task.assignedBy) {
    task.assignedBy.name = revealEncrypted(task.assignedBy.name);
    task.assignedBy.fullName = revealEncrypted(task.assignedBy.fullName);
  }
  return task;
}


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
    const { assignedTo, assignAll, title, description, department, priority, dueDate } = req.body || {};
    const taskTitle = String(title || '').trim();
    if (!taskTitle) {
      return res.status(400).json({ message: 'title is required.' });
    }

    const baseFields = {
      title: taskTitle,
      description: String(description || '').trim(),
      department: String(department || '').trim(),
      priority: ['low', 'medium', 'high'].includes(priority) ? priority : 'medium',
      dueDate: dueDate ? new Date(dueDate) : undefined,
      assignedBy: req.user.id,
    };
    const dueLabel = baseFields.dueDate ? ` Due ${baseFields.dueDate.toLocaleDateString()}.` : '';

    if (assignAll) {
      const recipients = await User.find({ role: { $ne: 'super_admin' }, isDeleted: { $ne: true } })
        .select('_id')
        .lean();
      if (!recipients.length) {
        return res.status(404).json({ message: 'No users available to assign this task to.' });
      }

      const tasks = await Task.insertMany(
        recipients.map((recipient) => ({ ...baseFields, assignedTo: recipient._id }))
      );

      await Promise.all(recipients.map((recipient) => createUserNotification({
        recipient: recipient._id,
        kind: 'task',
        source: 'Admin',
        title: 'New task assigned',
        message: `You have been assigned a new task: "${taskTitle}".${dueLabel}`,
        level: 'info',
        actionType: 'route',
        actionPath: '/alumni-dashboard',
        metadata: { taskId: String(tasks.find((t) => String(t.assignedTo) === String(recipient._id))?._id || '') },
      })));

      return res.status(201).json({ tasks, count: tasks.length });
    }

    const targetUserId = String(assignedTo || '').trim();
    if (!targetUserId) {
      return res.status(400).json({ message: 'assignedTo and title are required.' });
    }

    const targetUser = await User.findById(targetUserId).select('_id name fullName email').lean();
    if (!targetUser) {
      return res.status(404).json({ message: 'Assigned user not found.' });
    }

    const task = await Task.create({ ...baseFields, assignedTo: targetUserId });

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

    return res.json({ tasks: tasks.map(decorateTaskUsers) });
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
    return res.json({ tasks: tasks.map((task) => ({ ...task, department: revealEncrypted(task.department) })) });
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

// Assignee: submit completed work (optional file + optional write-up), marks task completed
router.post('/:id/submit', verifyToken, handleSubmissionUpload, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found.' });
    if (String(task.assignedTo) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Only the assigned employee can submit this task.' });
    }
    if (task.status === 'completed') {
      return res.status(400).json({ message: 'This task was already submitted.' });
    }

    const text = String(req.body?.text || '').trim();
    if (!text && !req.file) {
      return res.status(400).json({ message: 'Add a write-up or attach a file before submitting.' });
    }

    const stored = req.file ? await storeSubmissionFile(req.file) : null;
    task.submission = {
      text,
      fileUrl: stored?.fileUrl || '',
      fileName: stored?.fileName || '',
      storedName: stored?.storedName || '',
      submittedAt: new Date(),
    };
    task.status = 'completed';
    task.completedAt = new Date();
    await task.save();

    if (task.assignedBy) {
      await createUserNotification({
        recipient: task.assignedBy,
        kind: 'task',
        source: 'System',
        title: 'Task submitted',
        message: `A task has been marked as done: "${task.title}".`,
        level: 'success',
        actionType: 'route',
        actionPath: '/tasks',
        metadata: { taskId: String(task._id) },
      });
    }

    return res.json({ task });
  } catch (err) {
    console.error('POST /api/tasks/:id/submit error', err);
    return res.status(500).json({ message: 'Failed to submit task.' });
  }
});

// Assignee or admin: download the file attached to a task submission
router.get('/:id/submission/download', verifyToken, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).lean();
    if (!task) return res.status(404).json({ message: 'Task not found.' });

    const isOwner = String(task.assignedTo) === String(req.user.id);
    const isAdmin = ADMIN_ROLES.includes(req.user?.role);
    if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Not allowed.' });

    const fileUrl = task.submission?.fileUrl;
    if (!fileUrl) return res.status(404).json({ message: 'No file was submitted for this task.' });

    const downloadName = String(task.submission?.fileName || 'submission').replace(/[\r\n"]/g, '_');

    if (isRemoteFileUrl(fileUrl)) {
      const remoteResponse = await fetchRemoteFile(fileUrl);
      if (!remoteResponse.ok) return res.status(502).json({ message: 'File is unavailable right now.' });
      const fileBuffer = Buffer.from(await remoteResponse.arrayBuffer());
      res.setHeader('Content-Type', remoteResponse.headers.get('content-type') || 'application/octet-stream');
      res.setHeader('Content-Length', String(fileBuffer.length));
      res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
      return res.send(fileBuffer);
    }

    const filePath = path.join(submissionUploadsDir, task.submission.storedName);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File missing on server.' });
    return res.download(filePath, downloadName);
  } catch (err) {
    console.error('GET /api/tasks/:id/submission/download error', err);
    return res.status(500).json({ message: 'Failed to download submission.' });
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
