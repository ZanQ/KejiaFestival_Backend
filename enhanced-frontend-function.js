// Enhanced version of your frontend getDashboardStats function with debugging
getDashboardStats: async () => {
  console.log('🔍 getDashboardStats called');
  
  const token = localStorage.getItem('authTokenKejia') || localStorage.getItem('authToken');
  const userSession = sessionStorage.getItem('userKejia') || localStorage.getItem('user');
  
  console.log('🔍 Token found:', token ? 'YES (' + token.substring(0, 20) + '...)' : 'NO');
  console.log('🔍 User session:', userSession ? JSON.parse(userSession) : 'NO');
  
  if (!token) {
    console.error('❌ No auth token found! User needs to login.');
    throw new Error('Authentication required - please login first');
  }
  
  console.log('📡 Making admin dashboard request...');
  
  try {
    const response = await apiClient.get('/admin/dashboard', {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });
    
    console.log('✅ Admin dashboard response:', response.data);
    return response.data;
    
  } catch (error) {
    console.error('❌ Admin dashboard error:', {
      status: error.response?.status,
      message: error.response?.data?.message,
      data: error.response?.data
    });
    
    if (error.response?.status === 401) {
      console.log('🔄 Token might be expired - redirecting to login');
      // Clear expired token
      localStorage.removeItem('authTokenKejia');
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      sessionStorage.removeItem('userKejia');
      
      // Redirect to login or show login modal
      // window.location.href = '/login';
    }
    
    throw error;
  }
},
