const httpStatus = require('http-status');
const tokenService = require('./token.service');
const userService = require('./user.service');
const Token = require('../models/token.model');
const { VendorCode } = require('../models');
const ApiError = require('../utils/ApiError');
const { tokenTypes } = require('../config/tokens');
const { googleAuth } = require('../validations/auth.validation');

// Temporary storage for pending registrations (in production, use Redis or database)
const pendingRegistrations = new Map();

// Track tokens being processed to prevent duplicate calls
const processingTokens = new Set();

/**
 * Send verification email before registration
 * @param {Object} userData
 * @returns {Promise<string>}
 */
const sendPreRegistrationEmail = async (userData) => {
  // Check if user already exists
  const existingUser = await userService.getUserByEmail(userData.email);
  if (existingUser) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }

  // Check if username already exists (also check various transformations)
  if (userData.username) {
    const { User } = require('../models');
    const hasConflict = await User.hasUsernameConflict(userData.username);
    if (hasConflict) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Username conflicts with existing user. Please choose a different username.');
    }
  }

  // Check vendor code if provided
  let userType = 'customer'; // Default type
  if (userData.vendorCode) {
    const isValidVendorCode = await VendorCode.isCodeAvailable(userData.vendorCode);
    if (!isValidVendorCode) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid or already used vendor code');
    }
    userType = 'vendor';
  }

  // Generate verification token for email
  const verificationToken = require('crypto').randomBytes(32).toString('hex');
  
  // Store pending registration data with determined user type
  pendingRegistrations.set(verificationToken, {
    ...userData,
    type: userType, // Override type based on vendor code validation
    createdAt: new Date()
  });

  // Clean up old pending registrations (older than 24 hours)
  for (const [token, data] of pendingRegistrations.entries()) {
    if (new Date() - data.createdAt > 24 * 60 * 60 * 1000) {
      pendingRegistrations.delete(token);
    }
  }

  return verificationToken;
};

/**
 * Direct registration without email verification (also handles Google auth)
 * @param {Object} userData
 * @returns {Promise<User>}
 */
const registerUserDirect = async (userData) => {
  // Check if user already exists
  const existingUser = await userService.getUserByEmail(userData.email);
  if (existingUser) {
    // For Google auth, if user exists, update their Google ID if not already set
    if (userData.googleId && !existingUser.googleId) {
      await userService.updateUserById(existingUser.id, { googleId: userData.googleId });
      existingUser.googleId = userData.googleId;
    }
    return existingUser;
  }

  // Set username to be the same as name (with some sanitization)
  const username = userData.name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20);
  
  // Check if username already exists, if so, append a number
  const { User } = require('../models');
  let finalUsername = username;
  let counter = 1;
  
  while (await User.hasUsernameConflict(finalUsername)) {
    finalUsername = `${username}${counter}`;
    counter++;
  }

  // Generate a random password (you can modify this logic as needed)
  const randomPassword = require('crypto').randomBytes(8).toString('hex');

  // Create user data with Google fields if provided
  const userDataWithDefaults = {
    name: userData.name,
    email: userData.email,
    username: finalUsername,
    password: randomPassword, // Will be hashed by the User model
    type: userData.type || 'customer',
    googleAuth: {
      token: userData.token,
      googleId: userData.googleId,
    },
    isEmailVerified: true, // Skip email verification for direct registration
  };

  // Create the user
  const user = await userService.createUser(userDataWithDefaults);

  return user;
};

/**
 * Complete registration after email verification
 * @param {string} verificationToken
 * @returns {Promise<User>}
 */
