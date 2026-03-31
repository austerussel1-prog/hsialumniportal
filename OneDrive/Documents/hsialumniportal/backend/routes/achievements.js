const express = require('express');
const Achievement = require('../models/Achievement');
const User = require('../models/User');
const { verifyToken } = require('./auth');

const router = express.Router();

const ADMIN_ROLES = ['super_admin', 'superadmin', 'admin', 'hr', 'alumni_officer'];

const ensureAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('role');
    if (!user || !ADMIN_ROLES.includes(user.role)) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    req.adminUser = user;
    next();
  } catch (err) {
    return res.status(500).json({ message: 'Failed to validate admin access' });
  }
};

const emptyPayload = () => ({
  featured: null,
  badgeCatalog: [],
  milestones: [],
  appreciationPosts: [],
  certificationEvents: [],
  awardEvents: [],
  stats: {
    totalBadgesAwarded: 0,
    featuredAlumni: 0,
    appreciationPosts: 0,
    activeAlumni: 0,
  },
});

router.get('/', verifyToken, async (req, res) => {
  try {
    const achievement = await Achievement.findOne().sort({ updatedAt: -1 }).lean();
    if (!achievement) {
      return res.json(emptyPayload());
    }

    const awardEvents = Array.isArray(achievement.awardEvents) ? achievement.awardEvents : [];
    const appreciationPosts = Array.isArray(achievement.appreciationPosts) ? achievement.appreciationPosts : [];

    const badgeSet = new Set();
    awardEvents.forEach((ev) => {
      (Array.isArray(ev?.badges) ? ev.badges : []).forEach((badge) => {
        const name = String(badge || '').trim();
        if (name) badgeSet.add(name);
      });
    });

    return res.json({
      featured: achievement.featured || null,
      badgeCatalog: Array.isArray(achievement.badgeCatalog) ? achievement.badgeCatalog : [],
      milestones: Array.isArray(achievement.milestones) ? achievement.milestones : [],
      appreciationPosts,
      certificationEvents: Array.isArray(achievement.certificationEvents) ? achievement.certificationEvents : [],
      awardEvents,
      stats: {
        // Derived counts (keeps UI consistent after deletes).
        totalBadgesAwarded: badgeSet.size,
        featuredAlumni: awardEvents.length,
        appreciationPosts: appreciationPosts.length,
        activeAlumni: achievement.stats?.activeAlumni || 0,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch achievements data' });
  }
});

// Admin action: award a featured employee for the month.
router.post('/award', verifyToken, ensureAdmin, async (req, res) => {
  try {
    const {
      memberId,
      fullName,
      roleTitle,
      company,
      monthLabel,
      quote,
      badges = [],
      awardeeCategory,
    } = req.body || {};

    if (!fullName || !roleTitle || !company || !monthLabel) {
      return res.status(400).json({ message: 'fullName, roleTitle, company, and monthLabel are required' });
    }

    let achievement = await Achievement.findOne().sort({ updatedAt: -1 });
    if (!achievement) {
      achievement = new Achievement(emptyPayload());
    }

    achievement.featured = {
      memberId: memberId || null,
      fullName,
      roleTitle,
      company,
      monthLabel,
      quote: quote || '',
      badges: Array.isArray(badges) ? badges.filter(Boolean) : [],
    };

    const normalizedCategory = String(awardeeCategory || 'alumni').trim().toLowerCase();
    const category = normalizedCategory === 'employee' ? 'employee' : 'alumni';
    achievement.awardEvents = Array.isArray(achievement.awardEvents) ? achievement.awardEvents : [];
    achievement.awardEvents.push({
      memberId: memberId || null,
      category,
      fullName,
      roleTitle,
      company,
      monthLabel,
      quote: quote || '',
      badges: Array.isArray(badges) ? badges.filter(Boolean) : [],
      createdAt: new Date(),
    });

    const previousBadgeCount = Array.isArray(achievement.badgeCatalog) ? achievement.badgeCatalog.length : 0;
    const mergedBadges = new Set([...(achievement.badgeCatalog || []), ...(achievement.featured.badges || [])]);
    achievement.badgeCatalog = Array.from(mergedBadges);
    const addedBadgeCount = Math.max(0, achievement.badgeCatalog.length - previousBadgeCount);
    if (addedBadgeCount > 0) {
      achievement.certificationEvents = Array.isArray(achievement.certificationEvents)
        ? achievement.certificationEvents
        : [];
      achievement.certificationEvents.push({
        quantity: addedBadgeCount,
        source: 'award',
        createdAt: new Date(),
      });
    }

    achievement.stats.totalBadgesAwarded = Math.max(achievement.stats.totalBadgesAwarded || 0, achievement.badgeCatalog.length);
    achievement.stats.featuredAlumni = Array.isArray(achievement.awardEvents) ? achievement.awardEvents.length : 1;
    achievement.stats.appreciationPosts = achievement.appreciationPosts?.length || 0;
    achievement.updatedBy = req.adminUser._id;

    await achievement.save();

    return res.json({ message: 'Employee awarded successfully', achievement });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to save award' });
  }
});

// Admin action: delete an award event (featured history entry).
  router.delete('/award-events/:eventId', verifyToken, ensureAdmin, async (req, res) => {
  try {
    const { eventId } = req.params;

    const achievement = await Achievement.findOne().sort({ updatedAt: -1 });
    if (!achievement) {
      return res.status(404).json({ message: 'No achievements record found' });
    }

    achievement.awardEvents = Array.isArray(achievement.awardEvents) ? achievement.awardEvents : [];
    if (achievement.awardEvents.length === 0) {
      return res.status(404).json({ message: 'No award events found' });
    }

    let removed = false;
    const raw = String(eventId || '').trim();

    // Support "index-<n>" or numeric index for legacy rows.
    const indexMatch = raw.match(/^index-(\d+)$/) || raw.match(/^(\d+)$/);
    if (indexMatch) {
      const index = Number(indexMatch[1]);
      if (Number.isFinite(index) && index >= 0 && index < achievement.awardEvents.length) {
        achievement.awardEvents.splice(index, 1);
        removed = true;
      }
    } else if (raw && raw !== 'undefined') {
      const before = achievement.awardEvents.length;
      achievement.awardEvents = achievement.awardEvents.filter((ev) => String(ev?._id || '') !== raw);
      removed = achievement.awardEvents.length !== before;
    }

    if (!removed) {
      return res.status(404).json({ message: 'Award event not found' });
    }

    // Keep featured pointing to the latest award event (if any).
    const latest = achievement.awardEvents
      .slice()
      .sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0))[0];

    // Rebuild badge catalog + stats based on remaining awards.
    const remainingBadges = new Set();
    achievement.awardEvents.forEach((ev) => {
      (Array.isArray(ev?.badges) ? ev.badges : []).forEach((badge) => {
        const name = String(badge || '').trim();
        if (name) remainingBadges.add(name);
      });
    });

    achievement.badgeCatalog = Array.from(remainingBadges);
    achievement.stats.totalBadgesAwarded = achievement.badgeCatalog.length;

    if (achievement.awardEvents.length === 0) {
      // If all awards are gone, reset related derived fields.
      achievement.certificationEvents = [];
    }

    achievement.featured = latest
      ? {
        memberId: latest.memberId || null,
        fullName: latest.fullName || '',
        roleTitle: latest.roleTitle || '',
        company: latest.company || '',
        monthLabel: latest.monthLabel || '',
        quote: latest.quote || '',
        badges: Array.isArray(latest.badges) ? latest.badges.filter(Boolean) : [],
      }
      : null;

    achievement.stats.featuredAlumni = achievement.awardEvents.length;
    achievement.updatedBy = req.adminUser._id;

    achievement.markModified('awardEvents');
    achievement.markModified('badgeCatalog');
    achievement.markModified('certificationEvents');
    await achievement.save();

    return res.json({ message: 'Award event deleted successfully', achievement });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to delete award event' });
  }
});

// Admin action: add an appreciation post.
router.post('/appreciation', verifyToken, ensureAdmin, async (req, res) => {
  try {
    const {
      title,
      author,
      excerpt,
      likes = 0,
    } = req.body || {};

    if (!title || !author) {
      return res.status(400).json({ message: 'title and author are required' });
    }

    let achievement = await Achievement.findOne().sort({ updatedAt: -1 });
    if (!achievement) {
      achievement = new Achievement(emptyPayload());
    }

    achievement.appreciationPosts.unshift({
      title: String(title).trim(),
      author: String(author).trim(),
      excerpt: String(excerpt || '').trim(),
      likes: Number.isFinite(Number(likes)) ? Number(likes) : 0,
      likedBy: [],
    });

    achievement.stats.appreciationPosts = achievement.appreciationPosts.length;
    achievement.stats.activeAlumni = achievement.stats.activeAlumni || 0;
    achievement.updatedBy = req.adminUser._id;

    await achievement.save();

    return res.json({ message: 'Appreciation post added successfully', achievement });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to save appreciation post' });
  }
});

// Admin action: delete an appreciation post.
router.delete('/appreciation/:postId', verifyToken, ensureAdmin, async (req, res) => {
  try {
    const achievement = await Achievement.findOne().sort({ updatedAt: -1 });
    if (!achievement) {
      return res.status(404).json({ message: 'No achievements record found' });
    }

    const { postId } = req.params;
    let removed = false;

    // Primary lookup by sub-document _id.
    if (postId && postId !== 'undefined') {
      const post = achievement.appreciationPosts.id(postId);
      if (post) {
        post.deleteOne();
        removed = true;
      }
    }

    // Fallback for numeric index.
    if (!removed && /^\d+$/.test(String(postId))) {
      const index = Number(postId);
      if (index >= 0 && index < achievement.appreciationPosts.length) {
        achievement.appreciationPosts.splice(index, 1);
        removed = true;
      }
    }

    if (!removed) {
      return res.status(404).json({ message: 'Appreciation post not found' });
    }

    achievement.stats.appreciationPosts = achievement.appreciationPosts.length;
    achievement.updatedBy = req.adminUser._id;
    achievement.markModified('appreciationPosts');
    await achievement.save();

    return res.json({ message: 'Appreciation post deleted successfully', achievement });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to delete appreciation post' });
  }
});

// Any authenticated user can like/unlike an appreciation post.
router.post('/appreciation/:postId/like', verifyToken, async (req, res) => {
  try {
    const achievement = await Achievement.findOne().sort({ updatedAt: -1 });
    if (!achievement) {
      return res.status(404).json({ message: 'No achievements record found' });
    }

    const { postId } = req.params;
    let post = null;

    // Primary lookup by sub-document _id.
    if (postId && postId !== 'undefined') {
      post = achievement.appreciationPosts.id(postId);
    }

    // Fallback for legacy rows without _id, using numeric index.
    if (!post && /^\d+$/.test(String(postId))) {
      const index = Number(postId);
      if (index >= 0 && index < achievement.appreciationPosts.length) {
        post = achievement.appreciationPosts[index];
      }
    }

    if (!post) {
      return res.status(404).json({ message: 'Appreciation post not found' });
    }

    const userId = String(req.user.id);
    post.likedBy = Array.isArray(post.likedBy) ? post.likedBy : [];
    const likeIndex = post.likedBy.findIndex((id) => String(id) === userId);

    let liked = false;
    if (likeIndex === -1) {
      post.likedBy.push(req.user.id);
      liked = true;
    } else {
      post.likedBy.splice(likeIndex, 1);
    }

    post.likes = post.likedBy.length;
    achievement.markModified('appreciationPosts');
    await achievement.save();

    return res.json({
      message: liked ? 'Liked' : 'Unliked',
      postId: post._id || postId,
      likes: post.likes,
      liked,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to like appreciation post' });
  }
});

module.exports = router;
