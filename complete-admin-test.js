// Complete admin authentication test
const testCompleteAdminFlow = async () => {
  console.log('🧪 COMPLETE ADMIN AUTHENTICATION TEST');
  console.log('=====================================\n');
  
  try {
    // Step 1: Login as admin
    console.log('Step 1: Logging in as admin...');
    const loginResponse = await fetch('/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'zen.tang.lam@gmail.com',
        password: 'admin123'
      })
    });
    
    console.log('Login response status:', loginResponse.status);
    
    if (!loginResponse.ok) {
      const errorData = await loginResponse.json();
      console.error('❌ Login failed:', errorData);
      return;
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ Login successful!');
    console.log('User:', {
      name: loginData.user.name,
      email: loginData.user.email,
      type: loginData.user.type,
      role: loginData.user.role
    });
    
    const accessToken = loginData.tokens.access.token;
    console.log('🎫 Access token received (first 20 chars):', accessToken.substring(0, 20) + '...');
    
    // Step 2: Store token (simulate what frontend should do)
    localStorage.setItem('authTokenKejia', accessToken);
    localStorage.setItem('user', JSON.stringify(loginData.user));
    console.log('💾 Token stored in localStorage');
    
    // Step 3: Make admin dashboard call
    console.log('\nStep 2: Making admin dashboard call...');
    const dashboardResponse = await fetch('/v1/admin/dashboard', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    console.log('Dashboard response status:', dashboardResponse.status);
    
    if (dashboardResponse.ok) {
      const dashboardData = await dashboardResponse.json();
      console.log('✅ Admin dashboard call successful!');
      console.log('Dashboard data:', dashboardData);
    } else {
      const errorData = await dashboardResponse.json();
      console.error('❌ Admin dashboard call failed:', errorData);
    }
    
    // Step 4: Test platform fee endpoint
    console.log('\nStep 3: Testing platform fee endpoint...');
    const platformFeeResponse = await fetch('/v1/admin/platform-fee', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    console.log('Platform fee response status:', platformFeeResponse.status);
    
    if (platformFeeResponse.ok) {
      const platformFeeData = await platformFeeResponse.json();
      console.log('✅ Platform fee call successful!');
      console.log('Platform fee data:', platformFeeData);
    } else {
      const errorData = await platformFeeResponse.json();
      console.error('❌ Platform fee call failed:', errorData);
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
};

// Run the complete test
testCompleteAdminFlow();
