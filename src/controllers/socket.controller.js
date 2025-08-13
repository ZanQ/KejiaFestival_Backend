const httpStatus = require('http-status');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { userService } = require('../services');
const logger = require('../config/logger');

/**
 * Socket.IO controller for handling real-time events
 */
class SocketController {
  constructor(io) {
    this.io = io;
    this.connectedUsers = new Map(); // Track connected users
    this.setupSocketHandlers();
  }

  /**
   * Setup main socket connection handlers
   */
  setupSocketHandlers() {
    this.io.on('connection', async (socket) => {
      try {
        await this.handleConnection(socket);
      } catch (error) {
        logger.error('Socket connection error:', error);
        socket.emit('error', { message: 'Authentication failed' });
        socket.disconnect();
      }
    });
  }

  /**
   * Handle new socket connection
   */
  async handleConnection(socket) {
    // Authenticate user
    const { token, userId } = socket.handshake.auth;
    
    if (!token) {
      throw new Error('No authentication token provided');
    }

    // Verify JWT token
    const decoded = jwt.verify(token, config.jwt.secret);
    const user = await userService.getUserById(decoded.sub);
    
    if (!user) {
      throw new Error('User not found');
    }

    // Check if user already has an active connection
    const existingSocketId = this.connectedUsers.get(user.id);
    if (existingSocketId && existingSocketId !== socket.id) {
      const existingSocket = this.io.sockets.sockets.get(existingSocketId);
      if (existingSocket && existingSocket.connected) {
        // Notify the existing connection about the new login
        existingSocket.emit('session-replaced', {
          message: 'Your session has been replaced by a new login',
          timestamp: new Date()
        });
        
        // Disconnect the existing socket
        existingSocket.disconnect(true);
        logger.info(`Disconnected existing connection for user ${user.id}: ${existingSocketId}`);
      }
    }

    // Store user connection info
    socket.userId = user.id;
    socket.userType = user.type || user.accountType;
    this.connectedUsers.set(user.id, socket.id);

    // Auto-join user-specific room
    await socket.join(`user-${user.id}`);
    
    // If user is a vendor, also join vendor-specific rooms
    if (user.type === 'vendor' || user.accountType === 'vendor') {
      await socket.join(`vendor-dashboard-${user.id}`);
      logger.info(`Vendor ${user.id} joined vendor dashboard room`);
    }
    
    logger.info(`User ${user.id} (${socket.userType}) connected with socket ${socket.id}`);

    // Setup event handlers for this socket
    this.setupUserEventHandlers(socket);

    // Send connection confirmation
    socket.emit('connected', {
      userId: user.id,
      userType: socket.userType,
      message: 'Successfully connected to real-time updates'
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      this.handleDisconnection(socket);
    });
  }

  /**
   * Setup event handlers for authenticated user
   */
  setupUserEventHandlers(socket) {
    // Room management
    socket.on('join-user-room', (data) => {
      this.handleJoinUserRoom(socket, data);
    });

    socket.on('leave-user-room', (data) => {
      this.handleLeaveUserRoom(socket, data);
    });

    socket.on('join-order-room', (data) => {
      this.handleJoinOrderRoom(socket, data);
    });

    socket.on('leave-order-room', (data) => {
      this.handleLeaveOrderRoom(socket, data);
    });

    // Note: order-created event removed - orders are created via REST API
    // and notifications are sent via socketService.emitNewOrderToVendor()

    // Customer-specific events
    if (socket.userType === 'customer') {
      this.setupCustomerEventHandlers(socket);
    }

    // Vendor-specific events
    if (socket.userType === 'vendor') {
      this.setupVendorEventHandlers(socket);
    }

    // Admin-specific events
    if (socket.userType === 'admin') {
      this.setupAdminEventHandlers(socket);
    }
  }

  /**
   * Setup customer-specific event handlers
   */
  setupCustomerEventHandlers(socket) {
    // Customer can track their orders
    socket.on('track-my-orders', async () => {
      try {
        // Join rooms for all user's active orders
        // This would typically fetch from database
        const userOrders = await this.getUserActiveOrders(socket.userId);
        
        userOrders.forEach(order => {
          socket.join(`order-${order.id}`);
        });

        socket.emit('tracking-orders', {
          orderIds: userOrders.map(o => o.id),
          message: 'Now tracking your active orders'
        });
      } catch (error) {
        logger.error('Error tracking orders:', error);
        socket.emit('error', { message: 'Failed to track orders' });
      }
    });

    // Note: notify-vendor event removed - vendor notifications now handled 
    // via REST API in order.controller.js using socketService.emitNewOrderToVendor()

  }

  /**
   * Setup vendor-specific event handlers
   */
  setupVendorEventHandlers(socket) {
    // Vendor updates order status
    socket.on('update-order-status', async (data) => {
      try {
        await this.handleOrderStatusUpdate(socket, data);
      } catch (error) {
        logger.error('Error updating order status:', error);
        socket.emit('error', { message: 'Failed to update order status' });
      }
    });

    // Vendor sends message to customer
    socket.on('send-customer-message', (data) => {
      this.handleVendorMessage(socket, data);
    });
  }

  /**
   * Setup admin-specific event handlers
   */
  setupAdminEventHandlers(socket) {
    // Admin can broadcast announcements
    socket.on('broadcast-announcement', (data) => {
      this.handleAdminBroadcast(socket, data);
    });

    // Admin can monitor all transactions
    socket.on('monitor-transactions', () => {
      socket.join('admin-monitoring');
    });
  }

  /**
   * Handle user joining their own room
   */
  handleJoinUserRoom(socket, data) {
    const { userId } = data;
    
    // Security: Users can only join their own room
    if (userId !== socket.userId) {
      socket.emit('error', { message: 'Cannot join another user\'s room' });
      return;
    }

    socket.join(`user-${userId}`);
    socket.emit('room-joined', { room: `user-${userId}` });
    logger.info(`User ${userId} joined their user room`);
  }

  /**
   * Handle user leaving room
   */
  handleLeaveUserRoom(socket, data) {
    const { userId } = data;
    socket.leave(`user-${userId}`);
    socket.emit('room-left', { room: `user-${userId}` });
  }

  /**
   * Handle joining order room
   */
  async handleJoinOrderRoom(socket, data) {
    const { orderId } = data;
    
    try {
      // Verify user has permission to join this order room
      const hasPermission = await this.verifyOrderAccess(socket.userId, orderId, socket.userType);
      
      if (!hasPermission) {
        socket.emit('error', { message: 'No permission to access this order' });
        return;
      }

      socket.join(`order-${orderId}`);
      socket.emit('room-joined', { room: `order-${orderId}` });
      logger.info(`User ${socket.userId} joined order room ${orderId}`);

    } catch (error) {
      logger.error('Error joining order room:', error);
      socket.emit('error', { message: 'Failed to join order room' });
    }
  }

  /**
   * Handle leaving order room
   */
  handleLeaveOrderRoom(socket, data) {
    const { orderId } = data;
    socket.leave(`order-${orderId}`);
    socket.emit('room-left', { room: `order-${orderId}` });
  }

  /**
   * Handle order creation - This is handled by the order controller, not needed here
   */
  async handleOrderCreated(socket, data) {
    // This method is not used - order creation is handled by order.controller.js
    // which calls socketService.emitNewOrderToVendor() directly
    logger.info('handleOrderCreated called but not implemented - orders handled by order.controller.js');
  }

  /**
   * Handle order status update (typically called by vendors)
   */
  async handleOrderStatusUpdate(socket, data) {
    const { orderId, status, estimatedTime, message } = data;

    try {
      // Update order in database
      // const updatedOrder = await orderService.updateOrderStatus(orderId, status);
      
      // Get order details for notification
      const orderDetails = await this.getOrderDetails(orderId);
      
      if (!orderDetails) {
        throw new Error('Order not found');
      }

      // Emit to order room (all participants)
      /*this.io.to(`order-${orderId}`).emit('order-status-changed', {
        orderId,
        status,
        estimatedTime,
        itemName: orderDetails.item,
        userId: orderDetails.userId,
        vendorId: orderDetails.vendorId,
        timestamp: new Date()
      });*/

      // Send notification to customer
      this.io.to(`user-${orderDetails.userId}`).emit('new-notification', {
        message: message || `Your ${orderDetails.item} is ${status}!`,
        type: 'order-update',
        orderId,
        status,
        timestamp: new Date()
      });

      // If order is ready, send special notification
      if (status === 'order-status-update') {
        this.io.to(`user-${orderDetails.userId}`).emit('order-ready', {
          orderId,
          itemName: orderDetails.item,
          vendorId: orderDetails.vendorId,
          message: `Your ${orderDetails.item} is ready for pickup!`,
          timestamp: new Date()
        });
      }

      logger.info(`Order ${orderId} status updated to ${status}`);

    } catch (error) {
      logger.error('Error updating order status:', error);
      throw error;
    }
  }

  /**
   * Handle vendor message to customer
   */
  handleVendorMessage(socket, data) {
    const { userId, message, orderId } = data;

    this.io.to(`user-${userId}`).emit('vendor-message', {
      vendorId: socket.userId,
      message,
      orderId,
      timestamp: new Date()
    });

    socket.emit('message-sent', { userId, message });
  }

  /**
   * Handle admin broadcast
   */
  handleAdminBroadcast(socket, data) {
    const { message, type = 'announcement' } = data;

    // Broadcast to all connected users
    this.io.emit('admin-announcement', {
      message,
      type,
      timestamp: new Date(),
      adminId: socket.userId
    });

    logger.info(`Admin ${socket.userId} broadcast: ${message}`);
  }

  /**
   * Handle socket disconnection
   */
  handleDisconnection(socket) {
    this.connectedUsers.delete(socket.userId);
    logger.info(`User ${socket.userId} disconnected`);
  }

  // Utility methods for business logic integration

  /**
   * Emit general notification
   */
  emitNotification(userId, notification) {
        
    this.io.to(`user-${userId}`).emit('new-notification', {
      message: notification.message,
      type: notification.type || 'info',
      orderId: notification.orderId,
      data: notification.data,
      timestamp: new Date()
    });
  }

