const Joi = require('joi');
const { objectId } = require('./custom.validation');

const getUsers = {
  query: Joi.object().keys({
    name: Joi.string(),
    email: Joi.string().email(),
    type: Joi.string().valid('customer', 'vendor'),
    isApproved: Joi.boolean(),
    isSuspended: Joi.boolean(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getVendors = {
  query: Joi.object().keys({
    name: Joi.string(),
    email: Joi.string().email(),
    isApproved: Joi.boolean(),
    isSuspended: Joi.boolean(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getTransactions = {
  query: Joi.object().keys({
    status: Joi.string().valid('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'),
    paymentStatus: Joi.string().valid('pending', 'paid', 'failed', 'refunded'),
    customer: Joi.string().custom(objectId),
    vendor: Joi.string().custom(objectId),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const approveVendor = {
  params: Joi.object().keys({
    vendorId: Joi.string().custom(objectId),
  }),
};

const suspendUser = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
  }),
};

const unsuspendUser = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
  }),
};

const updatePlatformFee = {
  body: Joi.object().keys({
    percentage: Joi.number().min(0).max(100).required(),
  }),
};

module.exports = {
  getUsers,
  getVendors,
  getTransactions,
  approveVendor,
  suspendUser,
  unsuspendUser,
  updatePlatformFee,
};
