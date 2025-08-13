const express = require('express');
const validate = require('../../middlewares/validate');
const { vendorCodeValidation } = require('../../validations');
const { vendorCodeController } = require('../../controllers');

const router = express.Router();

router
  .route('/')
  .get(validate(vendorCodeValidation.getVendorCodes), vendorCodeController.getVendorCodes);

router
  .route('/stats')
  .get(vendorCodeController.getVendorCodeStats);

router
  .route('/check/:code')
  .get(validate(vendorCodeValidation.checkVendorCode), vendorCodeController.checkVendorCode);

router
  .route('/:vendorCodeId')
  .get(validate(vendorCodeValidation.getVendorCode), vendorCodeController.getVendorCode)
  .delete(validate(vendorCodeValidation.deleteVendorCode), vendorCodeController.deleteVendorCode);

module.exports = router;
