const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createMenu = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    description: Joi.string(),
    operatingHours: Joi.object().keys({
      monday: Joi.object().keys({
        open: Joi.string(),
        close: Joi.string(),
        closed: Joi.boolean(),
      }),
      tuesday: Joi.object().keys({
        open: Joi.string(),
        close: Joi.string(),
        closed: Joi.boolean(),
      }),
      wednesday: Joi.object().keys({
        open: Joi.string(),
        close: Joi.string(),
        closed: Joi.boolean(),
      }),
      thursday: Joi.object().keys({
        open: Joi.string(),
        close: Joi.string(),
        closed: Joi.boolean(),
      }),
      friday: Joi.object().keys({
        open: Joi.string(),
        close: Joi.string(),
        closed: Joi.boolean(),
      }),
      saturday: Joi.object().keys({
        open: Joi.string(),
        close: Joi.string(),
        closed: Joi.boolean(),
      }),
      sunday: Joi.object().keys({
        open: Joi.string(),
        close: Joi.string(),
        closed: Joi.boolean(),
      }),
    }),
  }),
};

const addMenuItem = {
  params: Joi.object().keys({
    menuId: Joi.string().custom(objectId),
  }),
  body: Joi.object().keys({
    name: Joi.string().required(),
    description: Joi.string(),
    price: Joi.number().min(0).required(),
    category: Joi.string().required(),
    subcategory: Joi.string(),
    preparationTime: Joi.number().integer().min(1),
    ingredients: Joi.array().items(Joi.string()),
    allergens: Joi.array().items(Joi.string()),
    dietary: Joi.array().items(
      Joi.string().valid('vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free', 'halal', 'kosher')
    ),
    customizations: Joi.array().items(
      Joi.object().keys({
        name: Joi.string().required(),
        options: Joi.array().items(
          Joi.object().keys({
            name: Joi.string().required(),
            price: Joi.number().min(0).required(),
          })
        ),
        required: Joi.boolean(),
      })
    ),
  }),
};

const getMenus = {
  query: Joi.object().keys({
    vendor: Joi.string().custom(objectId),
    isActive: Joi.boolean(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getMenu = {
  params: Joi.object().keys({
    menuId: Joi.string().custom(objectId),
  }),
};

const updateMenu = {
  params: Joi.object().keys({
    menuId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string(),
      description: Joi.string(),
      isActive: Joi.boolean(),
      operatingHours: Joi.object(),
    })
    .min(1),
};

const updateMenuItem = {
  params: Joi.object().keys({
    menuId: Joi.required().custom(objectId),
    itemId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string(),
      description: Joi.string(),
      price: Joi.number().min(0),
      isAvailable: Joi.boolean(),
      category: Joi.string(),
      preparationTime: Joi.number().integer().min(1),
    })
    .min(1),
};

const deleteMenu = {
  params: Joi.object().keys({
    menuId: Joi.string().custom(objectId),
  }),
};

module.exports = {
  createMenu,
  addMenuItem,
  getMenus,
  getMenu,
  updateMenu,
  updateMenuItem,
  deleteMenu,
};
