const allRoles = {
  customer: ['viewOrders', 'createOrders', 'viewProfile', 'manageProfile'],
  vendor: ['viewOrders', 'createOrders', 'viewProfile', 'manageProfile', 'viewSales', 'manageSales', 'viewDashboard', 'manageMenuItems'],
  admin: ['getUsers', 'manageUsers', 'viewAllOrders', 'manageAllOrders', 'viewAllSales', 'manageSystem', 'manageMenuItems'],
};

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));

module.exports = {
  roles,
  roleRights,
};
