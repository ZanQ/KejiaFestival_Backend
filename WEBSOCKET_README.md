# WebSocket Implementation for Kejia Festival Payment Platform

## Overview
This WebSocket implementation provides real-time communication between the React frontend and Node.js backend for the festival payment platform. It enables instant updates for balance changes, order status, notifications, and real-time customer-vendor interactions.

## 🚀 Features Implemented

### **Real-time Updates**
- ✅ User balance updates (payments, transactions)
- ✅ Order status changes (preparing → ready → completed)
- ✅ Push notifications for order pickup
- ✅ Payment completion notifications
- ✅ Vendor-customer messaging
- ✅ Admin monitoring and announcements

### **Security & Authentication**
- ✅ JWT token authentication for WebSocket connections
- ✅ User permission checking
- ✅ Rate limiting to prevent spam
- ✅ Resource ownership validation
- ✅ Secure room management

### **Multi-user Support**
- ✅ Customer real-time dashboard updates
- ✅ Vendor order management notifications
- ✅ Admin monitoring and broadcasting
- ✅ Auto-cleanup of disconnected users

## 📁 File Structure

```
src/
├── controllers/
│   └── socket.controller.js       # Main WebSocket event handling
├── services/
│   └── socket.service.js          # Business logic integration service
├── middlewares/
│   └── socket.js                  # Authentication & validation middleware
├── examples/
│   └── socket-integration-examples.js  # Integration examples for existing services
└── index.js                      # Updated with Socket.IO server setup
```

## 🔧 Installation & Setup

### **1. Dependencies**
```bash
npm install socket.io
```

### **2. Server Configuration (Already Implemented)**
The server is configured in `src/index.js` with:
- CORS support for React frontend
- WebSocket + polling fallback transport
- Automatic Socket.IO initialization

### **3. Frontend Integration (Already Implemented)**
The React frontend has:
- Socket connection management
- Real-time event listeners
- Automatic reconnection
- Connection status indicators

## 🎯 Core Events

### **Incoming Events (Client → Server)**
```javascript
// Authentication & Room Management
'join-user-room'     → { userId }
'leave-user-room'    → { userId }
'join-order-room'    → { orderId }
'leave-order-room'   → { orderId }

// Business Events
'order-created'      → { orderId, vendorId, item, price }
'update-order-status' → { orderId, status, estimatedTime }
'refresh-balance'    → {}
'track-my-orders'    → {}
```

### **Outgoing Events (Server → Client)**
```javascript
// User-specific Updates
'balance-updated'    → { userId, newBalance, oldBalance, amount, reason }
'new-notification'   → { message, type, orderId?, timestamp }
'payment-completed'  → { userId, amount, newBalance, paymentMethod }

// Order Updates
'order-status-changed' → { orderId, status, estimatedTime, itemName }
'order-ready'        → { orderId, itemName, vendorId, message }
'new-order'          → { orderId, userId, customerName, item, price }

// System Events
'connected'          → { userId, userType, message }
'error'              → { code, message }
```

## 🔐 Security Features

### **Authentication**
```javascript
// JWT token required on connection
socket.handshake.auth = {
  token: "your-jwt-token",
  userId: "user-id"
}
```

### **Permission System**
- **Customers**: Can view/create orders, view balance
- **Vendors**: Can view/update orders, view sales
- **Admins**: Full access to all features

### **Rate Limiting**
- 60 events per minute per user (configurable)
- Automatic cleanup of rate limit data

## 📋 Integration Examples

### **1. Add Funds (Zeffy Webhook)**
```javascript
const { socketService } = require('./services');

// In your payment webhook handler
const handleZeffyPayment = async (userId, amount, transactionData) => {
  // Update database
  const newBalance = await addFundsToUser(userId, amount);
  
  // Emit real-time updates
  socketService.emitPaymentCompleted(userId, {
    amount,
    newBalance,
    paymentMethod: 'zeffy',
    transactionId: transactionData.id
  });
};
```

