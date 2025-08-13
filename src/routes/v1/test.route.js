const express = require('express');
const { socketService } = require('../../services');
const catchAsync = require('../../utils/catchAsync');

const router = express.Router();

/**
 * Test socket emission to vendor
 * POST /v1/test/socket-vendor
 */
router.post('/socket-vendor', catchAsync(async (req, res) => {
  const { vendorId, testMessage } = req.body;
  
  if (!vendorId) {
    return res.status(400).json({ error: 'vendorId is required' });
  }

  try {
    // Test notification data
    const testOrderData = {
      orderId: 'test-order-123',
      customerId: 'test-customer-456',
      customerName: 'Test Customer',
      customerUsername: 'testuser',
      items: [{
        name: 'Test Item',
        quantity: 1,
        unitPrice: 10,
        totalPrice: 10
      }],
      totalPrice: 10,
      queuePosition: 1
    };

    // Emit test notification
    socketService.emitNewOrderToVendor(vendorId, testOrderData);
    
    res.json({ 
      success: true, 
      message: `Test notification sent to vendor ${vendorId}`,
      testData: testOrderData
    });
    
  } catch (error) {
    console.error('Test socket error:', error);
    res.status(500).json({ 
      error: 'Failed to send test notification', 
      details: error.message 
    });
  }
}));

/**
 * Get socket connection info
 * GET /v1/test/socket-status
 */
router.get('/socket-status', catchAsync(async (req, res) => {
  try {
    const connectionInfo = socketService.getConnectionStats();
    res.json({
      success: true,
      connections: connectionInfo
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get connection status',
      details: error.message
    });
  }
}));

module.exports = router;
