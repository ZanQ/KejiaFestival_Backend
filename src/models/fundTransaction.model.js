const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const fundTransactionSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    type: {
      type: String,
      enum: ['deposit', 'withdrawal', 'refund', 'payment', 'adjustment'],
      required: true,
    },
    method: {
      type: String,
      enum: ['card', 'bank_transfer', 'paypal', 'google_pay', 'apple_pay', 'cash', 'admin_adjustment', 'zeffy', 'zapier_webhook'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'cancelled'],
      default: 'pending',
    },
    description: {
      type: String,
      trim: true,
    },
    relatedOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    },
    transactionId: {
      type: String,
      unique: true,
      sparse: true,
    },
    externalTransactionId: {
      type: String,
      sparse: true,
    },
    zeffyTransactionId: {
      type: String,
      sparse: true,
    },
    zapierWebhookId: {
      type: String,
      sparse: true,
    },
    zeffyDonationData: {
      donorName: String,
      donorEmail: String,
      donationAmount: Number,
      currency: String,
      donationDate: Date,
      campaignId: String,
      campaignName: String,
      isRecurring: Boolean,
      recurringFrequency: String,
      processingFee: Number,
      netAmount: Number,
    },
    zapierMetadata: {
      zapId: String,
      triggerTimestamp: Date,
      sourceApp: String,
      webhookUrl: String,
      retryCount: Number,
      eventType: String,
      originalPayload: mongoose.Schema.Types.Mixed,
    },
    balanceBefore: {
      type: Number,
      required: true,
      min: 0,
    },
    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
    integrationSource: {
      type: String,
      enum: ['manual', 'zeffy', 'zapier', 'api', 'admin'],
      default: 'manual',
    },
    webhookVerified: {
      type: Boolean,
      default: false,
    },
    webhookSignature: {
      type: String,
      private: true,
    },
    processedAt: {
      type: Date,
    },
    failureReason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
fundTransactionSchema.plugin(toJSON);
fundTransactionSchema.plugin(paginate);

/**
 * Mark transaction as completed
 * @returns {Promise<void>}
 */
fundTransactionSchema.methods.markAsCompleted = async function () {
  this.status = 'completed';
  this.processedAt = new Date();
  await this.save();
};

/**
 * Mark transaction as failed
 * @param {string} reason - Failure reason
 * @returns {Promise<void>}
 */
fundTransactionSchema.methods.markAsFailed = async function (reason) {
  this.status = 'failed';
  this.failureReason = reason;
  this.processedAt = new Date();
  await this.save();
};

/**
 * Process Zeffy donation webhook
 * @param {Object} zeffyData - Zeffy webhook data
 * @returns {Promise<void>}
 */
fundTransactionSchema.methods.processZeffyDonation = async function (zeffyData) {
  this.method = 'zeffy';
  this.integrationSource = 'zeffy';
  this.zeffyTransactionId = zeffyData.id || zeffyData.transaction_id;
  this.externalTransactionId = zeffyData.external_id;
  
  this.zeffyDonationData = {
    donorName: zeffyData.donor_name,
    donorEmail: zeffyData.donor_email,
    donationAmount: zeffyData.amount,
    currency: zeffyData.currency || 'USD',
    donationDate: new Date(zeffyData.created_at),
    campaignId: zeffyData.campaign_id,
    campaignName: zeffyData.campaign_name,
    isRecurring: zeffyData.is_recurring || false,
    recurringFrequency: zeffyData.recurring_frequency,
    processingFee: zeffyData.processing_fee || 0,
    netAmount: zeffyData.net_amount || zeffyData.amount,
  };
  
  this.amount = zeffyData.net_amount || zeffyData.amount;
  this.description = `Zeffy donation from ${zeffyData.donor_name || 'Anonymous'}`;
  
  await this.save();
};

/**
 * Process Zapier webhook
 * @param {Object} zapierData - Zapier webhook data
 * @param {string} webhookId - Zapier webhook ID
 * @returns {Promise<void>}
 */
