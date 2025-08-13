# Kejia App - Database Models Documentation

## Overview
This document describes the database models created for the Kejia application, which appears to be a food ordering/restaurant management system.

## Models Created

### 1. User Model (Enhanced)
**File:** `src/models/user.model.js`

**Fields Added:**
- `username` - Unique username for login (required, min 3 chars)
- `googleAuth` - Object containing Google authentication session data
  - `googleId` - Google account ID
  - `accessToken` - Google access token (private)
  - `refreshToken` - Google refresh token (private)
- `type` - User type: 'customer', 'vendor', or 'admin'
- `balance` - Current account balance (default: 0)
- `pendingOrders` - Array of Order IDs
- `completedOrders` - Array of Order IDs
- `notifications` - Array of Notification IDs
- `fundsAddedHistory` - Array of FundTransaction IDs
- `scans` - Array of Scan IDs

**Vendor-specific fields:**
- `salesHistory` - Array of Sale IDs
- `totalSales` - Total sales amount
- `vendorDashboard.preOrders` - Array of pre-orders for vendor dashboard

**Methods Added:**
- `isUsernameTaken()` - Check if username exists
- `isVendor()` - Check if user is vendor
- `isAdmin()` - Check if user is admin
- `addFunds(amount)` - Add funds to user balance

### 2. Order Model
**File:** `src/models/order.model.js`

**Purpose:** Manages customer orders placed with vendors

**Key Fields:**
- `customer` - Reference to User (customer)
- `vendor` - Reference to User (vendor)
- `items` - Array of ordered items with name, quantity, price
- `totalAmount` - Total order amount
- `status` - Order status (pending, confirmed, preparing, ready, completed, cancelled)
- `paymentStatus` - Payment status (pending, paid, refunded)
- `orderType` - Type (pre-order, instant, scheduled)
- `scheduledTime` - When order is scheduled for
- `pickupTime` - When customer picked up order
- `isMarkedOff` - Whether vendor marked order as handed off
- `notes` - Customer notes
- `vendorNotes` - Vendor notes

**Methods:**
- `markAsHandedOff()` - Mark order as completed and handed off
- `calculateTotal()` - Calculate total from items

### 3. Menu Model
**File:** `src/models/menu.model.js`

**Purpose:** Manages vendor menus and menu items

**Key Fields:**
- `vendor` - Reference to User (vendor)
- `name` - Menu name
- `operatingHours` - Operating hours for each day of week
- `items` - Array of menu items
- `categories` - Menu categories
- `qrCode` - QR code for menu access
- `menuVersion` - Version number for tracking changes

**Menu Item Fields:**
- `name`, `description`, `price`, `category`
- `isAvailable` - Whether item is available
- `preparationTime` - Time to prepare item
- `ingredients`, `allergens`, `dietary` - Food information
- `customizations` - Available customizations with prices

**Methods:**
- `getAvailableItems()` - Get only available items
- `getItemsByCategory(category)` - Filter items by category
- `isCurrentlyOpen()` - Check if vendor is currently open

### 4. Notification Model
**File:** `src/models/notification.model.js`

**Purpose:** Manages user notifications

**Key Fields:**
- `user` - Reference to User
- `title`, `message` - Notification content
- `type` - Notification type (order, payment, system, promotion, reminder)
- `priority` - Priority level (low, normal, high, urgent)
- `isRead`, `readAt` - Read status and timestamp
- `relatedOrder`, `relatedTransaction` - Related entities
- `actionUrl` - URL for notification action
- `expiresAt` - Expiration date

**Methods:**
- `markAsRead()` - Mark notification as read
- `isExpired()` - Check if notification expired

### 5. FundTransaction Model
**File:** `src/models/fundTransaction.model.js`

**Purpose:** Tracks all financial transactions for users

**Key Fields:**
- `user` - Reference to User
- `amount` - Transaction amount
- `type` - Transaction type (deposit, withdrawal, refund, payment, adjustment)
- `method` - Payment method (card, bank_transfer, paypal, etc.)
- `status` - Transaction status (pending, completed, failed, cancelled)
- `balanceBefore`, `balanceAfter` - Balance before and after transaction
- `transactionId` - Unique transaction ID (auto-generated)
- `relatedOrder` - Related order if applicable

**Methods:**
- `markAsCompleted()` - Mark transaction as completed
- `markAsFailed(reason)` - Mark transaction as failed with reason

### 6. Scan Model
**File:** `src/models/scan.model.js`

**Purpose:** Tracks QR code and barcode scans by users

**Key Fields:**
- `user` - Reference to User who scanned
- `scanType` - Type of scan (qr_code, barcode, nfc, etc.)
- `scannedData` - Raw scanned data
- `decodedData` - Processed/decoded data
- `location` - GPS coordinates of scan
- `vendor` - Related vendor (if applicable)
- `action` - Action taken (view_menu, place_order, etc.)
- `scanResult` - Success/failure status
- `metadata` - Device info and additional data

**Methods:**
- `findNearby(longitude, latitude, maxDistance)` - Find scans near location

### 7. Sale Model
**File:** `src/models/sale.model.js`

**Purpose:** Tracks vendor sales for analytics and reporting

**Key Fields:**
- `vendor` - Reference to vendor User
- `customer` - Reference to customer User
- `order` - Reference to Order
- `saleAmount` - Total sale amount
- `commission` - Platform commission
- `netAmount` - Amount after commission
- `paymentMethod` - How customer paid
- `items` - Items sold with details
- `analytics` - Auto-generated analytics data (peak_hour, day_of_week, etc.)

**Methods:**
- `processRefund(amount, reason)` - Process refund
- `calculateCommission(rate)` - Calculate commission

## Configuration Updates

### Roles Configuration
**File:** `src/config/roles.js`

Updated to include three user types:
- `customer` - Basic customer permissions
- `vendor` - Vendor permissions including sales management
- `admin` - Full system administration permissions

### Validation Updates
**Files:** `src/validations/`

- Updated `auth.validation.js` - Added username field, allow login with username or email
- Updated `user.validation.js` - Added username and new user types
- Created `order.validation.js` - Order validation rules
- Created `menu.validation.js` - Menu and menu item validation rules

## Database Indexes

Added efficient indexes for:
- User lookups by email/username
- Order queries by customer/vendor/status/date
- Notification queries by user/read status
- Sales analytics by vendor/date/payment status
- Geographic queries for scan locations
- Transaction lookups by user/status/date

## Usage Examples

### Creating a User
```javascript
const user = new User({
  name: 'John Doe',
  username: 'johndoe',
  email: 'john@example.com',
  password: 'password123',
  type: 'customer'
});
```

### Creating an Order
```javascript
const order = new Order({
  customer: customerId,
  vendor: vendorId,
  items: [
    {
      name: 'Pizza',
      quantity: 1,
      price: 15.99,
      totalPrice: 15.99
    }
  ],
  orderType: 'instant'
});
```

### Vendor Dashboard Queries
```javascript
// Get vendor's pending orders
const pendingOrders = await Order.find({
  vendor: vendorId,
  status: 'pending'
});

// Get sales analytics
const salesData = await Sale.find({
  vendor: vendorId,
  createdAt: { $gte: startDate, $lte: endDate }
});
```

This system provides a comprehensive foundation for a food ordering platform with customer management, vendor operations, order processing, notifications, financial tracking, and analytics.
