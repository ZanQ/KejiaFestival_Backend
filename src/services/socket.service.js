const SocketController = require('../controllers/socket.controller');
const logger = require('../config/logger');

/**
 * Socket service for integrating WebSocket events with business logic
 */
class SocketService {
  constructor() {
    this.socketController = null;
    this.isInitialized = false;
  }

  /**
   * Initialize socket service with Socket.IO instance
   */
  initialize(io) {
    if (this.isInitialized) {
      logger.warn('SocketService already initialized');
      return;
    }

    this.socketController = new SocketController(io);
    this.isInitialized = true;
    logger.info('SocketService initialized successfully');
  }

  /**
   * Check if service is initialized
   */
  ensureInitialized() {
    if (!this.isInitialized || !this.socketController) {
      throw new Error('SocketService not initialized. Call initialize(io) first.');
    }
  }

  /**
   * Emit balance update to specific user
   * Call this when user balance changes (payments, transactions, etc.)
   */
  emitBalanceUpdate(userId, balanceData) {
    try {
      this.ensureInitialized();
      
      const payload = {
        newBalance: balanceData.newBalance,
        oldBalance: balanceData.oldBalance || balanceData.newBalance,
        amount: balanceData.amount || 0,
        reason: balanceData.reason || 'Balance update'
      };

      this.socketController.emitBalanceUpdate(userId, payload);
      logger.info(`Balance update emitted for user ${userId}: ${payload.newBalance}`);
      
    } catch (error) {
      logger.error('Error emitting balance update:', error);
    }
  }

  /**
   * Emit payment completion notification
   * Call this when Zeffy payment webhooks are received
   */
  emitPaymentCompleted(userId, paymentData) {
    try {
      this.ensureInitialized();

      const payload = {
        amount: paymentData.amount,
        newBalance: paymentData.newBalance,
        paymentMethod: paymentData.paymentMethod || 'zeffy',
        transactionId: paymentData.transactionId || `txn_${Date.now()}`
      };

      this.socketController.emitPaymentCompleted(userId, payload);
      logger.info(`Payment completion emitted for user ${userId}: $${payload.amount}`);

    } catch (error) {
      logger.error('Error emitting payment completion:', error);
    }
  }

  /**
   * Emit order status change
   * Call this when vendors update order status or when orders are created
   */
  async emitOrderStatusChange(orderId, statusData) {
    try {
      this.ensureInitialized();

      const payload = {
        orderId,
        status: statusData.status,
        estimatedTime: statusData.estimatedTime,
        itemName: statusData.itemName,
        userId: statusData.userId,
        vendorId: statusData.vendorId,
        message: statusData.message
      };

      await this.socketController.handleOrderStatusUpdate(
        { userId: statusData.vendorId }, // Mock socket object
        payload
      );

      logger.info(`Order status change emitted for order ${orderId}: ${payload.status}`);

    } catch (error) {
      logger.error('Error emitting order status change:', error);
    }
  }

  /**
   * Emit general notification to user
   * Call this for any user-specific notifications
   */
  emitNotification(userId, notification) {
    try {
      this.ensureInitialized();

      const payload = {
        message: notification.message,
        type: notification.type || 'info',
        orderId: notification.orderId,
        data: notification.data
      };

      this.socketController.emitNotification(userId, payload);
      logger.info(`Notification emitted to user ${userId}: ${payload.message}`);

    } catch (error) {
      logger.error('Error emitting notification:', error);
    }
  }

  /**
   * Emit order ready notification
   * Call this when vendor marks order as ready for pickup
   */
  emitOrderReady(orderId, orderData) {
    try {
      this.ensureInitialized();

      // Emit to order room
      this.socketController.io.to(`order-${orderId}`).emit('order-ready', {
        orderId,
        itemName: orderData.itemName,
        vendorId: orderData.vendorId,
        vendorName: orderData.vendorName,
        message: `Your ${orderData.itemName} is ready for pickup!`,
        timestamp: new Date()
      });

      // Also send as notification
      this.emitNotification(orderData.userId, {
        message: `🎉 Your ${orderData.itemName} is ready! Please come to ${orderData.vendorName} to pick it up.`,
        type: 'order-ready',
        orderId,
        data: {
          vendorId: orderData.vendorId,
          vendorName: orderData.vendorName,
          itemName: orderData.itemName
        }
      });

      logger.info(`Order ready notification sent for order ${orderId}`);

    } catch (error) {
      logger.error('Error emitting order ready notification:', error);
    }
  }

