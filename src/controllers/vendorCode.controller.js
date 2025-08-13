const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { vendorCodeService } = require('../services');

const getVendorCodes = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['isUsed']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await vendorCodeService.queryVendorCodes(filter, options);
  res.send(result);
});

const getVendorCode = catchAsync(async (req, res) => {
  const vendorCode = await vendorCodeService.getVendorCodeById(req.params.vendorCodeId);
  if (!vendorCode) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Vendor code not found');
  }
  res.send(vendorCode);
});

const checkVendorCode = catchAsync(async (req, res) => {
  const { code } = req.params;
  const isAvailable = await vendorCodeService.isVendorCodeAvailable(code);
  const vendorCode = await vendorCodeService.getVendorCodeByCode(code);
  
  res.send({
    code: code.toUpperCase(),
    isAvailable,
    isUsed: vendorCode ? vendorCode.isUsed : false,
    usedBy: vendorCode && vendorCode.isUsed ? vendorCode.usedBy : null,
    usedAt: vendorCode && vendorCode.isUsed ? vendorCode.usedAt : null
  });
});

const getVendorCodeStats = catchAsync(async (req, res) => {
  const stats = await vendorCodeService.getVendorCodeStats();
  res.send(stats);
});

const deleteVendorCode = catchAsync(async (req, res) => {
  await vendorCodeService.deleteVendorCodeById(req.params.vendorCodeId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  getVendorCodes,
  getVendorCode,
  checkVendorCode,
  getVendorCodeStats,
  deleteVendorCode,
};
