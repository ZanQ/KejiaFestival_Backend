const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { userService } = require('../services');
const logger = require('../config/logger');

/**
 * Socket.IO authentication middleware
 * Validates JWT tokens for WebSocket connections
 */
const socketAuth = async (socket, next) => {
  try {
    // Extract token from handshake auth
    const { token, userId } = socket.handshake.auth;

    if (!token) {
      const error = new Error('Authentication token required');
      error.data = { code: 'NO_TOKEN' };
      return next(error);
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (jwtError) {
      const error = new Error('Invalid or expired token');
      error.data = { code: 'INVALID_TOKEN' };
      return next(error);
    }

    // Get user from database
    const user = await userService.getUserById(decoded.sub);
    if (!user) {
      const error = new Error('User not found');
      error.data = { code: 'USER_NOT_FOUND' };
      return next(error);
    }

    // Verify user ID matches if provided
    if (userId && userId !== user.id) {
      const error = new Error('User ID mismatch');
      error.data = { code: 'USER_MISMATCH' };
      return next(error);
    }

    // Check if user is active (not suspended/banned)
    if (user.status && user.status !== 'active') {
      const error = new Error('User account is not active');
      error.data = { code: 'ACCOUNT_INACTIVE', status: user.status };
      return next(error);
    }

    // Attach user info to socket
    socket.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      type: user.type || user.accountType,
      role: user.role,
      isEmailVerified: user.isEmailVerified
    };

    // Log successful authentication
    logger.info(`Socket authenticated for user ${user.id} (${socket.user.type})`);

    next();
    
  } catch (error) {
    logger.error('Socket authentication error:', error);
    
    const authError = new Error('Authentication failed');
    authError.data = { 
      code: 'AUTH_ERROR',
      message: error.message 
    };
    
    next(authError);
  }
};

/**
 * Rate limiting middleware for socket events
 * Prevents spam and abuse
 */
const socketRateLimit = (eventsPerMinute = 60) => {
  const userEventCounts = new Map();
  
  // Clean up old entries every minute
  setInterval(() => {
    userEventCounts.clear();
  }, 60000);

  return (socket, next) => {
    const userId = socket.user?.id;
    
    if (!userId) {
      return next();
    }

    const now = Date.now();
    const userKey = `${userId}_${Math.floor(now / 60000)}`; // Per minute bucket
    
    const currentCount = userEventCounts.get(userKey) || 0;
    
    if (currentCount >= eventsPerMinute) {
      const error = new Error('Rate limit exceeded');
      error.data = { 
        code: 'RATE_LIMIT',
        limit: eventsPerMinute,
        resetTime: Math.ceil(now / 60000) * 60000
      };
      return next(error);
    }

    userEventCounts.set(userKey, currentCount + 1);
    next();
  };
};

/**
 * Permission middleware for socket events
 * Checks if user has permission for specific actions
 */
const socketPermission = (requiredPermission) => {
  return (socket, eventData, next) => {
    const user = socket.user;
    
    if (!user) {
      const error = new Error('User not authenticated');
      error.data = { code: 'NOT_AUTHENTICATED' };
      return next(error);
    }

    // Check basic permissions based on user type
    const permissions = {
      customer: ['view-orders', 'create-orders', 'view-balance'],
      vendor: ['view-orders', 'update-orders', 'view-sales'],
      admin: ['*'] // All permissions
    };

    const userPermissions = permissions[user.type] || [];
    
    if (!userPermissions.includes('*') && !userPermissions.includes(requiredPermission)) {
      const error = new Error('Insufficient permissions');
      error.data = { 
        code: 'INSUFFICIENT_PERMISSIONS',
        required: requiredPermission,
        userType: user.type
      };
      return next(error);
    }

    next();
  };
};

/**
 * Resource ownership middleware
 * Ensures users can only access their own resources
 */
const socketOwnership = (resourceType) => {
  return async (socket, eventData, next) => {
    try {
      const user = socket.user;
      
      if (!user) {
        const error = new Error('User not authenticated');
        error.data = { code: 'NOT_AUTHENTICATED' };
        return next(error);
      }

      // Admin can access everything
      if (user.type === 'admin') {
        return next();
      }

      switch (resourceType) {
        case 'user-room':
          // Users can only join their own user rooms
          if (eventData.userId !== user.id) {
            const error = new Error('Cannot access another user\'s room');
            error.data = { code: 'ACCESS_DENIED' };
            return next(error);
          }
          break;

        case 'order':
          // Check order ownership (would need to query database)
          const orderId = eventData.orderId;
          if (orderId) {
            // This would integrate with your order service
            // const order = await orderService.getOrderById(orderId);
            // const hasAccess = order.userId === user.id || order.vendorId === user.id;
            // if (!hasAccess) {
            //   const error = new Error('No access to this order');
            //   error.data = { code: 'ACCESS_DENIED' };
            //   return next(error);
            // }
          }
          break;

        default:
          // Default: allow access
          break;
      }

      next();
      
    } catch (error) {
      logger.error('Socket ownership check error:', error);
      
      const ownershipError = new Error('Ownership check failed');
      ownershipError.data = { 
        code: 'OWNERSHIP_ERROR',
        message: error.message 
      };
      
      next(ownershipError);
    }
  };
};

/**
 * Validation middleware for socket event data
 */
const socketValidation = (schema) => {
  return (socket, eventData, next) => {
    try {
      // Basic validation example - you can integrate with Joi or other validation libraries
      if (schema.required) {
        for (const field of schema.required) {
          if (!eventData[field]) {
            const error = new Error(`Missing required field: ${field}`);
            error.data = { 
              code: 'VALIDATION_ERROR',
              field,
              message: `${field} is required`
            };
            return next(error);
          }
        }
      }

      // Type validation
      if (schema.types) {
        for (const [field, expectedType] of Object.entries(schema.types)) {
          if (eventData[field] && typeof eventData[field] !== expectedType) {
            const error = new Error(`Invalid type for field: ${field}`);
            error.data = { 
              code: 'VALIDATION_ERROR',
              field,
              expected: expectedType,
              received: typeof eventData[field]
            };
            return next(error);
          }
        }
      }

      next();
      
    } catch (error) {
      logger.error('Socket validation error:', error);
      
      const validationError = new Error('Validation failed');
      validationError.data = { 
        code: 'VALIDATION_ERROR',
        message: error.message 
      };
      
      next(validationError);
    }
  };
};

module.exports = {
  socketAuth,
  socketRateLimit,
  socketPermission,
  socketOwnership,
  socketValidation
};
