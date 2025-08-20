const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { authService, userService, tokenService, emailService } = require('../services');
const axios = require('axios'); 

const CoOwnersAPI = 'https://prod.co-owners.ca:8000/v1'

const register = catchAsync(async (req, res) => {  
  // Send verification email first
  const verificationToken = await authService.sendPreRegistrationEmail(req.body);
  await emailService.sendPreRegistrationEmail(req.body.email, verificationToken, req.body.name, req.body.coOwners);
  
  res.status(httpStatus.OK).send({ 
    message: 'Verification email sent. Please check your email to complete registration.' 
  });
});

const completeRegistration = catchAsync(async (req, res) => {
  const { token } = req.body; // Changed from req.query to req.body
  
  console.log('Complete registration called with token:', token?.substring(0, 8) + '...');
  
  const user = await authService.completeRegistration(token);
  const tokens = await tokenService.generateAuthTokens(user);

  console.log('Registration completed for user:', user.email, 'type:', user.type);

  //Signup User on Co-Owners
    await axios.post(`${CoOwnersAPI}/auth/register`, {
      email: user.email,
      name: user.name,
      username: user.username,
      password: user.password,
      isEmailVerified: true,
    });

  // When sending the user data back, ensure sensitive information is not included
  user.password = undefined; // Remove password from response
  user.isEmailVerified = undefined; // Remove email verification status from response
  user.coOwners = undefined; // Remove co-owners from response
  user.createdAt = undefined; // Remove createdAt from response
  user.updatedAt = undefined; // Remove updatedAt from responsepe
  user.roles = undefined; // Remove roles from response

  if (user.type === 'customer') {
    user.vendorDashboard = undefined; // Remove vendor details from response
    user.salesHistory = undefined; // Remove sales history from response
    user.totalSales = undefined; // Remove total sales from response
  }
  if (user.type === 'vendor') {
    user.pendingOrders = undefined; // Remove pending orders from response
    user.completedOrders = undefined; // Remove completed orders from response
    user.notifications = undefined; // Remove notifications from response
    user.fundsAddedHistory = undefined; // Remove funds added history from response
    user.scans = undefined; // Remove scans from response
  }

  res.status(httpStatus.OK).send({ user, tokens });
});

const registerDirect = catchAsync(async (req, res) => {
  const { name, email, type, token, firstName, lastName, googleId } = req.body;
  
  // Log different types of registration
  if (googleId && token) {
    console.log('Google authentication called with data:', { 
      name, 
      email, 
      firstName, 
      lastName, 
      googleId: googleId.substring(0, 8) + '...', 
      type: 'customer'
    });
  } else {
    console.log('Direct registration called with data:', { name, email, type: type || 'customer' });
  }

  const user = await authService.registerUserDirect(req.body);
  const tokens = await tokenService.generateAuthTokens(user);

  const registrationType = googleId ? 'Google authentication' : 'Direct registration';

  console.log(`${registrationType} completed for user:`, {
    email: user.email, 
    type: user.type, 
    username: user.username,
    ...(user.googleId && { hasGoogleId: true })
  });

  //Register on Co-Owners
  await axios.post(`${CoOwnersAPI}/auth/signUpWithGoogle`, {
    email: user.email,
    name: user.name,
    username: user.username,
    isEmailVerified: true
  });


  // Clean up user data for response - create a clean copy to avoid mutating the original
  const cleanUser = {
    ...user.toObject ? user.toObject() : user,
    password: undefined,
    isEmailVerified: undefined,
    coOwners: undefined,
    createdAt: undefined,
    updatedAt: undefined,
    roles: undefined,
  };

  if (cleanUser.type === 'customer') {
    cleanUser.vendorDashboard = undefined;
    cleanUser.salesHistory = undefined;
    cleanUser.totalSales = undefined;
  }
  if (cleanUser.type === 'vendor') {
    cleanUser.pendingOrders = undefined;
    cleanUser.completedOrders = undefined;
    cleanUser.notifications = undefined;
    cleanUser.fundsAddedHistory = undefined;
    cleanUser.scans = undefined;
  }

  res.status(httpStatus.CREATED).send({ user: cleanUser, tokens });
});

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  const user = await authService.loginUserWithEmailAndPassword(email, password);
  const tokens = await tokenService.generateAuthTokens(user);

  // When sending the user data back, ensure sensitive information is not included
  user.password = undefined; // Remove password from response
  user.isEmailVerified = undefined; // Remove email verification status from response
  user.coOwners = undefined; // Remove co-owners from response
  user.createdAt = undefined; // Remove createdAt from response
  user.updatedAt = undefined; // Remove updatedAt from responsepe
  user.roles = undefined; // Remove roles from response

  if (user.type === 'customer') {
    user.vendorDashboard = undefined; // Remove vendor details from response
    user.salesHistory = undefined; // Remove sales history from response
    user.totalSales = undefined; // Remove total sales from response
  }
  if (user.type === 'vendor') {
    user.pendingOrders = undefined; // Remove pending orders from response
    user.completedOrders = undefined; // Remove completed orders from response
    user.notifications = undefined; // Remove notifications from response
    user.fundsAddedHistory = undefined; // Remove funds added history from response
    user.scans = undefined; // Remove scans from response
  }

  res.send({ user, tokens });
});

const logout = catchAsync(async (req, res) => {
  await authService.logout(req.body.refreshToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const refreshTokens = catchAsync(async (req, res) => {
  const tokens = await authService.refreshAuth(req.body.refreshToken);
  res.send({ ...tokens });
});

const forgotPassword = catchAsync(async (req, res) => {
  const resetPasswordToken = await tokenService.generateResetPasswordToken(req.body.email);
  await emailService.sendResetPasswordEmail(req.body.email, resetPasswordToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const resetPassword = catchAsync(async (req, res) => {
  await authService.resetPassword(req.query.token, req.body.password);
  res.status(httpStatus.NO_CONTENT).send();
});

const sendVerificationEmail = catchAsync(async (req, res) => {
  const verifyEmailToken = await tokenService.generateVerifyEmailToken(req.user);
  await emailService.sendVerificationEmail(req.user.email, verifyEmailToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const verifyEmail = catchAsync(async (req, res) => {
  await authService.verifyEmail(req.query.token);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  register,
  registerDirect,
  completeRegistration,
  login,
  logout,
  refreshTokens,
  forgotPassword,
  resetPassword,
  sendVerificationEmail,
  verifyEmail,
};
