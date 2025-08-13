const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { userService, orderService } = require('../services');

const getVendor = catchAsync(async (req, res) => {
  
  const vendor = await userService.getUserById(req.params.vendorId);
  
  if (!vendor) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Vendor not found');
  }

  // When sending the user data back, ensure sensitive information is not included
  vendor.password = undefined; // Remove password from response
  vendor.isEmailVerified = undefined; // Remove email verification status from response
  vendor.coOwners = undefined; // Remove co-owners from response
  vendor.createdAt = undefined; // Remove createdAt from response
  vendor.updatedAt = undefined; // Remove updatedAt from response
  vendor.roles = undefined; // Remove roles from response

  //Get number of completed orders
  const completedOrdersCount = vendor.salesHistory ? vendor.salesHistory.length : 0;

  //Get Revenue generated from orders
  const totalSales = vendor.totalSales || 0;

  //Get Pending orders count
  let pendingOrdersCount = 0;
  if (vendor.salesHistory && vendor.salesHistory.length > 0) {
    // Get all order IDs from salesHistory
    const orderIds = vendor.salesHistory;
    
    // Check each order to see if it has status 'preparing'
    const orderPromises = orderIds.map(orderId => orderService.getOrderById(orderId));
    const orders = await Promise.all(orderPromises);
    
    // Count orders with status 'preparing'
    pendingOrdersCount = orders.filter(order => order && order.status === 'preparing').length;
  }

  //transform vendor object to include these fields
  const transformedVendor = vendor.toObject();

  transformedVendor.soldItems = completedOrdersCount;
  transformedVendor.totalSales = totalSales;
  transformedVendor.pendingOrders = pendingOrdersCount;

  res.send(transformedVendor);
});

module.exports = {
  getVendor,
};
