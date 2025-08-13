const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createMenuItem = {
  body: Joi.object().keys({
    userId: Joi.string().custom(objectId).required(), // Vendor ID
    name: Joi.string().required().trim(),
    description: Joi.string().trim(),
    price: Joi.number().min(0).required(),
    image: Joi.string(), // Image URL from Google Cloud Storage
    qrCode: Joi.string(), // QR code URL (auto-generated, but allow in validation)
  }),
};

const getMenuItems = {
  query: Joi.object().keys({
    vendor: Joi.string().custom(objectId),
    sortBy: Joi.string(),
    limit: Joi.number().integer().min(1),
    page: Joi.number().integer().min(1),
  }),
};

const getMenuItem = {
  params: Joi.object().keys({
    menuItemId: Joi.string().custom(objectId),
  }),
};

const getMenuItemsByVendor = {
  params: Joi.object().keys({
    vendorId: Joi.string().custom(objectId),
  }),
  query: Joi.object().keys({
    sortBy: Joi.string(),
    limit: Joi.number().integer().min(1),
    page: Joi.number().integer().min(1),
  }),
};

const updateMenuItem = {
  params: Joi.object().keys({
    menuItemId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string().trim(),
      description: Joi.string().trim(),
      price: Joi.number().min(0),
      image: Joi.string(), // Image URL
      qrCode: Joi.string(), // QR code URL
    })
    .min(1),
};

const deleteMenuItem = {
  params: Joi.object().keys({
    menuItemId: Joi.string().custom(objectId),
  }),
};

module.exports = {
  createMenuItem,
  getMenuItems,
  getMenuItem,
  getMenuItemsByVendor,
  updateMenuItem,
  deleteMenuItem,
};
