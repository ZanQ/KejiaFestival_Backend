const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const vendorCodeSchema = mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    usedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    usedAt: {
      type: Date,
      default: null,
    },
    description: {
      type: String,
      default: 'Vendor registration code',
    },
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
vendorCodeSchema.plugin(toJSON);

/**
 * Check if vendor code exists and is available
 * @param {string} code - The vendor code
 * @returns {Promise<boolean>}
 */
vendorCodeSchema.statics.isCodeAvailable = async function (code) {
  const vendorCode = await this.findOne({ code: code.toUpperCase(), isUsed: false });
  return !!vendorCode;
};

/**
 * Use a vendor code
 * @param {string} code - The vendor code
 * @param {ObjectId} userId - The user ID who used the code
 * @returns {Promise<VendorCode>}
 */
vendorCodeSchema.statics.useCode = async function (code, userId) {
  const vendorCode = await this.findOneAndUpdate(
    { code: code.toUpperCase(), isUsed: false },
    { 
      isUsed: true, 
      usedBy: userId, 
      usedAt: new Date() 
    },
    { new: true }
  );
  return vendorCode;
};

/**
 * @typedef VendorCode
 */
const VendorCode = mongoose.model('VendorCode', vendorCodeSchema);

module.exports = VendorCode;
