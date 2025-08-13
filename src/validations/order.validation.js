const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createOrder = {
  body: Joi.object().keys({
    vendorId: Joi.string().custom(objectId).required(),
    userId: Joi.string().custom(objectId).required(),
    itemId: Joi.string().custom(objectId),
    quantity: Joi.number().integer().min(1).required(),
    // Item field - no validation, just pass through for verification
    item: Joi.any(),
    // Legacy support for existing structure
    vendor: Joi.string().custom(objectId),
    items: Joi.array().items(
      Joi.object().keys({
        name: Joi.string().required(),
        description: Joi.string(),
        quantity: Joi.number().integer().min(1).required(),
        price: Joi.number().min(0).required(),
        totalPrice: Joi.number().min(0).required(),
      })
    ),
    orderType: Joi.string().valid('pre-order', 'instant', 'scheduled'),
    scheduledTime: Joi.date(),
    notes: Joi.string(),
  }),
};

const getOrders = {
  query: Joi.object().keys({
    customer: Joi.string().custom(objectId),
    vendor: Joi.string().custom(objectId),
    status: Joi.string().valid('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'),
    orderType: Joi.string().valid('pre-order', 'instant', 'scheduled'),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getOrder = {
  params: Joi.object().keys({
    orderId: Joi.string().custom(objectId),
  }),
};

const updateOrder = {
  params: Joi.object().keys({
    orderId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      status: Joi.string().valid('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'),
      vendorNotes: Joi.string(),
      pickupTime: Joi.date(),
    })
    .min(1),
};

const updateOrderStatus = {
  params: Joi.object().keys({
    orderId: Joi.required().custom(objectId),
  }),
  body: Joi.object().keys({
    status: Joi.string().valid('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled').required(),
  }),
};

const markOrderHandedOff = {
  params: Joi.object().keys({
    orderId: Joi.required().custom(objectId),
  }),
};

const deleteOrder = {
  params: Joi.object().keys({
    orderId: Joi.string().custom(objectId),
  }),
};

module.exports = {
  createOrder,
  getOrders,
  getOrder,
  updateOrder,
  updateOrderStatus,
  markOrderHandedOff,
  deleteOrder,
};
