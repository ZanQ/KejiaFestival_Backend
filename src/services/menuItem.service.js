const httpStatus = require('http-status');
const { MenuItem } = require('../models');
const ApiError = require('../utils/ApiError');

// Note: OrderItem model doesn't exist, using Order model instead
const { Order } = require('../models');

/**
 * Create a menu item
 * @param {Object} menuItemBody
 * @returns {Promise<MenuItem>}
 */
const createMenuItem = async (menuItemBody) => {
  const { userId, ...itemData } = menuItemBody;
  
  // Set vendor to userId
  itemData.vendor = userId;
  
  // Create the menu item
  const menuItem = await MenuItem.create(itemData);
  return menuItem;
};

/**
 * Query for menu items
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryMenuItems = async (userId) => {
  const menuItems = await MenuItem.find({ vendor: userId });
  
  // Check if OrderItem collection has any documents before counting
  const hasOrderItems = await Order.exists({});
  
  //Find how many have been sold for each item and return plain objects
  const menuItemsWithSoldCount = [];
  for (let item of menuItems) {
    const itemObj = item.toObject(); // Convert to plain object
    if (hasOrderItems) {
      const totalSold = await Order.countDocuments({
        'items.menuItemId': item._id || item.id
      });
      itemObj.soldCount = totalSold;
    } else {
      itemObj.soldCount = 0;
    }
    menuItemsWithSoldCount.push(itemObj);
  }

  return menuItemsWithSoldCount;
};

/**
 * Get menu item by id
 * @param {ObjectId} id
 * @returns {Promise<MenuItem>}
 */
const getMenuItemById = async (id) => {
  return MenuItem.findById(id).populate('vendor', 'name email username');
};

/**
 * Update menu item by id
 * @param {ObjectId} menuItemId
 * @param {Object} updateBody
 * @returns {Promise<MenuItem>}
 */
const updateMenuItemById = async (menuItemId, updateBody) => {
  const menuItem = await getMenuItemById(menuItemId);
  if (!menuItem) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Menu item not found');
  }
  
  Object.assign(menuItem, updateBody);
  await menuItem.save();
  return menuItem;
};

/**
 * Delete menu item by id
 * @param {ObjectId} menuItemId
 * @returns {Promise<MenuItem>}
 */
const deleteMenuItemById = async (menuItemId) => {
  const menuItem = await getMenuItemById(menuItemId);
  if (!menuItem) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Menu item not found');
  }
  await menuItem.deleteOne();
  return menuItem;
};

module.exports = {
  createMenuItem,
  queryMenuItems,
  getMenuItemById,
  updateMenuItemById,
  deleteMenuItemById,
};
