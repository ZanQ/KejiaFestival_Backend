const Joi = require('joi');
const { objectId } = require('./custom.validation');

const getVendorCodes = {
  query: Joi.object().keys({
    isUsed: Joi.boolean(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getVendorCode = {
  params: Joi.object().keys({
    vendorCodeId: Joi.string().custom(objectId),
  }),
};

const checkVendorCode = {
  params: Joi.object().keys({
    code: Joi.string().required().length(8).uppercase(),
  }),
};

const deleteVendorCode = {
  params: Joi.object().keys({
    vendorCodeId: Joi.string().custom(objectId),
  }),
};

module.exports = {
  getVendorCodes,
  getVendorCode,
  checkVendorCode,
  deleteVendorCode,
};
