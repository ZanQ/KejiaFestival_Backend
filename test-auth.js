const axios = require('axios');

// Test authentication for menu item creation
async function testAuth() {
  const baseURL = 'http://localhost:3000/v1';
  
  try {
    console.log('Testing authentication for menu item creation...\n');
    
    // Test 1: Try to create menu item without authentication (should fail)
    console.log('1. Testing without authentication (should fail):');
    try {
      const response = await axios.post(`${baseURL}/menu-items`, {
        name: 'Test Item',
        description: 'Test Description',
        price: 10.99,
        userId: 'test-user-id'
      });
      console.log('❌ Unexpected success - this should have failed');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Correctly rejected: 401 Unauthorized');
        console.log('   Message:', error.response.data.message);
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }
    
    console.log('\n2. To test with authentication, you need to:');
    console.log('   a) Login first: POST /v1/auth/login');
    console.log('   b) Use the access token in Authorization header');
    console.log('   c) Make sure your user has "vendor" or "admin" role');
    console.log('\nExample request:');
    console.log('   Authorization: Bearer <your-access-token>');
    console.log('   Content-Type: application/json');
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Check if axios is available
try {
  testAuth();
} catch (error) {
  console.log('This test requires axios. Install it with: npm install axios');
  console.log('\nAlternatively, use curl to test:');
  console.log('curl -X POST http://localhost:3000/v1/menu-items \\');
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -d \'{"name":"Test","description":"Test","price":10.99,"userId":"test"}\'');
  console.log('\nShould return 401 Unauthorized');
}
