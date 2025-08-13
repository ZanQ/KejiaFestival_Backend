const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const { toJSON, paginate } = require('./plugins');
const { roles } = require('../config/roles');
const { boolean } = require('joi');

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      minlength: 3,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      validate(value) {
        if (!validator.isEmail(value)) {
          throw new Error('Invalid email');
        }
      },
    },
    password: {
      type: String,
      trim: true,
      minlength: 8,
      validate(value) {
        if (!value.match(/\d/) || !value.match(/[a-zA-Z]/)) {
          throw new Error('Password must contain at least one letter and one number');
        }
      },
      private: true, // used by the toJSON plugin
    },
    googleAuth: {
      googleId: {
        type: String,
        sparse: true,
      },
      token: {
        type: String,
        private: true,
      },
    },
    type: {
      type: String,
      enum: ['customer', 'vendor', 'admin'],
      default: 'customer',
    },
    role: {
      type: String,
      enum: roles,
      default: 'customer',
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    pendingOrders: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    }],
    completedOrders: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    }],
    notifications: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Notification',
    }],
    fundsAddedHistory: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FundTransaction',
    }],
    scans: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Scan',
    }],
    // Vendor-specific fields
    salesHistory: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    }],
    totalSales: {
      type: Number,
      default: 0,
      min: 0,
    },
    coOwners: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
userSchema.plugin(toJSON);
userSchema.plugin(paginate);

/**
 * Check if email is taken
 * @param {string} email - The user's email
 * @param {ObjectId} [excludeUserId] - The id of the user to be excluded
 * @returns {Promise<boolean>}
 */
userSchema.statics.isEmailTaken = async function (email, excludeUserId) {
  const user = await this.findOne({ email, _id: { $ne: excludeUserId } });
  return !!user;
};

/**
 * Check if username is taken
 * @param {string} username - The user's username
 * @param {ObjectId} [excludeUserId] - The id of the user to be excluded
 * @returns {Promise<boolean>}
 */
userSchema.statics.isUsernameTaken = async function (username, excludeUserId) {
  const user = await this.findOne({ username, _id: { $ne: excludeUserId } });
  return !!user;
};

/**
 * Check if normalized username conflicts with existing usernames
 * @param {string} username - The user's username
 * @param {ObjectId} [excludeUserId] - The id of the user to be excluded
 * @returns {Promise<boolean>}
 */
userSchema.statics.hasUsernameConflict = async function (username, excludeUserId) {
  // Check exact match
  const exactMatch = await this.findOne({ username, _id: { $ne: excludeUserId } });
  if (exactMatch) return true;
  
  // Check normalized version (lowercase, no spaces)
  const normalized = username.toLowerCase().replace(/\s+/g, '');
  const normalizedMatch = await this.findOne({ 
    username: normalized, 
    _id: { $ne: excludeUserId } 
  });
  if (normalizedMatch) return true;
  
  // Check if current username when normalized conflicts with others
  const allUsers = await this.find({ _id: { $ne: excludeUserId } }, { username: 1 });
  for (const user of allUsers) {
    const userNormalized = user.username.toLowerCase().replace(/\s+/g, '');
    if (userNormalized === normalized) {
      return true;
    }
  }
  
  return false;
};

/**
 * Check if password matches the user's password
 * @param {string} password
 * @returns {Promise<boolean>}
 */
userSchema.methods.isPasswordMatch = async function (password) {
  const user = this;
  return bcrypt.compare(password, user.password);
};

/**
 * Check if user is vendor
 * @returns {boolean}
 */
userSchema.methods.isVendor = function () {
  return this.type === 'vendor';
};

/**
 * Check if user is admin
 * @returns {boolean}
 */
userSchema.methods.isAdmin = function () {
  return this.type === 'admin';
};

/**
 * Add funds to user balance
 * @param {number} amount - Amount to add
 * @returns {Promise<void>}
 */
userSchema.methods.addFunds = async function (amount) {
  this.balance += amount;
  await this.save();
};

/**
 * Deduct funds from user balance
 * @param {number} amount - Amount to deduct
 * @returns {Promise<void>}
 */
userSchema.methods.deductFunds = async function (amount) {
  if (this.balance < amount) {
    throw new Error('Insufficient balance');
  }
  this.balance -= amount;
  await this.save();
};

userSchema.pre('save', async function (next) {
  const user = this;
  
  // Debug logging for username
  if (user.isModified('username')) {
    console.log('Username being saved:', user.username);
    console.log('Username type:', typeof user.username);
    console.log('Username length:', user.username.length);
  }
  
  if (user.isModified('password')) {
    user.password = await bcrypt.hash(user.password, 8);
  }
  next();
});

/**
 * @typedef User
 */
const User = mongoose.model('User', userSchema);

module.exports = User;
