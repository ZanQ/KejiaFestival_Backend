const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { userService, menuItemService, imageUploadService, qrCodeService, orderService } = require('../services');

const createMenuItem = catchAsync(async (req, res) => {
  let menuItemData = { ...req.body };
  
  // Handle image upload if present
  if (req.body.image && typeof req.body.image === 'string' && req.body.image.startsWith('data:')) {
    // Base64 image - upload to Google Cloud Storage
    try {
      const imageUrl = await imageUploadService.uploadMenuItemImage(
        req.body.image, 
        req.body.userId,
        {
          width: 800,
          height: 600, 
          quality: 85
        }
      );
      menuItemData.image = imageUrl;
    } catch (error) {
      throw new ApiError(httpStatus.BAD_REQUEST, `Image upload failed: ${error.message}`);
    }
  } else if (req.file) {
    // Multer file upload
    try {
      const imageUrl = await imageUploadService.uploadMenuItemImage(
        req.file,
        req.body.userId,
        {
          width: 800,
          height: 600,
          quality: 85
        }
      );
      menuItemData.image = imageUrl;
    } catch (error) {
      throw new ApiError(httpStatus.BAD_REQUEST, `Image upload failed: ${error.message}`);
    }
  }

  // Create the menu item first
  const menuItem = await menuItemService.createMenuItem(menuItemData);

  // Generate QR code for the menu item using the created item's ID
  try {
    const qrCodeUrl = await qrCodeService.generateMenuItemQRCode(
      menuItem, 
      req.body.userId, 
      menuItem._id || menuItem.id
    );
    
    // Update the menu item with the QR code URL
    await menuItemService.updateMenuItemById(menuItem._id || menuItem.id, { qrCode: qrCodeUrl });
    menuItem.qrCode = qrCodeUrl;
  } catch (error) {
    // Log the error but don't fail the creation if QR code generation fails
    console.warn('Failed to generate QR code:', error.message);
  }

  res.status(httpStatus.CREATED).send(menuItem);
});

const getMenuItems = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['category', 'subcategory', 'isAvailable', 'vendor']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await menuItemService.queryMenuItems(filter, options);
  res.send(result);
});

const getMenuItem = catchAsync(async (req, res) => {
  const menuItem = await menuItemService.getMenuItemById(req.params.menuItemId);

  if (!menuItem) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Menu item not found');
  }

  // Get vendor information if not already populated
  let vendorName = 'Unknown Vendor';
  let vendorId = 'unknown-vendor';
  
  if (menuItem.vendor) {
    if (typeof menuItem.vendor === 'string') {
      // If vendor is just an ID, fetch the user details
      const vendor = await userService.getUserById(menuItem.vendor);
      vendorName = vendor?.name || vendor?.username || 'Unknown Vendor';
      vendorId = vendor?._id || vendor?.id || menuItem.vendor;
    } else {
      // If vendor is already populated
      vendorName = menuItem.vendor.username || 'Unknown Vendor';
      vendorId = menuItem.vendor._id || menuItem.vendor.id || 'unknown-vendor';
    }
  }

  // Get the sold count from orders for this specific menu item
  let soldCount = 0;
  if (menuItem.vendor) {
    const vendor = await userService.getUserById(menuItem.vendor);

    if (vendor) {
      // Use MongoDB aggregation to count orders containing this menu item
      // This is much more efficient than fetching all orders and filtering in JavaScript
      const { Order } = require('../models');
      
      console.log(`Counting sold items for menu item ${menuItem._id || menuItem.id} by vendor ${vendor._id}`);
      soldCount = await Order.countDocuments({
        vendor: vendor._id,
        'items.menuItemId': menuItem._id || menuItem.id
      });
    }
  }

  // Format the response to match frontend expectations
  const productData = {
    id: menuItem.id || menuItem._id || req.params.menuItemId,
    name: menuItem.name || 'Unknown Item',
    description: menuItem.description || 'No description available',
    price: menuItem.price || 0,
    image: menuItem.image || '🍽️',
    vendor: vendorName,
    vendorId: vendorId,
    soldCount: soldCount
  };

  res.status(httpStatus.OK).send({ data: productData });
});

