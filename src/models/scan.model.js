const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const scanSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    scanType: {
      type: String,
      enum: ['qr_code', 'barcode', 'nfc', 'menu_scan', 'product_scan'],
      required: true,
    },
    scannedData: {
      type: String,
      required: true,
    },
    decodedData: {
      type: mongoose.Schema.Types.Mixed,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
      },
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    relatedOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    },
    scanResult: {
      type: String,
      enum: ['success', 'failed', 'invalid', 'expired'],
      default: 'success',
    },
    action: {
      type: String,
      enum: ['view_menu', 'place_order', 'verify_payment', 'check_balance', 'other'],
      required: true,
    },
    metadata: {
      deviceInfo: {
        userAgent: String,
        platform: String,
        appVersion: String,
      },
      scanDuration: Number, // in milliseconds
      additionalData: mongoose.Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
scanSchema.plugin(toJSON);
scanSchema.plugin(paginate);

// Create geospatial index for location-based queries
scanSchema.index({ location: '2dsphere' });

// Index for efficient queries
scanSchema.index({ user: 1, createdAt: -1 });
scanSchema.index({ vendor: 1, createdAt: -1 });
scanSchema.index({ scanType: 1, createdAt: -1 });
scanSchema.index({ action: 1, createdAt: -1 });

/**
 * Get scans within a certain distance from a point
 * @param {number} longitude - Longitude
 * @param {number} latitude - Latitude
 * @param {number} maxDistance - Maximum distance in meters
 * @returns {Promise<Array>}
 */
scanSchema.statics.findNearby = function (longitude, latitude, maxDistance = 1000) {
  return this.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        $maxDistance: maxDistance,
      },
    },
  });
};

/**
 * @typedef Scan
 */
const Scan = mongoose.model('Scan', scanSchema);

module.exports = Scan;