  /**
   * Emit order-status-update notification
   * 
   * @returns 
   */
  emitOrderStatusUpdate(userId, orderId, status, itemName) {

    console.log(`🔔 Emitting order status update to user ${userId}: ${status} for order ${orderId}`);
    console.log(`📡 Target room: user-${userId}`);
    console.log(`📊 Connected users:`, Array.from(this.connectedUsers.keys()));
    console.log(`🔗 User ${userId} connected:`, this.connectedUsers.has(userId));
    
    const targetRoom = `user-${userId}`;
    const roomSockets = this.io.sockets.adapter.rooms.get(targetRoom);
    console.log(`🏠 Room ${targetRoom} has ${roomSockets ? roomSockets.size : 0} sockets`);
    
    // Emit order status update notification - this is working perfectly!
    this.io.to(targetRoom).emit('new-notification', {
      message: `Your ${itemName} is now ${status}!`,
      type: 'order-status-update',
      orderId,
      data: {
        orderId,
        status,
        itemName
      },
      timestamp: new Date()
    });
    
    console.log(`✅ Order status notification sent successfully to room: ${targetRoom}`);
  }

  /**
   * Emit order completion notification
   * @param {string} userId - Customer user ID
   * @param {string} orderId - Order ID
   * @param {string} itemName - Name of the completed item
   */
  emitOrderCompletion(userId, orderId, itemName) {
    console.log(`🎉 Emitting order completion notification to user ${userId} for order ${orderId}`);
    console.log(`📡 Target room: user-${userId}`);
    console.log(`📊 Connected users:`, Array.from(this.connectedUsers.keys()));
    console.log(`🔗 User ${userId} connected:`, this.connectedUsers.has(userId));
    
    const targetRoom = `user-${userId}`;
    const roomSockets = this.io.sockets.adapter.rooms.get(targetRoom);
    console.log(`🏠 Room ${targetRoom} has ${roomSockets ? roomSockets.size : 0} sockets`);
    
    // Emit order completion notification
    this.io.to(targetRoom).emit('new-notification', {
      message: `🎉 Your ${itemName} order is complete and ready for pickup!`,
      type: 'order-completed',
      orderId,
      data: {
        orderId,
        status: 'completed',
        itemName,
        action: 'pickup-ready'
      },
      timestamp: new Date()
    });
    
    // Also emit a special order-ready event for UI updates
    this.io.to(targetRoom).emit('order-ready', {
      orderId,
      itemName,
      message: `Your ${itemName} is ready for pickup!`,
      timestamp: new Date()
    });
    
    console.log(`✅ Order completion notification sent successfully to room: ${targetRoom}`);
  }

  // Helper methods (these would integrate with your actual services)

  async getUserActiveOrders(userId) {
    // This would call your order service
    // return await orderService.getActiveOrdersByUserId(userId);
    return []; // Placeholder
  }

  async verifyOrderAccess(userId, orderId, userType) {
    // Verify user can access this order
    // Customers can access their own orders
    // Vendors can access orders they're fulfilling
    // Admins can access all orders
    return true; // Placeholder - implement actual verification
  }

  async getOrderDetails(orderId) {
    // This would call your order service
    // return await orderService.getOrderById(orderId);
    return null; // Placeholder
  }

  /**
   * Handle vendor notification when customer creates order
   * DEPRECATED: This method is no longer used - vendor notifications are now handled
   * via REST API in order.controller.js using socketService.emitNewOrderToVendor()
   */
  async handleNotifyVendor(socket, data) {
    logger.info('handleNotifyVendor called but deprecated - notifications handled via REST API');
    // This method is disabled to prevent duplicate notifications
  }

  async getCustomerInfo(userId) {
    // Get customer info for vendor notifications
    const user = await userService.getUserById(userId);
    return {
      id: user.id,
      name: user.name,
      email: user.email
    };
  }

  /**
   * Get connection status
   */
  getConnectionInfo() {
    return {
      connectedUsers: this.connectedUsers.size,
      userConnections: Array.from(this.connectedUsers.entries())
    };
  }

  /**
   * Check if user has existing socket connections
   * @param {string} userId - User ID to check
   * @returns {boolean} True if user has existing connections
   */
  hasExistingConnection(userId) {
    return this.connectedUsers.has(userId);
  }

  /**
   * Disconnect existing connections for a user
   * @param {string} userId - User ID to disconnect
   * @param {string} reason - Reason for disconnection
   */
  disconnectExistingConnections(userId, reason = 'New session started') {
    if (this.connectedUsers.has(userId)) {
      const existingSocket = this.connectedUsers.get(userId);
      
      // Emit session replacement event
      existingSocket.emit('session-replaced', {
        reason,
        timestamp: new Date()
      });
      
      // Disconnect existing socket
      existingSocket.disconnect(true);
      
      // Remove from connected users
      this.connectedUsers.delete(userId);
      
      logger.info(`Disconnected existing connection for user ${userId}. Reason: ${reason}`);
    }
  }
}

module.exports = SocketController;
