const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const {
  normalizeEmail,
  hashLookupValue,
  encryptField,
  decryptField,
  isEncryptedValue,
} = require('../utils/fieldEncryption');

function encryptedSetter(value) {
  if (value === null || typeof value === 'undefined') return value;
  return encryptField(String(value));
}

function encryptedGetter(value) {
  if (value === null || typeof value === 'undefined') return value;
  return decryptField(String(value));
}

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    set: encryptedSetter,
    get: encryptedGetter,
  },
  email: {
    type: String,
    required: true,
    set: function setEmail(value) {
      const normalized = normalizeEmail(value);
      if (!normalized) {
        this.emailHash = undefined;
        return normalized;
      }
      this.emailHash = hashLookupValue(normalized);
      return normalized;
    },
    index: true,
  },
  emailHash: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
  },
  employeeId: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
  },
  contactNumber: {
    type: String,
    required: false,
    set: encryptedSetter,
    get: encryptedGetter,
  },
  address: {
    type: String,
    required: false,
    set: encryptedSetter,
    get: encryptedGetter,
  },
    username: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
    },
  password: {
    type: String,
    required: false, 
  },
  googleId: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
  },
  provider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local',
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'super_admin', 'alumni', 'hr', 'alumni_officer'],
    default: 'user',
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  approvedAt: {
    type: Date,
  },
  registrationVerifiedAt: {
    type: Date,
    default: null,
  },
  otp: {
    type: String,
  },
  otpExpiry: {
    type: Date,
  },
  consent: {
    termsAccepted: {
      type: Boolean,
      default: false,
    },
    privacyAccepted: {
      type: Boolean,
      default: false,
    },
    termsVersion: {
      type: String,
      default: '',
    },
    privacyVersion: {
      type: String,
      default: '',
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
    source: {
      type: String,
      enum: ['register_form', 'google_register', 'admin_update', 'unknown'],
      default: 'unknown',
    },
    ipAddress: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  graduationYear: {
    type: String,
    required: false,
  },
  major: {
    type: String,
    required: false,
  },
  company: {
    type: String,
    required: false,
  },
  jobTitle: {
    type: String,
    required: false,
  },
  languages: {
    type: String,
    required: false,
  },
  education: {
    type: String,
    required: false,
  },
  skills: {
    type: String,
    required: false,
  },
  bio: {
    type: String,
    required: false,
  },
  bio2: {
    type: String,
    required: false,
  },
  profileImage: {
    type: String,
    required: false,
    set: encryptedSetter,
    get: encryptedGetter,
  },
  linkedinUrl: {
    type: String,
    required: false,
  },
  twitterUrl: {
    type: String,
    required: false,
  },
  instagramUrl: {
    type: String,
    required: false,
  },
  projects: {
    type: [
      {
        id: { type: Number },
        name: { type: String },
        link: { type: String },
        industry: { type: String },
        role: { type: String },
      },
    ],
    default: [],
  },
  careerDocuments: {
    type: [
      {
        id: { type: Number },
        name: { type: String },
      },
    ],
    default: [],
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false,
  },
  loginAlerts: {
    type: Boolean,
    default: true,
  },
  profileVisibility: {
    type: String,
    enum: ['public', 'members', 'private'],
    default: 'public',
  },
  failedLoginAttempts: {
    type: Number,
    default: 0,
  },
  lastFailedLoginAt: {
    type: Date,
    default: null,
  },
  lockUntil: {
    type: Date,
    default: null,
  },
  lastLoginAt: {
    type: Date,
    default: null,
  },
  lastActiveAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  isAnonymized: {
    type: Boolean,
    default: false,
    index: true,
  },
  anonymizedAt: {
    type: Date,
    default: null,
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
  deletionRequestedAt: {
    type: Date,
    default: null,
  },
  scheduledDeletionAt: {
    type: Date,
    default: null,
    index: true,
  },
  deletionReason: {
    type: String,
    default: '',
  },
  deletionFinalAction: {
    type: String,
    enum: ['delete', 'anonymize'],
    default: 'delete',
  },
  dataRemovalRequestedAt: {
    type: Date,
    default: null,
  },
  dataRemovalRequestStatus: {
    type: String,
    enum: ['none', 'pending', 'approved', 'rejected'],
    default: 'none',
    index: true,
  },
  dataRemovalRequestedFinalAction: {
    type: String,
    enum: ['delete', 'anonymize'],
    default: 'delete',
  },
  dataRemovalRequestReviewedAt: {
    type: Date,
    default: null,
  },
  dataRemovalRequestReviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  dataRemovalRequestDecisionNote: {
    type: String,
    default: '',
  },
  dataRemovalRequestNote: {
    type: String,
    default: '',
  },
  privacyUpdatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  toJSON: { getters: true },
  toObject: { getters: true },
});



userSchema.pre('save', async function () {
  // Only hash when a password is present and modified
  if (!this.password || !this.isModified('password')) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.pre('save', function privacyTimestamp() {
  if (
    this.isModified('name') ||
    this.isModified('email') ||
    this.isModified('contactNumber') ||
    this.isModified('address') ||
    this.isModified('profileImage')
  ) {
    this.privacyUpdatedAt = new Date();
  }
});

userSchema.statics.findByEmail = async function findByEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  let user = await this.findOne({ email: normalized });
  if (user) {
    const expectedHash = hashLookupValue(normalized);
    if (user.emailHash !== expectedHash) {
      try {
        user.emailHash = expectedHash;
        await user.save();
      } catch (err) {
        console.error('[privacy] Failed to backfill emailHash for user', String(user._id), err.message);
      }
    }
    return user;
  }

  const hashed = hashLookupValue(normalized);
  user = await this.findOne({ emailHash: hashed });
  if (user) {
    try {
      // Backfill legacy records where email was encrypted at rest.
      user.email = normalized;
      await user.save();
    } catch (err) {
      console.error('[privacy] Failed to backfill emailHash for user', String(user._id), err.message);
    }
    return user;
  }

  // Backward compatibility for rare records saved before emailHash existed.
  user = await this.findOne({ email: normalized });
  if (user) {
    if (isEncryptedValue(user.email) || !user.emailHash) {
      try {
        user.email = normalized;
        await user.save();
      } catch (err) {
        console.error('[privacy] Failed to backfill emailHash for user', String(user._id), err.message);
      }
    }
  }
  return user;
};

userSchema.statics.buildEmailFilter = function buildEmailFilter(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  return { email: normalized };
};

userSchema.methods.isLoginLocked = function isLoginLocked() {
  return Boolean(this.lockUntil && new Date(this.lockUntil).getTime() > Date.now());
};

userSchema.methods.registerFailedLogin = function registerFailedLogin(maxAttempts, lockMinutes) {
  const maxAllowed = Number.isFinite(Number(maxAttempts)) ? Number(maxAttempts) : 5;
  const lockForMinutes = Number.isFinite(Number(lockMinutes)) ? Number(lockMinutes) : 15;
  const nextAttempts = Number(this.failedLoginAttempts || 0) + 1;

  this.failedLoginAttempts = nextAttempts;
  this.lastFailedLoginAt = new Date();

  if (nextAttempts >= maxAllowed) {
    this.lockUntil = new Date(Date.now() + lockForMinutes * 60 * 1000);
    this.failedLoginAttempts = 0;
  }
};

userSchema.methods.clearLoginFailures = function clearLoginFailures() {
  this.failedLoginAttempts = 0;
  this.lastFailedLoginAt = null;
  this.lockUntil = null;
};


userSchema.methods.comparePassword = async function (inputPassword) {
  if (!this.password || typeof this.password !== 'string') return false;
  try {
    return await bcrypt.compare(inputPassword, this.password);
  } catch (err) {
    console.error('[auth] Failed to compare password hash for user', String(this._id), err.message);
    return false;
  }
};

module.exports = mongoose.model('User', userSchema);
