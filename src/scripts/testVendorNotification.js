const { socketService } = require('../services');

/**
 * Test vendor notification functionality
 */
async function testVendorNotification() {
  try {
    console.log('Testing vendor notification system...');

    // Mock order data
    const vendorId = '507f1f77bcf86cd799439011'; // Example vendor ID
    const orderData = {
      orderId: '507f1f77bcf86cd799439012',
      customerId: '507f1f77bcf86cd799439013',
      customerName: 'John Doe',
      customerUsername: 'johndoe',
      items: [{
        name: 'Delicious Dumplings',
        quantity: 3,
        unitPrice: 12.50,
        totalPrice: 37.50
      }],
      totalPrice: 37.50,
      specialInstructions: 'Extra spicy please!',
      queuePosition: 2
    };

    // Test the notification
    socketService.emitNewOrderToVendor(vendorId, orderData);
    
    console.log('✅ Vendor notification test completed successfully');
    console.log('📊 Test Data:', JSON.stringify(orderData, null, 2));
    
  } catch (error) {
    console.error('❌ Vendor notification test failed:', error);
  }
}

// Export for manual testing
module.exports = { testVendorNotification };

// Run test if called directly
if (require.main === module) {
  testVendorNotification();
}
