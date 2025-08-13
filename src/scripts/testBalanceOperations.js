const mongoose = require('mongoose');
const config = require('../config/config');
const { User } = require('../models');

/**
 * Test balance operations
 */
async function testBalanceOperations() {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    console.log('Connected to MongoDB');

    // Find some test users (customer and vendor)
    const customer = await User.findOne({ type: 'customer' });
    const vendor = await User.findOne({ type: 'vendor' });

    if (!customer || !vendor) {
      console.log('❌ Need at least one customer and one vendor to test');
      return;
    }

    console.log('\n🔍 Testing Balance Operations');
    console.log('Customer:', customer.name, '(', customer.email, ')');
    console.log('Vendor:', vendor.name, '(', vendor.email, ')');
    
    const testAmount = 10.50;
    
    // Show initial balances
    console.log('\n📊 Initial Balances:');
    console.log(`Customer: $${customer.balance}`);
    console.log(`Vendor: $${vendor.balance}`);

    // Test deductFunds
    console.log(`\n💰 Testing deductFunds($${testAmount})...`);
    try {
      await customer.deductFunds(testAmount);
      console.log('✅ Customer deductFunds successful');
      
      // Refresh and show updated balance
      const updatedCustomer = await User.findById(customer._id);
      console.log(`Customer new balance: $${updatedCustomer.balance}`);
    } catch (error) {
      console.log('❌ Customer deductFunds failed:', error.message);
    }

    // Test addFunds
    console.log(`\n💰 Testing addFunds($${testAmount})...`);
    try {
      await vendor.addFunds(testAmount);
      console.log('✅ Vendor addFunds successful');
      
      // Refresh and show updated balance
      const updatedVendor = await User.findById(vendor._id);
      console.log(`Vendor new balance: $${updatedVendor.balance}`);
    } catch (error) {
      console.log('❌ Vendor addFunds failed:', error.message);
    }

    console.log('\n✅ Balance operation test completed');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Export for manual testing
module.exports = { testBalanceOperations };

// Run test if called directly
if (require.main === module) {
  testBalanceOperations();
}