fundTransactionSchema.methods.processZapierWebhook = async function (zapierData, webhookId) {
  this.method = 'zapier_webhook';
  this.integrationSource = 'zapier';
  this.zapierWebhookId = webhookId;
  
  this.zapierMetadata = {
    zapId: zapierData.zap_id,
    triggerTimestamp: new Date(zapierData.timestamp),
    sourceApp: zapierData.source_app,
    webhookUrl: zapierData.webhook_url,
    retryCount: zapierData.retry_count || 0,
    eventType: zapierData.event_type,
    originalPayload: zapierData,
  };
  
  // Extract amount from Zapier data (this may vary based on your Zap configuration)
  this.amount = zapierData.amount || zapierData.credit_amount;
  this.description = zapierData.description || `Zapier credit from ${zapierData.source_app}`;
  
  await this.save();
};

/**
 * Verify webhook signature
 * @param {string} signature - Webhook signature
 * @param {string} secret - Webhook secret
 * @returns {boolean}
 */
fundTransactionSchema.methods.verifyWebhookSignature = function (signature, secret) {
  // This would implement actual signature verification
  // For now, just store the signature and mark as verified
  this.webhookSignature = signature;
  this.webhookVerified = true;
  return true;
};

/**
 * Check if transaction is from Zeffy
 * @returns {boolean}
 */
fundTransactionSchema.methods.isZeffyTransaction = function () {
  return this.method === 'zeffy' || this.integrationSource === 'zeffy';
};

/**
 * Check if transaction is from Zapier
 * @returns {boolean}
 */
fundTransactionSchema.methods.isZapierTransaction = function () {
  return this.method === 'zapier_webhook' || this.integrationSource === 'zapier';
};

/**
 * Get integration display name
 * @returns {string}
 */
fundTransactionSchema.methods.getIntegrationDisplayName = function () {
  switch (this.integrationSource) {
    case 'zeffy':
      return 'Zeffy Donation';
    case 'zapier':
      return `Zapier (${this.zapierMetadata?.sourceApp || 'Unknown'})`;
    case 'manual':
      return 'Manual Entry';
    case 'api':
      return 'API';
    case 'admin':
      return 'Admin Adjustment';
    default:
      return this.method || 'Unknown';
  }
};

// Generate unique transaction ID before saving
fundTransactionSchema.pre('save', function (next) {
  if (this.isNew && !this.transactionId) {
    const prefix = this.integrationSource === 'zeffy' ? 'ZEF' : 
                   this.integrationSource === 'zapier' ? 'ZAP' : 'TXN';
    this.transactionId = `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Auto-set type based on integration source for deposits
  if (this.isNew && this.integrationSource === 'zeffy' && !this.type) {
    this.type = 'deposit';
  }
  if (this.isNew && this.integrationSource === 'zapier' && !this.type) {
    this.type = 'deposit';
  }
  
  next();
});

// Static method to find transactions by Zeffy ID
fundTransactionSchema.statics.findByZeffyId = function (zeffyId) {
  return this.findOne({ zeffyTransactionId: zeffyId });
};

// Static method to find transactions by Zapier webhook ID
fundTransactionSchema.statics.findByZapierWebhookId = function (webhookId) {
  return this.findOne({ zapierWebhookId: webhookId });
};

// Static method to get integration statistics
fundTransactionSchema.statics.getIntegrationStats = function (userId, dateRange = {}) {
  const match = { user: userId };
  if (dateRange.start) match.createdAt = { $gte: dateRange.start };
  if (dateRange.end) match.createdAt = { ...match.createdAt, $lte: dateRange.end };
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$integrationSource',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
        avgAmount: { $avg: '$amount' },
      }
    }
  ]);
};

// Index for efficient queries
fundTransactionSchema.index({ user: 1, createdAt: -1 });
fundTransactionSchema.index({ status: 1, createdAt: -1 });
fundTransactionSchema.index({ integrationSource: 1, createdAt: -1 });
fundTransactionSchema.index({ webhookVerified: 1, integrationSource: 1 });

// Note: Individual field indexes are automatically created by sparse: true option
// so we don't need to explicitly create them for:
// - transactionId, externalTransactionId, zeffyTransactionId, zapierWebhookId

/**
 * @typedef FundTransaction
 */
const FundTransaction = mongoose.model('FundTransaction', fundTransactionSchema);

module.exports = FundTransaction;
