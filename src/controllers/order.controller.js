const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const orderService = require('../services/order.service');

 const { Order } = require('../models');

const createOrder = catchAsync(async (req, res) => {
  console.log('Creating order with data:', req.body);
  
  // Validate required fields
  const { vendorId, userId, quantity } = req.body;
  
  if (!vendorId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Missing required field: vendorId');
  }
  if (!userId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Missing required field: userId');
  }
  if (!quantity) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Missing required field: quantity');
  }

  const order = await orderService.createOrder(req.body);
  
  // Handle balance updates
  try {
    const { userService } = require('../services');
    const customer = await userService.getUserById(userId);
    const vendor = await userService.getUserById(vendorId);
    
    if (!customer || !vendor) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Customer or vendor not found');
    }

    console.log(`Before balance update - Customer balance: ${customer.balance}, Vendor balance: ${vendor.balance}`);

    // Deduct amount from customer balance
    try {
      await customer.deductFunds(order.totalAmount);
      console.log(`✅ Customer balance deducted successfully`);
    } catch (customerError) {
      console.error(`❌ Customer balance deduction failed:`, customerError.message);
      throw customerError;
    }
    
    // Add amount to vendor balance
    try {
      await vendor.addFunds(order.totalAmount);
      console.log(`✅ Vendor balance added successfully`);
    } catch (vendorError) {
      console.error(`❌ Vendor balance addition failed:`, vendorError.message);
      throw vendorError;
    }

    // Refresh user data to get updated balances
    const updatedCustomer = await userService.getUserById(userId);
    const updatedVendor = await userService.getUserById(vendorId);
    console.log(`After balance update - Customer balance: ${updatedCustomer.balance}, Vendor balance: ${updatedVendor.balance}`);

    // Calculate queue position - count orders ahead of this one for the same vendor
    // with status pending, confirmed, or preparing
   
    const ordersAhead = await Order.countDocuments({
      vendor: vendorId,
      status: { $in: ['pending', 'confirmed', 'preparing'] },
      createdAt: { $lt: order.createdAt }
    });

    // Add queue position to response
    const orderWithQueue = {
      ...order.toObject(),
      queuePosition: ordersAhead + 1 // Current order position (1-based)
    };

    // Notify vendor of new order via socket
    try {
      const { socketService } = require('../services');
      
      console.log(`🔔 Preparing to notify vendor ${vendorId} of new order`);
      
      // Prepare order data for vendor notification
      const vendorNotificationData = {
        orderId: order._id.toString(),
        customerId: customer._id.toString(),
        customerName: customer.name,
        customerUsername: customer.username, // Add username for debugging
        items: [{
          name: order.items[0].name,
          quantity: order.items[0].quantity,
          unitPrice: order.items[0].price,
          totalPrice: order.items[0].totalPrice
        }],
        totalPrice: order.totalAmount,
      };

      console.log(`📦 Vendor notification data:`, JSON.stringify(vendorNotificationData, null, 2));

      socketService.emitNewOrderToVendor(vendorId, vendorNotificationData);
      console.log(`✅ Vendor ${vendorId} notified of new order ${order._id}`);
      
    } catch (socketError) {
      console.error('❌ Failed to notify vendor via socket:', socketError.message);
      console.error('Socket error stack:', socketError.stack);
      // Don't fail the order creation if socket notification fails
    }

    console.log(`Order created. Queue position: ${ordersAhead + 1}, Customer balance updated: -$${order.totalAmount}, Vendor balance updated: +$${order.totalAmount}`);
    
    // Add sales amount to vendor's total sales as well as sales history
    try {
      vendor.totalSales = (vendor.totalSales || 0) + order.totalAmount;

      vendor.salesHistory = vendor.salesHistory || [];
      vendor.salesHistory.push(order._id);

      await vendor.save();
      console.log(`✅ Vendor total sales updated successfully`);
    } catch (salesError) {
      console.error(`❌ Vendor total sales update failed:`, salesError.message);
      // Don't fail the order creation if sales update fails
    }

    // Add order to customer's pending orders
    try {
      customer.pendingOrders = customer.pendingOrders || [];
      customer.pendingOrders.push(order._id);
      await customer.save();
      console.log(`✅ Order added to customer's pending orders`);
    } catch (pendingError) {
      console.error(`❌ Adding order to customer's pending orders failed:`, pendingError.message);
      // Don't fail the order creation if this fails
    }
    res.status(httpStatus.OK).send({ 
      data: orderWithQueue,
      message: `Order created successfully. You are #${ordersAhead + 1} in queue.`
    });

  } catch (balanceError) {
    // If balance update fails, we should probably cancel/rollback the order
    console.error('Balance update failed:', balanceError.message);
    
    // For now, return the order but with a warning
    res.status(httpStatus.CREATED).send({ 
      data: order,
      warning: `Order created but balance update failed: ${balanceError.message}`
    });
  }
});

