# Vendor Notification System

## Overview
The vendor notification system enables real-time communication between customers and vendors when orders are created. When a customer places an order, the vendor is immediately notified through WebSocket connections.

## Architecture

### Socket Events

#### 1. Client-Side Event (Customer)
```javascript
// Customer emits this event after creating an order
socket.emit('notify-vendor', {
  vendorId: 'vendor_id_here',
  eventType: 'new-order',
  orderData: {
    orderId: 'order_id_here',
    customerName: 'Customer Name',
    customerUserId: 'customer_id_here',
    items: [{
      name: 'Item Name',
      quantity: 2,
      unitPrice: 15.00,
      totalPrice: 30.00
    }],
    totalPrice: 30.00,
    specialInstructions: 'Optional instructions',
    queuePosition: 3
  }
});
```

#### 2. Server-Side Events (Vendor receives)

**Primary Event: `new-order-notification`**
```javascript
socket.on('new-order-notification', (data) => {
  // data structure:
  {
    eventType: 'new-order',
    orderId: 'order_id',
    customer: {
      id: 'customer_id',
      name: 'Customer Name',
      username: 'customer_username'
    },
    orderDetails: {
      items: [{ name, quantity, unitPrice, totalPrice }],
      totalPrice: 30.00,
      specialInstructions: 'Extra spicy',
      queuePosition: 3
    },
    timestamp: '2025-08-07T...',
    message: 'New order from Customer Name'
  }
});
```

**Dashboard Update: `dashboard-update`**
```javascript
socket.on('dashboard-update', (data) => {
  // data structure:
  {
    type: 'new-order',
    data: { /* same as new-order-notification */ }
  }
});
```

### Integration Points

#### 1. Order Creation Flow
1. Customer creates order via API (`POST /orders`)
2. Order saved to database
3. Balance updates processed
4. Queue position calculated
5. **Vendor notification sent automatically**
6. Response returned to customer

#### 2. Socket Room Management
- Vendors join room: `user-{vendorId}`
- Vendors can also join: `vendor-dashboard-{vendorId}` for dashboard updates
- Customers join room: `user-{customerId}`

## Implementation Details

### Backend Components

#### Socket Controller (`socket.controller.js`)
- `handleNotifyVendor()` - Processes customer notification requests
- `setupCustomerEventHandlers()` - Registers `notify-vendor` event for customers
- Validates vendor existence and customer authentication

#### Socket Service (`socket.service.js`)
- `emitNewOrderToVendor()` - Convenient method for sending vendor notifications
- Handles error logging and connection management

#### Order Controller (`order.controller.js`)
- Automatically triggers vendor notification after successful order creation
- Includes queue position and customer details
- Gracefully handles notification failures (doesn't break order creation)

### Error Handling

#### Customer-Side Errors
```javascript
socket.on('vendor-notification-failed', (data) => {
  console.error('Failed to notify vendor:', data.error);
});
```

#### Success Confirmation
```javascript
socket.on('vendor-notified', (data) => {
  console.log(`Vendor ${data.vendorName} has been notified`);
});
```

## Usage Examples

### Frontend Integration (Customer)

```javascript
// After successful order creation
const orderData = {
  vendorId: selectedVendor.id,
  eventType: 'new-order',
  orderData: {
    orderId: newOrder.id,
    customerName: user.name,
    customerUserId: user.id,
    items: orderItems,
    totalPrice: calculatedTotal
  }
};

socket.emit('notify-vendor', orderData);
```

### Frontend Integration (Vendor Dashboard)

```javascript
// Vendor dashboard listening for new orders
socket.on('new-order-notification', (notification) => {
  // Update dashboard UI
  addNewOrderToQueue(notification);
  showNotificationBadge();
  playNotificationSound();
});

socket.on('dashboard-update', (update) => {
  if (update.type === 'new-order') {
    updateOrderCount(update.data);
  }
});
```

## Benefits

1. **Real-Time Updates**: Vendors see orders immediately
2. **Better Customer Service**: Faster order processing
3. **Queue Management**: Vendors can track order volume
4. **Robust Error Handling**: System continues working even if notifications fail
5. **Automatic Integration**: No manual triggers needed - works with existing order creation

## Testing

Run the test script:
```bash
cd /path/to/project
node src/scripts/testVendorNotification.js
```

## Monitoring

Check socket service logs for notification delivery:
```
INFO: New order notification sent to vendor 507f... for order 508f...
ERROR: Error emitting new order to vendor: Connection not found
```
