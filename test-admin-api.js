const axios = require('axios');

// Create API client
const apiClient = axios.create({
  baseURL: 'http://localhost:8000/v1',
  headers: {
    'Content-Type': 'application/json'
  }
});

async function testAdminAPI() {
  try {
    console.log('🔐 Step 1: Authenticating as admin...');
    
    // Step 1: Login as admin to get JWT token
    const loginResponse = await apiClient.post('/auth/login', {
      email: 'zen.tang.lam@gmail.com',
      password: 'admin123' // Updated with correct password
    });
    
    console.log('✅ Login successful');
    const { user, tokens } = loginResponse.data;
    const accessToken = tokens.access.token;
    
    console.log('👤 Logged in as:', {
      name: user.name,
      email: user.email,
      type: user.type
    });
    
    console.log('🎫 Access token received:', accessToken.substring(0, 20) + '...');
    
    // Step 2: Set authorization header for subsequent requests
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    
    console.log('\n📊 Step 2: Testing admin endpoints...');
    
    // Test platform fee endpoint
    console.log('🔍 Getting platform fee...');
    const platformFeeResponse = await apiClient.get('/admin/platform-fee');
    console.log('✅ Platform fee:', platformFeeResponse.data);
    
    // Test dashboard stats
    console.log('🔍 Getting dashboard stats...');
    const dashboardResponse = await apiClient.get('/admin/dashboard');
    console.log('✅ Dashboard stats:', dashboardResponse.data);
    
    // Test updating platform fee
    console.log('🔍 Updating platform fee to 20%...');
    const updateResponse = await apiClient.put('/admin/platform-fee', {
      percentage: 20
    });
    console.log('✅ Platform fee updated:', updateResponse.data);
    
    // Verify the update
    console.log('🔍 Verifying platform fee update...');
    const verifyResponse = await apiClient.get('/admin/platform-fee');
    console.log('✅ Updated platform fee:', verifyResponse.data);
    
    console.log('\n🎉 All admin API tests passed!');
    
  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', {
        status: error.response.status,
        message: error.response.data.message || error.response.statusText,
        endpoint: error.config.url
      });
    } else {
      console.error('❌ Network Error:', error.message);
    }
  }
}

// Run the test
testAdminAPI();