const getOrders = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['customer', 'vendor', 'status', 'paymentStatus']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await orderService.queryOrders(filter, options);
  res.send({ data: result });
});

const getOrder = catchAsync(async (req, res) => {
  const order = await orderService.getOrderById(req.params.orderId);
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  }
  res.send({ data: order });
});

const getOrdersByCustomer = catchAsync(async (req, res) => {
  const orders = await orderService.getOrdersByCustomer(req.params.customerId);
  res.send({ data: orders });
});

const getOrdersByVendor = catchAsync(async (req, res) => {
  const orders = await orderService.getOrdersByVendor(req.params.vendorId);
  res.send({ data: orders });
});

const updateOrder = catchAsync(async (req, res) => {
  const order = await orderService.updateOrderById(req.params.orderId, req.body);
  res.send({ data: order });
});

const updateOrderStatus = catchAsync(async (req, res) => {
  const { status } = req.body;
  if (!status) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Status is required');
  }
  
  const order = await orderService.updateOrderStatus(req.params.orderId, status);
  
  // Optionally notify customer of status change via socket
  try {
    const { socketService } = require('../services');
    
    // Get order details for notification
    const updatedOrder = await orderService.getOrderById(req.params.orderId);
    
    if (updatedOrder && updatedOrder.customer) {
      const customerId = updatedOrder.customer._id || updatedOrder.customer.id || updatedOrder.customer;
      const itemName = updatedOrder.items && updatedOrder.items[0] ? updatedOrder.items[0].name : 'Order';
      
      console.log(`🔔 Notifying customer ${customerId} of order status update: ${status}`);
      
      // Use the socketService instance to access the socketController
      socketService.socketController.emitOrderStatusUpdate(customerId, req.params.orderId, status, itemName);
      
      console.log(`📱 Status update notification sent to customer ${customerId}: ${status}`);
    }
  } catch (socketError) {
    console.error('❌ Failed to send status update notification:', socketError.message);
    // Don't fail the status update if socket notification fails
  }
  
  res.send({ data: order });
});

const cancelOrder = catchAsync(async (req, res) => {
  const order = await orderService.cancelOrder(req.params.orderId);
  res.send({ data: order });
});

const completeOrder = catchAsync(async (req, res) => {
  const order = await orderService.completeOrder(req.params.orderId);

  // Notify customer of order completion via socket 
  try {
        const { socketService } = require('../services');
        
        // Get order details for notification
        const updatedOrder = await orderService.getOrderById(req.params.orderId);
        
        if (updatedOrder && updatedOrder.customer) {
        const customerId = updatedOrder.customer._id || updatedOrder.customer.id || updatedOrder.customer;
        const itemName = updatedOrder.items && updatedOrder.items[0] ? updatedOrder.items[0].name : 'Order';
        
        console.log(`🔔 Notifying customer ${customerId} of order completion`);
        
        // Use the socketService instance to access the socketController
        socketService.socketController.emitOrderCompletion(customerId, req.params.orderId, itemName);
        
        console.log(`📱 Order completion notification sent to customer ${customerId}`);
        }
  } catch (socketError) {
        console.error('❌ Failed to send order completion notification:', socketError.message);
        // Don't fail the completion if socket notification fails
  }
  res.send({ data: order });
});

module.exports = {
  createOrder,
  getOrders,
  getOrder,
  getOrdersByCustomer,
  getOrdersByVendor,
  updateOrder,
  updateOrderStatus,
  cancelOrder,
  completeOrder,
};