### **2. Order Status Updates**
```javascript
// In your vendor controller
const updateOrderStatus = async (orderId, status, vendorId) => {
  // Update database
  await updateOrderInDB(orderId, status);
  
  // Emit real-time updates
  await socketService.emitOrderStatusChange(orderId, {
    status,
    itemName: order.itemName,
    userId: order.userId,
    vendorId
  });
};
```

### **3. QR Code Payment Processing**
```javascript
// In your payment controller
const processQRPayment = async (customerId, vendorId, amount, orderData) => {
  // Process payment
  const result = await processPayment(customerId, vendorId, amount);
  
  // Notify customer
  socketService.emitNotification(customerId, {
    message: `Payment successful! Your ${orderData.item} is being prepared.`,
    type: 'success',
    orderId: result.orderId
  });
  
  // Notify vendor
  socketService.emitNewOrderToVendor(vendorId, {
    orderId: result.orderId,
    customerName: customer.name,
    item: orderData.item,
    price: amount
  });
};
```

## 🔄 Frontend Integration

### **Connection Management**
```javascript
// Already implemented in React frontend
const { isConnected, emitEvent } = useSocket(userId, true);

// Listen for balance updates
useBalanceUpdates(userId, (balanceData) => {
  setUser(prev => ({ ...prev, balance: balanceData.newBalance }));
});

// Listen for notifications
useNotifications(userId, (eventType, data) => {
  if (eventType === 'order-ready') {
    showOrderReadyNotification(data);
  }
});
```

## 🎪 Festival-Specific Use Cases

### **Customer Experience**
1. **Add Funds**: Zeffy payment → Instant balance update
2. **QR Scan**: Scan vendor QR → See item details → Confirm payment
3. **Order Tracking**: Real-time status updates (preparing → ready)
4. **Pickup Notifications**: Alert when order is ready

### **Vendor Experience**
1. **New Orders**: Instant notification when customer pays
2. **Order Management**: Update status → Notify customer automatically
3. **Balance Tracking**: Real-time sales and earnings updates

### **Admin Monitoring**
1. **Transaction Monitoring**: Real-time transaction feed
2. **System Announcements**: Broadcast to all users
3. **User Management**: Monitor connections and activity

## 🚀 Starting the Server

```bash
# Start the backend with WebSocket support
npm start

# The server will log:
# - Connected to MongoDB
# - Socket.IO initialized successfully  
# - Listening to port 8000
# - WebSocket server ready for connections
```

## 🧪 Testing WebSocket Events

### **Using Browser Developer Tools**
```javascript
// Test connection (in browser console)
const socket = io('http://localhost:8000', {
  auth: {
    token: 'your-jwt-token',
    userId: 'your-user-id'
  }
});

// Test events
socket.emit('join-user-room', { userId: 'your-user-id' });
socket.on('balance-updated', (data) => console.log('Balance:', data));
```

### **Integration Testing**
The React frontend automatically connects and handles all events. Simply:
1. Start backend: `npm start`
2. Start frontend: `npm start` (in React app)
3. Login to see real-time connection status
4. Test with multiple users/browser tabs

## 🔧 Configuration

### **Environment Variables**
```bash
# Add to your .env file
JWT_SECRET=your-jwt-secret
MONGODB_URL=your-mongodb-url
PORT=8000
```

### **CORS Configuration**
Update allowed origins in `src/index.js`:
```javascript
cors: {
  origin: ["http://localhost:3000", "https://your-production-domain.com"],
  methods: ["GET", "POST"],
  credentials: true
}
```

## 📊 Performance & Scaling

### **Current Implementation**
- ✅ Efficient room management
- ✅ Automatic cleanup of disconnected users
- ✅ Memory-efficient event handling
- ✅ Rate limiting to prevent abuse

### **Production Considerations**
- Use Redis adapter for multi-server deployments
- Implement connection pooling
- Add monitoring and analytics
- Set up proper logging and error tracking

## 🎯 Next Steps

1. **Integrate with existing services** using the provided examples
2. **Test with multiple users** to ensure real-time updates work
3. **Configure production settings** for deployment
4. **Add monitoring** for WebSocket connections and events
5. **Implement error recovery** for network interruptions

The WebSocket implementation is now ready for your festival payment platform! 🎪✨
