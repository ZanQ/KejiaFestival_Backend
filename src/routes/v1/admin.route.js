const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const adminValidation = require('../../validations/admin.validation');
const adminController = require('../../controllers/admin.controller');

const router = express.Router();

router
  .route('/dashboard')
  .get(auth('manageUsers'), adminController.getDashboardStats);

router
  .route('/users')
  .get(auth('manageUsers'), validate(adminValidation.getUsers), adminController.getUsers);

router
  .route('/vendors')
  .get(auth('manageUsers'), validate(adminValidation.getVendors), adminController.getVendors);

router
  .route('/transactions')
  .get(auth('manageUsers'), validate(adminValidation.getTransactions), adminController.getTransactions);

router
  .route('/vendors/:vendorId/approve')
  .put(auth('manageUsers'), validate(adminValidation.approveVendor), adminController.approveVendor);

router
  .route('/users/:userId/suspend')
  .put(auth('manageUsers'), validate(adminValidation.suspendUser), adminController.suspendUser);

router
  .route('/users/:userId/unsuspend')
  .put(auth('manageUsers'), validate(adminValidation.unsuspendUser), adminController.unsuspendUser);

router
  .route('/platform-fee')
  .get(auth('manageUsers'), adminController.getPlatformFee)
  .put(auth('manageUsers'), validate(adminValidation.updatePlatformFee), adminController.updatePlatformFee);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin management and statistics
 */

/**
 * @swagger
 * /admin/dashboard:
 *   get:
 *     summary: Get dashboard statistics
 *     description: Retrieve comprehensive dashboard statistics including user counts, order metrics, and financial data
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         vendors:
 *                           type: number
 *                         customers:
 *                           type: number
 *                         pendingVendors:
 *                           type: number
 *                         recentUsers:
 *                           type: number
 *                     orders:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         pending:
 *                           type: number
 *                         completed:
 *                           type: number
 *                         recentOrders:
 *                           type: number
 *                     finance:
 *                       type: object
 *                       properties:
 *                         totalRevenue:
 *                           type: number
 *                         platformFeesCollected:
 *                           type: number
 *                         platformFeePercentage:
 *                           type: number
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Get all users
 *     description: Retrieve all users with pagination and filtering
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Filter by user name
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         description: Filter by email
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [customer, vendor]
 *         description: Filter by user type
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Sort by field
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Maximum number of users
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /admin/platform-fee:
 *   get:
 *     summary: Get platform fee
 *     description: Get current platform fee percentage
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     percentage:
 *                       type: number
 *                       example: 5
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *   put:
 *     summary: Update platform fee
 *     description: Update the platform fee percentage
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - percentage
 *             properties:
 *               percentage:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 example: 5
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     percentage:
 *                       type: number
 *                 message:
 *                   type: string
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /admin/vendors/{vendorId}/approve:
 *   put:
 *     summary: Approve a vendor
 *     description: Approve a vendor account
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vendorId
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor id
 *     responses:
 *       "200":
 *         description: OK
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /admin/users/{userId}/suspend:
 *   put:
 *     summary: Suspend a user
 *     description: Suspend a user account
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User id
 *     responses:
 *       "200":
 *         description: OK
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */
