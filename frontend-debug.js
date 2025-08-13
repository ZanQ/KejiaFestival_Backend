// Frontend debugging helper - add this to your frontend code temporarily

const debugAdminCall = async () => {
  console.log('🔍 DEBUG: Starting admin dashboard call');
  
  // Check what's in localStorage
  const token1 = localStorage.getItem('authTokenKejia');
  const token2 = localStorage.getItem('authToken');
  const userSession = sessionStorage.getItem('userKejia') || localStorage.getItem('user');
  
  console.log('🔍 localStorage authTokenKejia:', token1 ? token1.substring(0, 20) + '...' : 'NOT FOUND');
  console.log('🔍 localStorage authToken:', token2 ? token2.substring(0, 20) + '...' : 'NOT FOUND');
  console.log('🔍 userSession:', userSession ? JSON.parse(userSession) : 'NOT FOUND');
  
  const token = token1 || token2;
  console.log('🔍 Final token being used:', token ? token.substring(0, 20) + '...' : 'NULL');
  
  if (!token) {
    console.error('❌ No token found! User needs to login first.');
    return;
  }
  
  try {
    console.log('📡 Making admin dashboard request...');
    const response = await fetch('/v1/admin/dashboard', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      }
    });
    
    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('📡 Response data:', data);
    
    if (response.ok) {
      console.log('✅ Admin dashboard call successful!');
    } else {
      console.error('❌ Admin dashboard call failed:', data);
    }
    
  } catch (error) {
    console.error('❌ Network error:', error);
  }
};

// Call this function to debug
debugAdminCall();
