const express = require('express');
const authRoute = require('./auth.route');
const userRoute = require('./user.route');
const menuItemRoute = require('./menuItem.route');
const orderRoute = require('./order.route');
const vendorCodeRoute = require('./vendorCode.route');
const vendorRoute = require('./vendor.route');
const adminRoute = require('./admin.route');
const testRoute = require('./test.route');
const docsRoute = require('./docs.route');
const config = require('../../config/config');

const router = express.Router();

const defaultRoutes = [
  {
    path: '/auth',
    route: authRoute,
  },
  {
    path: '/users',
    route: userRoute,
  },
  {
    path: '/menu-items',
    route: menuItemRoute,
  },
  {
    path: '/orders',
    route: orderRoute,
  },
  {
    path: '/vendor-codes',
    route: vendorCodeRoute,
  },
  {
    path: '/vendors',
    route: vendorRoute,
  },
  {
    path: '/admin',
    route: adminRoute,
  },
];

const devRoutes = [
  // routes available only in development mode
  {
    path: '/docs',
    route: docsRoute,
  },
  {
    path: '/test',
    route: testRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

/* istanbul ignore next */
if (config.env === 'development') {
  devRoutes.forEach((route) => {
    router.use(route.path, route.route);
  });
}

module.exports = router;
