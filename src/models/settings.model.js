const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const settingsSchema = mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ['string', 'number', 'boolean', 'object', 'array'],
      default: 'string',
    },
    isEditable: {
      type: Boolean,
      default: true,
    },
    category: {
      type: String,
      default: 'general',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
settingsSchema.plugin(toJSON);
settingsSchema.plugin(paginate);

/**
 * Get setting value by key
 * @param {string} key
 * @returns {Promise<any>}
 */
settingsSchema.statics.getValue = async function (key) {
  const setting = await this.findOne({ key });
  return setting ? setting.value : null;
};

/**
 * Set setting value by key
 * @param {string} key
 * @param {any} value
 * @param {Object} options
 * @returns {Promise<Settings>}
 */
settingsSchema.statics.setValue = async function (key, value, options = {}) {
  const { description, type, category } = options;
  
  const setting = await this.findOneAndUpdate(
    { key },
    {
      value,
      ...(description && { description }),
      ...(type && { type }),
      ...(category && { category }),
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
    }
  );
  
  return setting;
};

/**
 * Get platform fee percentage
 * @returns {Promise<number>}
 */
settingsSchema.statics.getPlatformFee = async function () {
  const fee = await this.getValue('platform_fee');
  return fee !== null ? fee : 15; // Default 15% if not set
};

/**
 * Set platform fee percentage
 * @param {number} percentage
 * @returns {Promise<Settings>}
 */
settingsSchema.statics.setPlatformFee = async function (percentage) {
  return this.setValue('platform_fee', percentage, {
    description: 'Platform fee percentage charged on transactions',
    type: 'number',
    category: 'finance'
  });
};

/**
 * Initialize default settings
 */
settingsSchema.statics.initializeDefaults = async function () {
  const defaults = [
    {
      key: 'platform_fee',
      value: 15,
      description: 'Platform fee percentage charged on transactions',
      type: 'number',
      category: 'finance'
    },
    {
      key: 'app_name',
      value: 'Kejia',
      description: 'Application name',
      type: 'string',
      category: 'general'
    },
    {
      key: 'maintenance_mode',
      value: false,
      description: 'Enable maintenance mode',
      type: 'boolean',
      category: 'system'
    }
  ];

  for (const setting of defaults) {
    const exists = await this.findOne({ key: setting.key });
    if (!exists) {
      await this.create(setting);
    }
  }
};

/**
 * @typedef Settings
 */
const Settings = mongoose.model('Settings', settingsSchema);

module.exports = Settings;