const getMenuItemsByVendor = catchAsync(async (req, res) => {
 
  // Get the Session Token from the request parameters
  const sessionToken = req.params.token;

  //Extract the userId from the session token
  const user = await userService.getUserBySessionToken(sessionToken);
  
  const result = await menuItemService.queryMenuItems(user._id);

  res.status(httpStatus.OK).send({ data: result });
});

const updateMenuItem = catchAsync(async (req, res) => {
  let updateData = { ...req.body };

  // Handle image upload if present
  if (req.body.image && typeof req.body.image === 'string' && req.body.image.startsWith('data:')) {
    // Base64 image - upload to Google Cloud Storage
    try {
      // Get the existing menu item to find the vendor
      const existingItem = await menuItemService.getMenuItemById(req.params.menuItemId);
      
      const imageUrl = await imageUploadService.uploadMenuItemImage(
        req.body.image,
        existingItem.vendor,
        {
          width: 800,
          height: 600,
          quality: 85
        }
      );
      updateData.image = imageUrl;

      // Optionally delete old image
      if (existingItem.image && existingItem.image.includes('storage.googleapis.com')) {
        try {
          await imageUploadService.deleteMenuItemImage(existingItem.image);
        } catch (error) {
          // Log but don't fail the update if old image deletion fails
          console.warn('Failed to delete old image:', error.message);
        }
      }
    } catch (error) {
      throw new ApiError(httpStatus.BAD_REQUEST, `Image upload failed: ${error.message}`);
    }
  } else if (req.file) {
    // Multer file upload
    try {
      const existingItem = await menuItemService.getMenuItemById(req.params.menuItemId);
      
      const imageUrl = await imageUploadService.uploadMenuItemImage(
        req.file,
        existingItem.vendor,
        {
          width: 800,
          height: 600,
          quality: 85
        }
      );
      updateData.image = imageUrl;

      // Optionally delete old image
      if (existingItem.image && existingItem.image.includes('storage.googleapis.com')) {
        try {
          await imageUploadService.deleteMenuItemImage(existingItem.image);
        } catch (error) {
          console.warn('Failed to delete old image:', error.message);
        }
      }
    } catch (error) {
      throw new ApiError(httpStatus.BAD_REQUEST, `Image upload failed: ${error.message}`);
    }
  }

  const menuItem = await menuItemService.updateMenuItemById(req.params.menuItemId, updateData);
  res.send(menuItem);
});

const deleteMenuItem = catchAsync(async (req, res) => {
  // Get the menu item to check for images and QR codes to delete
  try {
    const menuItem = await menuItemService.getMenuItemById(req.params.menuItemId);
    
    // Delete associated image from Google Cloud Storage
    if (menuItem.image && menuItem.image.includes('storage.googleapis.com')) {
      try {
        await imageUploadService.deleteMenuItemImage(menuItem.image);
      } catch (error) {
        console.warn('Failed to delete image from storage:', error.message);
      }
    }

    // Delete associated QR code from Google Cloud Storage
    if (menuItem.qrCode && menuItem.qrCode.includes('storage.googleapis.com')) {
      try {
        await qrCodeService.deleteQRCode(menuItem.qrCode);
      } catch (error) {
        console.warn('Failed to delete QR code from storage:', error.message);
      }
    }
  } catch (error) {
    // Continue with deletion even if cleanup fails
    console.warn('Failed to retrieve menu item for cleanup:', error.message);
  }

  await menuItemService.deleteMenuItemById(req.params.menuItemId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createMenuItem,
  getMenuItems,
  getMenuItem,
  getMenuItemsByVendor,
  updateMenuItem,
  deleteMenuItem,
};
