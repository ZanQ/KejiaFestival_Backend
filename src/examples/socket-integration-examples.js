/**
 * Integration examples showing how to emit socket events from your existing services
 * Copy these examples into your actual service files where appropriate
 */

const { socketService } = require('./services');

// ========================================
// USER SERVICE INTEGRATION EXAMPLES
// ========================================

/**
 * Example: Add funds to user account (Zeffy webhook integration)
 * Add this to your user.service.js in the addFunds method
 */
const addFundsWithSocketNotification = async (userId, amount, paymentData) => {
  try {
    // Update user balance in database
    const user = await getUserById(userId);
    const oldBalance = user.balance;
    const newBalance = oldBalance + amount;
    
    // Update user in database
    await updateUserById(userId, { balance: newBalance });
    
    // Emit real-time balance update
    socketService.emitBalanceUpdate(userId, {
      newBalance,
      oldBalance,
      amount,
      reason: 'Funds added via Zeffy'
    });

    // Emit payment completion notification
    socketService.emitPaymentCompleted(userId, {
      amount,
      newBalance,
      paymentMethod: 'zeffy',
      transactionId: paymentData.transactionId
    });

    // Send success notification
    socketService.emitNotification(userId, {
      message: `Successfully added $${amount} to your account!`,
      type: 'success',
      data: { amount, newBalance }
    });

    return { user: { ...user.toObject(), balance: newBalance }, newBalance };
    
  } catch (error) {
    // Send error notification
    socketService.emitNotification(userId, {
      message: 'Failed to add funds to your account. Please try again.',
      type: 'error'
    });
    throw error;
  }
};

/**
 * Example: Process payment/purchase
 * Add this to your user.service.js or create a transaction.service.js
 */
const processPaymentWithSocketNotification = async (userId, vendorId, amount, orderData) => {
  try {
    // Calculate platform fee (15%)
    const platformFee = amount * 0.15;
    const vendorAmount = amount - platformFee;
    
    // Update customer balance
    const customer = await getUserById(userId);
    const newCustomerBalance = customer.balance - amount;
    await updateUserById(userId, { balance: newCustomerBalance });

    // Update vendor balance
    const vendor = await getUserById(vendorId);
    const newVendorBalance = vendor.balance + vendorAmount;
    await updateUserById(vendorId, { balance: newVendorBalance });

    // Emit balance updates to both users
    socketService.emitBalanceUpdate(userId, {
      newBalance: newCustomerBalance,
      oldBalance: customer.balance,
      amount: -amount,
      reason: `Payment for ${orderData.itemName}`
    });

    socketService.emitBalanceUpdate(vendorId, {
      newBalance: newVendorBalance,
      oldBalance: vendor.balance,
      amount: vendorAmount,
      reason: `Sale: ${orderData.itemName} (after 15% platform fee)`
    });

    // Create order and emit notifications
    const orderId = generateOrderId();
    
    // Notify customer
    socketService.emitNotification(userId, {
      message: `Payment successful! Your ${orderData.itemName} is being prepared.`,
      type: 'success',
      orderId,
      data: orderData
    });

    // Notify vendor of new order
    socketService.emitNewOrderToVendor(vendorId, {
      orderId,
      userId,
      customerName: customer.name,
      item: orderData.itemName,
      price: amount,
      specialInstructions: orderData.specialInstructions
    });

    return { orderId, customerBalance: newCustomerBalance, vendorBalance: newVendorBalance };
    
  } catch (error) {
    socketService.emitNotification(userId, {
      message: 'Payment failed. Please try again.',
      type: 'error'
    });
    throw error;
  }
};

// ========================================
// ORDER SERVICE INTEGRATION EXAMPLES
// ========================================

/**
 * Example: Update order status (for vendors)
 * Add this to your order.service.js or vendor.service.js
 */
const updateOrderStatusWithNotification = async (orderId, status, vendorId, estimatedTime = null) => {
  try {
    // Update order in database
    const order = await getOrderById(orderId);
    await updateOrderById(orderId, { 
      status, 
      estimatedTime,
      updatedAt: new Date()
    });

    // Emit order status change
    await socketService.emitOrderStatusChange(orderId, {
      status,
      estimatedTime,
      itemName: order.itemName,
      userId: order.userId,
      vendorId,
      message: `Your ${order.itemName} is now ${status}!`
    });

    // If order is ready, send special notification
    if (status === 'ready') {
      const vendor = await getUserById(vendorId);
      socketService.emitOrderReady(orderId, {
        itemName: order.itemName,
        vendorId,
        vendorName: vendor.businessName || vendor.name,
        userId: order.userId
      });
    }

    return order;
    
  } catch (error) {
    throw error;
  }
};