const completeRegistration = async (verificationToken) => {
  // Check if this token is already being processed
  if (processingTokens.has(verificationToken)) {
    throw new ApiError(httpStatus.TOO_MANY_REQUESTS, 'Registration is already being processed. Please wait.');
  }

  // Mark token as being processed
  processingTokens.add(verificationToken);

  try {
    const pendingData = pendingRegistrations.get(verificationToken);
    if (!pendingData) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid or expired verification token');
    }

    // Check if token is expired (24 hours)
    if (new Date() - pendingData.createdAt > 24 * 60 * 60 * 1000) {
      pendingRegistrations.delete(verificationToken);
      throw new ApiError(httpStatus.BAD_REQUEST, 'Verification token has expired');
    }

    // Check if user already exists (to prevent duplicate calls)
    const existingUser = await userService.getUserByEmail(pendingData.email);
    if (existingUser) {
      // User already exists, clean up token and return existing user
      pendingRegistrations.delete(verificationToken);
      return existingUser;
    }

    // If user has a vendor code, mark it as used
    if (pendingData.vendorCode && pendingData.type === 'vendor') {
      // Create user first to get the user ID
      const tempUserData = { ...pendingData };
      delete tempUserData.vendorCode; // Remove vendorCode from user data
      
      const user = await userService.createUser({
        ...tempUserData,
        isEmailVerified: true // Mark as verified since they clicked the email link
      });

      // Mark vendor code as used
      await VendorCode.useCode(pendingData.vendorCode, user._id);

      // Clean up pending registration
      pendingRegistrations.delete(verificationToken);

      return user;
    } else {
      // Regular customer registration
      const tempUserData = { ...pendingData };
      delete tempUserData.vendorCode; // Remove vendorCode from user data if present
      
      const user = await userService.createUser({
        ...tempUserData,
        isEmailVerified: true // Mark as verified since they clicked the email link
      });

      // Clean up pending registration
      pendingRegistrations.delete(verificationToken);

      return user;
    }
  } finally {
    // Always remove from processing set
    processingTokens.delete(verificationToken);
  }
};

/**
 * Login with username and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<User>}
 */
const loginUserWithEmailAndPassword = async (email, password) => {
  const user = await userService.getUserByEmail(email);
  if (!user || !(await user.isPasswordMatch(password))) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password');
  }
  return user;
};

/**
 * Logout
 * @param {string} refreshToken
 * @returns {Promise}
 */
const logout = async (refreshToken) => {
  const refreshTokenDoc = await Token.findOne({ token: refreshToken, type: tokenTypes.REFRESH, blacklisted: false });
  if (!refreshTokenDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Not found');
  }
  await refreshTokenDoc.remove();
};

/**
 * Refresh auth tokens
 * @param {string} refreshToken
 * @returns {Promise<Object>}
 */
const refreshAuth = async (refreshToken) => {
  try {
    const refreshTokenDoc = await tokenService.verifyToken(refreshToken, tokenTypes.REFRESH);
    const user = await userService.getUserById(refreshTokenDoc.user);
    if (!user) {
      throw new Error();
    }
    await refreshTokenDoc.remove();
    return tokenService.generateAuthTokens(user);
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
  }
};

/**
 * Reset password
 * @param {string} resetPasswordToken
 * @param {string} newPassword
 * @returns {Promise}
 */
const resetPassword = async (resetPasswordToken, newPassword) => {
  try {
    const resetPasswordTokenDoc = await tokenService.verifyToken(resetPasswordToken, tokenTypes.RESET_PASSWORD);
    const user = await userService.getUserById(resetPasswordTokenDoc.user);
    if (!user) {
      throw new Error();
    }
    await userService.updateUserById(user.id, { password: newPassword });
    await Token.deleteMany({ user: user.id, type: tokenTypes.RESET_PASSWORD });
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Password reset failed');
  }
};

/**
 * Verify email
 * @param {string} verifyEmailToken
 * @returns {Promise}
 */
const verifyEmail = async (verifyEmailToken) => {
  try {
    const verifyEmailTokenDoc = await tokenService.verifyToken(verifyEmailToken, tokenTypes.VERIFY_EMAIL);
    const user = await userService.getUserById(verifyEmailTokenDoc.user);
    if (!user) {
      throw new Error();
    }
    await Token.deleteMany({ user: user.id, type: tokenTypes.VERIFY_EMAIL });
    await userService.updateUserById(user.id, { isEmailVerified: true });
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Email verification failed');
  }
};

module.exports = {
  sendPreRegistrationEmail,
  completeRegistration,
  registerUserDirect,
  loginUserWithEmailAndPassword,
  logout,
  refreshAuth,
  resetPassword,
  verifyEmail,
};
