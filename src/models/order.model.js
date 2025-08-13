const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const orderSchema = mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: [{
      menuItemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MenuItem',
      },
      name: {
        type: String,
        required: true,
        trim: true,
      },
      description: {
        type: String,
        trim: true,
      },
      quantity: {
        type: Number,
        required: true,
        min: 1,
      },
      price: {
        type: Number,
        required: true,
        min: 0,
      },
      totalPrice: {
        type: Number,
        required: true,
        min: 0,
      },
    }],
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'refunded'],
      default: 'pending',
    },
    orderType: {
      type: String,
      enum: ['pre-order', 'instant', 'scheduled'],
      default: 'instant',
    },
    scheduledTime: {
      type: Date,
    },
    pickupTime: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
    },
    vendorNotes: {
      type: String,
      trim: true,
    },
    isMarkedOff: {
      type: Boolean,
      default: false,
    },
    markedOffAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
orderSchema.plugin(toJSON);
orderSchema.plugin(paginate);

/**
 * Mark order as completed and handed off
 * @returns {Promise<void>}
 */
orderSchema.methods.markAsHandedOff = async function () {
  this.status = 'completed';
  this.isMarkedOff = true;
  this.markedOffAt = new Date();
  await this.save();
};

/**
 * Calculate total amount from items
 * @returns {number}
 */
orderSchema.methods.calculateTotal = function () {
  return this.items.reduce((total, item) => total + item.totalPrice, 0);
};

// Pre-save middleware to calculate total amount
orderSchema.pre('save', function (next) {
  if (this.items && this.items.length > 0) {
    this.totalAmount = this.calculateTotal();
  }
  next();
});

/**
 * @typedef Order
 */
const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
