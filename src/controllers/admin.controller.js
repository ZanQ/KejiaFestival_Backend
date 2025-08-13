const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { adminService } = require('../services');

const getDashboardStats = catchAsync(async (req, res) => {
  console.log('Admin dashboard stats requested');
  const stats = await adminService.getDashboardStats();
  res.send({ data: stats });
});

const getUsers = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name', 'email', 'type', 'isApproved', 'isSuspended']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  options.sortBy = options.sortBy || 'createdAt:desc';
  
  console.log('Admin users list requested with filter:', filter);
  const result = await adminService.getUsers(filter, options);
  res.send({ data: result });
});

const getVendors = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name', 'email', 'isApproved', 'isSuspended']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  options.sortBy = options.sortBy || 'createdAt:desc';
  
  console.log('Admin vendors list requested with filter:', filter);
  const result = await adminService.getVendors(filter, options);
  res.send({ data: result });
});

const getTransactions = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['status', 'paymentStatus', 'customer', 'vendor']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  options.sortBy = options.sortBy || 'createdAt:desc';
  
  console.log('Admin transactions list requested with filter:', filter);
  const result = await adminService.getTransactions(filter, options);
  res.send({ data: result });
});

const approveVendor = catchAsync(async (req, res) => {
  const { vendorId } = req.params;
  console.log(`Admin approving vendor: ${vendorId}`);
  
  const vendor = await adminService.approveVendor(vendorId);
  
  console.log(`✅ Vendor ${vendorId} approved successfully`);
  res.send({ 
    data: vendor, 
    message: 'Vendor approved successfully' 
  });
});

const suspendUser = catchAsync(async (req, res) => {
  const { userId } = req.params;
  console.log(`Admin suspending user: ${userId}`);
  
  const user = await adminService.suspendUser(userId);
  
  console.log(`✅ User ${userId} suspended successfully`);
  res.send({ 
    data: user, 
    message: 'User suspended successfully' 
  });
});

const unsuspendUser = catchAsync(async (req, res) => {
  const { userId } = req.params;
  console.log(`Admin unsuspending user: ${userId}`);
  
  const user = await adminService.unsuspendUser(userId);
  
  console.log(`✅ User ${userId} unsuspended successfully`);
  res.send({ 
    data: user, 
    message: 'User unsuspended successfully' 
  });
});

const getPlatformFee = catchAsync(async (req, res) => {
  console.log('Admin platform fee requested');
  const fee = await adminService.getPlatformFee();
  res.send({ 
    data: { 
      percentage: fee 
    } 
  });
});

const updatePlatformFee = catchAsync(async (req, res) => {
  const { percentage } = req.body;
  
  if (percentage === undefined || percentage === null) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Percentage is required');
  }
  
  console.log(`Admin updating platform fee to: ${percentage}%`);
  
  const setting = await adminService.updatePlatformFee(percentage);
  
  console.log(`✅ Platform fee updated to ${percentage}%`);
  res.send({ 
    data: { 
      percentage: setting.value 
    }, 
    message: `Platform fee updated to ${percentage}%` 
  });
});

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
