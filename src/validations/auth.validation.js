const Joi = require('joi');
const { password } = require('./custom.validation');

const register = {
  body: Joi.object().keys({
    email: Joi.string().required().email(),
    username: Joi.string().required().min(3).max(50),
    password: Joi.string().required().custom(password),
    name: Joi.string().required(),
    type: Joi.string().valid('customer', 'vendor').default('customer'),
    vendorCode: Joi.string().optional().length(8).uppercase(),
    coOwners: Joi.boolean().optional().default(false),
  }),
};

const registerDirect = {
  body: Joi.object().keys({
    email: Joi.string().required().email(),
    name: Joi.string().required().min(2).max(100),
    type: Joi.string().valid('customer', 'vendor').default('customer'),
  }),
};

const googleAuth = {
  body: Joi.object().keys({
    token: Joi.string().required(),
    name: Joi.string().required().min(2).max(100),
    email: Joi.string().required().email(),
    firstName: Joi.string().required().min(1).max(50),
    lastName: Joi.string().required().min(1).max(50),
    googleId: Joi.string().required(),
    type: Joi.string().valid('customer', 'vendor').default('customer'),
  }),
};

const login = {
  body: Joi.object().keys({
    email: Joi.string(),
    username: Joi.string(),
    password: Joi.string().required(),
  }).xor('email', 'username'),
};

const logout = {
  body: Joi.object().keys({
    refreshToken: Joi.string().required(),
  }),
};

const refreshTokens = {
  body: Joi.object().keys({
    refreshToken: Joi.string().required(),
  }),
};

const forgotPassword = {
  body: Joi.object().keys({
    email: Joi.string().email().required(),
  }),
};

const resetPassword = {
  query: Joi.object().keys({
    token: Joi.string().required(),
  }),
  body: Joi.object().keys({
    password: Joi.string().required().custom(password),
  }),
};

const verifyEmail = {
  query: Joi.object().keys({
    token: Joi.string().required(),
  }),
};

const completeRegistration = {
  body: Joi.object().keys({
    token: Joi.string().required(),
  }),
};

module.exports = {
  register,
  registerDirect,
  googleAuth,
  login,
  logout,
  refreshTokens,
  forgotPassword,
  resetPassword,
  verifyEmail,
  completeRegistration,
};
