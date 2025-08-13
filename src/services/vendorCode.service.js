const httpStatus = require('http-status');
const { VendorCode } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Create vendor codes
 * @param {Array} codes
 * @returns {Promise<Array>}
 */
const createVendorCodes = async (codes) => {
  return VendorCode.insertMany(codes);
};

/**
 * Get all vendor codes
 * @param {Object} filter
 * @param {Object} options
 * @returns {Promise<QueryResult>}
 */
const queryVendorCodes = async (filter, options) => {
  const vendorCodes = await VendorCode.paginate(filter, options);
  return vendorCodes;
};

/**
 * Get vendor code by id
 * @param {ObjectId} id
 * @returns {Promise<VendorCode>}
 */
const getVendorCodeById = async (id) => {
  return VendorCode.findById(id);
};

/**
 * Get vendor code by code
 * @param {string} code
 * @returns {Promise<VendorCode>}
 */
const getVendorCodeByCode = async (code) => {
  return VendorCode.findOne({ code: code.toUpperCase() });
};

/**
 * Check if vendor code is available
 * @param {string} code
 * @returns {Promise<boolean>}
 */
const isVendorCodeAvailable = async (code) => {
  return VendorCode.isCodeAvailable(code);
};

/**
 * Use vendor code
 * @param {string} code
 * @param {ObjectId} userId
 * @returns {Promise<VendorCode>}
 */
const useVendorCode = async (code, userId) => {
  const vendorCode = await VendorCode.useCode(code, userId);
  if (!vendorCode) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid or already used vendor code');
  }
  return vendorCode;
};

/**
 * Get vendor code usage statistics
 * @returns {Promise<Object>}
 */
const getVendorCodeStats = async () => {
  const total = await VendorCode.countDocuments();
  const used = await VendorCode.countDocuments({ isUsed: true });
  const available = total - used;
  
  return {
    total,
    used,
    available,
    usagePercentage: total > 0 ? Math.round((used / total) * 100) : 0
  };
};

/**
 * Delete vendor code
 * @param {ObjectId} vendorCodeId
 * @returns {Promise<VendorCode>}
 */
const deleteVendorCodeById = async (vendorCodeId) => {
  const vendorCode = await getVendorCodeById(vendorCodeId);
  if (!vendorCode) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Vendor code not found');
  }
  await vendorCode.remove();
  return vendorCode;
};

module.exports = {
  createVendorCodes,
  queryVendorCodes,
  getVendorCodeById,
  getVendorCodeByCode,
  isVendorCodeAvailable,
  useVendorCode,
  getVendorCodeStats,
  deleteVendorCodeById,
};
