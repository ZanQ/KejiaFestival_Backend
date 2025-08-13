const Joi = require('joi');
const { password, objectId } = require('./custom.validation');

const createUser = {
  body: Joi.object().keys({
    email: Joi.string().required().email(),
    username: Joi.string().required().min(3).max(50),
    password: Joi.string().required().custom(password),
    name: Joi.string().required(),
    type: Joi.string().required().valid('customer', 'vendor', 'admin'),
    role: Joi.string().required().valid('customer', 'vendor', 'admin'),
  }),
};

const getUsers = {
  query: Joi.object().keys({
    name: Joi.string(),
    username: Joi.string(),
    type: Joi.string().valid('customer', 'vendor', 'admin'),
    role: Joi.string().valid('customer', 'vendor', 'admin'),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getUser = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
  }),
};

const updateUser = {
  params: Joi.object().keys({
    userId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      email: Joi.string().email(),
      username: Joi.string().min(3).max(50),
      password: Joi.string().custom(password),
      name: Joi.string(),
      type: Joi.string().valid('customer', 'vendor', 'admin'),
    })
    .min(1),
};

const deleteUser = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
  }),
};

module.exports = {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
};
