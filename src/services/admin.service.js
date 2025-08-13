const httpStatus = require('http-status');
const { User, Order, FundTransaction, Settings } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Get dashboard statistics
 * @returns {Promise<Object>}
 */
const getDashboardStats = async () => {
  const totalUsers = await User.countDocuments();
  const totalVendors = await User.countDocuments({ type: 'vendor' });
  const totalCustomers = await User.countDocuments({ type: 'customer' });
  const pendingVendors = await User.countDocuments({ type: 'vendor', isApproved: false });
  
  const totalOrders = await Order.countDocuments();
  const pendingOrders = await Order.countDocuments({ status: 'pending' });
  const completedOrders = await Order.countDocuments({ status: 'completed' });
  
  // Calculate total revenue (sum of all completed orders)
  const revenueResult = await Order.aggregate([
    { $group: { _id: null, total: { $sum: '$totalAmount' } } }
  ]);
  const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;
  
  // Calculate platform fees collected
  const platformFeePercentage = await Settings.getPlatformFee();
  const platformFeesCollected = (totalRevenue * platformFeePercentage) / 100;
  
  // Recent activity (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentOrders = await Order.countDocuments({
    createdAt: { $gte: thirtyDaysAgo }
  });
  
  const recentUsers = await User.countDocuments({
    createdAt: { $gte: thirtyDaysAgo }
  });

  return {
    users: {
      total: totalUsers,
      vendors: totalVendors,
      customers: totalCustomers,
      pendingVendors,
      recentUsers
    },
    orders: {
      total: totalOrders,
      pending: pendingOrders,
      completed: completedOrders,
      recentOrders
    },
    finance: {
      totalRevenue,
      platformFeesCollected,
      platformFeePercentage
    }
  };
};

/**
 * Get all users with pagination
 * @param {Object} filter
 * @param {Object} options
 * @returns {Promise<Object>}
 */
const getUsers = async (filter = {}, options = {}) => {
  const users = await User.paginate(filter, {
    ...options,
    select: '-password',
    populate: [
      { path: 'pendingOrders', select: 'status totalAmount createdAt' },
      { path: 'completedOrders', select: 'status totalAmount createdAt' }
    ]
  });

  //Convert users into objects to send back so we can capture the createdAt
  const userObjects = users.results.map((user) => {

    return {
      id: user._id,
      email: user.email,
      name: user.username,
      createdAt: user.createdAt,
      balance: user.balance
    };
  });

  return {
    ...users,
    results: userObjects
  };
};

/**
 * Get all vendors with pagination
 * @param {Object} filter
 * @param {Object} options
 * @returns {Promise<Object>}
 */
const getVendors = async (filter = {}, options = {}) => {
  const vendorFilter = { ...filter, type: 'vendor' };
  const vendors = await User.paginate(vendorFilter, {
    ...options,
    select: '-password'
  });

  //Convert vendors into objects to send back so we can capture the createdAt
  const vendorObjects = await Promise.all(vendors.results.map(async (vendor) => {
    
    //Get total amount from all orders by this vendor by going through salesHistory, obtaining the order ID and summing up totalAmount from the orders object
    const vendorSales = await Order.aggregate([
      { $match: { vendor: vendor._id } },
      { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
    ]);
    
    const totalSales = vendorSales.length > 0 ? vendorSales[0].total : 0;
    const orderCount = vendorSales.length > 0 ? vendorSales[0].count : 0;

    return {
      id: vendor._id,
      email: vendor.email,
      name: vendor.name,
      username: vendor.username,
      createdAt: vendor.createdAt,
      updatedAt: vendor.updatedAt,
      isApproved: vendor.isApproved,
      isSuspended: vendor.isSuspended,
      balance: vendor.balance,
      totalSales: totalSales, // Total amount from all orders
      orderCount: orderCount // Number of orders
    };
  }));

  return {
    ...vendors,
    results: vendorObjects
  };
};

/**
 * Get all transactions with pagination
 * @param {Object} filter
 * @param {Object} options
 * @returns {Promise<Object>}
 */
const getTransactions = async (filter = {}, options = {}) => {
  // Get both orders and fund transactions
  const orders = await Order.paginate(filter, {
    ...options,
    select: '_id totalAmount createdAt status',
    populate: [
      { path: 'customer', select: 'name email username' },
      { path: 'vendor', select: 'name email username' }
    ]
  });
  
  //Convert orders into objects to send back so we can capture the createdAt
  const orderObjects = orders.results.map((order) => {
    return {
      id: order._id,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      status: order.status,
      customer: order.customer,
      vendor: order.vendor
    };
  });

  return {
    ...orders,
    results: orderObjects
  };
};

/**
 * Approve a vendor
 * @param {string} vendorId
 * @returns {Promise<User>}
 */
const approveVendor = async (vendorId) => {
  const vendor = await User.findById(vendorId);
  if (!vendor) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Vendor not found');
  }
  
  if (vendor.type !== 'vendor') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User is not a vendor');
  }
  
  vendor.isApproved = true;
  await vendor.save();
  
  return vendor;
};

/**
 * Suspend a user
 * @param {string} userId
 * @returns {Promise<User>}
 */
const suspendUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  
  user.isSuspended = true;
  await user.save();
  
  return user;
};

/**
 * Unsuspend a user
 * @param {string} userId
 * @returns {Promise<User>}
 */
const unsuspendUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  
  user.isSuspended = false;
  await user.save();
  
  return user;
};

/**
 * Get platform fee
 * @returns {Promise<number>}
 */
const getPlatformFee = async () => {
  return await Settings.getPlatformFee();
};

/**
 * Update platform fee
 * @param {number} percentage
 * @returns {Promise<Settings>}
 */
const updatePlatformFee = async (percentage) => {
  if (percentage < 0 || percentage > 100) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Platform fee must be between 0 and 100 percent');
  }
  
  return await Settings.setPlatformFee(percentage);
};

module.exports = {
  getDashboardStats,
  getUsers,
  getVendors,
  getTransactions,
  approveVendor,
  suspendUser,
  unsuspendUser,
  getPlatformFee,
  updatePlatformFee,
};
