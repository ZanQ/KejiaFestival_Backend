const httpStatus = require('http-status');
const { Order, MenuItem } = require('../models');
const ApiError = require('../utils/ApiError');
const userService = require('./user.service');
const menuItemService = require('./menuItem.service');
const { create } = require('handlebars');

const { User } = require('../models');

/**
 * Create an order
 * @param {Object} orderBody
 * @returns {Promise<Order>}
 */
const createOrder = async (orderBody) => {
  const { vendorId, itemId, userId, quantity, item } = orderBody;

  // Validate vendor exists
  const vendor = await userService.getUserById(vendorId);
  if (!vendor) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Vendor not found');
  }

  // Validate customer exists
  const customer = await userService.getUserById(userId);
  if (!customer) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Customer not found');
  }

  let orderItem;
  
  if (itemId) {
    // If specific menu item ID is provided, get menu item details
    const menuItem = await menuItemService.getMenuItemById(itemId);
    if (!menuItem) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Menu item not found');
    }

    // Verify the menu item belongs to the specified vendor
    if (menuItem.vendor._id.toString() !== vendorId) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Menu item does not belong to the specified vendor');
    }

    orderItem = {
      name: menuItem.name,
      description: menuItem.description || '',
      quantity: quantity,
      price: menuItem.price,
      totalPrice: menuItem.price * quantity,
      menuItemId: itemId // Add reference to menu item
    };
  } else if (item) {
    // If no specific menu item ID, use provided item details
    orderItem = {
      name: item.name || item,
      description: item.description || '',
      quantity: quantity,
      price: item.price || 0,
      totalPrice: (item.price || 0) * quantity,
    };
  } else {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Either itemId or item details must be provided');
  }

  // Create the order
  const order = await Order.create({
    customer: userId,
    vendor: vendorId,
    items: [orderItem],
    totalAmount: orderItem.totalPrice,
    status: 'preparing',
    paymentStatus: 'paid',
  });

  // Populate customer and vendor details
  await order.populate([
    { path: 'customer', select: 'name email username' },
    { path: 'vendor', select: 'name email username' }
  ]);

  return order;
};

/**
 * Query for orders
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const queryOrders = async (filter, options) => {
  const orders = await Order.paginate(filter, {
    ...options,
    populate: [
      { path: 'customer', select: 'name email username' },
      { path: 'vendor', select: 'name email username' }
    ]
  });
  return orders;
};

/**
 * Get order by id
 * @param {ObjectId} id
 * @returns {Promise<Order>}
 */
const getOrderById = async (id) => {
  const order = await Order.findById(id).populate([
    { path: 'customer', select: 'name email username' },
    { path: 'vendor', select: 'name email username' }
  ]);
  return order;
};

/**
 * Get orders by customer
 * @param {ObjectId} customerId
 * @returns {Promise<Order[]>}
 */
const getOrdersByCustomer = async (customerId) => {
  const orders = await Order.find({ customer: customerId })
    .populate([
      { path: 'vendor', select: 'name email username' }
    ])
    .sort({ createdAt: -1 });

  // Refactor to return only necessary fields and different format 
  const formattedOrders = await Promise.all(orders.map(async order => {
    // Get the first item from the items array if it exists
    const firstItem = order.items && order.items.length > 0 ? order.items[0] : {};
    
    // Look for vendor name in order or fallback to first item
    const vendor = await userService.getUserById(order.vendor);

    // Find Queue position based by determine how many orders of this exact item are ahead and marked as 'preparing' from all orders, not just this customer
    const ordersAhead = await Order.countDocuments({
        'items.name': firstItem.name,  // Same item name
        status: 'preparing',           // Only preparing orders
        createdAt: { $lt: order.createdAt }  // Created before this order
    });
    
    return {
      id: order.id || order._id,
      vendor: vendor.username || 'Unknown Vendor',
      item: firstItem.name,
      status: order.status || 'preparing',
      queuePosition: ordersAhead + 1,
      price: order.totalAmount,
      quantity: firstItem.quantity || 1,
    };
  }));
  
  return formattedOrders;
};

/**
 * Get orders by vendor
 * @param {ObjectId} vendorId
 * @returns {Promise<Order[]>}
 */
const getOrdersByVendor = async (vendorId) => {
  const orders = await Order.find({ vendor: vendorId })
    .populate([
      { path: 'customer', select: 'name email username' }
    ])
    .sort({ createdAt: -1 });

  // Change into object to send back
  const formattedOrders = await Promise.all(orders.map(async order => {
    const firstItem = order.items && order.items.length > 0 ? order.items[0] : {};
    
    //Lookup Customer name
    const vendor = await User.findById(order.vendor);

    return {
      id: order._id,
      customer: order.customer.name,
      vendor: vendor.username,
      item: firstItem.name,
      status: order.status,
      totalAmount: order.totalAmount,
      quantity: firstItem.quantity,
      createdAt: order.createdAt
    };
  }));

  return formattedOrders;
};

/**
 * Update order by id
 * @param {ObjectId} orderId
 * @param {Object} updateBody
 * @returns {Promise<Order>}
 */
const updateOrderById = async (orderId, updateBody) => {
  const order = await getOrderById(orderId);
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  }
  
  Object.assign(order, updateBody);
  await order.save();
  return order;
};

/**
 * Update order status
 * @param {ObjectId} orderId
 * @param {string} status
 * @returns {Promise<Order>}
 */
const updateOrderStatus = async (orderId, status) => {
  const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid order status');
  }

  return updateOrderById(orderId, { status });
};

/**
 * Cancel order
 * @param {ObjectId} orderId
 * @returns {Promise<Order>}
 */
const cancelOrder = async (orderId) => {
  return updateOrderStatus(orderId, 'cancelled');
};

/**
 * Complete order
 * @param {ObjectId} orderId
 * @returns {Promise<Order>}
 */
const completeOrder = async (orderId) => {
  const order = await getOrderById(orderId);
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  }

  await order.markAsHandedOff();
  return order;
};

module.exports = {
  createOrder,
  queryOrders,
  getOrderById,
  getOrdersByCustomer,
  getOrdersByVendor,
  updateOrderById,
  updateOrderStatus,
  cancelOrder,
  completeOrder,
};
