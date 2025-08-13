const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { uploadSingle } = require('../../middlewares/upload');
const menuItemValidation = require('../../validations/menuItem.validation');
const menuItemController = require('../../controllers/menuItem.controller');

const router = express.Router();

router
  .route('/')
  .post(
    validate(menuItemValidation.createMenuItem), 
    menuItemController.createMenuItem
  )
  .get(validate(menuItemValidation.getMenuItems), menuItemController.getMenuItems);

// Separate route for multipart form data uploads
router
  .route('/upload')
  .post(
    ...uploadSingle('image'), // Handle file upload
    validate(menuItemValidation.createMenuItem), 
    menuItemController.createMenuItem
  );

router
  .route('/vendor/:token')
  .get(menuItemController.getMenuItemsByVendor);

router
  .route('/:menuItemId')
  .get(validate(menuItemValidation.getMenuItem), menuItemController.getMenuItem)
  .put(
    validate(menuItemValidation.updateMenuItem), 
    menuItemController.updateMenuItem
  )
  .delete(validate(menuItemValidation.deleteMenuItem), menuItemController.deleteMenuItem);

// Separate route for multipart form data updates
router
  .route('/:menuItemId/upload')
  .put(
    ...uploadSingle('image'), // Handle file upload
    validate(menuItemValidation.updateMenuItem), 
    menuItemController.updateMenuItem
  );

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Menu Items
 *   description: Menu item management and retrieval
 */

/**
 * @swagger
 * /menu-items:
 *   post:
 *     summary: Create a menu item
 *     description: Only vendors can create menu items for their own menus, and admins can create menu items for any vendor.
 *     tags: [Menu Items]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - name
 *               - price
 *             properties:
 *               userId:
 *                 type: string
 *                 description: Vendor ID who owns this menu item
 *               name:
 *                 type: string
 *                 description: Name of the menu item
 *               description:
 *                 type: string
 *                 description: Description of the menu item
 *               price:
 *                 type: number
 *                 minimum: 0
 *                 description: Price of the menu item
 *               image:
 *                 type: string
 *                 description: Single image (emoji, base64, or URL)
 *               category:
 *                 type: string
 *                 description: Category of the menu item
 *                 default: General
 *               subcategory:
 *                 type: string
 *                 description: Subcategory of the menu item
 *               isAvailable:
 *                 type: boolean
 *                 default: true
 *               preparationTime:
 *                 type: number
 *                 minimum: 1
 *                 default: 15
 *                 description: Preparation time in minutes
 *               ingredients:
 *                 type: array
 *                 items:
 *                   type: string
 *               allergens:
 *                 type: array
 *                 items:
 *                   type: string
 *               dietary:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [vegetarian, vegan, gluten-free, dairy-free, nut-free, halal, kosher]
 *             example:
 *               userId: 507f1f77bcf86cd799439011
 *               name: Margherita Pizza
 *               description: Classic pizza with tomato sauce, mozzarella, and basil
 *               price: 12.99
 *               image: 🍕
 *               category: Pizza
 *     responses:
 *       "201":
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MenuItem'
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *
 *   get:
 *     summary: Get all menu items
 *     description: Anyone can retrieve menu items with optional filtering.
 *     tags: [Menu Items]
 *     parameters:
 *       - in: query
 *         name: vendor
 *         schema:
 *           type: string
 *         description: Filter by vendor ID
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: subcategory
 *         schema:
 *           type: string
 *         description: Filter by subcategory
 *       - in: query
 *         name: isAvailable
 *         schema:
 *           type: boolean
 *         description: Filter by availability
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: sort by query in the form of field:desc/asc (ex. name:asc)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 10
 *         description: Maximum number of menu items
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
 *                 results:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/MenuItem'
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 10
 *                 totalPages:
 *                   type: integer
 *                   example: 1
 *                 totalResults:
 *                   type: integer
 *                   example: 1
 */

/**
 * @swagger
 * /menu-items/vendor/{vendorId}:
 *   get:
 *     summary: Get menu items by vendor
 *     description: Get all menu items for a specific vendor.
 *     tags: [Menu Items]
 *     parameters:
 *       - in: path
 *         name: vendorId
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: subcategory
 *         schema:
 *           type: string
 *         description: Filter by subcategory
 *       - in: query
 *         name: isAvailable
 *         schema:
 *           type: boolean
 *         description: Filter by availability
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: sort by query in the form of field:desc/asc (ex. name:asc)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 10
 *         description: Maximum number of menu items
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
 *                 results:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/MenuItem'
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 10
 *                 totalPages:
 *                   type: integer
 *                   example: 1
 *                 totalResults:
 *                   type: integer
 *                   example: 1
 */

/**
 * @swagger
 * /menu-items/{id}:
 *   get:
 *     summary: Get a menu item
 *     description: Anyone can get menu item details.
 *     tags: [Menu Items]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Menu item id
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/MenuItem'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   put:
 *     summary: Update a menu item
 *     description: Only vendors can update their own menu items, and admins can update any menu item.
 *     tags: [Menu Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Menu item id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *                 minimum: 0
 *               category:
 *                 type: string
 *               subcategory:
 *                 type: string
 *               isAvailable:
 *                 type: boolean
 *               preparationTime:
 *                 type: number
 *                 minimum: 1
 *               ingredients:
 *                 type: array
 *                 items:
 *                   type: string
 *               allergens:
 *                 type: array
 *                 items:
 *                   type: string
 *               dietary:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [vegetarian, vegan, gluten-free, dairy-free, nut-free, halal, kosher]
 *             example:
 *               name: Margherita Pizza
 *               price: 13.99
 *               isAvailable: true
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/MenuItem'
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   delete:
 *     summary: Delete a menu item
 *     description: Only vendors can delete their own menu items, and admins can delete any menu item.
 *     tags: [Menu Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Menu item id
 *     responses:
 *       "204":
 *         description: No content
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */
