const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const menuItemSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  image: {
    type: String, // Image URL from Google Cloud Storage
  },
  qrCode: {
    type: String, // QR code data or URL
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// add plugin that converts mongoose to json
menuItemSchema.plugin(toJSON);

/**
 * @typedef MenuItem
 */
const MenuItem = mongoose.model('MenuItem', menuItemSchema);

module.exports = MenuItem;
