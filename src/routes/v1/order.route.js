const express = require('express');
const validate = require('../../middlewares/validate');
const orderValidation = require('../../validations/order.validation');
const orderController = require('../../controllers/order.controller');

const router = express.Router();

router
  .route('/')
  .post(validate(orderValidation.createOrder), orderController.createOrder)
  .get(validate(orderValidation.getOrders), orderController.getOrders);

router
  .route('/:orderId')
  .get(validate(orderValidation.getOrder), orderController.getOrder)
  .put(validate(orderValidation.updateOrder), orderController.updateOrder);

router
  .route('/:orderId/status')
  .put(validate(orderValidation.updateOrderStatus), orderController.updateOrderStatus);

router
  .route('/:orderId/cancel')
  .put(validate(orderValidation.getOrder), orderController.cancelOrder);

router
  .route('/:orderId/complete')
  .put(validate(orderValidation.getOrder), orderController.completeOrder);

router
  .route('/customer/:customerId')
  .get(orderController.getOrdersByCustomer);

router
  .route('/vendor/:vendorId')
  .get(orderController.getOrdersByVendor);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Order management and retrieval
 */

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Create an order
 *     description: Create a new order.
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vendorId
 *               - userId
 *               - quantity
 *             properties:
 *               vendorId:
 *                 type: string
 *                 description: ID of the vendor
 *               userId:
 *                 type: string
 *                 description: ID of the customer
 *               itemId:
 *                 type: string
 *                 description: Optional specific menu item ID
 *               quantity:
 *                 type: number
 *                 minimum: 1
 *                 description: Quantity of items
 *               item:
 *                 type: object
 *                 description: Item details if no itemId provided
 *                 properties:
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   price:
 *                     type: number
 *             example:
 *               vendorId: 507f1f77bcf86cd799439011
 *               userId: 507f1f77bcf86cd799439012
 *               itemId: 507f1f77bcf86cd799439013
 *               quantity: 2
 *     responses:
 *       "201":
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Order'
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   get:
 *     summary: Get all orders
 *     description: Retrieve orders with optional filtering.
 *     tags: [Orders]
 *     parameters:
 *       - in: query
 *         name: customer
 *         schema:
 *           type: string
 *         description: Filter by customer ID
 *       - in: query
 *         name: vendor
 *         schema:
 *           type: string
 *         description: Filter by vendor ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, preparing, ready, completed, cancelled]
 *         description: Filter by order status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: sort by query in the form of field:desc/asc (ex. createdAt:desc)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 10
 *         description: Maximum number of orders
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     results:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Order'
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     totalResults:
 *                       type: integer
 */