  /**
   * Emit new order notification to vendor
   * Call this when customer creates a new order
   */
  emitNewOrderToVendor(vendorId, orderData) {
    try {
      this.ensureInitialized();

      logger.info(`🔔 Attempting to notify vendor ${vendorId} of new order ${orderData.orderId}`);

      const notification = {
        eventType: 'new-order',
        orderId: orderData.orderId,
        customer: {
          id: orderData.customerId,
          name: orderData.customerName,
          username: orderData.customerUsername
        },
        orderDetails: {
          items: orderData.items,
          totalPrice: orderData.totalPrice,
        },
        timestamp: new Date(),
        message: `New order from ${orderData.customerName}`
      };

      logger.info(`📦 Notification payload:`, JSON.stringify(notification, null, 2));

      // Check if vendor is connected
      const isVendorConnected = this.socketController.connectedUsers.has(vendorId);
      logger.info(`🔗 Vendor ${vendorId} connection status: ${isVendorConnected ? 'CONNECTED' : 'NOT CONNECTED'}`);
      
      if (isVendorConnected) {
        const socketId = this.socketController.connectedUsers.get(vendorId);
        logger.info(`📡 Vendor socket ID: ${socketId}`);
      }

      // Send to vendor's user room
      const vendorRoom = `user-${vendorId}`;
      logger.info(`📢 Emitting to room: ${vendorRoom}`);
      this.socketController.io.to(vendorRoom).emit('new-order-notification', notification);

      // Also send to vendor dashboard room if they're monitoring it
      const dashboardRoom = `vendor-dashboard-${vendorId}`;
      logger.info(`📊 Emitting to dashboard room: ${dashboardRoom}`);
      this.socketController.io.to(dashboardRoom).emit('dashboard-update', {
        type: 'new-order',
        data: notification
      });

      logger.info(`✅ New order notification sent to vendor ${vendorId} for order ${orderData.orderId}`);

    } catch (error) {
      logger.error('❌ Error emitting new order to vendor:', error);
      logger.error('Error stack:', error.stack);
    }
  }

  /**
   * Emit transaction notification for admin monitoring
   * Call this for all transactions for admin oversight
   */
  emitTransactionForAdmin(transactionData) {
    try {
      this.ensureInitialized();

      this.socketController.io.to('admin-monitoring').emit('new-transaction', {
        transactionId: transactionData.id,
        userId: transactionData.userId,
        vendorId: transactionData.vendorId,
        amount: transactionData.amount,
        platformFee: transactionData.platformFee,
        type: transactionData.type,
        timestamp: new Date()
      });

      logger.info(`Transaction ${transactionData.id} sent to admin monitoring`);

    } catch (error) {
      logger.error('Error emitting transaction for admin:', error);
    }
  }

  /**
   * Broadcast system announcement to all users
   * Call this for festival-wide announcements
   */
  broadcastAnnouncement(announcement) {
    try {
      this.ensureInitialized();

      this.socketController.io.emit('system-announcement', {
        message: announcement.message,
        type: announcement.type || 'announcement',
        title: announcement.title,
        priority: announcement.priority || 'normal',
        timestamp: new Date()
      });

      logger.info(`System announcement broadcast: ${announcement.message}`);

    } catch (error) {
      logger.error('Error broadcasting announcement:', error);
    }
  }

  /**
   * Get connection statistics
   */
  getConnectionStats() {
    try {
      this.ensureInitialized();
      return this.socketController.getConnectionInfo();
    } catch (error) {
      logger.error('Error getting connection stats:', error);
      return { connectedUsers: 0, userConnections: [] };
    }
  }

  /**
   * Check if user has existing socket connections
   * @param {string} userId - User ID to check
   * @returns {boolean} True if user has existing connections
   */
  hasExistingConnection(userId) {
    try {
      this.ensureInitialized();
      return this.socketController.hasExistingConnection(userId);
    } catch (error) {
      logger.error('Error checking existing connection for user:', userId, error);
      return false;
    }
  }

  /**
   * Disconnect existing connections for a user
   * @param {string} userId - User ID to disconnect
   * @param {string} reason - Reason for disconnection
   */
  disconnectExistingConnections(userId, reason = 'New session started') {
    try {
      this.ensureInitialized();
      this.socketController.disconnectExistingConnections(userId, reason);
    } catch (error) {
      logger.error('Error disconnecting existing connections for user:', userId, error);
    }
  }

  /**
   * Disconnect specific user
   * Useful for admin actions or security purposes
   */
  disconnectUser(userId, reason = 'Administrative action') {
    try {
      this.ensureInitialized();

      const socketId = this.socketController.connectedUsers.get(userId);
      if (socketId) {
        const socket = this.socketController.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit('force-disconnect', { reason });
          socket.disconnect(true);
          logger.info(`User ${userId} forcibly disconnected: ${reason}`);
        }
      }
    } catch (error) {
      logger.error('Error disconnecting user:', error);
    }
  }

}

// Create singleton instance
const socketService = new SocketService();

module.exports = socketService;
