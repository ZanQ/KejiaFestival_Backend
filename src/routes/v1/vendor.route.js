const express = require('express');
const validate = require('../../middlewares/validate');
const vendorController = require('../../controllers/vendor.controller');

const router = express.Router();

router
  .route('/:vendorId')
  .get(vendorController.getVendor);

module.exports = router;