/**
 * Example: Create new order
 * Add this to your order.service.js
 */
const createOrderWithNotification = async (orderData) => {
  try {
    // Create order in database
    const order = await createOrder(orderData);
    
    // Emit to vendor
    socketService.emitNewOrderToVendor(orderData.vendorId, {
      orderId: order.id,
      userId: orderData.userId,
      customerName: orderData.customerName,
      item: orderData.itemName,
      price: orderData.price,
      specialInstructions: orderData.specialInstructions
    });

    // Emit confirmation to customer
    socketService.emitNotification(orderData.userId, {
      message: `Order placed successfully! Estimated wait time: ${orderData.estimatedTime} minutes.`,
      type: 'success',
      orderId: order.id,
      data: {
        itemName: orderData.itemName,
        estimatedTime: orderData.estimatedTime
      }
    });

    return order;
    
  } catch (error) {
    socketService.emitNotification(orderData.userId, {
      message: 'Failed to place order. Please try again.',
      type: 'error'
    });
    throw error;
  }
};

// ========================================
// WEBHOOK INTEGRATION EXAMPLES
// ========================================

/**
 * Example: Zeffy payment webhook handler
 * Add this to your webhook routes or payment controller
 */
const handleZeffyWebhook = async (webhookData) => {
  try {
    const { userId, amount, transactionId, status } = webhookData;
    
    if (status === 'completed') {
      // Add funds to user account
      await addFundsWithSocketNotification(userId, amount, {
        transactionId,
        paymentMethod: 'zeffy'
      });

      console.log(`Zeffy payment completed: $${amount} added to user ${userId}`);
    } else if (status === 'failed') {
      // Notify user of failed payment
      socketService.emitNotification(userId, {
        message: 'Payment failed. Please try again or contact support.',
        type: 'error',
        data: { transactionId, amount }
      });
    }
    
  } catch (error) {
    console.error('Zeffy webhook error:', error);
  }
};

// ========================================
// ADMIN SERVICE INTEGRATION EXAMPLES
// ========================================

/**
 * Example: Admin dashboard real-time updates
 * Add this to your admin.service.js
 */
const emitAdminUpdate = (updateType, data) => {
  try {
    // Emit transaction data for admin monitoring
    if (updateType === 'transaction') {
      socketService.emitTransactionForAdmin({
        id: data.transactionId,
        userId: data.userId,
        vendorId: data.vendorId,
        amount: data.amount,
        platformFee: data.platformFee,
        type: data.type
      });
    }

    // Broadcast system announcements
    if (updateType === 'announcement') {
      socketService.broadcastAnnouncement({
        message: data.message,
        type: data.type,
        title: data.title,
        priority: data.priority
      });
    }
    
  } catch (error) {
    console.error('Admin update error:', error);
  }
};

// ========================================
// ROUTE INTEGRATION EXAMPLES
// ========================================

/**
 * Example: Route for vendors to update order status
 * Add this to your routes/v1/vendor.route.js or similar
 */
const updateOrderStatusRoute = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, estimatedTime } = req.body;
    const vendorId = req.user.id; // From JWT authentication

    const updatedOrder = await updateOrderStatusWithNotification(
      orderId, 
      status, 
      vendorId, 
      estimatedTime
    );

    res.status(200).json({
      success: true,
      order: updatedOrder,
      message: 'Order status updated successfully'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update order status'
    });
  }
};

/**
 * Example: Route for processing QR code payments
 * Add this to your routes/v1/payment.route.js or similar
 */
const processQRPaymentRoute = async (req, res) => {
  try {
    const { vendorId, amount, itemName, specialInstructions } = req.body;
    const userId = req.user.id; // From JWT authentication

    const result = await processPaymentWithSocketNotification(userId, vendorId, amount, {
      itemName,
      specialInstructions
    });

    res.status(200).json({
      success: true,
      orderId: result.orderId,
      newBalance: result.customerBalance,
      message: 'Payment processed successfully'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Payment processing failed'
    });
  }
};

module.exports = {
  addFundsWithSocketNotification,
  processPaymentWithSocketNotification,
  updateOrderStatusWithNotification,
  createOrderWithNotification,
  handleZeffyWebhook,
  emitAdminUpdate,
  updateOrderStatusRoute,
  processQRPaymentRoute
};
