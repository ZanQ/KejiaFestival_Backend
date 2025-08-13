const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { userService } = require('../services');

const createUser = catchAsync(async (req, res) => {
  const user = await userService.createUser(req.body);
  res.status(httpStatus.CREATED).send(user);
});

const getUsers = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name', 'role']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await userService.queryUsers(filter, options);
  res.send(result);
});

const getUser = catchAsync(async (req, res) => {
  const user = await userService.getUserById(req.params.userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  res.send(user);
});

const getProfile = catchAsync(async (req, res) => {

  // Extract token from Authorization header
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'No valid token provided');
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  // Use user service to get user by session token
  const user = await userService.getUserBySessionToken(token);
  
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  
  // When sending the user data back, ensure sensitive information is not included
  user.password = undefined; // Remove password from response
  user.isEmailVerified = undefined; // Remove email verification status from response
  user.coOwners = undefined; // Remove co-owners from response
  user.createdAt = undefined; // Remove createdAt from response
  user.updatedAt = undefined; // Remove updatedAt from responsepe
  user.roles = undefined; // Remove roles from response

  if (user.type === 'customer') {
    user.vendorDashboard = undefined; // Remove vendor details from response
    user.salesHistory = undefined; // Remove sales history from response
    user.totalSales = undefined; // Remove total sales from response
  }
  if (user.type === 'vendor') {
    user.pendingOrders = undefined; // Remove pending orders from response
    user.completedOrders = undefined; // Remove completed orders from response
    user.notifications = undefined; // Remove notifications from response
    user.fundsAddedHistory = undefined; // Remove funds added history from response
    user.scans = undefined; // Remove scans from response
  }

  res.send({ user });
});

const updateUser = catchAsync(async (req, res) => {
  const user = await userService.updateUserById(req.params.userId, req.body);
  res.send(user);
});

const deleteUser = catchAsync(async (req, res) => {
  await userService.deleteUserById(req.params.userId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createUser,
  getUsers,
  getUser,
  getProfile,
  updateUser,
  deleteUser,
};
