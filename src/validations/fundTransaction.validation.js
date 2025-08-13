const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createFundTransaction = {
  body: Joi.object().keys({
    user: Joi.string().required().custom(objectId),
    amount: Joi.number().min(0).required(),
    type: Joi.string().required().valid('deposit', 'withdrawal', 'refund', 'payment', 'adjustment'),
    method: Joi.string().required().valid('card', 'bank_transfer', 'paypal', 'google_pay', 'apple_pay', 'cash', 'admin_adjustment', 'zeffy', 'zapier_webhook'),
    description: Joi.string(),
    relatedOrder: Joi.string().custom(objectId),
    balanceBefore: Joi.number().min(0).required(),
    balanceAfter: Joi.number().min(0).required(),
    integrationSource: Joi.string().valid('manual', 'zeffy', 'zapier', 'api', 'admin'),
  }),
};

const zeffyWebhook = {
  body: Joi.object().keys({
    id: Joi.string().required(),
    transaction_id: Joi.string(),
    external_id: Joi.string(),
    donor_name: Joi.string(),
    donor_email: Joi.string().email().required(),
    amount: Joi.number().min(0).required(),
    currency: Joi.string().default('USD'),
    created_at: Joi.string().isoDate().required(),
    campaign_id: Joi.string(),
    campaign_name: Joi.string(),
    is_recurring: Joi.boolean(),
    recurring_frequency: Joi.string(),
    processing_fee: Joi.number().min(0),
    net_amount: Joi.number().min(0),
    user_id: Joi.string().custom(objectId), // Custom field to identify the user
  }),
};

const zapierWebhook = {
  body: Joi.object().keys({
    zap_id: Joi.string(),
    timestamp: Joi.string().isoDate(),
    source_app: Joi.string(),
    webhook_url: Joi.string().uri(),
    retry_count: Joi.number().integer().min(0),
    event_type: Joi.string(),
    amount: Joi.number().min(0).required(),
    credit_amount: Joi.number().min(0),
    description: Joi.string(),
    user_id: Joi.string().custom(objectId).required(), // Custom field to identify the user
    // Allow additional fields from various Zapier integrations
  }).unknown(true),
};

const getFundTransactions = {
  query: Joi.object().keys({
    user: Joi.string().custom(objectId),
    type: Joi.string().valid('deposit', 'withdrawal', 'refund', 'payment', 'adjustment'),
    method: Joi.string().valid('card', 'bank_transfer', 'paypal', 'google_pay', 'apple_pay', 'cash', 'admin_adjustment', 'zeffy', 'zapier_webhook'),
    status: Joi.string().valid('pending', 'completed', 'failed', 'cancelled'),
    integrationSource: Joi.string().valid('manual', 'zeffy', 'zapier', 'api', 'admin'),
    startDate: Joi.date(),
    endDate: Joi.date(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getFundTransaction = {
  params: Joi.object().keys({
    transactionId: Joi.string().custom(objectId),
  }),
};

const updateFundTransaction = {
  params: Joi.object().keys({
    transactionId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      status: Joi.string().valid('pending', 'completed', 'failed', 'cancelled'),
      description: Joi.string(),
      failureReason: Joi.string(),
      webhookVerified: Joi.boolean(),
    })
    .min(1),
};

const verifyWebhook = {
  params: Joi.object().keys({
    transactionId: Joi.required().custom(objectId),
  }),
  body: Joi.object().keys({
    signature: Joi.string().required(),
    secret: Joi.string().required(),
  }),
};

const getIntegrationStats = {
  query: Joi.object().keys({
    user: Joi.string().custom(objectId),
    startDate: Joi.date(),
    endDate: Joi.date(),
  }),
};

module.exports = {
  createFundTransaction,
  zeffyWebhook,
  zapierWebhook,
  getFundTransactions,
  getFundTransaction,
  updateFundTransaction,
  verifyWebhook,
  getIntegrationStats,
};
